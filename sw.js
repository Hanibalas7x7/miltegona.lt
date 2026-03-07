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
    '/css/style.css',
    '/css/calculator.css',
    '/css/services.css',
    '/css/about.css',
    '/css/contact.css',
    '/css/gallery.css',
    '/css/tracking.css',
    '/js/main.js',
    '/js/calculator.js',
    '/js/gallery.js',
    '/manifest.json',
    '/assets/miltegona-logo-white-v4-Awv5M7Brq0SlKNEo.png',
];

// Install — cache static assets
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

// Fetch — cache-first for static, network-first for API
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Skip non-GET and supabase API calls
    if (event.request.method !== 'GET') return;
    if (url.hostname.includes('supabase.co')) return;
    if (url.hostname.includes('emailjs.com')) return;
    if (url.hostname.includes('fonts.googleapis.com')) return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                // Cache successful same-origin responses
                if (response.ok && url.origin === self.location.origin) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => {
                // Offline fallback for navigation
                if (event.request.mode === 'navigate') {
                    return caches.match('/');
                }
            });
        })
    );
});
