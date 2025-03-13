import { isBrowser } from './browserCheck';

const DB_NAME = 'MenuManagerOfflineDB';
const DB_VERSION = 4; // Increment DB version for schema update
const STORES = {
  CATEGORIES: 'categories',
  SUBCATEGORIES: 'subcategories',
  TABLES: 'tables',
  TABLE_TYPES: 'tableTypes',
  DISHES: 'dishes',            // New store
  VARIANTS: 'variants',        // New store
  PENDING_OPERATIONS: 'pendingOperations',
  META: 'meta'
};

// Server-side fallback implementations
const serverSideFallbacks = {
  // Fallback that returns empty array
  getEmptyArray: async () => [],
  // Fallback that returns null
  getNull: async () => null,
  // Fallback that returns success=true
  getSuccess: async () => ({ success: true }),
  // Fallback for boolean operations
  getBoolean: async () => true,
};

/**
 * Initialize the IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */

export const initDB = () => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
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
      console.log(`Upgrading IndexedDB from version ${event.oldVersion} to ${event.newVersion}`);
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
        console.log('Creating categories store');
        db.createObjectStore(STORES.CATEGORIES, { keyPath: '_id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.SUBCATEGORIES)) {
        console.log('Creating subcategories store');
        db.createObjectStore(STORES.SUBCATEGORIES, { keyPath: '_id' });
      }
      
      // Create stores for tables and table types
      if (!db.objectStoreNames.contains(STORES.TABLES)) {
        console.log('Creating tables store');
        db.createObjectStore(STORES.TABLES, { keyPath: '_id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.TABLE_TYPES)) {
        console.log('Creating tableTypes store');
        db.createObjectStore(STORES.TABLE_TYPES, { keyPath: '_id' });
      }

      if (!db.objectStoreNames.contains(STORES.DISHES)) {
        console.log('Creating dishes store');
        db.createObjectStore(STORES.DISHES, { keyPath: '_id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.VARIANTS)) {
        console.log('Creating variants store');
        db.createObjectStore(STORES.VARIANTS, { keyPath: '_id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.PENDING_OPERATIONS)) {
        console.log('Creating pendingOperations store');
        db.createObjectStore(STORES.PENDING_OPERATIONS, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.META)) {
        console.log('Creating meta store');
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
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
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
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
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
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
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
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
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
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
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
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
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
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
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
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
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
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
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
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
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
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
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
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
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
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
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
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
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
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
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
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
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
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
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
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
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
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
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
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
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
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
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
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
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

/**
 * Save multiple tables to IndexedDB
 * @param {Array} tables - Array of table objects
 * @returns {Promise<boolean>}
 */
export const saveTables = async (tables) => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    await dbOperation(STORES.TABLES, 'readwrite', (transaction, store, resolve) => {
      // Clear existing tables first
      store.clear();
      // Add all tables
      tables.forEach(table => {
        store.add(table);
      });
      // Save last sync time
      const metaTransaction = transaction.db.transaction(STORES.META, 'readwrite');
      const metaStore = metaTransaction.objectStore(STORES.META);
      metaStore.put({ key: 'lastTableSync', value: new Date().toISOString() });
      resolve(true);
    });
    console.log(`Saved ${tables.length} tables to IndexedDB`);
    return true;
  } catch (error) {
    console.error('Error saving tables to IndexedDB:', error);
    return false;
  }
};

/**
 * Get all tables from IndexedDB
 * @returns {Promise<Array>}
 */
export const getTables = async () => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    const result = await dbOperation(STORES.TABLES, 'readonly', (transaction, store, resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result);
      };
    });
    console.log(`Retrieved ${result?.length || 0} tables from IndexedDB`);
    return result || [];
  } catch (error) {
    console.error('Error getting tables from IndexedDB:', error);
    return [];
  }
};

/**
 * Get a single table by ID
 * @param {string} id - Table ID
 * @returns {Promise<Object|null>}
 */
export const getTableById = async (id) => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    return await dbOperation(STORES.TABLES, 'readonly', (transaction, store, resolve) => {
      const request = store.get(id);
      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  } catch (error) {
    console.error(`Error getting table ${id} from IndexedDB:`, error);
    return null;
  }
};

/**
 * Get tables filtered by type ID
 * @param {string} typeId - Type ID to filter by
 * @returns {Promise<Array>}
 */
export const getTablesByType = async (typeId) => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    const tables = await getTables();
    if (!typeId) return tables;
    return tables.filter(table => 
      table.tableType === typeId || 
      (table.tableType && table.tableType._id === typeId)
    );
  } catch (error) {
    console.error('Error filtering tables by type:', error);
    return [];
  }
};

