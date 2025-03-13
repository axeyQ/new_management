// src/lib/enhancedAxiosWithAuth.js
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import * as idb from './indexedDBService';

// Create a custom axios instance
const enhancedAxiosWithAuth = axios.create();

// Offline operation types for optimistic UI updates
export const OPERATION_TYPES = {
  CREATE_CATEGORY: 'CREATE_CATEGORY',
  UPDATE_CATEGORY: 'UPDATE_CATEGORY',
  DELETE_CATEGORY: 'DELETE_CATEGORY',
  UPDATE_CATEGORY_STOCK: 'UPDATE_CATEGORY_STOCK',
  CREATE_SUBCATEGORY: 'CREATE_SUBCATEGORY',
  UPDATE_SUBCATEGORY: 'UPDATE_SUBCATEGORY',
  DELETE_SUBCATEGORY: 'DELETE_SUBCATEGORY',
  UPDATE_SUBCATEGORY_STOCK: 'UPDATE_SUBCATEGORY_STOCK',
  CREATE_TABLE: 'CREATE_TABLE',
  UPDATE_TABLE: 'UPDATE_TABLE',
  DELETE_TABLE: 'DELETE_TABLE',
  CREATE_TABLE_TYPE: 'CREATE_TABLE_TYPE',
  UPDATE_TABLE_TYPE: 'UPDATE_TABLE_TYPE',
  DELETE_TABLE_TYPE: 'DELETE_TABLE_TYPE',
  CREATE_DISH: 'CREATE_DISH',
  UPDATE_DISH: 'UPDATE_DISH',
  DELETE_DISH: 'DELETE_DISH',
  UPDATE_DISH_STOCK: 'UPDATE_DISH_STOCK',
  CREATE_VARIANT: 'CREATE_VARIANT',
  UPDATE_VARIANT: 'UPDATE_VARIANT',
  DELETE_VARIANT: 'DELETE_VARIANT',
  UPDATE_VARIANT_STOCK: 'UPDATE_VARIANT_STOCK'
};

/**
 * Enhanced error capture specifically for category creation
 * @param {Object} error - The error from the axios request
 * @param {Object} request - The original request
 * @returns {Object} - Enhanced error information
 */
const captureDetailedCategoryError = (error, request) => {
  // Basic error info
  const errorInfo = {
    message: error.message || 'Unknown error occurred',
    code: error.code,
    stack: error.stack,
    request: {
      url: request.url,
      method: request.method,
      data: request.data ? JSON.parse(request.data) : {}
    }
  };

  // Check for network errors during online status
  if (!error.response && navigator.onLine) {
    errorInfo.detailedReason = 'NETWORK_UNREACHABLE';
    errorInfo.userMessage = 'Server unreachable despite online status. Check your connection.';
  }

  // Check for CORS issues
  if (error.message?.includes('Network Error') || error.message?.includes('CORS')) {
    errorInfo.detailedReason = 'CORS_OR_NETWORK';
    errorInfo.userMessage = 'Network or CORS error. The request was blocked.';
  }

  // Check for specific axios errors
  if (error.code === 'ECONNABORTED') {
    errorInfo.detailedReason = 'REQUEST_TIMEOUT';
    errorInfo.userMessage = 'Request timed out. The server took too long to respond.';
  }

  // Try to extract more info from the response if available
  if (error.response) {
    errorInfo.status = error.response.status;
    errorInfo.statusText = error.response.statusText;
    errorInfo.data = error.response.data;

    // Check for common status codes
    if (error.response.status === 400) {
      errorInfo.detailedReason = 'VALIDATION_ERROR';
      errorInfo.userMessage = error.response.data?.message || 'Validation error. Check your input.';
    } else if (error.response.status === 401) {
      errorInfo.detailedReason = 'AUTHENTICATION_ERROR';
      errorInfo.userMessage = 'Authentication error. Please log in again.';
    } else if (error.response.status === 403) {
      errorInfo.detailedReason = 'PERMISSION_ERROR';
      errorInfo.userMessage = 'Permission denied. You don\'t have access to this resource.';
    } else if (error.response.status === 404) {
      errorInfo.detailedReason = 'RESOURCE_NOT_FOUND';
      errorInfo.userMessage = 'Resource not found. The requested endpoint does not exist.';
    } else if (error.response.status === 409) {
      errorInfo.detailedReason = 'CONFLICT_ERROR';
      errorInfo.userMessage = 'Conflict error. The resource already exists or is in conflict.';
    } else if (error.response.status === 422) {
      errorInfo.detailedReason = 'UNPROCESSABLE_ENTITY';
      errorInfo.userMessage = 'Unprocessable entity. The request was well-formed but contained invalid data.';
    } else if (error.response.status >= 500) {
      errorInfo.detailedReason = 'SERVER_ERROR';
      errorInfo.userMessage = 'Server error. Please try again later.';
    }
  }

  // Log the detailed error for debugging
  console.error('Detailed category creation error:', errorInfo);
  return errorInfo;
};

