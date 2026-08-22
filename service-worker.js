var CACHE_NAME = 'hyphsworld-shell-v1';
var APP_SHELL = [
  './', './index.html', './styles.css', './homepage-upgrades.css',
  './mobile-app.css', './mobile-app.js', './app-icon.svg', './site.webmanifest'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(APP_SHELL); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) { return key !== CACHE_NAME; }).map(function (key) { return caches.delete(key); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(function (response) {
    var copy = response.clone();
    caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
    return response;
  }).catch(function () {
    return caches.match(event.request).then(function (cached) { return cached || caches.match('./index.html'); });
  }));
});
