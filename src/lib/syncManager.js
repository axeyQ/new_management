// src/lib/syncManager.js
import axiosWithAuth from './axiosWithAuth';
import * as idb from './indexedDBService';
import toast from 'react-hot-toast';
import { OPERATION_TYPES } from './enhancedAxiosWithAuth';
import { showNotification } from './notificationService';
import { isBrowser, safeNavigatorAccess, safeWindowAccess } from './browserCheck';

// Skip initialization in server-side rendering
let setupCompleted = false;

// Maximum retry attempts for operations
const MAX_RETRIES = 3;

// Exponential backoff delay calculation (in milliseconds)
const getBackoffDelay = (retryCount) => {
  return Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
};

/**
* Log sync errors for debugging
* @param {string} message - Error message
* @param {Object} error - Error object
* @param {Object} operation - Operation that failed
*/
const logSyncError = (message, error, operation) => {
  if (!isBrowser()) return;
  
  console.error(`Sync Error: ${message}`, {
    error,
    operation,
    timestamp: new Date().toISOString(),
    // Add additional diagnostic info
    statusCode: error.response?.status,
    statusText: error.response?.statusText,
    responseData: error.response?.data
  });
  
  // Save error to IndexedDB for debugging
  idb.setMetadata('lastSyncError', {
    message,
    operation: operation?.id,
    operationType: operation?.type,
    timestamp: new Date().toISOString(),
    errorMessage: error.message,
    statusCode: error.response?.status
  });
};

/**
* Checks if an operation can be retried
* @param {Object} operation - The operation to check
* @returns {boolean} - Whether the operation can be retried
*/
const canRetryOperation = (operation) => {
  // Don't retry if max retries reached
  if ((operation.retryCount || 0) >= MAX_RETRIES) {
    return false;
  }
  
  // Don't retry certain status codes (400, 404, etc.)
  if (operation.lastError && operation.lastError.statusCode) {
    const nonRetryableCodes = [400, 404, 409, 422];
    if (nonRetryableCodes.includes(operation.lastError.statusCode)) {
      return false;
    }
  }
  
  return true;
};

/**
* Process a specific type of conflict
* @param {Object} operation - The operation with conflict
* @param {Object} error - The error response
* @returns {Promise<boolean>} - Whether the conflict was resolved
*/
const resolveConflict = async (operation, error) => {
  if (!isBrowser()) return false;
  
  // Implement specific conflict resolution strategies based on operation type
  
  // Category already exists conflict (409 status code)
  if (operation.type === OPERATION_TYPES.CREATE_CATEGORY && error.response?.status === 409) {
    try {
      // Find any temp category in IndexedDB
      const categories = await idb.getCategories();
      const tempCategory = categories.find(c => c._id === operation.tempId);
      
      if (tempCategory) {
        // Get the existing category from server to compare
        const existingRes = await axiosWithAuth.get('/api/menu/categories');
        const existingCategories = existingRes.data.data || [];
        const existingCategory = existingCategories.find(
          c => c.categoryName.toLowerCase() === tempCategory.categoryName.toLowerCase()
        );
        
        if (existingCategory) {
          // Delete the temp category from IndexedDB
          await idb.deleteCategory(operation.tempId);
          // Clear the operation
          await idb.clearOperation(operation.id);
          console.log('Resolved conflict: Category already exists');
          return true;
        }
      }
    } catch (resolveError) {
      console.error('Error resolving conflict:', resolveError);
    }
  }
  
  // Subcategory already exists conflict
  if (operation.type === OPERATION_TYPES.CREATE_SUBCATEGORY && error.response?.status === 409) {
    try {
      // Find any temp subcategory in IndexedDB
      const subcategories = await idb.getSubcategories();
      const tempSubcategory = subcategories.find(sc => sc._id === operation.tempId);
      
      if (tempSubcategory) {
        // Get the existing subcategory from server to compare
        const existingRes = await axiosWithAuth.get('/api/menu/subcategories');
        const existingSubcategories = existingRes.data.data || [];
        const existingSubcategory = existingSubcategories.find(
          sc => sc.subCategoryName.toLowerCase() === tempSubcategory.subCategoryName.toLowerCase()
        );
        
        if (existingSubcategory) {
          // Delete the temp subcategory from IndexedDB
          await idb.deleteSubcategory(operation.tempId);
          // Clear the operation
          await idb.clearOperation(operation.id);
          console.log('Resolved conflict: Subcategory already exists');
          return true;
        }
      }
    } catch (resolveError) {
      console.error('Error resolving conflict:', resolveError);
    }
  }
  
  // Table already exists conflict
  if (operation.type === OPERATION_TYPES.CREATE_TABLE && error.response?.status === 409) {
    try {
      // Find any temp table in IndexedDB
      const tables = await idb.getTables();
      const tempTable = tables.find(t => t._id === operation.tempId);
      
      if (tempTable) {
        // Get the existing table from server to compare
        const existingRes = await axiosWithAuth.get('/api/tables');
        const existingTables = existingRes.data.data || [];
        const existingTable = existingTables.find(
          t => t.tableName.toLowerCase() === tempTable.tableName.toLowerCase()
        );
        
        if (existingTable) {
          // Delete the temp table from IndexedDB
          await idb.deleteTable(operation.tempId);
          // Clear the operation
          await idb.clearOperation(operation.id);
          console.log('Resolved conflict: Table already exists');
          return true;
        }
      }
    } catch (resolveError) {
      console.error('Error resolving table conflict:', resolveError);
    }
  }
  
  // Table Type already exists conflict
  if (operation.type === OPERATION_TYPES.CREATE_TABLE_TYPE && error.response?.status === 409) {
    try {
      // Find any temp table type in IndexedDB
      const tableTypes = await idb.getTableTypes();
      const tempTableType = tableTypes.find(t => t._id === operation.tempId);
      
      if (tempTableType) {
        // Get the existing table type from server to compare
        const existingRes = await axiosWithAuth.get('/api/tables/types');
        const existingTableTypes = existingRes.data.data || [];
        const existingTableType = existingTableTypes.find(
          t => t.tableTypeName.toLowerCase() === tempTableType.tableTypeName.toLowerCase()
        );
        
        if (existingTableType) {
          // Delete the temp table type from IndexedDB
          await idb.deleteTableType(operation.tempId);
          // Clear the operation
          await idb.clearOperation(operation.id);
          console.log('Resolved conflict: Table type already exists');
          return true;
        }
      }
    } catch (resolveError) {
      console.error('Error resolving table type conflict:', resolveError);
    }
  }
  
  return false;
};

