// Adoras Service Worker - PWA Support
// Version 1.8.0 - Badge Persistence Fix

const CACHE_NAME = 'adoras-v8';
const RUNTIME_CACHE = 'adoras-runtime-v8';
const BADGE_STORE_NAME = 'adoras-badge-store';
const BADGE_DB_VERSION = 1;

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Helper: Open IndexedDB for badge persistence
async function openBadgeDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BADGE_STORE_NAME, BADGE_DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('badges')) {
        db.createObjectStore('badges');
      }
    };
  });
}

// Helper: Store badge count in IndexedDB
async function storeBadgeCount(count) {
  try {
    const db = await openBadgeDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['badges'], 'readwrite');
      const store = transaction.objectStore('badges');
      const request = store.put(count, 'totalBadgeCount');
      
      request.onsuccess = () => {
        console.log('[SW] 💾 Badge count stored in IndexedDB:', count);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SW] ❌ Failed to store badge count:', error);
  }
}

// Helper: Get badge count from IndexedDB
async function getBadgeCount() {
  try {
    const db = await openBadgeDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['badges'], 'readonly');
      const store = transaction.objectStore('badges');
      const request = store.get('totalBadgeCount');
      
      request.onsuccess = () => {
        const count = request.result || 0;
        console.log('[SW] 📖 Badge count read from IndexedDB:', count);
        resolve(count);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SW] ❌ Failed to read badge count:', error);
    return 0;
  }
}

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching assets');
        // Try to cache assets, but don't fail if some are missing
        return cache.addAll(PRECACHE_ASSETS).catch((error) => {
          console.warn('[SW] Some assets failed to cache, continuing anyway:', error);
          // Continue with installation even if caching fails
          return Promise.resolve();
        });
      })
      .then(() => {
        console.log('[SW] Skipping waiting...');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Install failed:', error);
        // Still try to skip waiting
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
        // Still try to claim clients
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
          // Cache the new version
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // If network fails, try cache
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
          // Return cached version and update in background
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

        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache if not a success
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Cache the fetched resource
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });

            return response;
          })
          .catch((error) => {
            console.error('[SW] Fetch failed:', error);
            // Could return a custom offline page here
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

// Handle push notifications - iMessage & Duolingo Style
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let notificationData = {
    title: 'Adoras',
    body: 'New memory shared!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    badgeCount: 1, // CRITICAL: Badge count for iOS
    data: {},
    type: 'message', // message, prompt, milestone
  };

  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      
      // CRITICAL: Extract badge count from data
      const badgeCount = typeof data.badge === 'number' ? data.badge : 
                        (data.data?.badgeCount || 1);
      
      console.log('[SW] 📱 iOS Badge count from notification:', badgeCount);
      
      notificationData = {
        title: data.title || 'Adoras',
        body: data.body || 'New memory shared!',
        icon: data.icon || '/icon-192.png',
        badge: '/icon-192.png', // Badge icon (keep as icon path)
        badgeCount: badgeCount, // Badge COUNT for iOS
        data: data.data || {},
        tag: data.tag || 'adoras-notification',
        type: data.type || 'message',
        requireInteraction: data.requireInteraction || false,
        image: data.image,
        silent: data.silent || false,
      };
      
      // CRITICAL: Set app badge IMMEDIATELY when push arrives (iOS PWA in background!)
      // AND persist it to IndexedDB so app can read it on foreground
      if ('setAppBadge' in navigator) {
        navigator.setAppBadge(badgeCount)
          .then(async () => {
            console.log('[SW] ✅ iOS Badge set to:', badgeCount, '(from push event, BEFORE showing notification)');
            // Persist to IndexedDB
            await storeBadgeCount(badgeCount);
          })
          .catch((badgeError) => {
            console.error('[SW] ❌ Failed to set app badge:', badgeError);
          });
      } else if (self.navigator && 'setAppBadge' in self.navigator) {
        self.navigator.setAppBadge(badgeCount)
          .then(async () => {
            console.log('[SW] ✅ iOS Badge set to:', badgeCount, '(via self.navigator)');
            // Persist to IndexedDB
            await storeBadgeCount(badgeCount);
          })
          .catch((badgeError) => {
            console.error('[SW] ❌ Failed to set app badge:', badgeError);
          });
      } else {
        console.log('[SW] ⚠️ Badge API not available in service worker context');
        // Still persist to IndexedDB even if badge API not available
        storeBadgeCount(badgeCount);
      }
      
    } catch (error) {
      console.error('[SW] Error parsing push data:', error);
      notificationData.body = event.data.text();
    }
  }

  // Determine notification style based on type
  let options = {};
  
  if (notificationData.type === 'prompt') {
    // Duolingo-style gamified daily prompt
    options = {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      vibrate: [100, 50, 100, 50, 100, 50, 200], // Fun vibration pattern
      tag: 'daily-prompt',
      requireInteraction: true, // Make it persistent like Duolingo
      data: notificationData.data,
      image: notificationData.image,
      silent: false,
      actions: [
        {
          action: 'answer',
          title: '✍️ Answer Now',
          icon: '/icon-192.png',
        },
        {
          action: 'remind',
          title: '🔔 Remind Later',
        },
      ],
      // Gamification elements
      renotify: true,
      timestamp: Date.now(),
    };
  } else if (notificationData.type === 'message' || notificationData.type === 'memory') {
    // iMessage-style notification for new messages/memories
    options = {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      vibrate: [50, 100, 50], // Short, subtle vibration like iMessage
      tag: notificationData.tag || 'adoras-message',
      requireInteraction: false,
      data: notificationData.data,
      image: notificationData.image,
      silent: notificationData.silent,
      actions: [
        {
          action: 'open',
          title: 'Open',
          icon: '/icon-192.png',
        },
        {
          action: 'reply',
          title: 'Reply',
        },
      ],
      timestamp: Date.now(),
    };
  } else if (notificationData.type === 'milestone') {
    // Celebration style for milestones
    options = {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      vibrate: [100, 50, 100, 50, 100, 50, 200, 50, 200],
      tag: 'milestone',
      requireInteraction: true,
      data: notificationData.data,
      image: notificationData.image,
      actions: [
        {
          action: 'celebrate',
          title: '🎉 View',
        },
      ],
    };
  } else {
    // Default notification
    options = {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      vibrate: [200, 100, 200],
      tag: notificationData.tag || 'adoras-notification',
      requireInteraction: notificationData.requireInteraction || false,
      data: notificationData.data,
      actions: [
        {
          action: 'open',
          title: 'Open App',
        },
        {
          action: 'close',
          title: 'Dismiss',
        },
      ],
    };
  }

  event.waitUntil(
    (async () => {
      // DEBUG: Log exactly what we're sending to iOS
      console.log('[SW] 🔔 Showing notification with:', {
        title: notificationData.title,
        body: options.body,
        fullPayload: { title: notificationData.title, ...options }
      });
      
      // Show notification
      await self.registration.showNotification(notificationData.title, options);
      
      // Update badge count for iOS (if supported)
      if ('setAppBadge' in navigator) {
        try {
          // Get current badge count from notificationData (NOT data.badgeCount)
          const badgeCount = notificationData.badgeCount || notificationData.data?.badgeCount || 1;
          console.log('[SW] 📱 Setting iOS badge to:', badgeCount);
          await navigator.setAppBadge(badgeCount);
          console.log('[SW] ✅ iOS Badge successfully set');
        } catch (error) {
          console.log('[SW] ⚠️ Badge API failed:', error);
        }
      } else {
        console.log('[SW] ⚠️ setAppBadge not available in navigator');
      }
      
      // iOS-specific: Try to vibrate even if API not available in options
      if (navigator.vibrate && options.vibrate) {
        navigator.vibrate(options.vibrate);
      }
    })()
  );
});

