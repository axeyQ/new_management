import * as idb from './indexedDBService';
import enhancedAxiosWithAuth from './enhancedAxiosWithAuth';
import { syncEvents, SYNC_EVENTS, logSyncOperation } from './syncTracker';
import { showNotification } from './notificationService';

// Define error types and recovery strategies
export const ERROR_TYPES = {
  NETWORK: 'network_error',
  AUTH: 'authentication_error',
  VALIDATION: 'validation_error',
  SERVER: 'server_error',
  CONFLICT: 'conflict_error',
  TIMEOUT: 'timeout_error',
  UNKNOWN: 'unknown_error',
};

export const RECOVERY_STRATEGIES = {
  RETRY: 'retry',
  SKIP: 'skip',
  MODIFY: 'modify',
  REQUEUE: 'requeue',
  ESCALATE: 'escalate',
  MANUAL: 'manual'
};

// Maximum number of retries
const MAX_RETRIES = 5;

// Exponential backoff delay calculation (in milliseconds)
const getBackoffDelay = (retryCount) => {
  return Math.min(1000 * Math.pow(2, retryCount), 60000); // Max 60 seconds
};

// Map HTTP status codes to error types
const mapStatusCodeToErrorType = (status) => {
  if (!status) return ERROR_TYPES.NETWORK;
  
  if (status === 401 || status === 403) return ERROR_TYPES.AUTH;
  if (status === 400 || status === 422) return ERROR_TYPES.VALIDATION;
  if (status >= 500) return ERROR_TYPES.SERVER;
  if (status === 409) return ERROR_TYPES.CONFLICT;
  if (status === 408 || status === 504) return ERROR_TYPES.TIMEOUT;
  
  return ERROR_TYPES.UNKNOWN;
};

// Map error types to appropriate recovery strategies
const determineRecoveryStrategy = (errorType, retryCount = 0) => {
  // If we've hit the max retries, escalate or manual intervention
  if (retryCount >= MAX_RETRIES) {
    return RECOVERY_STRATEGIES.MANUAL;
  }
  
  switch (errorType) {
    case ERROR_TYPES.NETWORK:
    case ERROR_TYPES.TIMEOUT:
    case ERROR_TYPES.SERVER:
      return RECOVERY_STRATEGIES.RETRY;
      
    case ERROR_TYPES.AUTH:
      return RECOVERY_STRATEGIES.ESCALATE; // Need manual token refresh
      
    case ERROR_TYPES.VALIDATION:
      return RECOVERY_STRATEGIES.MODIFY; // Need to fix data
      
    case ERROR_TYPES.CONFLICT:
      return RECOVERY_STRATEGIES.MANUAL; // Need manual conflict resolution
      
    default:
      return retryCount < 2 
        ? RECOVERY_STRATEGIES.RETRY // Try a couple of times for unknown errors
        : RECOVERY_STRATEGIES.MANUAL; // Then ask for help
  }
};

// Parse error from response or error object
const parseError = (error) => {
  // Initial error info with defaults
  const errorInfo = {
    type: ERROR_TYPES.UNKNOWN,
    message: error.message || 'Unknown error occurred',
    statusCode: null,
    isNetworkError: !error.response,
    details: null,
    raw: error
  };
  
  // If it's a network error (no response)
  if (!error.response) {
    errorInfo.type = ERROR_TYPES.NETWORK;
    errorInfo.message = 'Network error - unable to connect to server';
    return errorInfo;
  }
  
  // If we have a response with status
  if (error.response && error.response.status) {
    errorInfo.statusCode = error.response.status;
    errorInfo.type = mapStatusCodeToErrorType(error.response.status);
    
    // Extract detailed error message if available
    if (error.response.data) {
      if (typeof error.response.data === 'string') {
        errorInfo.message = error.response.data;
      } else if (error.response.data.message) {
        errorInfo.message = error.response.data.message;
      } else if (error.response.data.error) {
        errorInfo.message = error.response.data.error;
      }
      
      // Save full details
      errorInfo.details = error.response.data;
    }
  }
  
  // Check for timeout
  if (
    error.code === 'ECONNABORTED' || 
    error.message?.includes('timeout') ||
    error.message?.includes('Timeout')
  ) {
    errorInfo.type = ERROR_TYPES.TIMEOUT;
    errorInfo.message = 'Request timed out';
  }
  
  return errorInfo;
};

// Create a recovery plan for a failed operation
const createRecoveryPlan = (operation, error, recoveryStrategy) => {
  const plan = {
    operationId: operation.id,
    originalOperation: operation,
    error,
    strategy: recoveryStrategy,
    created: new Date().toISOString(),
    status: 'pending',
    attempts: operation.attempts || 0,
    nextAttempt: null,
    modifications: null
  };
  
  // Set next attempt time based on strategy
  if (recoveryStrategy === RECOVERY_STRATEGIES.RETRY) {
    const delay = getBackoffDelay(plan.attempts);
    plan.nextAttempt = new Date(Date.now() + delay).toISOString();
  }
  
  return plan;
};

