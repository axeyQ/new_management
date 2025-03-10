// src/lib/localStorageService.js
const STORAGE_KEYS = {
    CATEGORIES: 'menu-categories',
    SUBCATEGORIES: 'menu-subcategories',
    LAST_SYNC: 'menu-last-sync',
    PENDING_OPERATIONS: 'menu-pending-operations'
  };
  
  // Save categories to local storage
  export const saveCategories = (categories) => {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      return true;
    } catch (error) {
      console.error('Error saving categories to localStorage:', error);
      return false;
    }
  };
  
  // Get categories from local storage
  export const getCategories = () => {
    try {
      const categories = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return categories ? JSON.parse(categories) : [];
    } catch (error) {
      console.error('Error getting categories from localStorage:', error);
      return [];
    }
  };
  
  // Save subcategories to local storage
  export const saveSubcategories = (subcategories) => {
    try {
      localStorage.setItem(STORAGE_KEYS.SUBCATEGORIES, JSON.stringify(subcategories));
      return true;
    } catch (error) {
      console.error('Error saving subcategories to localStorage:', error);
      return false;
    }
  };
  
  // Get subcategories from local storage
  export const getSubcategories = () => {
    try {
      const subcategories = localStorage.getItem(STORAGE_KEYS.SUBCATEGORIES);
      return subcategories ? JSON.parse(subcategories) : [];
    } catch (error) {
      console.error('Error getting subcategories from localStorage:', error);
      return [];
    }
  };
  
  // Filter subcategories by category ID
  export const getSubcategoriesByCategory = (categoryId) => {
    const subcategories = getSubcategories();
    if (!categoryId) return subcategories;
    return subcategories.filter(sc => sc.category === categoryId || 
      (sc.category && sc.category._id === categoryId));
  };
  
  // Get last sync time
  export const getLastSyncTime = () => {
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  };
  
  // Queue operations for when back online
  export const queueOperation = (operation) => {
    try {
      const operations = getPendingOperations();
      operations.push({
        ...operation,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem(STORAGE_KEYS.PENDING_OPERATIONS, JSON.stringify(operations));
      return true;
    } catch (error) {
      console.error('Error queueing operation:', error);
      return false;
    }
  };
  
  // Get pending operations
  export const getPendingOperations = () => {
    try {
      const operations = localStorage.getItem(STORAGE_KEYS.PENDING_OPERATIONS);
      return operations ? JSON.parse(operations) : [];
    } catch (error) {
      console.error('Error getting pending operations:', error);
      return [];
    }
  };
  
  // Clear completed operations
  export const clearOperation = (operationId) => {
    try {
      const operations = getPendingOperations();
      const updatedOperations = operations.filter(op => op.id !== operationId);
      localStorage.setItem(STORAGE_KEYS.PENDING_OPERATIONS, JSON.stringify(updatedOperations));
      return true;
    } catch (error) {
      console.error('Error clearing operation:', error);
      return false;
    }
  };