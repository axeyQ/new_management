import { syncEvents, SYNC_EVENTS } from './syncTracker';

// Check if notifications are supported and permission is granted
export const areNotificationsAvailable = () => {
  return (
    'Notification' in window &&
    (Notification.permission === 'granted' || Notification.permission === 'default')
  );
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    return { success: false, message: 'Notifications are not supported in this browser' };
  }

  if (Notification.permission === 'granted') {
    return { success: true, message: 'Notification permission already granted' };
  }

  if (Notification.permission === 'denied') {
    return { success: false, message: 'Notification permission was denied' };
  }

  try {
    const permission = await Notification.requestPermission();
    return {
      success: permission === 'granted',
      message: permission === 'granted'
        ? 'Notification permission granted'
        : 'Notification permission denied'
    };
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return { success: false, message: 'Error requesting notification permission' };
  }
};

// Show a notification
export const showNotification = (title, options = {}) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    console.log('Cannot show notification. Permission not granted.');
    return false;
  }

  try {
    // Use the service worker to show the notification if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          vibrate: [200, 100, 200],
          ...options
        });
      });
    } else {
      // Fallback to regular notification if service worker not available
      new Notification(title, {
        icon: '/icons/icon-192x192.png',
        ...options
      });
    }
    return true;
  } catch (error) {
    console.error('Error showing notification:', error);
    return false;
  }
};

// Initialize notification listeners
export const initNotificationListeners = () => {
  // Show notification when sync starts
  syncEvents.on(SYNC_EVENTS.SYNC_STARTED, (data) => {
    showNotification('Sync Started', {
      body: `Syncing ${data.total} operations`,
      tag: 'sync-started',
      data: { type: 'sync-started', url: '/dashboard/settings/offline' }
    });
  });

  // Show notification when sync completes
  syncEvents.on(SYNC_EVENTS.SYNC_COMPLETED, (data) => {
    showNotification('Sync Completed', {
      body: `Successfully synchronized ${data.completed} operations`,
      tag: 'sync-completed',
      data: { type: 'sync-completed', url: '/dashboard/settings/offline' }
    });
  });

  // Show notification when sync fails
  syncEvents.on(SYNC_EVENTS.SYNC_FAILED, (data) => {
    showNotification('Sync Failed', {
      body: `Sync completed with ${data.failed} failed operations`,
      tag: 'sync-failed',
      requireInteraction: true,
      data: { type: 'sync-failed', url: '/dashboard/settings/offline' }
    });
  });

  // Show notification when conflicts are detected
  syncEvents.on(SYNC_EVENTS.SYNC_CONFLICT_DETECTED, (data) => {
    showNotification('Sync Conflict Detected', {
      body: 'Manual resolution required for data conflicts',
      tag: 'sync-conflict',
      requireInteraction: true,
      data: { type: 'sync-conflict', url: '/dashboard/settings/offline' }
    });
  });

  // Listen for notification clicks from service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'notification-click') {
        // Handle notification click
        const { notificationType, url } = event.data;
        
        // Navigate to specified URL
        if (url && window.location.pathname !== url) {
          window.location.href = url;
        }
      }
    });
  }

  return {
    success: true,
    message: 'Notification listeners initialized'
  };
};

// Component to show notification permission request
export const NotificationPermissionComponent = () => {
  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission();
    if (result.success) {
      // Initialize listeners if permission granted
      initNotificationListeners();
    }
  };

  return {
    requestPermission: handleRequestPermission,
    isSupported: 'Notification' in window,
    currentPermission: 'Notification' in window ? Notification.permission : null
  };
};

// Send notification about operation status
export const notifyOperationStatus = (operation, success) => {
  if (success) {
    // Only notify about bulk operation success, not individual ones
    return;
  }

  // Notify about failures
  let operationType = operation.type || 'Unknown';
  let title = `Operation Failed: ${operationType}`;
  let body = 'An operation failed to synchronize';

  // Customize based on operation type
  if (operationType.includes('CATEGORY')) {
    body = 'A category operation failed to synchronize';
  } else if (operationType.includes('SUBCATEGORY')) {
    body = 'A subcategory operation failed to synchronize';
  }

  showNotification(title, {
    body,
    tag: 'operation-failed',
    requireInteraction: false,
    data: { type: 'operation-failed', url: '/dashboard/settings/offline' }
  });
};

// Notifications for specific offline events
export const notifyOfflineStatus = (isOffline) => {
  if (isOffline) {
    showNotification('You Are Offline', {
      body: 'The app is now in offline mode. Changes will be synced when you reconnect.',
      tag: 'offline-status',
      silent: true
    });
  } else {
    showNotification('Back Online', {
      body: 'You are back online. Syncing your changes...',
      tag: 'online-status'
    });
  }
};

// Add notification handlers to service worker
export const addNotificationHandlersToServiceWorker = () => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'init-notification-handlers'
    });
  }
};

// Initialize
export const initNotifications = async () => {
  if (!areNotificationsAvailable()) {
    return { success: false, message: 'Notifications are not available' };
  }

  if (Notification.permission === 'granted') {
    initNotificationListeners();
    addNotificationHandlersToServiceWorker();
    return { success: true, message: 'Notifications initialized' };
  }

  return { success: false, message: 'Notification permission not granted' };
};

// Auto-initialize if permission is already granted
if (typeof window !== 'undefined' && Notification.permission === 'granted') {
  initNotifications();
}