// Save recovery plan to IndexedDB
const saveRecoveryPlan = async (plan) => {
  // Get existing recovery plans
  const recoveryPlans = await idb.getMetadata('recoveryPlans') || {};
  
  // Add or update this plan
  recoveryPlans[plan.operationId] = plan;
  
  // Save back to IndexedDB
  await idb.setMetadata('recoveryPlans', recoveryPlans);
  
  return plan;
};

// Handle a failed operation
export const handleFailedOperation = async (operation, error) => {
  // Parse the error
  const parsedError = parseError(error);
  
  // Increment attempt count
  const attempts = (operation.attempts || 0) + 1;
  
  // Determine recovery strategy
  const recoveryStrategy = determineRecoveryStrategy(parsedError.type, attempts);
  
  // Create recovery plan
  const plan = createRecoveryPlan(
    { ...operation, attempts },
    parsedError,
    recoveryStrategy
  );
  
  // Save the plan
  await saveRecoveryPlan(plan);
  
  // Log the failure
  logSyncOperation(operation.id, false, {
    error: parsedError,
    recoveryPlan: plan
  });
  
  // Emit recovery plan event
  syncEvents.emit('error_recovery_plan_created', plan);
  
  // If it's a manual intervention required, show notification
  if (
    recoveryStrategy === RECOVERY_STRATEGIES.MANUAL || 
    recoveryStrategy === RECOVERY_STRATEGIES.ESCALATE
  ) {
    showNotification('Manual Intervention Required', {
      body: `Operation failed: ${parsedError.message}`,
      requireInteraction: true,
      tag: 'error-recovery',
      data: { type: 'error-recovery', operationId: operation.id }
    });
  }
  
  return plan;
};

// Execute recovery for an operation
export const executeRecovery = async (operationId) => {
  // Get recovery plans
  const recoveryPlans = await idb.getMetadata('recoveryPlans') || {};
  const plan = recoveryPlans[operationId];
  
  if (!plan) {
    return { success: false, message: 'Recovery plan not found' };
  }
  
  try {
    // Mark as in progress
    plan.status = 'in_progress';
    await saveRecoveryPlan(plan);
    
    let result = null;
    
    // Execute based on strategy
    switch (plan.strategy) {
      case RECOVERY_STRATEGIES.RETRY:
        result = await retryOperation(plan);
        break;
        
      case RECOVERY_STRATEGIES.MODIFY:
        // This requires manual data modification first
        result = { success: false, message: 'Modification required before retry' };
        break;
        
      case RECOVERY_STRATEGIES.MANUAL:
        // This requires manual intervention
        result = { success: false, message: 'Manual intervention required' };
        break;
        
      case RECOVERY_STRATEGIES.REQUEUE:
        result = await requeueOperation(plan);
        break;
        
      case RECOVERY_STRATEGIES.ESCALATE:
        // This requires escalation (e.g., token refresh)
        result = { success: false, message: 'Escalation required' };
        break;
        
      default:
        result = { success: false, message: 'Unknown recovery strategy' };
    }
    
    // Update plan status
    plan.status = result.success ? 'completed' : 'failed';
    plan.result = result;
    await saveRecoveryPlan(plan);
    
    // If successful, remove from pending operations
    if (result.success) {
      await idb.clearOperation(operationId);
    }
    
    return result;
    
  } catch (error) {
    // Update plan with new error
    plan.status = 'failed';
    plan.lastError = parseError(error);
    await saveRecoveryPlan(plan);
    
    return { success: false, message: 'Recovery execution failed', error };
  }
};

// Retry an operation
const retryOperation = async (plan) => {
  try {
    const { originalOperation } = plan;
    
    // Re-execute the original request
    const response = await enhancedAxiosWithAuth({
      method: originalOperation.method,
      url: originalOperation.url,
      data: originalOperation.data,
      headers: originalOperation.headers,
      timeout: 30000 // Longer timeout for retries
    });
    
    // If successful
    if (response.data.success) {
      logSyncOperation(originalOperation.id, true, {
        recoveryAttempt: plan.attempts,
        result: response.data
      });
      
      return {
        success: true,
        message: 'Operation successfully recovered',
        data: response.data
      };
    }
    
    // If not successful but we got a response
    return {
      success: false,
      message: response.data.message || 'Retry was not successful',
      data: response.data
    };
    
  } catch (error) {
    // Handle new error
    const parsedError = parseError(error);
    
    return {
      success: false,
      message: 'Retry failed',
      error: parsedError
    };
  }
};

