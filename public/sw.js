// Adoras Service Worker - PWA Support
// Version 2.0.5 - CRITICAL FIX: Cleaned push handler for iOS + Force Update

const CACHE_NAME = 'adoras-v15';
const RUNTIME_CACHE = 'adoras-runtime-v15';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching assets');
        return cache.addAll(PRECACHE_ASSETS).catch((error) => {
          console.warn('[SW] Some assets failed to cache, continuing anyway:', error);
          return Promise.resolve();
        });
      })
      .then(() => {
        console.log('[SW] Skipping waiting...');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Install failed:', error);
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        console.log('[SW] Current caches:', cacheNames);
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients...');
        return self.clients.claim();
      })
      .then(() => {
        console.log('[SW] ✅ Service worker activated and ready!');
      })
      .catch((error) => {
        console.error('[SW] Activation error:', error);
        return self.clients.claim();
      })
  );
});

// Fetch event - network first, then cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // API requests - network only (don't cache user data)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // For navigation requests, use network first strategy
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((response) => {
              return response || caches.match('/');
            });
        })
    );
    return;
  }

  // For other requests (CSS, JS, images), use cache first strategy
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          fetch(request)
            .then((response) => {
              if (response && response.status === 200) {
                const responseClone = response.clone();
                caches.open(RUNTIME_CACHE).then((cache) => {
                  cache.put(request, responseClone);
                });
              }
            })
            .catch(() => {
              // Network error, but we have cache
            });
          return cachedResponse;
        }

        return fetch(request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });

            return response;
          })
          .catch((error) => {
            console.error('[SW] Fetch failed:', error);
            throw error;
          });
      })
  );
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skipping waiting...');
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] Clearing all caches...');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// CRITICAL: Handle push notifications - iOS Compatible
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let title = 'Adoras';
  let body = 'New message!';
  let badgeCount = 1;
  let notificationData = {};
  
  // Parse push data
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[SW] Push data:', data);
      
      // CRITICAL: Handle APNS format (iOS) vs standard web push
      if (data.aps) {
        // iOS APNS format: { aps: { alert: { title, body }, badge: N } }
        title = data.aps.alert?.title || data.title || 'Adoras';
        body = data.aps.alert?.body || data.body || 'New message!';
        badgeCount = typeof data.aps.badge === 'number' ? data.aps.badge : 1;
        notificationData = data.data || data;
        console.log('[SW] iOS APNS format - title:', title, 'badge:', badgeCount);
      } else {
        // Standard web push format: { title, body, badge, data: { badgeCount } }
        title = data.title || 'Adoras';
        body = data.body || 'New message!';
        // Try multiple sources for badge count (all should match from backend)
        badgeCount = typeof data.badge === 'number' ? data.badge : 
                     (data.data?.badgeCount || data.badgeCount || 1);
        notificationData = data.data || data;
        console.log('[SW] Web push format - title:', title, 'badge:', badgeCount);
      }
      
      // CRITICAL FIX v2.2.1: Set iOS App Badge immediately
      // This ensures the home screen icon shows the correct count
      if ('setAppBadge' in navigator) {
        try {
          navigator.setAppBadge(badgeCount);
          console.log('[SW] ✅ iOS App Badge set to:', badgeCount);
        } catch (badgeError) {
          console.error('[SW] ❌ Failed to set app badge:', badgeError);
        }
      }
      
      // Persist badge to IndexedDB for app restoration
      try {
        const dbRequest = indexedDB.open('adoras-badge-store', 1);
        dbRequest.onsuccess = (e) => {
          const db = e.target.result;
          const transaction = db.transaction(['badges'], 'readwrite');
          const store = transaction.objectStore('badges');
          store.put(badgeCount, 'totalBadgeCount');
          console.log('[SW] Badge persisted to IndexedDB:', badgeCount);
        };
        dbRequest.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('badges')) {
            db.createObjectStore('badges');
          }
        };
      } catch (error) {
        console.error('[SW] IndexedDB error:', error);
      }
      
    } catch (error) {
      console.error('[SW] Error parsing push data:', error);
      body = event.data.text ? event.data.text() : 'New message!';
    }
  }
  
  // Show notification
  const options = {
    body: body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'adoras-message',
    data: notificationData,
    requireInteraction: false,
    vibrate: [50, 100, 50],
    timestamp: Date.now()
  };
  
  console.log('[SW] Showing notification - title:', title, 'body:', body, 'badge:', badgeCount);
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  // Clear badge when notification is clicked
  if (typeof navigator.clearAppBadge === 'function') {
    navigator.clearAppBadge().catch(() => {});
  }

  // Handle action buttons
  if (event.action === 'close') {
    return;
  }

  if (event.action === 'reply') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url.includes(self.location.origin)) {
              client.postMessage({
                type: 'NAVIGATE_TO_CHAT',
                data: event.notification.data,
              });
              return client.focus();
            }
          }
          
          if (clients.openWindow) {
            return clients.openWindow('/?tab=chat');
          }
        })
    );
    return;
  }

  // Default: Open app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            // Send message to app to handle prompt if this is a prompt notification
            const notificationData = event.notification.data || {};
            if (notificationData.promptQuestion) {
              // This is a prompt - tell the app to show it
              client.postMessage({
                type: 'SHOW_PROMPT',
                data: notificationData,
              });
            }
            return client.focus();
          }
        }
        
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

console.log('[SW] Service worker loaded - v2.0.4');
