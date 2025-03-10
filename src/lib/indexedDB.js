import { openDB } from 'idb';

const DB_NAME = 'menuManagementDB';
const DB_VERSION = 1;

// Simple database initialization - read-only at this stage
export async function initDB() {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Categories store
      if (!db.objectStoreNames.contains('categories')) {
        const categoryStore = db.createObjectStore('categories', { keyPath: '_id' });
      }

      // Subcategories store
      if (!db.objectStoreNames.contains('subcategories')) {
        const subcategoryStore = db.createObjectStore('subcategories', { keyPath: '_id' });
      }
    }
  });

  return db;
}

// Simple getter methods
export async function getCategories() {
  const db = await initDB();
  return db.getAll('categories');
}

export async function getSubcategories() {
  const db = await initDB();
  return db.getAll('subcategories');
}

export async function saveCategories(categories) {
  const db = await initDB();
  const tx = db.transaction('categories', 'readwrite');
  for (const category of categories) {
    await tx.store.put(category);
  }
  await tx.done;
}

export async function saveSubcategories(subcategories) {
  const db = await initDB();
  const tx = db.transaction('subcategories', 'readwrite');
  for (const subcategory of subcategories) {
    await tx.store.put(subcategory);
  }
  await tx.done;
}