// Add a request interceptor to include the token in all requests
enhancedAxiosWithAuth.interceptors.request.use(
  async (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    // If token exists, add it to headers
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Function to determine operation type from request
const getOperationType = (url, method) => {
  method = method.toLowerCase();
  if (url.includes('/api/menu/categories')) {
    if (url.includes('/stock')) {
      return OPERATION_TYPES.UPDATE_CATEGORY_STOCK;
    } else if (method === 'post') {
      return OPERATION_TYPES.CREATE_CATEGORY;
    } else if (method === 'put') {
      return OPERATION_TYPES.UPDATE_CATEGORY;
    } else if (method === 'delete') {
      return OPERATION_TYPES.DELETE_CATEGORY;
    }
  } else if (url.includes('/api/menu/subcategories')) {
    if (url.includes('/stock')) {
      return OPERATION_TYPES.UPDATE_SUBCATEGORY_STOCK;
    } else if (method === 'post') {
      return OPERATION_TYPES.CREATE_SUBCATEGORY;
    } else if (method === 'put') {
      return OPERATION_TYPES.UPDATE_SUBCATEGORY;
    } else if (method === 'delete') {
      return OPERATION_TYPES.DELETE_SUBCATEGORY;
    }
  } else if (url.includes('/api/tables/types')) {
    if (method === 'post') {
      return OPERATION_TYPES.CREATE_TABLE_TYPE;
    } else if (method === 'put') {
      return OPERATION_TYPES.UPDATE_TABLE_TYPE;
    } else if (method === 'delete') {
      return OPERATION_TYPES.DELETE_TABLE_TYPE;
    }
  } else if (url.includes('/api/tables')) {
    if (method === 'post') {
      return OPERATION_TYPES.CREATE_TABLE;
    } else if (method === 'put') {
      return OPERATION_TYPES.UPDATE_TABLE;
    } else if (method === 'delete') {
      return OPERATION_TYPES.DELETE_TABLE;
    }
  } else if (url.includes('/api/menu/dishes')) {
    if (url.includes('/stock')) {
      return OPERATION_TYPES.UPDATE_DISH_STOCK;
    } else if (method === 'post') {
      return OPERATION_TYPES.CREATE_DISH;
    } else if (method === 'put') {
      return OPERATION_TYPES.UPDATE_DISH;
    } else if (method === 'delete') {
      return OPERATION_TYPES.DELETE_DISH;
    }
  } else if (url.includes('/api/menu/variants')) {
    if (url.includes('/stock')) {
      return OPERATION_TYPES.UPDATE_VARIANT_STOCK;
    } else if (method === 'post') {
      return OPERATION_TYPES.CREATE_VARIANT;
    } else if (method === 'put') {
      return OPERATION_TYPES.UPDATE_VARIANT;
    } else if (method === 'delete') {
      return OPERATION_TYPES.DELETE_VARIANT;
    }
  }
  return null;
};

// Function to extract ID from URL
const extractIdFromUrl = (url) => {
  const parts = url.split('/');
  const idPart = parts[parts.length - 1];
  // If the URL ends with /stock, the ID is the second-to-last part
  if (idPart === 'stock') {
    return parts[parts.length - 2];
  }
  return idPart;
};

// Register for background sync if available
const registerBackgroundSync = async (operationId) => {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(`sync-operation-${operationId}`);
      return true;
    } catch (error) {
      console.error('Background sync registration failed:', error);
      return false;
    }
  }
  return false;
};

