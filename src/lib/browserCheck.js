// src/lib/browserCheck.js
/**
 * Safely checks if code is running in a browser environment
 * @returns {boolean} - true if running in a browser
 */
export const isBrowser = () => {
    return typeof window !== 'undefined';
  };
  
  /**
   * Safely accesses window object or returns a specified fallback
   * @param {Function} accessor - Function that accesses window properties
   * @param {any} fallback - Value to return if window is undefined or the property doesn't exist
   * @returns {any} - The result of the accessor or the fallback
   */
  export const safeWindowAccess = (accessor, fallback = null) => {
    if (!isBrowser()) {
      return fallback;
    }
    
    try {
      return accessor();
    } catch (error) {
      console.error('Error accessing window property:', error);
      return fallback;
    }
  };
  
  /**
   * Provides a safe navigator object or fallback
   * @param {Function} accessor - Function that accesses navigator properties
   * @param {any} fallback - Value to return if navigator is undefined
   * @returns {any} - The result of the accessor or the fallback
   */
  export const safeNavigatorAccess = (accessor, fallback = null) => {
    if (!isBrowser() || typeof navigator === 'undefined') {
      return fallback;
    }
    
    try {
      return accessor();
    } catch (error) {
      console.error('Error accessing navigator property:', error);
      return fallback;
    }
  };
  
  /**
   * Provides a safe check if we're online
   * @returns {boolean} - true if browser reports as online, false otherwise
   */
  export const isOnline = () => {
    return safeNavigatorAccess(() => navigator.onLine, true);
  };
  
  /**
   * Safely executes browser-only code
   * @param {Function} fn - Function to execute in browser environment
   * @returns {any} - Result of the function or undefined
   */
  export const runInBrowser = (fn) => {
    if (isBrowser()) {
      return fn();
    }
    return undefined;
  };