/**
* Recover operation data when temp table is missing
* This function helps when the temp table wasn't properly saved in IndexedDB
* @param {Object} operation - The operation with missing temp data
* @returns {Object|null} Recovered data or null if not possible
*/
const recoverMissingTempData = (operation) => {
  try {
    // If the operation has data, we can use it directly
    if (operation.data && Object.keys(operation.data).length > 0) {
      console.log('Recovering from operation.data:', operation.data);
      
      // Ensure data has required fields to create a table
      const recoveredData = { ...operation.data };
      
      // Add any missing required fields with sensible defaults
      if (!recoveredData.tableName) {
        recoveredData.tableName = `Recovered Table ${new Date().toLocaleTimeString()}`;
      }
      
      if (recoveredData.capacity === undefined) {
        recoveredData.capacity = 1;
      }
      
      if (recoveredData.status === undefined) {
        recoveredData.status = true;
      }
      
      return recoveredData;
    }
    
    return null;
  } catch (error) {
    console.error('Error recovering temp data:', error);
    return null;
  }
};

/**
* Recover operation data when temp table type is missing
* This function helps when the temp table type wasn't properly saved in IndexedDB
* @param {Object} operation - The operation with missing temp data
* @returns {Object|null} Recovered data or null if not possible
*/
const recoverMissingTempTypeData = (operation) => {
  try {
    // If the operation has data, we can use it directly
    if (operation.data && Object.keys(operation.data).length > 0) {
      console.log('Recovering table type from operation.data:', operation.data);
      
      // Ensure data has required fields to create a table type
      const recoveredData = { ...operation.data };
      
      // Add any missing required fields with sensible defaults
      if (!recoveredData.tableTypeName) {
        recoveredData.tableTypeName = `Recovered Type ${new Date().toLocaleTimeString()}`;
      }
      
      if (recoveredData.tableTypeDescription === undefined) {
        recoveredData.tableTypeDescription = '';
      }
      
      return recoveredData;
    }
    
    return null;
  } catch (error) {
    console.error('Error recovering table type temp data:', error);
    return null;
  }
};

/**
* Recover operation data when temp category is missing
* @param {Object} operation - The operation with missing temp data
* @returns {Object|null} Recovered data or null if not possible
*/
const recoverMissingCategoryData = (operation) => {
  try {
    // If the operation has data, we can use it directly
    if (operation.data && Object.keys(operation.data).length > 0) {
      console.log('Recovering category from operation.data:', operation.data);
      
      // Ensure data has required fields to create a category
      const recoveredData = { ...operation.data };
      
      // Add any missing required fields with sensible defaults
      if (!recoveredData.categoryName) {
        recoveredData.categoryName = `Recovered Category ${new Date().toLocaleTimeString()}`;
      }
      
      if (!recoveredData.parentCategory) {
        recoveredData.parentCategory = 'food';
      }
      
      return recoveredData;
    }
    
    return null;
  } catch (error) {
    console.error('Error recovering category temp data:', error);
    return null;
  }
};

/**
* Recover operation data when temp subcategory is missing
* @param {Object} operation - The operation with missing temp data
* @returns {Object|null} Recovered data or null if not possible
*/
const recoverMissingSubcategoryData = (operation) => {
  try {
    // If the operation has data, we can use it directly
    if (operation.data && Object.keys(operation.data).length > 0) {
      console.log('Recovering subcategory from operation.data:', operation.data);
      
      // Ensure data has required fields to create a subcategory
      const recoveredData = { ...operation.data };
      
      // Add any missing required fields with sensible defaults
      if (!recoveredData.subCategoryName) {
        recoveredData.subCategoryName = `Recovered Subcategory ${new Date().toLocaleTimeString()}`;
      }
      
      return recoveredData;
    }
    
    return null;
  } catch (error) {
    console.error('Error recovering subcategory temp data:', error);
    return null;
  }
};