// Handle notification clicks - Enhanced with action handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  // Clear badge on iOS when notification is clicked
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(() => {
      // Silently fail if not supported
    });
  }

  // Handle action buttons
  if (event.action === 'close') {
    return;
  }

  if (event.action === 'remind') {
    // Reschedule notification for 2 hours later
    event.waitUntil(
      self.registration.showNotification('⏰ Daily Prompt Reminder', {
        body: 'Don\'t forget to share your memory today!',
        icon: '/icon-192.png',
        tag: 'daily-prompt-reminder',
        timestamp: Date.now() + 2 * 60 * 60 * 1000,
        actions: [
          { action: 'answer', title: '✍️ Answer Now' },
        ],
      })
    );
    return;
  }

  if (event.action === 'reply') {
    // Open app directly to chat tab
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Focus existing window if available
          for (const client of clientList) {
            if (client.url.includes(self.location.origin)) {
              client.postMessage({
                type: 'NAVIGATE_TO_CHAT',
                data: event.notification.data,
              });
              return client.focus();
            }
          }
          
          // Otherwise, open new window to chat
          if (clients.openWindow) {
            return clients.openWindow('/?tab=chat');
          }
        })
    );
    return;
  }

  if (event.action === 'answer' || event.action === 'celebrate') {
    // Open app to prompts tab
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url.includes(self.location.origin)) {
              client.postMessage({
                type: 'NAVIGATE_TO_PROMPTS',
                data: event.notification.data,
              });
              return client.focus();
            }
          }
          
          if (clients.openWindow) {
            return clients.openWindow('/?tab=prompts');
          }
        })
    );
    return;
  }

  // Default: Open app (or focus if already open)
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            return client.focus();
          }
        }
        
        // Otherwise, open new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

console.log('[SW] Service worker loaded');
