import * as idb from './indexedDBService';

// Set up schema version tracking
const CURRENT_SCHEMA_VERSION = 3; // Increment this when schema changes

// Migration steps for each version
const MIGRATION_STEPS = {
  // Version 1 to 2
  '1-2': async (db) => {
    console.log('Running migration from v1 to v2...');
    
    // Example: Add a new field to existing records
    const categoriesStore = db.transaction(idb.STORES.CATEGORIES, 'readwrite').objectStore(idb.STORES.CATEGORIES);
    
    // Get all existing categories
    const categories = await getAllRecords(categoriesStore);
    
    // Update each category with new stockStatus structure
    for (const category of categories) {
      // Add stockStatus if it doesn't exist
      if (!category.stockStatus) {
        category.stockStatus = {
          isOutOfStock: category.outOfStock || false,
          restockTime: category.outOfStockUntil || null,
          outOfStockReason: category.outOfStockReason || '',
          autoRestock: category.outOfStockType !== 'manual',
          orderModes: {
            dineIn: { isOutOfStock: false },
            takeaway: { isOutOfStock: false },
            delivery: { isOutOfStock: false },
            qrOrdering: { isOutOfStock: false },
            directTakeaway: { isOutOfStock: false },
            directDelivery: { isOutOfStock: false },
            zomato: { isOutOfStock: false }
          }
        };
        
        // Put updated category back
        await putRecord(categoriesStore, category);
      }
    }
    
    // Do the same for subcategories
    const subcategoriesStore = db.transaction(idb.STORES.SUBCATEGORIES, 'readwrite').objectStore(idb.STORES.SUBCATEGORIES);
    const subcategories = await getAllRecords(subcategoriesStore);
    
    for (const subcategory of subcategories) {
      if (!subcategory.stockStatus) {
        subcategory.stockStatus = {
          isOutOfStock: subcategory.outOfStock || false,
          restockTime: subcategory.outOfStockUntil || null,
          outOfStockReason: subcategory.outOfStockReason || '',
          autoRestock: subcategory.outOfStockType !== 'manual',
          orderModes: {
            dineIn: { isOutOfStock: false },
            takeaway: { isOutOfStock: false },
            delivery: { isOutOfStock: false },
            qrOrdering: { isOutOfStock: false },
            directTakeaway: { isOutOfStock: false },
            directDelivery: { isOutOfStock: false },
            zomato: { isOutOfStock: false }
          }
        };
        
        await putRecord(subcategoriesStore, subcategory);
      }
    }
    
    console.log('Completed migration from v1 to v2');
  },
  
  // Version 2 to 3
  '2-3': async (db) => {
    console.log('Running migration from v2 to v3...');
    
    // Example: Add metadata for analytics and search functionality
    const metaStore = db.transaction(idb.STORES.META, 'readwrite').objectStore(idb.STORES.META);
    
    // Create search indexes metadata if not exists
    const searchIndexes = {
      key: 'searchIndexes',
      value: {
        categories: {
          lastUpdated: null,
          fields: ['categoryName', 'parentCategory', 'stockStatus.outOfStockReason']
        },
        subcategories: {
          lastUpdated: null,
          fields: ['subCategoryName', 'category.categoryName', 'stockStatus.outOfStockReason']
        }
      }
    };
    
    await putRecord(metaStore, searchIndexes);
    
    // Create offline analytics metadata if not exists
    const offlineAnalytics = {
      key: 'offlineAnalytics',
      value: {
        totalOfflineTime: 0,
        offlineUsageEvents: [],
        syncEvents: [],
        lastCalculated: null
      }
    };
    
    await putRecord(metaStore, offlineAnalytics);
    
    // Create recovery plans store if not exists
    if (!db.objectStoreNames.contains('recoveryPlans')) {
      db.createObjectStore('recoveryPlans', { keyPath: 'id' });
    }
    
    console.log('Completed migration from v2 to v3');
  },
  
  // Add more migration steps for future versions
};

// Helper functions for migrations
const getAllRecords = (store) => {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
};