/**
 * Update or add a single table
 * @param {Object} table - Table object with _id
 * @returns {Promise<boolean>}
 */
export const updateTable = async (table) => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    await dbOperation(STORES.TABLES, 'readwrite', (transaction, store, resolve) => {
      store.put(table);
      resolve(true);
    });
    return true;
  } catch (error) {
    console.error('Error updating table in IndexedDB:', error);
    return false;
  }
};

/**
 * Delete a table by ID
 * @param {string} id - Table ID
 * @returns {Promise<boolean>}
 */
export const deleteTable = async (id) => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    await dbOperation(STORES.TABLES, 'readwrite', (transaction, store, resolve) => {
      store.delete(id);
      resolve(true);
    });
    return true;
  } catch (error) {
    console.error(`Error deleting table ${id} from IndexedDB:`, error);
    return false;
  }
};

/**
 * Save multiple table types to IndexedDB
 * @param {Array} tableTypes - Array of table type objects
 * @returns {Promise<boolean>}
 */
export const saveTableTypes = async (tableTypes) => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    await dbOperation(STORES.TABLE_TYPES, 'readwrite', (transaction, store, resolve) => {
      // Clear existing table types
      store.clear();
      // Add all table types
      tableTypes.forEach(tableType => {
        store.add(tableType);
      });
      // Save last sync time
      const metaTransaction = transaction.db.transaction(STORES.META, 'readwrite');
      const metaStore = metaTransaction.objectStore(STORES.META);
      metaStore.put({ key: 'lastTableTypeSync', value: new Date().toISOString() });
      resolve(true);
    });
    console.log(`Saved ${tableTypes.length} table types to IndexedDB`);
    return true;
  } catch (error) {
    console.error('Error saving table types to IndexedDB:', error);
    return false;
  }
};

/**
 * Get all table types from IndexedDB
 * @returns {Promise<Array>}
 */
export const getTableTypes = async () => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    const result = await dbOperation(STORES.TABLE_TYPES, 'readonly', (transaction, store, resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result);
      };
    });
    console.log(`Retrieved ${result?.length || 0} table types from IndexedDB`);
    return result || [];
  } catch (error) {
    console.error('Error getting table types from IndexedDB:', error);
    return [];
  }
};

/**
 * Get a single table type by ID
 * @param {string} id - Table type ID
 * @returns {Promise<Object|null>}
 */
export const getTableTypeById = async (id) => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    return await dbOperation(STORES.TABLE_TYPES, 'readonly', (transaction, store, resolve) => {
      const request = store.get(id);
      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  } catch (error) {
    console.error(`Error getting table type ${id} from IndexedDB:`, error);
    return null;
  }
};

/**
 * Update or add a single table type
 * @param {Object} tableType - Table type object with _id
 * @returns {Promise<boolean>}
 */
export const updateTableType = async (tableType) => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    await dbOperation(STORES.TABLE_TYPES, 'readwrite', (transaction, store, resolve) => {
      store.put(tableType);
      resolve(true);
    });
    return true;
  } catch (error) {
    console.error('Error updating table type in IndexedDB:', error);
    return false;
  }
};