/**
* Processes a single pending operation with enhanced error handling
* @param {Object} operation - The operation to process
* @returns {Promise<{success: boolean, error: Object|null}>}
*/
export const processOperation = async (operation) => {
  if (!isBrowser()) return { success: false, error: new Error('Not in browser environment') };
  
  try {
    console.log(`Processing operation: ${operation.type}`, operation);
    
    // Special handling for create operations that used temp IDs
    if (operation.type === OPERATION_TYPES.CREATE_CATEGORY && operation.tempId) {
      // Find the temp category in IndexedDB
      const categories = await idb.getCategories();
      const tempCategory = categories.find(c => c._id === operation.tempId);
      
      if (tempCategory) {
        try {
          // Prepare clean data for the API
          const cleanData = { ...operation.data };
          
          // If operation data is empty, use the temp category data
          if (Object.keys(cleanData).length === 0) {
            Object.assign(cleanData, tempCategory);
          }
          
          // Remove temp fields
          delete cleanData._id;
          delete cleanData.isTemp;
          delete cleanData.__v;
          
          console.log('Sending cleaned category data to server:', cleanData);
          
          // Create the real category
          const response = await axiosWithAuth({
            method: operation.method,
            url: operation.url,
            data: cleanData
          });
          
          if (response.data.success) {
            console.log('Category created successfully on server:', response.data.data);
            
            // Replace the temp category with the real one
            await idb.deleteCategory(operation.tempId);
            await idb.updateCategory(response.data.data);
            
            // Clear the operation
            await idb.clearOperation(operation.id);
            return { success: true, error: null };
          } else {
            throw new Error(response.data.message || 'Server returned error');
          }
        } catch (error) {
          // Try to resolve conflict if applicable
          const conflictResolved = await resolveConflict(operation, error);
          if (conflictResolved) {
            return { success: true, error: null };
          }
          
          // Log the error for debugging
          logSyncError('Failed to create category', error, operation);
          
          // If we have a 400 error, add additional diagnostics
          if (error.response?.status === 400) {
            console.error('Validation error details:', {
              dataWeTriedToSend: operation.data,
              serverResponse: error.response.data,
              tempCategoryData: tempCategory
            });
          }
          
          // If can retry, update operation with error info and increment retry count
          if (canRetryOperation(operation)) {
            const updatedOperation = {
              ...operation,
              retryCount: (operation.retryCount || 0) + 1,
              lastAttempt: new Date().toISOString(),
              lastError: {
                message: error.message,
                statusCode: error.response?.status,
                data: error.response?.data
              }
            };
            
            // Update in DB and schedule retry with backoff
            await idb.clearOperation(operation.id);
            const newId = `${operation.id}_retry_${updatedOperation.retryCount}`;
            await idb.queueOperation({...updatedOperation, id: newId});
            
            // Schedule retry with exponential backoff
            const delay = getBackoffDelay(updatedOperation.retryCount);
            setTimeout(() => {
              console.log(`Retrying operation after ${delay}ms:`, newId);
            }, delay);
            
            return { success: false, error, willRetry: true };
          }
          
          // If max retries reached or non-retryable error, mark as failed
          await idb.clearOperation(operation.id);
          await idb.setMetadata('failedOperations', {
            ...await idb.getMetadata('failedOperations') || {},
            [operation.id]: {
              operation,
              error: {
                message: error.message,
                statusCode: error.response?.status,
                data: error.response?.data
              },
              timestamp: new Date().toISOString()
            }
          });
          
          return { success: false, error, willRetry: false };
        }
      } else {
        // Temp category not found, try to recover from operation data
        console.warn(`Temp category with ID ${operation.tempId} not found in IndexedDB`);
        
        // Try to recover data from the operation itself
        const recoveredData = recoverMissingCategoryData(operation);
        
        if (recoveredData) {
          console.log('Attempting to create category with recovered data:', recoveredData);
          
          try {
            // Attempt to create with recovered data
            const response = await axiosWithAuth({
              method: operation.method,
              url: operation.url,
              data: recoveredData
            });
            
            if (response.data.success) {
              console.log('Successfully created category with recovered data:', response.data.data);
              
              // Update local categories
              await idb.updateCategory(response.data.data);
              
              // Clear the operation
              await idb.clearOperation(operation.id);
              return { success: true, error: null, recovered: true };
            } else {
              throw new Error(response.data.message || 'Server returned error');
            }
          } catch (error) {
            console.error('Failed to create category with recovered data:', error);
            
            // Clear the operation since recovery failed
            await idb.clearOperation(operation.id);
            return {
              success: false,
              error: new Error('Recovery failed: ' + error.message),
              recoveryAttempted: true
            };
          }
        } else {
          // No data to recover, clean up the operation
          await idb.clearOperation(operation.id);
          return {
            success: false,
            error: new Error('Temporary category not found and no data to recover'),
            cleanedUp: true
          };
        }
      }
    }
    
    // Handle subcategory creation
    else if (operation.type === OPERATION_TYPES.CREATE_SUBCATEGORY && operation.tempId) {
      // Find the temp subcategory in IndexedDB
      const subcategories = await idb.getSubcategories();
      const tempSubcategory = subcategories.find(sc => sc._id === operation.tempId);
      
      if (tempSubcategory) {
        try {
          // Prepare clean data for the API
          const cleanData = { ...operation.data };
          
          // If operation data is empty, use the temp subcategory data
          if (Object.keys(cleanData).length === 0) {
            Object.assign(cleanData, tempSubcategory);
          }
          
          // Remove temp fields
          delete cleanData._id;
          delete cleanData.isTemp;
          delete cleanData.__v;
          
          // Ensure category is just an ID if it's stored as an object
          if (cleanData.category && typeof cleanData.category === 'object' && cleanData.category._id) {
            cleanData.category = cleanData.category._id;
          }
          
          console.log('Sending cleaned subcategory data to server:', cleanData);
          
          // Create the real subcategory
          const response = await axiosWithAuth({
            method: operation.method,
            url: operation.url,
            data: cleanData
          });
          
          if (response.data.success) {
            console.log('Subcategory created successfully on server:', response.data.data);
            
            // Replace the temp subcategory with the real one
            await idb.deleteSubcategory(operation.tempId);
            await idb.updateSubcategory(response.data.data);
            
            // Clear the operation
            await idb.clearOperation(operation.id);
            return { success: true, error: null };
          } else {
            throw new Error(response.data.message || 'Server returned error');
          }
        } catch (error) {
          // Try to resolve conflict if applicable
          const conflictResolved = await resolveConflict(operation, error);
          if (conflictResolved) {
            return { success: true, error: null };
          }
          
          // Log the error for debugging
          logSyncError('Failed to create subcategory', error, operation);
          
          // If can retry, update operation with error info and increment retry count
          if (canRetryOperation(operation)) {
            const updatedOperation = {
              ...operation,
              retryCount: (operation.retryCount || 0) + 1,
              lastAttempt: new Date().toISOString(),
              lastError: {
                message: error.message,
                statusCode: error.response?.status,
                data: error.response?.data
              }
            };
            
            // Update in DB and schedule retry with backoff
            await idb.clearOperation(operation.id);
            const newId = `${operation.id}_retry_${updatedOperation.retryCount}`;
            await idb.queueOperation({...updatedOperation, id: newId});
            
            // Schedule retry with exponential backoff
            const delay = getBackoffDelay(updatedOperation.retryCount);
            setTimeout(() => {
              console.log(`Retrying operation after ${delay}ms:`, newId);
            }, delay);
            
            return { success: false, error, willRetry: true };
          }
          
          // If max retries reached or non-retryable error, mark as failed
          await idb.clearOperation(operation.id);
          await idb.setMetadata('failedOperations', {
            ...await idb.getMetadata('failedOperations') || {},
            [operation.id]: {
              operation,
              error: {
                message: error.message,
                statusCode: error.response?.status,
                data: error.response?.data
              },
              timestamp: new Date().toISOString()
            }
          });
          
          return { success: false, error, willRetry: false };
        }
      } else {
        // Temp subcategory not found, try to recover from operation data
        console.warn(`Temp subcategory with ID ${operation.tempId} not found in IndexedDB`);
        
        // Try to recover data from the operation itself
        const recoveredData = recoverMissingSubcategoryData(operation);
        
        if (recoveredData) {
          console.log('Attempting to create subcategory with recovered data:', recoveredData);
          
          try {
            // Attempt to create with recovered data
            const response = await axiosWithAuth({
              method: operation.method,
              url: operation.url,
              data: recoveredData
            });
            
            if (response.data.success) {
              console.log('Successfully created subcategory with recovered data:', response.data.data);
              
              // Update local subcategories
              await idb.updateSubcategory(response.data.data);
              
              // Clear the operation
              await idb.clearOperation(operation.id);
              return { success: true, error: null, recovered: true };
            } else {
              throw new Error(response.data.message || 'Server returned error');
            }
          } catch (error) {
            console.error('Failed to create subcategory with recovered data:', error);
            
            // Clear the operation since recovery failed
            await idb.clearOperation(operation.id);
            return {
              success: false,
              error: new Error('Recovery failed: ' + error.message),
              recoveryAttempted: true
            };
          }
        } else {
          // No data to recover, clean up the operation
          await idb.clearOperation(operation.id);
          return {
            success: false,
            error: new Error('Temporary subcategory not found and no data to recover'),
            cleanedUp: true
          };
        }
      }
    }
    
   
    // Add table creation handling
    else if (operation.type === OPERATION_TYPES.CREATE_TABLE && operation.tempId) {
      // Find the temp table in IndexedDB
      const tables = await idb.getTables();
      const tempTable = tables.find(t => t._id === operation.tempId);
      
      if (tempTable) {
        try {
          // Prepare clean data for the API
          // Start with the original operation data
          const cleanData = { ...operation.data };
          
          // If the operation data is empty, use the temp table data
          if (Object.keys(cleanData).length === 0) {
            Object.assign(cleanData, tempTable);
          }
          
          // Ensure these problematic fields are removed
          delete cleanData._id;
          delete cleanData.isTemp;
          delete cleanData.__v;
          
          // Make sure the tableType is a string ID, not an object
          if (cleanData.tableType && typeof cleanData.tableType === 'object' && cleanData.tableType._id) {
            cleanData.tableType = cleanData.tableType._id;
          }
          
          console.log('Sending cleaned table data to server:', cleanData);
          
          // Create the real table
          const response = await axiosWithAuth({
            method: operation.method,
            url: operation.url,
            data: cleanData
          });
          
          if (response.data.success) {
            console.log('Table created successfully on server:', response.data.data);
            
            // Replace the temp table with the real one
            await idb.deleteTable(operation.tempId);
            await idb.updateTable(response.data.data);
            
            // Clear the operation
            await idb.clearOperation(operation.id);
            return { success: true, error: null };
          } else {
            throw new Error(response.data.message || 'Server returned error');
          }
        } catch (error) {
          // Try to resolve conflict if applicable
          const conflictResolved = await resolveConflict(operation, error);
          
          if (conflictResolved) {
            return { success: true, error: null };
          }
          
          // Log the error for debugging
          logSyncError('Failed to create table', error, operation);
          
          // If we have a 400 error, it might be due to validation issues with the data
          // Let's add some additional diagnostics
          if (error.response?.status === 400) {
            console.error('Validation error details:', {
              dataWeTriedToSend: operation.data,
              serverResponse: error.response.data,
              tempTableData: tempTable
            });
          }
          
          // If can retry, update operation with error info and increment retry count
          if (canRetryOperation(operation)) {
            const updatedOperation = {
              ...operation,
              retryCount: (operation.retryCount || 0) + 1,
              lastAttempt: new Date().toISOString(),
              lastError: {
                message: error.message,
                statusCode: error.response?.status,
                data: error.response?.data
              }
            };
            
            // Update in DB and schedule retry with backoff
            await idb.clearOperation(operation.id);
            const newId = `${operation.id}_retry_${updatedOperation.retryCount}`;
            await idb.queueOperation({...updatedOperation, id: newId});
            
            // Schedule retry with exponential backoff
            const delay = getBackoffDelay(updatedOperation.retryCount);
            setTimeout(() => {
              console.log(`Retrying operation after ${delay}ms:`, newId);
            }, delay);
            
            return { success: false, error, willRetry: true };
          }
          
          // If max retries reached or non-retryable error, mark as failed
          await idb.clearOperation(operation.id);
          await idb.setMetadata('failedOperations', {
            ...await idb.getMetadata('failedOperations') || {},
            [operation.id]: {
              operation,
              error: {
                message: error.message,
                statusCode: error.response?.status,
                data: error.response?.data
              },
              timestamp: new Date().toISOString()
            }
          });
          
          return { success: false, error, willRetry: false };
        }
      } else {
        // Temp table not found, but we can try to recover from operation data
        console.warn(`Temp table with ID ${operation.tempId} not found in IndexedDB`);
        
        // Try to recover data from the operation itself
        const recoveredData = recoverMissingTempData(operation);
        
        if (recoveredData) {
          console.log('Attempting to create table with recovered data:', recoveredData);
          
          try {
            // Attempt to create with recovered data
            const response = await axiosWithAuth({
              method: operation.method,
              url: operation.url,
              data: recoveredData
            });
            
            if (response.data.success) {
              console.log('Successfully created table with recovered data:', response.data.data);
              
              // Update local tables
              await idb.updateTable(response.data.data);
              
              // Clear the operation
              await idb.clearOperation(operation.id);
              
              return { success: true, error: null, recovered: true };
            } else {
              throw new Error(response.data.message || 'Server returned error');
            }
          } catch (error) {
            console.error('Failed to create table with recovered data:', error);
            
            // Clear the operation since recovery failed
            await idb.clearOperation(operation.id);
            
            return {
              success: false,
              error: new Error('Recovery failed: ' + error.message),
              recoveryAttempted: true
            };
          }
        } else {
          // No data to recover, clean up the operation
          await idb.clearOperation(operation.id);
          
          return {
            success: false,
            error: new Error('Temporary table not found and no data to recover'),
            cleanedUp: true
          };
        }
      }
    }
    // Add table type creation handling
    else if (operation.type === OPERATION_TYPES.CREATE_TABLE_TYPE && operation.tempId) {
      // Find the temp table type in IndexedDB
      const tableTypes = await idb.getTableTypes();
      const tempTableType = tableTypes.find(t => t._id === operation.tempId);
      
      if (tempTableType) {
        try {
          // Prepare clean data for the API - similar to table handling
          // Start with the original operation data
          const cleanData = { ...operation.data };
          
          // If the operation data is empty, use the temp table type data
          if (Object.keys(cleanData).length === 0) {
            Object.assign(cleanData, tempTableType);
          }
          
          // Ensure these problematic fields are removed
          delete cleanData._id;
          delete cleanData.isTemp;
          delete cleanData.__v;
          
          console.log('Sending cleaned table type data to server:', cleanData);
          
          // Create the real table type
          const response = await axiosWithAuth({
            method: operation.method,
            url: operation.url,
            data: cleanData
          });
          
          if (response.data.success) {
            console.log('Table type created successfully on server:', response.data.data);
            
            // Replace the temp table type with the real one
            await idb.deleteTableType(operation.tempId);
            await idb.updateTableType(response.data.data);
            
            // Clear the operation
            await idb.clearOperation(operation.id);
            return { success: true, error: null };
          } else {
            throw new Error(response.data.message || 'Server returned error');
          }
        } catch (error) {
          // Try to resolve conflict if applicable
          const conflictResolved = await resolveConflict(operation, error);
          
          if (conflictResolved) {
            return { success: true, error: null };
          }
          
          // Log the error for debugging
          logSyncError('Failed to create table type', error, operation);
          
          // If we have a 400 error, it might be due to validation issues with the data
          // Add detailed diagnostics (similar to table handling)
          if (error.response?.status === 400) {
            console.error('Validation error details:', {
              dataWeTriedToSend: operation.data,
              serverResponse: error.response.data,
              tempTableTypeData: tempTableType
            });
          }
          
          // If can retry, update operation with error info and increment retry count
          if (canRetryOperation(operation)) {
            const updatedOperation = {
              ...operation,
              retryCount: (operation.retryCount || 0) + 1,
              lastAttempt: new Date().toISOString(),
              lastError: {
                message: error.message,
                statusCode: error.response?.status,
                data: error.response?.data
              }
            };
            
            // Update in DB and schedule retry with backoff
            await idb.clearOperation(operation.id);
            const newId = `${operation.id}_retry_${updatedOperation.retryCount}`;
            await idb.queueOperation({...updatedOperation, id: newId});
            
            // Schedule retry with exponential backoff
            const delay = getBackoffDelay(updatedOperation.retryCount);
            setTimeout(() => {
              console.log(`Retrying operation after ${delay}ms:`, newId);
            }, delay);
            
            return { success: false, error, willRetry: true };
          }
          
          // If max retries reached or non-retryable error, mark as failed
          await idb.clearOperation(operation.id);
          await idb.setMetadata('failedOperations', {
            ...await idb.getMetadata('failedOperations') || {},
            [operation.id]: {
              operation,
              error: {
                message: error.message,
                statusCode: error.response?.status,
                data: error.response?.data
              },
              timestamp: new Date().toISOString()
            }
          });
          
          return { success: false, error, willRetry: false };
        }
      } else {
        // Temp table type not found, but we can try to recover from operation data
        console.warn(`Temp table type with ID ${operation.tempId} not found in IndexedDB`);
        
        // Try to recover data from the operation itself
        const recoveredData = recoverMissingTempTypeData(operation);
        
        if (recoveredData) {
          console.log('Attempting to create table type with recovered data:', recoveredData);
          
          try {
            // Attempt to create with recovered data
            const response = await axiosWithAuth({
              method: operation.method,
              url: operation.url,
              data: recoveredData
            });
            
            if (response.data.success) {
              console.log('Successfully created table type with recovered data:', response.data.data);
              
              // Update local table types
              await idb.updateTableType(response.data.data);
              
              // Clear the operation
              await idb.clearOperation(operation.id);
              
              return { success: true, error: null, recovered: true };
            } else {
              throw new Error(response.data.message || 'Server returned error');
            }
          } catch (error) {
            console.error('Failed to create table type with recovered data:', error);
            
            // Clear the operation since recovery failed
            await idb.clearOperation(operation.id);
            
            return {
              success: false,
              error: new Error('Recovery failed: ' + error.message),
              recoveryAttempted: true
            };
          }
        } else {
          // No data to recover, clean up the operation
          await idb.clearOperation(operation.id);
          
          return {
            success: false,
            error: new Error('Temporary table type not found and no data to recover'),
            cleanedUp: true
          };
        }
      }
    }
    // Handle all other operation types
    else {
      try {
        // Recreate the request
        const response = await axiosWithAuth({
          method: operation.method,
          url: operation.url,
          data: operation.data,
          headers: operation.headers
        });
        
        if (response.data.success) {
          // Operation succeeded, clear it
          await idb.clearOperation(operation.id);
          return { success: true, error: null };
        } else {
          // API returned success: false
          throw new Error(response.data.message || 'Operation failed on server');
        }
      } catch (error) {
        // Try to resolve conflict if applicable
        const conflictResolved = await resolveConflict(operation, error);
        
        if (conflictResolved) {
          return { success: true, error: null };
        }
        
        // Log the error for debugging
        logSyncError(`Failed to process ${operation.type}`, error, operation);
        
        // If can retry, update operation with error info and increment retry count
        if (canRetryOperation(operation)) {
          const updatedOperation = {
            ...operation,
            retryCount: (operation.retryCount || 0) + 1,
            lastAttempt: new Date().toISOString(),
            lastError: {
              message: error.message,
              statusCode: error.response?.status,
              data: error.response?.data
            }
          };
          
          // Update in DB and schedule retry with backoff
          await idb.clearOperation(operation.id);
          const newId = `${operation.id}_retry_${updatedOperation.retryCount}`;
          await idb.queueOperation({...updatedOperation, id: newId});
          
          // Schedule retry with exponential backoff
          const delay = getBackoffDelay(updatedOperation.retryCount);
          setTimeout(() => {
            console.log(`Retrying operation after ${delay}ms:`, newId);
          }, delay);
          
          return { success: false, error, willRetry: true };
        }
        
        // If max retries reached or non-retryable error, mark as failed
        await idb.clearOperation(operation.id);
        await idb.setMetadata('failedOperations', {
          ...await idb.getMetadata('failedOperations') || {},
          [operation.id]: {
            operation,
            error: {
              message: error.message,
              statusCode: error.response?.status,
              data: error.response?.data
            },
            timestamp: new Date().toISOString()
          }
        });
        
        return { success: false, error, willRetry: false };
      }
    }
  } catch (unexpectedError) {
    // Handle unexpected errors in our sync code
    logSyncError('Unexpected error in processOperation', unexpectedError, operation);
    return { success: false, error: unexpectedError, willRetry: false };
  }
  
  // If we get here, something went wrong
  return { success: false, error: new Error('Unknown error occurred'), willRetry: false };
};

