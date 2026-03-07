const CACHE_NAME = 'miltegona-v1';
const STATIC_ASSETS = [
    '/',
    '/apie-mus/',
    '/miltelinis-dazymas/',
    '/kaina/',
    '/kontaktai/',
    '/galerija/',
    '/dazai/',
    '/sekimas/',
    '/assets/miltegona-logo-white-v4-Awv5M7Brq0SlKNEo.png',
];

// Cache-first asset types (images, fonts — rarely change)
const CACHE_FIRST_EXT = /\.(png|jpg|jpeg|webp|svg|ico|woff|woff2|ttf)(\?.*)?$/;

// Install — cache core pages and logo
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// Activate — delete old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch strategy:
// - Images/fonts: cache-first (fast, rarely change)
// - HTML/CSS/JS: network-first (always fresh, cache as offline fallback)
// - API (Supabase, EmailJS): always network only
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (event.request.method !== 'GET') return;
    if (url.hostname.includes('supabase.co')) return;
    if (url.hostname.includes('emailjs.com')) return;
    if (url.hostname.includes('fonts.googleapis.com')) return;
    if (url.hostname.includes('fonts.gstatic.com')) return;

    // Cache-first for images and fonts
    if (CACHE_FIRST_EXT.test(url.pathname)) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Network-first for HTML, CSS, JS — always fresh, cache as offline fallback
    event.respondWith(
        fetch(event.request).then(response => {
            if (response.ok && url.origin === self.location.origin) {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
        }).catch(() => {
            return caches.match(event.request).then(cached => {
                if (cached) return cached;
                if (event.request.mode === 'navigate') return caches.match('/');
            });
        })
    );
});
