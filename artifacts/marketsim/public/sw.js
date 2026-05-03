// MarketSim AI — Service Worker v1.0
// Strategy: Cache-First for assets, Network-First for API

const CACHE_NAME = 'marketsim-v1';
const BASE = '/marketsim';

// App shell — core files to cache immediately on install
const PRECACHE_URLS = [
  BASE + '/',
  BASE + '/simulate',
  BASE + '/history',
  BASE + '/manifest.json',
  BASE + '/favicon.svg',
  BASE + '/icons/icon-192.svg',
  BASE + '/icons/icon-512.svg',
];

// ── INSTALL: precache app shell ──────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Silently ignore failed precache entries (e.g. dev env)
      });
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: clean old caches ───────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: routing strategy ──────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip non-GET and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') return;

  // 2. API calls → Network First, no cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ error: 'أنت غير متصل بالإنترنت. يرجى التحقق من اتصالك.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  // 3. Google Fonts → Network First with cache fallback
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        fetch(request)
          .then((response) => {
            cache.put(request, response.clone());
            return response;
          })
          .catch(() => cache.match(request))
      )
    );
    return;
  }

  // 4. Static assets (JS, CSS, images, fonts) → Cache First
  if (
    url.pathname.match(/\.(js|css|svg|png|jpg|jpeg|webp|woff|woff2|ttf|ico)$/) ||
    url.pathname.includes('/assets/')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 5. Navigation requests (HTML pages) → Network First, cache fallback
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(BASE + '/').then(
            (cached) =>
              cached ||
              new Response(
                `<!DOCTYPE html><html lang="ar" dir="rtl">
                <head><meta charset="UTF-8"><title>MarketSim AI — غير متصل</title>
                <meta name="viewport" content="width=device-width,initial-scale=1">
                <style>body{background:#06040f;color:#fff;font-family:Tajawal,sans-serif;
                display:flex;flex-direction:column;align-items:center;justify-content:center;
                min-height:100vh;margin:0;text-align:center;gap:16px}
                h1{font-size:32px;font-weight:900}p{color:rgba(255,255,255,0.5);font-size:16px}
                button{background:linear-gradient(135deg,#8b5cf6,#6d28d9);border:none;
                color:#fff;padding:14px 32px;border-radius:12px;font-size:15px;
                cursor:pointer;font-family:inherit;font-weight:700}</style></head>
                <body>
                  <div style="font-size:56px">📡</div>
                  <h1>MarketSim AI</h1>
                  <p>أنت غير متصل بالإنترنت حالياً</p>
                  <p style="font-size:13px;max-width:280px">تحتاج اتصالاً لتشغيل المحاكاة. تحقق من اتصالك وحاول مجدداً.</p>
                  <button onclick="location.reload()">🔄 إعادة المحاولة</button>
                </body></html>`,
                { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
              )
          )
        )
    );
    return;
  }

  // 6. Everything else → Network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ── BACKGROUND SYNC: retry failed simulations ────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