/**
 * Delete a table type by ID
 * @param {string} id - Table type ID
 * @returns {Promise<boolean>}
 */
export const deleteTableType = async (id) => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    await dbOperation(STORES.TABLE_TYPES, 'readwrite', (transaction, store, resolve) => {
      store.delete(id);
      resolve(true);
    });
    return true;
  } catch (error) {
    console.error(`Error deleting table type ${id} from IndexedDB:`, error);
    return false;
  }
};

/**
 * Get tables with populated table type data
 * This merges the table type data into the table objects
 * @returns {Promise<Array>}
 */
export const getTablesWithTableTypes = async () => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    const tables = await getTables();
    const tableTypes = await getTableTypes();
    
    // Create a map of table types by ID for faster lookup
    const tableTypeMap = tableTypes.reduce((map, tableType) => {
      map[tableType._id] = tableType;
      return map;
    }, {});
    
    // Populate the tableType field for each table
    return tables.map(table => {
      // If tableType is just an ID string
      if (typeof table.tableType === 'string') {
        return {
          ...table,
          tableType: tableTypeMap[table.tableType] || table.tableType
        };
      }
      // If tableType is already an object but might not have all properties
      else if (table.tableType && table.tableType._id) {
        const fullTableType = tableTypeMap[table.tableType._id];
        if (fullTableType) {
          return {
            ...table,
            tableType: fullTableType
          };
        }
      }
      // Return as-is if no matching table type found
      return table;
    });
  } catch (error) {
    console.error('Error getting tables with table types:', error);
    return await getTables();
  }
};

/**
 * Get last sync time for tables or table types
 * @param {string} type - 'table' or 'tableType'
 * @returns {Promise<string|null>}
 */
export const getTableLastSyncTime = async (type = 'table') => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    const key = type === 'table' ? 'lastTableSync' : 'lastTableTypeSync';
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
 * Detect conflicts for tables
 * @param {Array} serverTables - Tables from the server
 * @returns {Promise<Array>} - Array of potential conflicts
 */
export const detectTableConflicts = async (serverTables) => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    const localTables = await getTables();
    const conflicts = [];
    
    // Create maps for faster lookups
    const serverMap = serverTables.reduce((map, table) => {
      map[table._id] = table;
      return map;
    }, {});
    
    const localMap = localTables.reduce((map, table) => {
      map[table._id] = table;
      return map;
    }, {});
    
    // Check for updates to the same table
    for (const localTable of localTables) {
      // Skip temporary tables
      if (localTable.isTemp) continue;
      
      const serverTable = serverMap[localTable._id];
      if (serverTable) {
        // Compare updatedAt timestamps if available
        const localUpdated = localTable.updatedAt ? new Date(localTable.updatedAt) : null;
        const serverUpdated = serverTable.updatedAt ? new Date(serverTable.updatedAt) : null;
        
        // If both have valid timestamps and were updated after the last sync
        if (localUpdated && serverUpdated) {
          const lastSync = await getTableLastSyncTime('table');
          const lastSyncDate = lastSync ? new Date(lastSync) : null;
          
          if (lastSyncDate && localUpdated > lastSyncDate && serverUpdated > lastSyncDate) {
            // Potential conflict - both were updated since last sync
            conflicts.push({
              type: 'UPDATE_TABLE',
              id: localTable._id,
              localData: localTable,
              serverData: serverTable,
              endpoint: '/api/tables'
            });
          }
        }
      }
    }
    
    // Check for local temp tables that might conflict with server ones
    for (const localTable of localTables) {
      if (localTable.isTemp) {
        // Look for server tables with the same name
        const matchingServerTable = serverTables.find(
          t => t.tableName.toLowerCase() === localTable.tableName.toLowerCase()
        );
        
        if (matchingServerTable) {
          conflicts.push({
            type: 'CREATE_TABLE',
            tempId: localTable._id,
            localData: localTable,
            serverData: matchingServerTable,
            endpoint: '/api/tables'
          });
        }
      }
    }
    
    return conflicts;
  } catch (error) {
    console.error('Error detecting table conflicts:', error);
    return [];
  }
};

