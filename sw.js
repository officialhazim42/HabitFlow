/**
 * HabitFlow — Service Worker
 * Versioned app-shell caching, resilient offline support,
 * safe non-sensitive asset caching, and atomic cache activation.
 */

const CACHE_NAME = 'habitflow-v1.0.0';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './habitflow_auth.html',
  './dashboard.html',
  './reset-password.html',
  './pages/privacy.html',
  './pages/terms.html',
  './favicon.svg',
  './assets/icons/favicon.svg',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-192.png',
  './assets/icons/icon-maskable-512.png',
  './assets/css/styles.css',
  './assets/css/auth.css',
  './assets/css/dashboard.css',
  './assets/css/developer-modal.css',
  './assets/js/theme.js',
  './assets/js/config.js',
  './assets/js/supabase-client.js',
  './assets/js/validation.js',
  './assets/js/profile.js',
  './assets/js/auth.js',
  './assets/js/dashboard.js',
  './assets/js/reset-password.js',
  './assets/js/pwa.js',
  './manifest.webmanifest',
  './manifest.json'
];

// Offline HTML fallback for navigation requests when network is unavailable and page is uncached
const OFFLINE_FALLBACK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#0B1220">
  <title>HabitFlow — Offline</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0B1220;
      color: #F4F7FB;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }
    .card {
      background: #111B2B;
      border: 1px solid #29384D;
      border-radius: 16px;
      padding: 36px 28px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.4);
    }
    .icon {
      width: 48px;
      height: 48px;
      margin: 0 auto 16px;
      color: #9BE15D;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    p {
      color: #9AA8BC;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      background: #9BE15D;
      color: #0B1220;
      padding: 10px 24px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      text-decoration: none;
      cursor: pointer;
      border: none;
    }
    .btn:hover {
      background: #8DD650;
    }
  </style>
</head>
<body>
  <div class="card">
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="1" y1="1" x2="23" y2="23"></line>
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
      <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
      <line x1="12" y1="20" x2="12.01" y2="20"></line>
    </svg>
    <h1>You are currently offline</h1>
    <p>HabitFlow requires an internet connection to reach this page. Previously cached pages and habit data remain available once connection is restored.</p>
    <button class="btn" onclick="window.location.reload()">Retry Connection</button>
  </div>
</body>
</html>`;

/**
 * Check if a request URL should NEVER be cached
 * Excludes remote database, authentication, backend API, and private requests
 */
function isSensitiveOrDynamic(url) {
  const parsed = new URL(url);
  // Exclude Supabase auth and rest APIs
  if (parsed.hostname.includes('supabase.co')) return true;
  if (parsed.pathname.includes('/auth/v1')) return true;
  if (parsed.pathname.includes('/rest/v1')) return true;
  // Exclude local server reminder endpoints
  if (parsed.pathname.startsWith('/api/')) return true;
  return false;
}

// Install Event — Precaching core application shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Precache static assets individually to prevent a single failure from aborting install
      await Promise.all(
        PRECACHE_ASSETS.map(asset =>
          cache.add(asset).catch(err => {
            console.warn('[HabitFlow SW] Precaching skipped for:', asset, err.message);
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate Event — Clean up obsolete cache versions and claim clients immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[HabitFlow SW] Purging obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Message Event — Support manual skipWaiting updates
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch Event — Network-first for navigation, Stale-while-revalidate for static assets
self.addEventListener('fetch', event => {
  const req = event.request;

  // Only handle GET requests; never intercept POST, PUT, DELETE, PATCH
  if (req.method !== 'GET') {
    return;
  }

  // Do not intercept chrome-extension or other non-http protocols
  if (!req.url.startsWith('http://') && !req.url.startsWith('https://')) {
    return;
  }

  // Strictly avoid caching sensitive backend/auth calls
  if (isSensitiveOrDynamic(req.url)) {
    return;
  }

  // Handle HTML Page Navigation: Network-First with Cache Fallback
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(req, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // If network failed, look for matching page in cache
          const cachedResponse = await caches.match(req);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Try matching dashboard or index as fallback if user is navigating within app
          const defaultCached = await caches.match('./dashboard.html') || await caches.match('./habitflow_auth.html');
          if (defaultCached) {
            return defaultCached;
          }
          // Return offline fallback page
          return new Response(OFFLINE_FALLBACK_HTML, {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        })
    );
    return;
  }

  // Handle Static Assets (CSS, JS, Fonts, Images, Icons, Manifest): Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then(cachedResponse => {
      const fetchPromise = fetch(req)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(req, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(err => {
          // Network failed, return cached response if available
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
