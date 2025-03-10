// src/lib/offlineUtils.js
export function isOnline() {
    // Check if we're in a browser environment
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    // Default to true in server environment
    return true;
  }
  
  export function setupConnectivityListeners() {
    // Only set up listeners in browser environment
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('Application is online');
      });
      
      window.addEventListener('offline', () => {
        console.log('Application is offline');
      });
    }
  }