/**
 * Detect conflicts for table types
 * @param {Array} serverTableTypes - Table types from the server
 * @returns {Promise<Array>} - Array of potential conflicts
 */
export const detectTableTypeConflicts = async (serverTableTypes) => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    const localTableTypes = await getTableTypes();
    const conflicts = [];
    
    // Create maps for faster lookups
    const serverMap = serverTableTypes.reduce((map, type) => {
      map[type._id] = type;
      return map;
    }, {});
    
    const localMap = localTableTypes.reduce((map, type) => {
      map[type._id] = type;
      return map;
    }, {});
    
    // Check for updates to the same table type
    for (const localType of localTableTypes) {
      // Skip temporary table types
      if (localType.isTemp) continue;
      
      const serverType = serverMap[localType._id];
      if (serverType) {
        // Compare updatedAt timestamps if available
        const localUpdated = localType.updatedAt ? new Date(localType.updatedAt) : null;
        const serverUpdated = serverType.updatedAt ? new Date(serverType.updatedAt) : null;
        
        // If both have valid timestamps and were updated after the last sync
        if (localUpdated && serverUpdated) {
          const lastSync = await getTableLastSyncTime('tableType');
          const lastSyncDate = lastSync ? new Date(lastSync) : null;
          
          if (lastSyncDate && localUpdated > lastSyncDate && serverUpdated > lastSyncDate) {
            // Potential conflict - both were updated since last sync
            conflicts.push({
              type: 'UPDATE_TABLE_TYPE',
              id: localType._id,
              localData: localType,
              serverData: serverType,
              endpoint: '/api/tables/types'
            });
          }
        }
      }
    }
    
    // Check for local temp table types that might conflict with server ones
    for (const localType of localTableTypes) {
      if (localType.isTemp) {
        // Look for server table types with the same name
        const matchingServerType = serverTableTypes.find(
          t => t.tableTypeName.toLowerCase() === localType.tableTypeName.toLowerCase()
        );
        
        if (matchingServerType) {
          conflicts.push({
            type: 'CREATE_TABLE_TYPE',
            tempId: localType._id,
            localData: localType,
            serverData: matchingServerType,
            endpoint: '/api/tables/types'
          });
        }
      }
    }
    
    return conflicts;
  } catch (error) {
    console.error('Error detecting table type conflicts:', error);
    return [];
  }
};

/**
 * Force a reset of the database to ensure proper schema
 * @returns {Promise<Object>} Result object with success status
 */
export const resetAndInitDB = async () => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    // Close any open connections
    const dbs = await window.indexedDB.databases();
    for (const db of dbs) {
      if (db.name === DB_NAME) {
        await window.indexedDB.deleteDatabase(DB_NAME);
        console.log("Deleted existing database to force schema update");
        break;
      }
    }
    
    // Initialize with new schema
    const db = await initDB();
    console.log("Database initialized with new schema");
    
    // Initialize meta data
    const transaction = db.transaction(STORES.META, 'readwrite');
    const store = transaction.objectStore(STORES.META);
    
    // Set schema version
    store.put({ key: 'schemaVersion', value: DB_VERSION });
    store.put({ key: 'lastSchemaUpdate', value: new Date().toISOString() });
    
    return { success: true, message: "Database reset and initialized successfully" };
  } catch (error) {
    console.error("Error resetting database:", error);
    return { success: false, error };
  }
};

/**
 * Save multiple dishes to IndexedDB
 * @param {Array} dishes - Array of dish objects
 * @returns {Promise<boolean>}
 */