/**
* Processes pending operations when coming back online with better error handling
* @returns {Promise<{success: boolean, processed: number, failed: number, retrying: number}>}
*/
export const processPendingOperations = async () => {
  if (!isBrowser()) {
    return { success: true, processed: 0, failed: 0, retrying: 0 };
  }
  
  try {
    const pendingOperations = await idb.getPendingOperations();
    
    if (pendingOperations.length === 0) {
      return { success: true, processed: 0, failed: 0, retrying: 0 };
    }
    
    let processed = 0;
    let failed = 0;
    let retrying = 0;
    let failedOperationDetails = [];
    
    // Sort operations to process creates first, then updates, then deletes
    const sortedOperations = [...pendingOperations].sort((a, b) => {
      // Skip operations that are scheduled for retry
      if (a.id.includes('_retry_') && !b.id.includes('_retry_')) return 1;
      if (!a.id.includes('_retry_') && b.id.includes('_retry_')) return -1;
      
      // Create operations first
      if (a.type.includes('CREATE') && !b.type.includes('CREATE')) return -1;
      if (!a.type.includes('CREATE') && b.type.includes('CREATE')) return 1;
      
      // Then updates
      if (a.type.includes('UPDATE') && b.type.includes('DELETE')) return -1;
      if (a.type.includes('DELETE') && b.type.includes('UPDATE')) return 1;
      
      // Then by timestamp (oldest first)
      return new Date(a.timestamp) - new Date(b.timestamp);
    });
    
    // Process operations in the optimized order
    for (const operation of sortedOperations) {
      try {
        // Skip operations scheduled for retry with backoff
        if (operation.id.includes('_retry_') && operation.lastAttempt) {
          const retryCount = parseInt(operation.id.split('_retry_')[1]) || 0;
          const lastAttempt = new Date(operation.lastAttempt).getTime();
          const now = Date.now();
          const waitTime = getBackoffDelay(retryCount);
          
          if (now - lastAttempt < waitTime) {
            retrying++;
            continue; // Skip, not ready for retry yet
          }
        }
        
        const result = await processOperation(operation);
        
        if (result.success) {
          processed++;
        } else if (result.willRetry) {
          retrying++;
        } else {
          failed++;
          failedOperationDetails.push({
            id: operation.id,
            type: operation.type,
            url: operation.url,
            errorMessage: result.error?.message || 'Unknown error',
            statusCode: result.error?.response?.status
          });
        }
      } catch (error) {
        console.error(`Error processing operation: ${operation.type}`, error);
        failed++;
        failedOperationDetails.push({
          id: operation.id,
          type: operation.type,
          url: operation.url,
          errorMessage: error.message || 'Unexpected error',
          statusCode: error.response?.status
        });
      }
    }
    
    // Save detailed error information for debugging
    if (failedOperationDetails.length > 0) {
      await idb.setMetadata('lastSyncFailures', {
        timestamp: new Date().toISOString(),
        failures: failedOperationDetails
      });
    }
    
    return {
      success: failed === 0,
      processed,
      failed,
      retrying,
      failedOperations: failedOperationDetails
    };
  } catch (error) {
    console.error('Error processing pending operations:', error);
    await idb.setMetadata('lastSyncError', {
      message: 'Failed to process pending operations',
      timestamp: new Date().toISOString(),
      errorMessage: error.message
    });
    
    return {
      success: false,
      processed: 0,
      failed: 0,
      retrying: 0,
      error: error.message
    };
  }
};