const putRecord = (store, record) => {
  return new Promise((resolve, reject) => {
    const request = store.put(record);
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
};

// Execute migrations needed to get from currentVersion to targetVersion
const executeMigrations = async (db, currentVersion, targetVersion) => {
  console.log(`Migrating database from v${currentVersion} to v${targetVersion}`);
  
  // Execute each migration step in sequence
  for (let v = currentVersion; v < targetVersion; v++) {
    const migrationKey = `${v}-${v + 1}`;
    const migrationFn = MIGRATION_STEPS[migrationKey];
    
    if (migrationFn) {
      try {
        await migrationFn(db);
      } catch (error) {
        console.error(`Migration ${migrationKey} failed:`, error);
        throw error;
      }
    } else {
      console.warn(`No migration function found for ${migrationKey}`);
    }
  }
  
  return true;
};

// Main migration handler
export const checkAndMigrateDatabase = async () => {
  try {
    // Get current schema version from IndexedDB
    const db = await idb.initDB(); // This will initialize the DB with the current structure
    
    // Get the current schema version from metadata
    const schemaVersion = await idb.getMetadata('schemaVersion');
    const currentVersion = schemaVersion ? schemaVersion.version : 1;
    
    // If already at the latest version, no migration needed
    if (currentVersion >= CURRENT_SCHEMA_VERSION) {
      console.log(`Database already at latest schema version (${currentVersion})`);
      return { success: true, migrated: false, version: currentVersion };
    }
    
    // Execute needed migrations
    await executeMigrations(db, currentVersion, CURRENT_SCHEMA_VERSION);
    
    // Update the schema version in metadata
    await idb.setMetadata('schemaVersion', { version: CURRENT_SCHEMA_VERSION, updatedAt: new Date().toISOString() });
    
    return { 
      success: true, 
      migrated: true, 
      fromVersion: currentVersion, 
      toVersion: CURRENT_SCHEMA_VERSION 
    };
    
  } catch (error) {
    console.error('Database migration failed:', error);
    
    return { 
      success: false, 
      error: error.message,
      errorDetails: error 
    };
  }
};

// Get current schema info
export const getSchemaInfo = async () => {
  const schemaVersion = await idb.getMetadata('schemaVersion');
  
  return {
    currentVersion: schemaVersion ? schemaVersion.version : 1,
    latestVersion: CURRENT_SCHEMA_VERSION,
    needsMigration: (schemaVersion ? schemaVersion.version : 1) < CURRENT_SCHEMA_VERSION,
    lastUpdated: schemaVersion ? schemaVersion.updatedAt : null
  };
};

// Force a database migration (useful for testing or manual intervention)
export const forceMigration = async (fromVersion = null) => {
  try {
    const db = await idb.initDB();
    
    // If fromVersion is not specified, get the current version
    let startVersion = fromVersion;
    if (startVersion === null) {
      const schemaVersion = await idb.getMetadata('schemaVersion');
      startVersion = schemaVersion ? schemaVersion.version : 1;
    }
    
    // Validate version range
    if (startVersion >= CURRENT_SCHEMA_VERSION) {
      return { 
        success: false, 
        message: `Cannot migrate from version ${startVersion} to ${CURRENT_SCHEMA_VERSION}` 
      };
    }
    
    // Execute migrations
    await executeMigrations(db, startVersion, CURRENT_SCHEMA_VERSION);
    
    // Update the schema version in metadata
    await idb.setMetadata('schemaVersion', { version: CURRENT_SCHEMA_VERSION, updatedAt: new Date().toISOString() });
    
    return { 
      success: true, 
      message: `Successfully migrated from v${startVersion} to v${CURRENT_SCHEMA_VERSION}` 
    };
    
  } catch (error) {
    console.error('Force migration failed:', error);
    
    return { 
      success: false, 
      message: 'Migration failed', 
      error: error.message 
    };
  }
};

// Reset the database completely (for development/testing)
export const resetDatabase = async () => {
  try {
    // Close any open connections
    const dbs = await window.indexedDB.databases();
    
    for (const db of dbs) {
      if (db.name === idb.DB_NAME) {
        await window.indexedDB.deleteDatabase(idb.DB_NAME);
        break;
      }
    }
    
    // Reinitialize with fresh schema
    await idb.initDB();
    
    // Set the schema version to the current version
    await idb.setMetadata('schemaVersion', { version: CURRENT_SCHEMA_VERSION, updatedAt: new Date().toISOString() });
    
    return { success: true, message: 'Database reset successfully' };
    
  } catch (error) {
    console.error('Database reset failed:', error);
    
    return { 
      success: false, 
      message: 'Database reset failed', 
      error: error.message 
    };
  }
};

// Check for database migration on module import
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  window.addEventListener('DOMContentLoaded', () => {
    // Check for migrations
    checkAndMigrateDatabase()
      .then(result => {
        if (result.migrated) {
          console.log(`Database migrated from v${result.fromVersion} to v${result.toVersion}`);
        }
      })
      .catch(error => {
        console.error('Error during database migration check:', error);
      });
  });
}