export const saveDishes = async (dishes) => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    await dbOperation(STORES.DISHES, 'readwrite', (transaction, store, resolve) => {
      // Clear existing dishes first
      store.clear();
      // Add all dishes
      dishes.forEach(dish => {
        store.add(dish);
      });
      // Save last sync time
      const metaTransaction = transaction.db.transaction(STORES.META, 'readwrite');
      const metaStore = metaTransaction.objectStore(STORES.META);
      metaStore.put({ key: 'lastDishSync', value: new Date().toISOString() });
      resolve(true);
    });
    return true;
  } catch (error) {
    console.error('Error saving dishes to IndexedDB:', error);
    return false;
  }
};

/**
 * Get all dishes from IndexedDB
 * @returns {Promise<Array>}
 */
export const getDishes = async () => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    return await dbOperation(STORES.DISHES, 'readonly', (transaction, store, resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  } catch (error) {
    console.error('Error getting dishes from IndexedDB:', error);
    return [];
  }
};

/**
 * Get a single dish by ID
 * @param {string} id - Dish ID
 * @returns {Promise<Object|null>}
 */
export const getDishById = async (id) => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    return await dbOperation(STORES.DISHES, 'readonly', (transaction, store, resolve) => {
      const request = store.get(id);
      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  } catch (error) {
    console.error(`Error getting dish ${id} from IndexedDB:`, error);
    return null;
  }
};

/**
 * Update or add a single dish
 * @param {Object} dish - Dish object with _id
 * @returns {Promise<boolean>}
 */
export const updateDish = async (dish) => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    await dbOperation(STORES.DISHES, 'readwrite', (transaction, store, resolve) => {
      store.put(dish);
      resolve(true);
    });
    return true;
  } catch (error) {
    console.error('Error updating dish in IndexedDB:', error);
    return false;
  }
};

/**
 * Delete a dish by ID
 * @param {string} id - Dish ID
 * @returns {Promise<boolean>}
 */
export const deleteDish = async (id) => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    await dbOperation(STORES.DISHES, 'readwrite', (transaction, store, resolve) => {
      store.delete(id);
      resolve(true);
    });
    return true;
  } catch (error) {
    console.error(`Error deleting dish ${id} from IndexedDB:`, error);
    return false;
  }
};

/**
 * Get dishes filtered by subcategory ID
 * @param {string} subcategoryId - Subcategory ID to filter by
 * @returns {Promise<Array>}
 */
export const getDishesBySubcategory = async (subcategoryId) => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    const dishes = await getDishes();
    if (!subcategoryId) return dishes;
    
    return dishes.filter(dish => {
      // Check if dish has the subcategory in its subCategory array
      if (!dish.subCategory) return false;
      
      // Handle if subCategory is an array of objects or array of strings
      return dish.subCategory.some(sc => {
        return (typeof sc === 'object') ? sc._id === subcategoryId : sc === subcategoryId;
      });
    });
  } catch (error) {
    console.error('Error filtering dishes by subcategory:', error);
    return [];
  }
};

/**
 * Search dishes by name or description
 * @param {string} query - Search query
 * @returns {Promise<Array>}
 */
export const searchDishes = async (query) => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  if (!query || query.trim() === '') {
    return await getDishes();
  }
  
  try {
    const dishes = await getDishes();
    const searchTerm = query.trim().toLowerCase();
    
    return dishes.filter(dish => 
      dish.dishName.toLowerCase().includes(searchTerm) ||
      (dish.description && dish.description.toLowerCase().includes(searchTerm))
    );
  } catch (error) {
    console.error('Error searching dishes:', error);
    return [];
  }
};

/**
 * Get last sync time for dishes
 * @returns {Promise<string|null>}
 */
export const getDishLastSyncTime = async () => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    return await dbOperation(STORES.META, 'readonly', (transaction, store, resolve) => {
      const request = store.get('lastDishSync');
      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null);
      };
    });
  } catch (error) {
    console.error('Error getting dish last sync time from IndexedDB:', error);
    return null;
  }
};

// Variant-related functions