/**
* Syncs all data from the server
* @returns {Promise<{success: boolean, categories: number, subcategories: number}>}
*/
export const syncAllData = async () => {
  if (!isBrowser()) {
    return { 
      success: true, 
      categories: 0, 
      subcategories: 0,
      tables: 0,
      tableTypes: 0 
    };
  }
  
  try {
    // Sync categories
    const categoriesResponse = await axiosWithAuth.get('/api/menu/categories');
    if (categoriesResponse.data.success) {
      await idb.saveCategories(categoriesResponse.data.data);
    }
    
    // Sync subcategories
    const subcategoriesResponse = await axiosWithAuth.get('/api/menu/subcategories');
    if (subcategoriesResponse.data.success) {
      await idb.saveSubcategories(subcategoriesResponse.data.data);
    }
    
    // Sync tables
    const tablesResponse = await axiosWithAuth.get('/api/tables');
    if (tablesResponse.data.success) {
      await idb.saveTables(tablesResponse.data.data);
    }
    
    // Sync table types
    const tableTypesResponse = await axiosWithAuth.get('/api/tables/types');
    if (tableTypesResponse.data.success) {
      await idb.saveTableTypes(tableTypesResponse.data.data);
    }
    
    return {
      success: true,
      categories: categoriesResponse.data.data.length,
      subcategories: subcategoriesResponse.data.data.length,
      tables: tablesResponse.data.data.length,
      tableTypes: tableTypesResponse.data.data.length
    };
  } catch (error) {
    console.error('Error syncing data:', error);
    await idb.setMetadata('lastSyncError', {
      message: 'Failed to sync data from server',
      timestamp: new Date().toISOString(),
      errorMessage: error.message,
      statusCode: error.response?.status
    });
    
    return { success: false, error: error.message };
  }
};

