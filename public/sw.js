// Service Worker for Strategic Advisor
// Handles push notifications, background sync, and caching

const CACHE_NAME = 'strategic-advisor-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // Fallback for offline
        return caches.match('/index.html');
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const data = event.data ? event.data.json() : {
    title: 'Strategic Advisor',
    body: 'New alert available',
    icon: '/icon-192.png',
  };

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open', title: 'View', icon: '/icon-192.png' },
      { action: 'close', title: 'Dismiss', icon: '/icon-192.png' },
    ],
    tag: data.tag || 'strategic-alert',
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if not already open
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url || '/');
        }
      })
  );
});

// Background sync for urgent monitoring
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'check-urgent-items') {
    event.waitUntil(checkForUrgentItems());
  }
});

// Function to check for urgent items
async function checkForUrgentItems() {
  try {
    // This would call your backend API to check for urgent items
    // For now, we'll use a simple localStorage check
    const response = await fetch('/api/check-urgent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => null);

    if (response && response.ok) {
      const data = await response.json();
      
      if (data.urgentItems && data.urgentItems.length > 0) {
        // Show notification for urgent items
        await self.registration.showNotification('🚨 Strategic Advisor Alert', {
          body: `${data.urgentItems.length} urgent item(s) require your attention`,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'urgent-items',
          requireInteraction: true,
          data: { url: '/?urgent=true' },
        });
      }
    }
  } catch (error) {
    console.error('[SW] Error checking urgent items:', error);
  }
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag);
  
  if (event.tag === 'check-urgent-periodic') {
    event.waitUntil(checkForUrgentItems());
  }
});

console.log('[SW] Service Worker loaded');
