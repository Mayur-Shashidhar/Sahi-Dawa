const OFFLINE_CACHE_NAME = 'sahidawa-offline-v1';
const API_CACHE_NAME = 'sahidawa-api-v1';
const STATIC_CACHE_NAME = 'sahidawa-static-v1';

// List of routes that should be available offline
const OFFLINE_PAGES = [
  '/',
  '/en',
  '/hi',
  '/offline',
];

// Cache static assets on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_PAGES).catch(() => {
        // Silently fail if pages can't be cached
        console.log('Some pages could not be cached during install');
      });
    })
  );
  self.skipWaiting();
});

// Clean up old caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(
            (cacheName) =>
              cacheName !== OFFLINE_CACHE_NAME &&
              cacheName !== API_CACHE_NAME &&
              cacheName !== STATIC_CACHE_NAME
          )
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

// Network-first strategy for API calls, fall back to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // API requests: network first, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok) {
            const cache = caches.open(API_CACHE_NAME);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Return cached response if network fails
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline page if nothing is cached
            return caches.match('/').then((offlineResponse) => {
              return (
                offlineResponse ||
                new Response(
                  JSON.stringify({
                    error: 'You are offline and this page is not cached',
                  }),
                  { status: 503, headers: { 'Content-Type': 'application/json' } }
                )
              );
            });
          });
        })
    );
    return;
  }

  // HTML documents: network first for navigation, cache for back button
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful HTML responses
          if (response.ok) {
            const cache = caches.open(OFFLINE_CACHE_NAME);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Try to return cached version
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline page as fallback
            return caches.match('/').catch(() => {
              return new Response(
                'Offline - this page is not available in offline mode',
                { status: 503 }
              );
            });
          });
        })
    );
    return;
  }

  // Static assets: cache first, network fallback
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request)
          .then((response) => {
            // Cache successful responses
            if (response.ok) {
              const cache = caches.open(STATIC_CACHE_NAME);
              cache.then((c) => c.put(request, response.clone()));
            }
            return response;
          })
          .catch(() => {
            // Return placeholder for images if offline
            if (request.destination === 'image') {
              return caches.match('/images/placeholder.png').catch(() => {
                return new Response(
                  '<svg><rect width="100" height="100" fill="#ccc"/></svg>',
                  { headers: { 'Content-Type': 'image/svg+xml' } }
                );
              });
            }
            return new Response('Offline', { status: 503 });
          });
      })
    );
    return;
  }
});

// Handle push notifications
self.addEventListener("push", (event) => {
    const payload = event.data
        ? event.data.json()
        : {
              title: "Medicine recall alert",
              body: "A medicine recall alert was issued.",
              url: "/alerts",
          };

    event.waitUntil(
        self.registration.showNotification(payload.title || "Medicine recall alert", {
            body: payload.body || payload.recallReason,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            data: {
                url: payload.url || "/alerts",
                medicineName: payload.medicineName,
                recallReason: payload.recallReason,
            },
            tag: payload.medicineName ? `recall-${payload.medicineName}` : "medicine-recall",
            requireInteraction: payload.severity === "critical",
        })
    );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || "/alerts";

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if ("focus" in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }

            return self.clients.openWindow(targetUrl);
        })
    );
});