/**
 * Save multiple variants to IndexedDB
 * @param {Array} variants - Array of variant objects
 * @returns {Promise<boolean>}
 */
export const saveVariants = async (variants) => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    await dbOperation(STORES.VARIANTS, 'readwrite', (transaction, store, resolve) => {
      // Clear existing variants
      store.clear();
      // Add all variants
      variants.forEach(variant => {
        store.add(variant);
      });
      // Save last sync time
      const metaTransaction = transaction.db.transaction(STORES.META, 'readwrite');
      const metaStore = metaTransaction.objectStore(STORES.META);
      metaStore.put({ key: 'lastVariantSync', value: new Date().toISOString() });
      resolve(true);
    });
    return true;
  } catch (error) {
    console.error('Error saving variants to IndexedDB:', error);
    return false;
  }
};

/**
 * Get all variants from IndexedDB
 * @returns {Promise<Array>}
 */
export const getVariants = async () => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    return await dbOperation(STORES.VARIANTS, 'readonly', (transaction, store, resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  } catch (error) {
    console.error('Error getting variants from IndexedDB:', error);
    return [];
  }
};

/**
 * Get variants for a specific dish
 * @param {string} dishId - Dish ID
 * @returns {Promise<Array>}
 */
export const getVariantsByDish = async (dishId) => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    const variants = await getVariants();
    return variants.filter(variant => 
      variant.dishReference === dishId || 
      (variant.dishReference && variant.dishReference._id === dishId)
    );
  } catch (error) {
    console.error(`Error getting variants for dish ${dishId}:`, error);
    return [];
  }
};

/**
 * Get a single variant by ID
 * @param {string} id - Variant ID
 * @returns {Promise<Object|null>}
 */
export const getVariantById = async (id) => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    return await dbOperation(STORES.VARIANTS, 'readonly', (transaction, store, resolve) => {
      const request = store.get(id);
      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  } catch (error) {
    console.error(`Error getting variant ${id} from IndexedDB:`, error);
    return null;
  }
};

/**
 * Update or add a single variant
 * @param {Object} variant - Variant object with _id
 * @returns {Promise<boolean>}
 */
export const updateVariant = async (variant) => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    await dbOperation(STORES.VARIANTS, 'readwrite', (transaction, store, resolve) => {
      store.put(variant);
      resolve(true);
    });
    return true;
  } catch (error) {
    console.error('Error updating variant in IndexedDB:', error);
    return false;
  }
};

/**
 * Delete a variant by ID
 * @param {string} id - Variant ID
 * @returns {Promise<boolean>}
 */
export const deleteVariant = async (id) => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    await dbOperation(STORES.VARIANTS, 'readwrite', (transaction, store, resolve) => {
      store.delete(id);
      resolve(true);
    });
    return true;
  } catch (error) {
    console.error(`Error deleting variant ${id} from IndexedDB:`, error);
    return false;
  }
};

/**
 * Get last sync time for variants
 * @returns {Promise<string|null>}
 */
export const getVariantLastSyncTime = async () => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    return await dbOperation(STORES.META, 'readonly', (transaction, store, resolve) => {
      const request = store.get('lastVariantSync');
      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null);
      };
    });
  } catch (error) {
    console.error('Error getting variant last sync time from IndexedDB:', error);
    return null;
  }
};

/**
 * Detect conflicts between local and server dishes
 * @param {Array} serverDishes - Dishes from the server
 * @returns {Promise<Array>} - Array of potential conflicts
 */
