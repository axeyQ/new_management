import axiosWithAuth from './axiosWithAuth';
import * as idb from './indexedDBService';
import toast from 'react-hot-toast';
import { OPERATION_TYPES } from './enhancedAxiosWithAuth';

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
  // Implement specific conflict resolution strategies based on operation type
  
  // Category already exists conflict (409 status code)
  if (
    operation.type === OPERATION_TYPES.CREATE_CATEGORY && 
    error.response?.status === 409
  ) {
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
  
  // Add other conflict resolution strategies as needed
  
  return false;
};

/**
 * Processes a single pending operation with enhanced error handling
 * @param {Object} operation - The operation to process
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export const processOperation = async (operation) => {
  try {
    console.log(`Processing operation: ${operation.type}`, operation);
    
    // Special handling for create operations that used temp IDs
    if (operation.type === OPERATION_TYPES.CREATE_CATEGORY && operation.tempId) {
      // Find the temp category in IndexedDB
      const categories = await idb.getCategories();
      const tempCategory = categories.find(c => c._id === operation.tempId);
      
      if (tempCategory) {
        try {
          // Create the real category
          const response = await axiosWithAuth({
            method: operation.method,
            url: operation.url,
            data: {
              ...operation.data,
              // Don't include the temporary ID in the request
              _id: undefined,
              isTemp: undefined
            }
          });
          
          if (response.data.success) {
            // Replace the temp category with the real one
            await idb.deleteCategory(operation.tempId);
            await idb.updateCategory(response.data.data);
            
            // Clear the operation
            await idb.clearOperation(operation.id);
            return { success: true, error: null };
          }
        } catch (error) {
          // Try to resolve conflict if applicable
          const conflictResolved = await resolveConflict(operation, error);
          
          if (conflictResolved) {
            return { success: true, error: null };
          }
          
          // Log the error for debugging
          logSyncError('Failed to create category', error, operation);
          
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
    }
    // Similar handling for other operation types
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
    
    return {
      success: true,
      categories: categoriesResponse.data.data.length,
      subcategories: subcategoriesResponse.data.data.length
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
  try {
    await idb.setMetadata('syncStatus', 'in-progress');
    await idb.setMetadata('syncStartTime', new Date().toISOString());
    
    // First process any pending operations
    const result = await processPendingOperations();
    
    if (result.processed > 0) {
      toast.success(`Synchronized ${result.processed} operation(s)`);
    }
    
    if (result.retrying > 0) {
      toast.info(`${result.retrying} operation(s) will retry automatically`);
    }
    
    if (result.failed > 0) {
      toast.error(`Failed to synchronize ${result.failed} operation(s)`);
      
      // If there were failures, provide more details
      console.error('Failed operations:', result.failedOperations);
    }
    
    // Then fetch fresh data
    const syncResult = await syncAllData();
    
    if (syncResult.success) {
      toast.success('Data synchronized successfully');
      
      // Store sync information
      await idb.setMetadata('lastFullSync', new Date().toISOString());
      await idb.setMetadata('syncStatus', 'complete');
    } else {
      toast.error('Failed to synchronize data from server');
      await idb.setMetadata('syncStatus', 'failed');
    }
    
    return { 
      ...result, 
      dataSync: syncResult.success, 
      categories: syncResult.success ? syncResult.categories : 0,
      subcategories: syncResult.success ? syncResult.subcategories : 0
    };
  } catch (error) {
    console.error('Sync initialization failed:', error);
    toast.error('Synchronization failed');
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
  let lastOnlineStatus = navigator.onLine;
  
  window.addEventListener('online', async () => {
    if (!lastOnlineStatus) {
      // Only sync if we were previously offline
      toast.success('Back online. Synchronizing data...');
      
      // Wait a moment for network to stabilize
      setTimeout(async () => {
        const result = await initializeSync();
        
        // If some operations failed, offer manual retry
        if (result.failed > 0) {
          const retryLater = window.confirm(`${result.failed} operation(s) failed to sync. Would you like to retry them later?`);
          
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
    toast.warning('You are offline. Changes will be saved locally.');
  });
  
  // Register for background sync if available
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      // Check if periodic sync is supported
      if ('periodicSync' in registration) {
        // Register for periodic sync (every 3 hours)
        registration.periodicSync.register('sync-menu-data', {
          minInterval: 3 * 60 * 60 * 1000 // 3 hours
        }).catch(error => {
          console.error('Periodic sync registration failed:', error);
        });
      }
    });
  }
  
  // Initialize sync on load if we're online
  if (navigator.onLine) {
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
};