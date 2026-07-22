const CACHE_NAME = 'muller-delivery-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
  // እዚህ ጋር ሌሎች CSS፣ JS ወይም ምስል ፋይሎችን መጨመር ትችላለህ
];

// 1. Service Worker ሲጫን (Install ሲደረግ)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. የድሮ ፋይሎችን ለማጥፋት (Activate ሲደረግ)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. ኢንተርኔት በማይኖርበት ጊዜ (Fetch)
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