export const detectDishConflicts = async (serverDishes) => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    const localDishes = await getDishes();
    const conflicts = [];
    
    // Create maps for faster lookups
    const serverMap = serverDishes.reduce((map, dish) => {
      map[dish._id] = dish;
      return map;
    }, {});
    
    // Check for updates to the same dish
    for (const localDish of localDishes) {
      // Skip temporary dishes
      if (localDish.isTemp) continue;
      
      const serverDish = serverMap[localDish._id];
      if (serverDish) {
        // Compare updatedAt timestamps if available
        const localUpdated = localDish.updatedAt ? new Date(localDish.updatedAt) : null;
        const serverUpdated = serverDish.updatedAt ? new Date(serverDish.updatedAt) : null;
        
        // If both have valid timestamps and were updated after the last sync
        if (localUpdated && serverUpdated) {
          const lastSync = await getDishLastSyncTime();
          const lastSyncDate = lastSync ? new Date(lastSync) : null;
          
          if (lastSyncDate && localUpdated > lastSyncDate && serverUpdated > lastSyncDate) {
            // Potential conflict - both were updated since last sync
            conflicts.push({
              type: 'UPDATE_DISH',
              id: localDish._id,
              localData: localDish,
              serverData: serverDish,
              endpoint: '/api/menu/dishes'
            });
          }
        }
      }
    }
    
    // Check for local temp dishes that might conflict with server ones
    for (const localDish of localDishes) {
      if (localDish.isTemp) {
        // Look for server dishes with the same name
        const matchingServerDish = serverDishes.find(
          dish => dish.dishName.toLowerCase() === localDish.dishName.toLowerCase()
        );
        
        if (matchingServerDish) {
          conflicts.push({
            type: 'CREATE_DISH',
            tempId: localDish._id,
            localData: localDish,
            serverData: matchingServerDish,
            endpoint: '/api/menu/dishes'
          });
        }
      }
    }
    
    return conflicts;
  } catch (error) {
    console.error('Error detecting dish conflicts:', error);
    return [];
  }
};

/**
 * Detect conflicts between local and server variants
 * @param {Array} serverVariants - Variants from the server
 * @returns {Promise<Array>} - Array of potential conflicts
 */
export const detectVariantConflicts = async (serverVariants) => {
    // Skip IndexedDB operations on the server
    if (!isBrowser()) {
      return Promise.resolve(null);
    }
  try {
    const localVariants = await getVariants();
    const conflicts = [];
    
    // Create maps for faster lookups
    const serverMap = serverVariants.reduce((map, variant) => {
      map[variant._id] = variant;
      return map;
    }, {});
    
    // Check for updates to the same variant
    for (const localVariant of localVariants) {
      // Skip temporary variants
      if (localVariant.isTemp) continue;
      
      const serverVariant = serverMap[localVariant._id];
      if (serverVariant) {
        // Compare updatedAt timestamps
        const localUpdated = localVariant.updatedAt ? new Date(localVariant.updatedAt) : null;
        const serverUpdated = serverVariant.updatedAt ? new Date(serverVariant.updatedAt) : null;
        
        if (localUpdated && serverUpdated) {
          const lastSync = await getVariantLastSyncTime();
          const lastSyncDate = lastSync ? new Date(lastSync) : null;
          
          if (lastSyncDate && localUpdated > lastSyncDate && serverUpdated > lastSyncDate) {
            conflicts.push({
              type: 'UPDATE_VARIANT',
              id: localVariant._id,
              localData: localVariant,
              serverData: serverVariant,
              endpoint: '/api/menu/variants'
            });
          }
        }
      }
    }
    
    // Check for local temp variants that might conflict with server ones
    for (const localVariant of localVariants) {
      if (localVariant.isTemp) {
        const matchingServerVariant = serverVariants.find(
          variant => variant.variantName.toLowerCase() === localVariant.variantName.toLowerCase() &&
                     variant.dishReference === localVariant.dishReference
        );
        
        if (matchingServerVariant) {
          conflicts.push({
            type: 'CREATE_VARIANT',
            tempId: localVariant._id,
            localData: localVariant,
            serverData: matchingServerVariant,
            endpoint: '/api/menu/variants'
          });
        }
      }
    }
    
    return conflicts;
  } catch (error) {
    console.error('Error detecting variant conflicts:', error);
    return [];
  }
};