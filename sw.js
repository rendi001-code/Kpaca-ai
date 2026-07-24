const CACHE = "kpaca-ai-v2.3";
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE)));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