/**
* Manually retry failed operations
* @returns {Promise<{success: boolean, retriedCount: number}>}
*/
export const retryFailedOperations = async () => {
  if (!isBrowser()) {
    return { success: true, retriedCount: 0 };
  }
  
  try {
    const failedOps = await idb.getMetadata('failedOperations') || {};
    const failedOpIds = Object.keys(failedOps);
    
    if (failedOpIds.length === 0) {
      return { success: true, retriedCount: 0 };
    }
    
    let retriedCount = 0;
    
    for (const id of failedOpIds) {
      const failedOp = failedOps[id].operation;
      
      if (failedOp) {
        // Reset retry count and requeue
        const retriedOp = {
          ...failedOp,
          id: `${failedOp.id}_manual_retry_${Date.now()}`,
          retryCount: 0,
          lastAttempt: null,
          lastError: null
        };
        
        await idb.queueOperation(retriedOp);
        retriedCount++;
      }
    }
    
    // Clear failed operations that were requeued
    await idb.setMetadata('failedOperations', {});
    
    return { success: true, retriedCount };
  } catch (error) {
    console.error('Error retrying failed operations:', error);
    return { success: false, error: error.message };
  }
};

/**
* Initializes synchronization process with enhanced error handling
* @returns {Promise<{success: boolean, processed: number, failed: number, retrying: number}>}
*/
export const initializeSync = async () => {
  if (!isBrowser()) {
    return { success: true, processed: 0, failed: 0, retrying: 0 };
  }
  
  try {
    await idb.setMetadata('syncStatus', 'in-progress');
    await idb.setMetadata('syncStartTime', new Date().toISOString());
    
    // First process any pending operations
    const result = await processPendingOperations();
    
    if (result.processed > 0 && typeof toast !== 'undefined') {
      toast.success(`Synchronized ${result.processed} operation(s)`);
    }
    
    if (result.retrying > 0 && typeof toast !== 'undefined') {
      toast.info(`${result.retrying} operation(s) will retry automatically`);
    }
    
    if (result.failed > 0 && typeof toast !== 'undefined') {
      toast.error(`Failed to synchronize ${result.failed} operation(s)`);
      // If there were failures, provide more details
      console.error('Failed operations:', result.failedOperations);
    }
    
    // Then fetch fresh data
    const syncResult = await syncAllData();
    
    if (syncResult.success) {
      if (typeof toast !== 'undefined') {
        toast.success('Data synchronized successfully');
      }
      
      // Store sync information
      await idb.setMetadata('lastFullSync', new Date().toISOString());
      await idb.setMetadata('syncStatus', 'complete');
      
      // Show notification for successful sync
      showNotification('Sync Complete', {
        body: `Synchronized ${result.processed} operations and refreshed data`
      });
    } else {
      if (typeof toast !== 'undefined') {
        toast.error('Failed to synchronize data from server');
      }
      await idb.setMetadata('syncStatus', 'failed');
      
      // Show notification for failed sync
      showNotification('Sync Failed', {
        body: 'Some operations could not be synchronized',
        requireInteraction: true
      });
    }
    
    return {
      ...result,
      dataSync: syncResult.success,
      categories: syncResult.success ? syncResult.categories : 0,
      subcategories: syncResult.success ? syncResult.subcategories : 0,
      tables: syncResult.success ? syncResult.tables : 0,
      tableTypes: syncResult.success ? syncResult.tableTypes : 0
    };
  } catch (error) {
    console.error('Sync initialization failed:', error);
    if (typeof toast !== 'undefined') {
      toast.error('Synchronization failed');
    }
    
    await idb.setMetadata('syncStatus', 'failed');
    await idb.setMetadata('lastSyncError', {
      message: 'Sync initialization failed',
      timestamp: new Date().toISOString(),
      errorMessage: error.message
    });
    
    return {
      success: false,
      processed: 0,
      failed: 0,
      retrying: 0,
      error: error.message
    };
  }
};