// Generate temporary ID for new items
const generateTempId = () => `temp_${uuidv4()}`;

// Apply optimistic updates locally
const applyOptimisticUpdate = async (operationType, url, data, tempId = null) => {
  switch (operationType) {
    case OPERATION_TYPES.CREATE_CATEGORY: {
      const newCategory = {
        ...data,
        _id: tempId || generateTempId(),
        isTemp: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await idb.updateCategory(newCategory);
      return newCategory;
    }
    case OPERATION_TYPES.UPDATE_CATEGORY: {
      const id = extractIdFromUrl(url);
      const existingCategory = await idb.getCategoryById(id);
      if (existingCategory) {
        const updatedCategory = {
          ...existingCategory,
          ...data,
          updatedAt: new Date().toISOString()
        };
        await idb.updateCategory(updatedCategory);
        return updatedCategory;
      }
      return null;
    }
    case OPERATION_TYPES.DELETE_CATEGORY: {
      const id = extractIdFromUrl(url);
      await idb.deleteCategory(id);
      return { _id: id };
    }
    case OPERATION_TYPES.UPDATE_CATEGORY_STOCK: {
      const id = extractIdFromUrl(url);
      const existingCategory = await idb.getCategoryById(id);
      if (existingCategory) {
        const updatedCategory = {
          ...existingCategory,
          stockStatus: {
            ...existingCategory.stockStatus || {},
            ...data,
            lastStockUpdate: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        };
        await idb.updateCategory(updatedCategory);
        return updatedCategory;
      }
      return null;
    }
    case OPERATION_TYPES.CREATE_SUBCATEGORY: {
      const newSubCategory = {
        ...data,
        _id: tempId || generateTempId(),
        isTemp: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await idb.updateSubcategory(newSubCategory);
      return newSubCategory;
    }
    case OPERATION_TYPES.UPDATE_SUBCATEGORY: {
      const id = extractIdFromUrl(url);
      const existingSubCategory = await idb.getSubcategoryById(id);
      if (existingSubCategory) {
        const updatedSubCategory = {
          ...existingSubCategory,
          ...data,
          updatedAt: new Date().toISOString()
        };
        await idb.updateSubcategory(updatedSubCategory);
        return updatedSubCategory;
      }
      return null;
    }
    case OPERATION_TYPES.DELETE_SUBCATEGORY: {
      const id = extractIdFromUrl(url);
      await idb.deleteSubcategory(id);
      return { _id: id };
    }
    case OPERATION_TYPES.UPDATE_SUBCATEGORY_STOCK: {
      const id = extractIdFromUrl(url);
      const existingSubCategory = await idb.getSubcategoryById(id);
      if (existingSubCategory) {
        const updatedSubCategory = {
          ...existingSubCategory,
          stockStatus: {
            ...existingSubCategory.stockStatus || {},
            ...data,
            lastStockUpdate: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        };
        await idb.updateSubcategory(updatedSubCategory);
        return updatedSubCategory;
      }
      return null;
    }
    case OPERATION_TYPES.CREATE_TABLE: {
      const newTable = {
        ...data,
        _id: tempId || generateTempId(),
        isTemp: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await idb.updateTable(newTable);
      return newTable;
    }
    case OPERATION_TYPES.UPDATE_TABLE: {
      const id = extractIdFromUrl(url);
      const existingTable = await idb.getTableById(id);
      if (existingTable) {
        const updatedTable = {
          ...existingTable,
          ...data,
          updatedAt: new Date().toISOString()
        };
        await idb.updateTable(updatedTable);
        return updatedTable;
      }
      return null;
    }
    case OPERATION_TYPES.DELETE_TABLE: {
      const id = extractIdFromUrl(url);
      await idb.deleteTable(id);
      return { _id: id };
    }
    case OPERATION_TYPES.CREATE_TABLE_TYPE: {
      const newTableType = {
        ...data,
        _id: tempId || generateTempId(),
        isTemp: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await idb.updateTableType(newTableType);
      return newTableType;
    }
    case OPERATION_TYPES.UPDATE_TABLE_TYPE: {
      const id = extractIdFromUrl(url);
      const existingTableType = await idb.getTableTypeById(id);
      if (existingTableType) {
        const updatedTableType = {
          ...existingTableType,
          ...data,
          updatedAt: new Date().toISOString()
        };
        await idb.updateTableType(updatedTableType);
        return updatedTableType;
      }
      return null;
    }
    case OPERATION_TYPES.DELETE_TABLE_TYPE: {
      const id = extractIdFromUrl(url);
      await idb.deleteTableType(id);
      return { _id: id };
    }
    case OPERATION_TYPES.CREATE_DISH: {
      const newDish = {
        ...data,
        _id: tempId || generateTempId(),
        isTemp: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await idb.updateDish(newDish);
      return newDish;
    }
    
    case OPERATION_TYPES.UPDATE_DISH: {
      const id = extractIdFromUrl(url);
      const existingDish = await idb.getDishById(id);
      if (existingDish) {
        const updatedDish = {
          ...existingDish,
          ...data,
          updatedAt: new Date().toISOString()
        };
        await idb.updateDish(updatedDish);
        return updatedDish;
      }
      return null;
    }
    
    case OPERATION_TYPES.DELETE_DISH: {
      const id = extractIdFromUrl(url);
      await idb.deleteDish(id);
      return { _id: id };
    }
    
    case OPERATION_TYPES.UPDATE_DISH_STOCK: {
      const id = extractIdFromUrl(url);
      const existingDish = await idb.getDishById(id);
      if (existingDish) {
        const updatedDish = {
          ...existingDish,
          stockStatus: {
            ...existingDish.stockStatus || {},
            ...data,
            lastStockUpdate: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        };
        await idb.updateDish(updatedDish);
        return updatedDish;
      }
      return null;
    }
    
    // Add cases for variants
    case OPERATION_TYPES.CREATE_VARIANT: {
      const newVariant = {
        ...data,
        _id: tempId || generateTempId(),
        isTemp: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await idb.updateVariant(newVariant);
      return newVariant;
    }
    
    case OPERATION_TYPES.UPDATE_VARIANT: {
      const id = extractIdFromUrl(url);
      const existingVariant = await idb.getVariantById(id);
      if (existingVariant) {
        const updatedVariant = {
          ...existingVariant,
          ...data,
          updatedAt: new Date().toISOString()
        };
        await idb.updateVariant(updatedVariant);
        return updatedVariant;
      }
      return null;
    }
    
    case OPERATION_TYPES.DELETE_VARIANT: {
      const id = extractIdFromUrl(url);
      await idb.deleteVariant(id);
      return { _id: id };
    }
    
    case OPERATION_TYPES.UPDATE_VARIANT_STOCK: {
      const id = extractIdFromUrl(url);
      const existingVariant = await idb.getVariantById(id);
      if (existingVariant) {
        const updatedVariant = {
          ...existingVariant,
          stockStatus: {
            ...existingVariant.stockStatus || {},
            ...data,
            lastStockUpdate: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        };
        await idb.updateVariant(updatedVariant);
        return updatedVariant;
      }
      return null;
    }
    
    default:
      return null;
  }
};

// Add a response interceptor to handle offline mode
enhancedAxiosWithAuth.interceptors.response.use(
  async (response) => {
    // If it's a GET request for categories or subcategories, store the data
    const url = response.config.url;
    if (url.includes('/api/menu/categories') && response.config.method === 'get') {
      if (response.data.success && response.data.data) {
        await idb.saveCategories(response.data.data);
      }
    } else if (url.includes('/api/menu/subcategories') && response.config.method === 'get') {
      if (response.data.success && response.data.data) {
        await idb.saveSubcategories(response.data.data);
      }
    } else if (url.includes('/api/tables/types') && response.config.method === 'get') {
      if (response.data.success && response.data.data) {
        await idb.saveTableTypes(response.data.data);
      }
    } else if (url.includes('/api/tables') && response.config.method === 'get' && !url.includes('/types')) {
      if (response.data.success && response.data.data) {
        await idb.saveTables(response.data.data);
      }
    } else if (url.includes('/api/menu/dishes') && response.config.method === 'get' && !url.includes('/variants')) {
      if (response.data.success && response.data.data) {
        await idb.saveDishes(response.data.data);
      }
    }
    else if (url.includes('/api/menu/variants') && response.config.method === 'get') {
      if (response.data.success && response.data.data) {
        await idb.saveVariants(response.data.data);
      }
    }
    // Handle dish variants separately (dish/:id/variants endpoint)
    else if (url.includes('/api/menu/dishes/') && url.includes('/variants') && response.config.method === 'get') {
      if (response.data.success && response.data.data) {
        // Get existing variants and merge with new ones
        const existingVariants = await idb.getVariants();
        const dishId = url.split('/dishes/')[1].split('/variants')[0]; // Extract dish ID from URL
        
        // Filter out old variants for this dish
        const filteredVariants = existingVariants.filter(variant => {
          return variant.dishReference !== dishId && 
                 (!variant.dishReference || variant.dishReference._id !== dishId);
        });
        
        // Merge with new variants
        const updatedVariants = [...filteredVariants, ...response.data.data];
        await idb.saveVariants(updatedVariants);
      }
    }
    
    return response;
  },
  async (error) => {
    // Handle network errors
    if (!error.response) {
      const request = error.config;
      const operationType = getOperationType(request.url, request.method);
      const requestData = request.data ? JSON.parse(request.data) : {};
      
      // For GET requests, try to return cached data
      if (request.method.toLowerCase() === 'get') {
        if (request.url.includes('/api/menu/categories')) {
          const cachedCategories = await idb.getCategories();
          const lastSyncTime = await idb.getLastSyncTime('category');
          if (cachedCategories.length > 0) {
            console.log('Returning cached categories');
            return Promise.resolve({
              data: {
                success: true,
                data: cachedCategories,
                isOfflineData: true,
                lastSyncTime
              }
            });
          }
        } else if (request.url.includes('/api/menu/subcategories')) {
          let cachedSubcategories = await idb.getSubcategories();
          const lastSyncTime = await idb.getLastSyncTime('subcategory');
          
          // Check if there's a category filter
          if (request.url.includes('?category=')) {
            const categoryId = new URL(request.url, window.location.origin).searchParams.get('category');
            if (categoryId) {
              cachedSubcategories = await idb.getSubcategoriesByCategory(categoryId);
            }
          }
          
          if (cachedSubcategories.length > 0) {
            console.log('Returning cached subcategories');
            return Promise.resolve({
              data: {
                success: true,
                data: cachedSubcategories,
                isOfflineData: true,
                lastSyncTime
              }
            });
          }
        } else if (request.url.includes('/api/tables/types')) {
          const cachedTableTypes = await idb.getTableTypes();
          const lastSyncTime = await idb.getTableLastSyncTime('tableType');
          if (cachedTableTypes.length > 0) {
            console.log('Returning cached table types');
            return Promise.resolve({
              data: {
                success: true,
                data: cachedTableTypes,
                isOfflineData: true,
                lastSyncTime
              }
            });
          }
        } else if (request.url.includes('/api/tables') && !request.url.includes('/types')) {
          let cachedTables = await idb.getTables();
          const lastSyncTime = await idb.getTableLastSyncTime('table');

          // Check if there's a type filter
          if (request.url.includes('?type=')) {
            const typeId = new URL(request.url, window.location.origin).searchParams.get('type');
            if (typeId) {
              cachedTables = await idb.getTablesByType(typeId);
            }
          }
          
          if (cachedTables.length > 0) {
            console.log('Returning cached tables');
            return Promise.resolve({
              data: {
                success: true,
                data: cachedTables,
                isOfflineData: true,
                lastSyncTime
              }
            });
          }
        } else if (request.url.includes('/api/menu/dishes') && !request.url.includes('/variants')) {
          // Check if there's a subcategory filter
          let cachedDishes;
          
          if (request.url.includes('?subcategory=')) {
            const subcategoryId = new URL(request.url, window.location.origin)
              .searchParams.get('subcategory');
            
            if (subcategoryId) {
              cachedDishes = await idb.getDishesBySubcategory(subcategoryId);
            } else {
              cachedDishes = await idb.getDishes();
            }
          } else {
            cachedDishes = await idb.getDishes();
          }
          
          const lastSyncTime = await idb.getDishLastSyncTime();
          
          if (cachedDishes.length > 0) {
            console.log('Returning cached dishes');
            return Promise.resolve({
              data: {
                success: true,
                data: cachedDishes,
                isOfflineData: true,
                lastSyncTime
              }
            });
          }
        } else if (request.url.includes('/api/menu/variants')) {
          const cachedVariants = await idb.getVariants();
          const lastSyncTime = await idb.getVariantLastSyncTime();
          
          if (cachedVariants.length > 0) {
            console.log('Returning cached variants');
            return Promise.resolve({
              data: {
                success: true,
                data: cachedVariants,
                isOfflineData: true,
                lastSyncTime
              }
            });
          }
        }else if (request.url.includes('/api/menu/dishes/') && request.url.includes('/variants')) {
          // Extract dish ID from URL
          const urlParts = request.url.split('/');
          const dishIdIndex = urlParts.indexOf('dishes') + 1;
          const dishId = urlParts[dishIdIndex];
          
          const cachedVariants = await idb.getVariantsByDish(dishId);
          const lastSyncTime = await idb.getVariantLastSyncTime();
          
          if (cachedVariants.length > 0) {
            console.log('Returning cached variants for dish:', dishId);
            return Promise.resolve({
              data: {
                success: true,
                data: cachedVariants,
                isOfflineData: true,
                lastSyncTime
              }
            });
          }
        }
      }
      
      // For mutation requests (POST, PUT, DELETE), queue them for later
      else if (operationType) {
        const operationId = uuidv4();
        
        // Generate temp ID for create operations
        const tempId = operationType.includes('CREATE') ? generateTempId() : null;
        
        // Capture detailed error information for category creation
        let errorInfo = null;
        if (operationType === OPERATION_TYPES.CREATE_CATEGORY) {
          errorInfo = captureDetailedCategoryError(error, request);
        }
        
        // Apply optimistic update
        const optimisticResult = await applyOptimisticUpdate(
          operationType,
          request.url,
          requestData,
          tempId
        );
        
        // Queue the operation with enhanced error details if available
        await idb.queueOperation({
          id: operationId,
          type: operationType,
          method: request.method,
          url: request.url,
          data: requestData,
          tempId,
          headers: request.headers,
          errorInfo // Add the enhanced error info
        });
        
        // Try to register for background sync
        await registerBackgroundSync(operationId);
        
        // Return a mock successful response with the optimistic result and error info if available
        return Promise.resolve({
          data: {
            success: true,
            message: errorInfo?.userMessage || 'Operation queued for when you are back online',
            isOfflineOperation: true,
            operationId,
            data: optimisticResult,
            errorInfo // Include this in the response for better UI feedback
          }
        });
      }
    }
    
    return Promise.reject(error);
  }
);

export default enhancedAxiosWithAuth;