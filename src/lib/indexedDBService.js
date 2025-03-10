// src/lib/indexedDBService.js
const DB_NAME = 'MenuManagerOfflineDB';
const DB_VERSION = 1;
const STORES = {
  CATEGORIES: 'categories',
  SUBCATEGORIES: 'subcategories',
  PENDING_OPERATIONS: 'pendingOperations',
  META: 'meta'
};

/**
 * Initialize the IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
        db.createObjectStore(STORES.CATEGORIES, { keyPath: '_id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.SUBCATEGORIES)) {
        db.createObjectStore(STORES.SUBCATEGORIES, { keyPath: '_id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.PENDING_OPERATIONS)) {
        db.createObjectStore(STORES.PENDING_OPERATIONS, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: 'key' });
      }
    };
  });
};

/**
 * Perform a database operation with automatic connection handling
 * @param {string} storeName - Name of the object store
 * @param {string} mode - 'readonly' or 'readwrite'
 * @param {function} callback - Function that will receive the transaction and store
 * @returns {Promise<any>}
 */
const dbOperation = async (storeName, mode, callback) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    
    transaction.oncomplete = () => {
      db.close();
    };
    
    transaction.onerror = (event) => {
      console.error(`Transaction error on ${storeName}:`, event.target.error);
      reject(event.target.error);
    };
    
    try {
      callback(transaction, store, resolve, reject);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Save multiple categories to IndexedDB
 * @param {Array} categories - Array of category objects
 * @returns {Promise<boolean>}
 */
export const saveCategories = async (categories) => {
  try {
    await dbOperation(STORES.CATEGORIES, 'readwrite', (transaction, store, resolve) => {
      // Clear existing categories first
      store.clear();
      
      // Add all categories
      categories.forEach(category => {
        store.add(category);
      });
      
      // Save last sync time
      const metaTransaction = transaction.db.transaction(STORES.META, 'readwrite');
      const metaStore = metaTransaction.objectStore(STORES.META);
      metaStore.put({ key: 'lastCategorySync', value: new Date().toISOString() });
      
      resolve(true);
    });
    return true;
  } catch (error) {
    console.error('Error saving categories to IndexedDB:', error);
    return false;
  }
};

/**
 * Get all categories from IndexedDB
 * @returns {Promise<Array>}
 */
export const getCategories = async () => {
  try {
    return await dbOperation(STORES.CATEGORIES, 'readonly', (transaction, store, resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  } catch (error) {
    console.error('Error getting categories from IndexedDB:', error);
    return [];
  }
};

/**
 * Get a single category by ID
 * @param {string} id - Category ID
 * @returns {Promise<Object|null>}
 */
export const getCategoryById = async (id) => {
  try {
    return await dbOperation(STORES.CATEGORIES, 'readonly', (transaction, store, resolve) => {
      const request = store.get(id);
      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  } catch (error) {
    console.error(`Error getting category ${id} from IndexedDB:`, error);
    return null;
  }
};

/**
 * Update or add a single category
 * @param {Object} category - Category object with _id
 * @returns {Promise<boolean>}
 */
export const updateCategory = async (category) => {
  try {
    await dbOperation(STORES.CATEGORIES, 'readwrite', (transaction, store, resolve) => {
      store.put(category);
      resolve(true);
    });
    return true;
  } catch (error) {
    console.error('Error updating category in IndexedDB:', error);
    return false;
  }
};

/**
 * Delete a category by ID
 * @param {string} id - Category ID
 * @returns {Promise<boolean>}
 */
export const deleteCategory = async (id) => {
  try {
    await dbOperation(STORES.CATEGORIES, 'readwrite', (transaction, store, resolve) => {
      store.delete(id);
      resolve(true);
    });
    return true;
  } catch (error) {
    console.error(`Error deleting category ${id} from IndexedDB:`, error);
    return false;
  }
};

/**
 * Save multiple subcategories to IndexedDB
 * @param {Array} subcategories - Array of subcategory objects
 * @returns {Promise<boolean>}
 */
export const saveSubcategories = async (subcategories) => {
  try {
    await dbOperation(STORES.SUBCATEGORIES, 'readwrite', (transaction, store, resolve) => {
      // Clear existing subcategories
      store.clear();
      
      // Add all subcategories
      subcategories.forEach(subcategory => {
        store.add(subcategory);
      });
      
      // Save last sync time
      const metaTransaction = transaction.db.transaction(STORES.META, 'readwrite');
      const metaStore = metaTransaction.objectStore(STORES.META);
      metaStore.put({ key: 'lastSubcategorySync', value: new Date().toISOString() });
      
      resolve(true);
    });
    return true;
  } catch (error) {
    console.error('Error saving subcategories to IndexedDB:', error);
    return false;
  }
};

/**
 * Get all subcategories from IndexedDB
 * @returns {Promise<Array>}
 */
export const getSubcategories = async () => {
  try {
    return await dbOperation(STORES.SUBCATEGORIES, 'readonly', (transaction, store, resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  } catch (error) {
    console.error('Error getting subcategories from IndexedDB:', error);
    return [];
  }
};

/**
 * Get subcategories filtered by category ID
 * @param {string} categoryId - Category ID to filter by
 * @returns {Promise<Array>}
 */
export const getSubcategoriesByCategory = async (categoryId) => {
  try {
    const subcategories = await getSubcategories();
    if (!categoryId) return subcategories;
    
    return subcategories.filter(sc => 
      sc.category === categoryId || 
      (sc.category && sc.category._id === categoryId)
    );
  } catch (error) {
    console.error('Error filtering subcategories by category:', error);
    return [];
  }
};

/**
 * Get a single subcategory by ID
 * @param {string} id - Subcategory ID
 * @returns {Promise<Object|null>}
 */
export const getSubcategoryById = async (id) => {
  try {
    return await dbOperation(STORES.SUBCATEGORIES, 'readonly', (transaction, store, resolve) => {
      const request = store.get(id);
      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  } catch (error) {
    console.error(`Error getting subcategory ${id} from IndexedDB:`, error);
    return null;
  }
};

/**
 * Update or add a single subcategory
 * @param {Object} subcategory - Subcategory object with _id
 * @returns {Promise<boolean>}
 */
export const updateSubcategory = async (subcategory) => {
  try {
    await dbOperation(STORES.SUBCATEGORIES, 'readwrite', (transaction, store, resolve) => {
      store.put(subcategory);
      resolve(true);
    });
    return true;
  } catch (error) {
    console.error('Error updating subcategory in IndexedDB:', error);
    return false;
  }
};

/**
 * Delete a subcategory by ID
 * @param {string} id - Subcategory ID
 * @returns {Promise<boolean>}
 */
export const deleteSubcategory = async (id) => {
  try {
    await dbOperation(STORES.SUBCATEGORIES, 'readwrite', (transaction, store, resolve) => {
      store.delete(id);
      resolve(true);
    });
    return true;
  } catch (error) {
    console.error(`Error deleting subcategory ${id} from IndexedDB:`, error);
    return false;
  }
};

/**
 * Queue an operation for when back online
 * @param {Object} operation - Operation object
 * @returns {Promise<boolean>}
 */
export const queueOperation = async (operation) => {
  try {
    await dbOperation(STORES.PENDING_OPERATIONS, 'readwrite', (transaction, store, resolve) => {
      const enhancedOperation = {
        ...operation,
        timestamp: new Date().toISOString()
      };
      store.add(enhancedOperation);
      resolve(true);
    });
    return true;
  } catch (error) {
    console.error('Error queueing operation in IndexedDB:', error);
    return false;
  }
};

/**
 * Get all pending operations
 * @returns {Promise<Array>}
 */
export const getPendingOperations = async () => {
  try {
    return await dbOperation(STORES.PENDING_OPERATIONS, 'readonly', (transaction, store, resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  } catch (error) {
    console.error('Error getting pending operations from IndexedDB:', error);
    return [];
  }
};

/**
 * Clear a completed operation
 * @param {string} operationId - Operation ID
 * @returns {Promise<boolean>}
 */
export const clearOperation = async (operationId) => {
  try {
    await dbOperation(STORES.PENDING_OPERATIONS, 'readwrite', (transaction, store, resolve) => {
      store.delete(operationId);
      resolve(true);
    });
    return true;
  } catch (error) {
    console.error(`Error clearing operation ${operationId} from IndexedDB:`, error);
    return false;
  }
};

/**
 * Get last sync time
 * @param {string} type - 'category' or 'subcategory'
 * @returns {Promise<string|null>}
 */
export const getLastSyncTime = async (type = 'category') => {
  try {
    const key = type === 'category' ? 'lastCategorySync' : 'lastSubcategorySync';
    return await dbOperation(STORES.META, 'readonly', (transaction, store, resolve) => {
      const request = store.get(key);
      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null);
      };
    });
  } catch (error) {
    console.error(`Error getting ${type} last sync time from IndexedDB:`, error);
    return null;
  }
};

/**
 * Save metadata value
 * @param {string} key - Metadata key
 * @param {any} value - Metadata value
 * @returns {Promise<boolean>}
 */
export const setMetadata = async (key, value) => {
  try {
    await dbOperation(STORES.META, 'readwrite', (transaction, store, resolve) => {
      store.put({ key, value });
      resolve(true);
    });
    return true;
  } catch (error) {
    console.error(`Error saving metadata ${key} to IndexedDB:`, error);
    return false;
  }
};

/**
 * Get metadata value
 * @param {string} key - Metadata key
 * @returns {Promise<any|null>}
 */
export const getMetadata = async (key) => {
  try {
    return await dbOperation(STORES.META, 'readonly', (transaction, store, resolve) => {
      const request = store.get(key);
      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null);
      };
    });
  } catch (error) {
    console.error(`Error getting metadata ${key} from IndexedDB:`, error);
    return null;
  }
};

/**
 * Get subcategories with populated category data
 * This merges the category data into the subcategory objects
 * @returns {Promise<Array>}
 */
export const getSubcategoriesWithCategories = async () => {
  try {
    const subcategories = await getSubcategories();
    const categories = await getCategories();
    
    // Create a map of categories by ID for faster lookup
    const categoryMap = categories.reduce((map, category) => {
      map[category._id] = category;
      return map;
    }, {});
    
    // Populate the category field for each subcategory
    return subcategories.map(subcategory => {
      // If category is just an ID string
      if (typeof subcategory.category === 'string') {
        return {
          ...subcategory,
          category: categoryMap[subcategory.category] || subcategory.category
        };
      }
      // If category is already an object but might not have all properties
      else if (subcategory.category && subcategory.category._id) {
        const fullCategory = categoryMap[subcategory.category._id];
        if (fullCategory) {
          return {
            ...subcategory,
            category: fullCategory
          };
        }
      }
      
      // Return as-is if no matching category found
      return subcategory;
    });
  } catch (error) {
    console.error('Error getting subcategories with categories:', error);
    return await getSubcategories();
  }
};

/**
 * Search subcategories by name
 * @param {string} query - Search query
 * @returns {Promise<Array>}
 */
export const searchSubcategories = async (query) => {
  if (!query || query.trim() === '') {
    return await getSubcategories();
  }
  
  try {
    const subcategories = await getSubcategories();
    const searchTerm = query.trim().toLowerCase();
    
    return subcategories.filter(subcategory => 
      subcategory.subCategoryName.toLowerCase().includes(searchTerm)
    );
  } catch (error) {
    console.error('Error searching subcategories:', error);
    return [];
  }
};

/**
 * Get subcategories that might have sync conflicts
 * This finds subcategories that have been modified both locally and on the server
 * @param {Array} serverSubcategories - Subcategories from the server
 * @returns {Promise<Array>} - Array of potential conflicts
 */
export const detectSubcategoryConflicts = async (serverSubcategories) => {
  try {
    const localSubcategories = await getSubcategories();
    const conflicts = [];
    
    // Create maps for faster lookups
    const serverMap = serverSubcategories.reduce((map, sc) => {
      map[sc._id] = sc;
      return map;
    }, {});
    
    const localMap = localSubcategories.reduce((map, sc) => {
      map[sc._id] = sc;
      return map;
    }, {});
    
    // Check for updates to the same subcategory
    for (const localSc of localSubcategories) {
      // Skip temporary subcategories
      if (localSc.isTemp) continue;
      
      const serverSc = serverMap[localSc._id];
      if (serverSc) {
        // Compare updatedAt timestamps if available
        const localUpdated = localSc.updatedAt ? new Date(localSc.updatedAt) : null;
        const serverUpdated = serverSc.updatedAt ? new Date(serverSc.updatedAt) : null;
        
        // If both have valid timestamps and were updated after the last sync
        if (localUpdated && serverUpdated) {
          const lastSync = await getLastSyncTime('subcategory');
          const lastSyncDate = lastSync ? new Date(lastSync) : null;
          
          if (lastSyncDate && localUpdated > lastSyncDate && serverUpdated > lastSyncDate) {
            // Potential conflict - both were updated since last sync
            conflicts.push({
              type: 'UPDATE_SUBCATEGORY',
              id: localSc._id,
              localData: localSc,
              serverData: serverSc,
              endpoint: '/api/menu/subcategories'
            });
          }
        }
      }
    }
    
    // Check for local temp subcategories that might conflict with server ones
    for (const localSc of localSubcategories) {
      if (localSc.isTemp) {
        // Look for server subcategories with the same name
        const matchingServerSc = serverSubcategories.find(
          sc => sc.subCategoryName.toLowerCase() === localSc.subCategoryName.toLowerCase()
        );
        
        if (matchingServerSc) {
          conflicts.push({
            type: 'CREATE_SUBCATEGORY',
            tempId: localSc._id,
            localData: localSc,
            serverData: matchingServerSc,
            endpoint: '/api/menu/subcategories'
          });
        }
      }
    }
    
    return conflicts;
  } catch (error) {
    console.error('Error detecting subcategory conflicts:', error);
    return [];
  }
};

/**
 * Get categories that might have sync conflicts
 * This finds categories that have been modified both locally and on the server
 * @param {Array} serverCategories - Categories from the server
 * @returns {Promise<Array>} - Array of potential conflicts
 */
export const detectCategoryConflicts = async (serverCategories) => {
  try {
    const localCategories = await getCategories();
    const conflicts = [];
    
    // Create maps for faster lookups
    const serverMap = serverCategories.reduce((map, cat) => {
      map[cat._id] = cat;
      return map;
    }, {});
    
    const localMap = localCategories.reduce((map, cat) => {
      map[cat._id] = cat;
      return map;
    }, {});
    
    // Check for updates to the same category
    for (const localCat of localCategories) {
      // Skip temporary categories
      if (localCat.isTemp) continue;
      
      const serverCat = serverMap[localCat._id];
      if (serverCat) {
        // Compare updatedAt timestamps if available
        const localUpdated = localCat.updatedAt ? new Date(localCat.updatedAt) : null;
        const serverUpdated = serverCat.updatedAt ? new Date(serverCat.updatedAt) : null;
        
        // If both have valid timestamps and were updated after the last sync
        if (localUpdated && serverUpdated) {
          const lastSync = await getLastSyncTime('category');
          const lastSyncDate = lastSync ? new Date(lastSync) : null;
          
          if (lastSyncDate && localUpdated > lastSyncDate && serverUpdated > lastSyncDate) {
            // Potential conflict - both were updated since last sync
            conflicts.push({
              type: 'UPDATE_CATEGORY',
              id: localCat._id,
              localData: localCat,
              serverData: serverCat,
              endpoint: '/api/menu/categories'
            });
          }
        }
      }
    }
    
    // Check for local temp categories that might conflict with server ones
    for (const localCat of localCategories) {
      if (localCat.isTemp) {
        // Look for server categories with the same name
        const matchingServerCat = serverCategories.find(
          cat => cat.categoryName.toLowerCase() === localCat.categoryName.toLowerCase()
        );
        
        if (matchingServerCat) {
          conflicts.push({
            type: 'CREATE_CATEGORY',
            tempId: localCat._id,
            localData: localCat,
            serverData: matchingServerCat,
            endpoint: '/api/menu/categories'
          });
        }
      }
    }
    
    return conflicts;
  } catch (error) {
    console.error('Error detecting category conflicts:', error);
    return [];
  }
};