// Requeue an operation with modifications
const requeueOperation = async (plan) => {
  try {
    const { originalOperation, modifications } = plan;
    
    // Create a new operation with modifications
    const newOperationId = `${originalOperation.id}_recovery_${Date.now()}`;
    const newOperation = {
      ...originalOperation,
      id: newOperationId,
      data: modifications?.data || originalOperation.data,
      attempts: 0, // Reset attempts
      recoveredFrom: originalOperation.id
    };
    
    // Queue the new operation
    await idb.queueOperation(newOperation);
    
    logSyncOperation(originalOperation.id, true, {
      recoveryMethod: 'requeue',
      newOperationId
    });
    
    return {
      success: true,
      message: 'Operation requeued with modifications',
      newOperationId
    };
    
  } catch (error) {
    return {
      success: false,
      message: 'Failed to requeue operation',
      error
    };
  }
};

// Apply modifications to an operation
export const applyModifications = async (operationId, modifications) => {
  // Get recovery plans
  const recoveryPlans = await idb.getMetadata('recoveryPlans') || {};
  const plan = recoveryPlans[operationId];
  
  if (!plan) {
    return { success: false, message: 'Recovery plan not found' };
  }
  
  try {
    // Update plan with modifications
    plan.modifications = modifications;
    plan.strategy = RECOVERY_STRATEGIES.REQUEUE; // Change strategy to requeue
    await saveRecoveryPlan(plan);
    
    // Execute recovery with new strategy
    return await executeRecovery(operationId);
    
  } catch (error) {
    return {
      success: false,
      message: 'Failed to apply modifications',
      error
    };
  }
};

// Process all automatic recovery plans
export const processAutoRecoveryPlans = async () => {
  try {
    // Get all recovery plans
    const recoveryPlans = await idb.getMetadata('recoveryPlans') || {};
    
    let processed = 0;
    let failed = 0;
    
    // Get current time
    const now = new Date();
    
    // Process each plan
    for (const [operationId, plan] of Object.entries(recoveryPlans)) {
      // Skip if not pending
      if (plan.status !== 'pending') continue;
      
      // Skip if it's not an automatic strategy
      if (
        plan.strategy !== RECOVERY_STRATEGIES.RETRY &&
        plan.strategy !== RECOVERY_STRATEGIES.REQUEUE
      ) continue;
      
      // Skip if nextAttempt is in the future
      if (plan.nextAttempt && new Date(plan.nextAttempt) > now) continue;
      
      // Try to execute recovery
      const result = await executeRecovery(operationId);
      
      if (result.success) {
        processed++;
      } else {
        failed++;
      }
    }
    
    return { processed, failed };
    
  } catch (error) {
    console.error('Error processing recovery plans:', error);
    return { processed: 0, failed: 0, error };
  }
};

// Listen for error events and create recovery plans
export const initErrorRecoverySystem = () => {
  // Listen for failed operations
  syncEvents.on(SYNC_EVENTS.SYNC_ITEM_FAILED, async (event) => {
    // Get the operation from the pending operations
    const pendingOps = await idb.getPendingOperations();
    const operation = pendingOps.find(op => op.id === event.operationId);
    
    if (operation) {
      await handleFailedOperation(operation, event.error || new Error('Unknown error'));
    }
  });
  
  // Set up periodic checking for auto-recovery plans
  setInterval(async () => {
    if (navigator.onLine) {
      await processAutoRecoveryPlans();
    }
  }, 60000); // Check every minute
  
  return {
    recoveryEnabled: true,
    message: 'Error recovery system initialized'
  };
};

// Set up error recovery UI component
export const ErrorRecoveryUI = {
  getRecoveryPlans: async () => {
    return await idb.getMetadata('recoveryPlans') || {};
  },
  
  executeRecovery,
  
  applyModifications,
  
  clearRecoveryPlan: async (operationId) => {
    const recoveryPlans = await idb.getMetadata('recoveryPlans') || {};
    
    if (recoveryPlans[operationId]) {
      delete recoveryPlans[operationId];
      await idb.setMetadata('recoveryPlans', recoveryPlans);
      return { success: true, message: 'Recovery plan cleared' };
    }
    
    return { success: false, message: 'Recovery plan not found' };
  },
  
  clearAllCompletedPlans: async () => {
    const recoveryPlans = await idb.getMetadata('recoveryPlans') || {};
    
    // Keep only non-completed plans
    const updatedPlans = {};
    
    for (const [operationId, plan] of Object.entries(recoveryPlans)) {
      if (plan.status !== 'completed') {
        updatedPlans[operationId] = plan;
      }
    }
    
    await idb.setMetadata('recoveryPlans', updatedPlans);
    
    return {
      success: true,
      message: 'Completed recovery plans cleared',
      cleared: Object.keys(recoveryPlans).length - Object.keys(updatedPlans).length
    };
  }
};

// Initialize on import
initErrorRecoverySystem();