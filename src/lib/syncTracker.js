import * as idb from './indexedDBService';
import { BehaviorSubject } from 'rxjs';

// Create observables for sync status
export const syncStatus = new BehaviorSubject({
  inProgress: false,
  progress: 0,
  total: 0,
  completed: 0,
  failed: 0,
  lastSync: null,
  errors: []
});

// Background sync events
export const SYNC_EVENTS = {
  SYNC_STARTED: 'sync_started',
  SYNC_PROGRESS: 'sync_progress',
  SYNC_COMPLETED: 'sync_completed',
  SYNC_FAILED: 'sync_failed',
  SYNC_ITEM_PROCESSED: 'sync_item_processed',
  SYNC_ITEM_FAILED: 'sync_item_failed',
  SYNC_CONFLICT_DETECTED: 'sync_conflict_detected'
};

// Create a custom event emitter for sync events
class SyncEventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return () => this.off(event, listener);
  }

  off(event, listener) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }

  emit(event, ...args) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(...args));
  }
  
  // Clear all listeners
  clear() {
    this.events = {};
  }
}

// Create a singleton instance
export const syncEvents = new SyncEventEmitter();

/**
 * Track sync progress and update the observable
 * @param {Object} progress - Progress info
 */
export const updateSyncProgress = async (progress) => {
  // Get current state
  const current = syncStatus.getValue();
  
  // Update with new data
  const updated = {
    ...current,
    ...progress
  };
  
  // Emit change
  syncStatus.next(updated);
  
  // Save to IndexedDB for persistence
  await idb.setMetadata('syncStatus', updated);
  
  // Emit appropriate events
  if (progress.inProgress && !current.inProgress) {
    syncEvents.emit(SYNC_EVENTS.SYNC_STARTED, updated);
  }
  
  if (progress.inProgress && current.inProgress) {
    syncEvents.emit(SYNC_EVENTS.SYNC_PROGRESS, updated);
  }
  
  if (!progress.inProgress && current.inProgress) {
    if (progress.failed > 0) {
      syncEvents.emit(SYNC_EVENTS.SYNC_FAILED, updated);
    } else {
      syncEvents.emit(SYNC_EVENTS.SYNC_COMPLETED, updated);
    }
  }
};

/**
 * Log an individual sync operation result
 * @param {string} operationId - The operation ID
 * @param {boolean} success - Whether it succeeded
 * @param {Object} data - Additional data
 */
export const logSyncOperation = async (operationId, success, data = {}) => {
  // Get current progress
  const current = syncStatus.getValue();
  
  // Create a new operation log entry
  const operationLog = {
    operationId,
    success,
    timestamp: new Date().toISOString(),
    ...data
  };
  
  // Get existing logs
  const operationLogs = await idb.getMetadata('syncOperationLogs') || [];
  
  // Add new log
  const updatedLogs = [operationLog, ...operationLogs.slice(0, 49)]; // Keep last 50
  await idb.setMetadata('syncOperationLogs', updatedLogs);
  
  // Update progress counts
  const updated = {
    ...current,
    completed: success ? current.completed + 1 : current.completed,
    failed: !success ? current.failed + 1 : current.failed,
    progress: Math.min(((current.completed + (success ? 1 : 0)) / current.total) * 100, 100)
  };
  
  // If there was an error, add it to the errors list
  if (!success && data.error) {
    updated.errors = [...(current.errors || []), {
      operationId,
      timestamp: new Date().toISOString(),
      ...data
    }].slice(0, 10); // Keep only the last 10 errors
  }
  
  // Update observable
  syncStatus.next(updated);
  
  // Emit appropriate event
  if (success) {
    syncEvents.emit(SYNC_EVENTS.SYNC_ITEM_PROCESSED, operationLog);
  } else {
    syncEvents.emit(SYNC_EVENTS.SYNC_ITEM_FAILED, operationLog);
  }
  
  // If this operation had conflicts
  if (data.conflict) {
    syncEvents.emit(SYNC_EVENTS.SYNC_CONFLICT_DETECTED, {
      ...operationLog,
      conflict: data.conflict
    });
  }
};

/**
 * Start tracking a new sync process
 * @param {number} total - Total operations to process
 * @param {Object} additionalData - Any additional data to include
 */
export const startSyncTracking = async (total, additionalData = {}) => {
  const newStatus = {
    inProgress: true,
    progress: 0,
    total,
    completed: 0,
    failed: 0,
    startTime: new Date().toISOString(),
    errors: [],
    ...additionalData
  };
  
  // Update observable
  syncStatus.next(newStatus);
  
  // Save to IndexedDB
  await idb.setMetadata('syncStatus', newStatus);
  
  // Emit start event
  syncEvents.emit(SYNC_EVENTS.SYNC_STARTED, newStatus);
  
  return newStatus;
};

/**
 * Complete the current sync process
 * @param {Object} result - Final result data
 */
export const completeSyncTracking = async (result = {}) => {
  const current = syncStatus.getValue();
  
  const completed = {
    ...current,
    inProgress: false,
    endTime: new Date().toISOString(),
    duration: current.startTime ? new Date() - new Date(current.startTime) : 0,
    lastSync: new Date().toISOString(),
    ...result
  };
  
  // Update observable
  syncStatus.next(completed);
  
  // Save to history
  const history = await idb.getMetadata('syncHistory') || [];
  const updatedHistory = [
    {
      ...completed,
      id: `sync_${Date.now()}`
    },
    ...history.slice(0, 49) // Keep last 50
  ];
  
  await idb.setMetadata('syncHistory', updatedHistory);
  
  // Save to IndexedDB
  await idb.setMetadata('syncStatus', completed);
  
  // Emit completion event
  if (completed.failed > 0) {
    syncEvents.emit(SYNC_EVENTS.SYNC_FAILED, completed);
  } else {
    syncEvents.emit(SYNC_EVENTS.SYNC_COMPLETED, completed);
  }
  
  return completed;
};

/**
 * Get the current sync status from IndexedDB
 */
export const loadSyncStatus = async () => {
  const savedStatus = await idb.getMetadata('syncStatus');
  if (savedStatus) {
    syncStatus.next(savedStatus);
  }
  return savedStatus;
};

/**
 * Listen for sync events from the service worker
 */
export const listenForServiceWorkerSyncEvents = () => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const data = event.data;
      
      if (data.type === 'sync_progress') {
        updateSyncProgress({
          inProgress: true,
          progress: data.progress,
          total: data.total,
          completed: data.completed,
          failed: data.failed
        });
      }
      
      if (data.type === 'sync_completed') {
        completeSyncTracking({
          ...data
        });
      }
      
      if (data.type === 'sync_operation') {
        logSyncOperation(
          data.operationId,
          data.success,
          data
        );
      }
    });
  }
};

// Initialize on import
loadSyncStatus();
listenForServiceWorkerSyncEvents();