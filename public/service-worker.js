const CACHE_NAME = 'menu-manager-cache-v2';
const DATA_CACHE_NAME = 'menu-manager-data-cache-v2';
const DB_NAME = 'MenuManagerOfflineDB';

const urlsToCache = [
  '/',
  '/dashboard',
  '/dashboard/menu/categories',
  '/dashboard/menu/subcategories',
  // Add CSS, JS and other static assets
  '/globals.css',
  '/offline.html'
  // Add icons, fonts, etc.
];

const apiUrlsToCache = [
  '/api/menu/categories',
  '/api/menu/subcategories'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // For API requests, try the network first, then fall back to cache
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          caches.open(DATA_CACHE_NAME)
            .then((cache) => {
              // Check if this is a GET request for categories or subcategories
              if (
                event.request.method === 'GET' &&
                (event.request.url.includes('/api/menu/categories') ||
                 event.request.url.includes('/api/menu/subcategories'))
              ) {
                cache.put(event.request, responseToCache);
              }
            });
          
          return response;
        })
        .catch(() => {
          // If network request fails, try to return from cache
          return caches.match(event.request);
        })
    );
  } 
  // For non-API requests, try the cache first, then fall back to network
  else {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          
          // Clone the request
          const fetchRequest = event.request.clone();
          
          return fetch(fetchRequest).then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          });
        })
    );
  }
});

// Open the IndexedDB database
const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    request.onerror = reject;
    request.onsuccess = event => resolve(event.target.result);
  });
};

// Get pending operations from IndexedDB
const getPendingOperations = async () => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingOperations'], 'readonly');
    const store = transaction.objectStore('pendingOperations');
    const request = store.getAll();
    
    request.onerror = reject;
    request.onsuccess = event => resolve(event.result);
  });
};

// Process a pending operation
const processOperation = async (operation) => {
  try {
    // Get the token from IndexedDB
    const db = await openDatabase();
    const tokenTx = db.transaction(['meta'], 'readonly');
    const metaStore = tokenTx.objectStore('meta');
    const tokenRequest = metaStore.get('authToken');
    
    let token = null;
    await new Promise((resolve, reject) => {
      tokenRequest.onerror = reject;
      tokenRequest.onsuccess = event => {
        token = event.target.result ? event.target.result.value : null;
        resolve();
      };
    });
    
    // Create headers with Authorization token
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Make the network request
    const response = await fetch(operation.url, {
      method: operation.method,
      headers,
      body: JSON.stringify(operation.data)
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Background sync operation failed:', error);
    return false;
  }
};

// Clear a processed operation
const clearOperation = async (operationId) => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingOperations'], 'readwrite');
    const store = transaction.objectStore('pendingOperations');
    const request = store.delete(operationId);
    
    request.onerror = reject;
    request.onsuccess = () => resolve(true);
  });
};

// Background sync handler
self.addEventListener('sync', async (event) => {
  if (event.tag.startsWith('sync-operation-')) {
    // Extract the operation ID from the tag
    const operationId = event.tag.replace('sync-operation-', '');
    
    event.waitUntil(
      (async () => {
        const operations = await getPendingOperations();
        const operation = operations.find(op => op.id === operationId);
        
        if (operation) {
          const success = await processOperation(operation);
          
          if (success) {
            await clearOperation(operation.id);
          }
        }
      })()
    );
  } else if (event.tag === 'sync-all-pending') {
    event.waitUntil(
      (async () => {
        const operations = await getPendingOperations();
        
        // Process operations in order (creates first, then updates, then deletes)
        const sortedOperations = [...operations].sort((a, b) => {
          if (a.type.includes('CREATE') && !b.type.includes('CREATE')) return -1;
          if (!a.type.includes('CREATE') && b.type.includes('CREATE')) return 1;
          if (a.type.includes('UPDATE') && b.type.includes('DELETE')) return -1;
          if (a.type.includes('DELETE') && b.type.includes('UPDATE')) return 1;
          return new Date(a.timestamp) - new Date(b.timestamp);
        });
        
        for (const operation of sortedOperations) {
          const success = await processOperation(operation);
          
          if (success) {
            await clearOperation(operation.id);
          }
        }
      })()
    );
  }
});

// Periodic background sync handler
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-menu-data') {
    event.waitUntil(
      (async () => {
        try {
          // First sync any pending operations
          const operations = await getPendingOperations();
          
          for (const operation of operations) {
            const success = await processOperation(operation);
            
            if (success) {
              await clearOperation(operation.id);
            }
          }
          
          // Then refresh the cached API data
          for (const url of apiUrlsToCache) {
            const cache = await caches.open(DATA_CACHE_NAME);
            
            try {
              // Fetch fresh data
              const response = await fetch(url, {
                headers: { 'Cache-Control': 'no-cache' }
              });
              
              if (response.ok) {
                // Update the cache with fresh data
                await cache.put(url, response);
              }
            } catch (error) {
              console.error(`Failed to refresh cache for ${url}:`, error);
            }
          }
          
          console.log('Periodic sync completed successfully');
        } catch (error) {
          console.error('Periodic sync failed:', error);
        }
      })()
    );
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    event.waitUntil(
      self.registration.showNotification('Menu Manager', {
        body: data.message || 'New update available',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        data: data
      })
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // Check if there is already a window open
      for (const client of windowClients) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/dashboard/menu/categories');
      }
    })
  );
});