/**
* Sets up automatic sync on reconnect
*/
export const setupAutoSync = () => {
  // Skip in non-browser environments
  if (!isBrowser() || setupCompleted) return;
  
  let lastOnlineStatus = safeNavigatorAccess(() => navigator.onLine, true);
  
  window.addEventListener('online', async () => {
    if (!lastOnlineStatus) {
      // Only sync if we were previously offline
      if (typeof toast !== 'undefined') {
        toast.success('Back online. Synchronizing data...');
      }
      
      // Wait a moment for network to stabilize
      setTimeout(async () => {
        const result = await initializeSync();
        
        // If some operations failed, offer manual retry
        if (result.failed > 0) {
          const retryLater = safeWindowAccess(() => 
            window.confirm(`${result.failed} operation(s) failed to sync. Would you like to retry them later?`), 
            false
          );
          
          if (!retryLater) {
            // If user doesn't want to retry later, clear failed operations
            await idb.setMetadata('failedOperations', {});
          }
        }
      }, 1500);
    }
    
    lastOnlineStatus = true;
  });
  
  window.addEventListener('offline', () => {
    lastOnlineStatus = false;
    if (typeof toast !== 'undefined') {
      toast.warning('You are offline. Changes will be saved locally.');
    }
  });
  
  // Register for background sync if available
  if (safeNavigatorAccess(() => 'serviceWorker' in navigator, false)) {
    safeNavigatorAccess(() => navigator.serviceWorker.ready.then(registration => {
      // Check if periodic sync is supported
      if ('periodicSync' in registration) {
        // Register for periodic sync (every 3 hours)
        registration.periodicSync.register('sync-menu-data', {
          minInterval: 3 * 60 * 60 * 1000 // 3 hours
        }).catch(error => {
          console.error('Periodic sync registration failed:', error);
        });
      }
    }), null);
  }
  
  // Initialize sync on load if we're online
  if (safeNavigatorAccess(() => navigator.onLine, true)) {
    idb.getMetadata('syncStatus').then(status => {
      if (status !== 'in-progress') {
        idb.setMetadata('syncStatus', 'in-progress').then(() => {
          // Wait a moment for the app to stabilize
          setTimeout(() => {
            initializeSync().then(() => {
              console.log('Initial sync complete');
            });
          }, 2000);
        });
      }
    });
  }
  
  setupCompleted = true;
};

// Only initialize auto-sync in browser environment
if (isBrowser()) {
  // Wrap in a setTimeout to ensure this runs after module initialization
  setTimeout(() => {
    setupAutoSync();
  }, 0);
}

// Export the main functions
export default {
  processOperation,
  processPendingOperations,
  syncAllData,
  retryFailedOperations,
  initializeSync,
  setupAutoSync
};