var CACHE_NAME = 'hyphsworld-shell-v2';
var RUNTIME_CACHE = 'hyphsworld-runtime-v2';
var APP_SHELL = [
  './', './index.html', './styles.css', './homepage-upgrades.css',
  './mobile-app.css', './mobile-app.js', './site-experience.css', './site-experience.js',
  './app-icon.svg', './site.webmanifest'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(APP_SHELL); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) {
      return key !== CACHE_NAME && key !== RUNTIME_CACHE;
    }).map(function (key) { return caches.delete(key); }));
  }));
  self.clients.claim();
});

function isStaticAsset(request) {
  var url = new URL(request.url);
  return /\.(?:css|js|png|jpg|jpeg|webp|gif|svg|woff2?|mp3|m4a|mp4)$/i.test(url.pathname);
}

function staleWhileRevalidate(request) {
  return caches.open(RUNTIME_CACHE).then(function (cache) {
    return cache.match(request).then(function (cached) {
      var network = fetch(request).then(function (response) {
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      }).catch(function () { return cached; });
      return cached || network;
    });
  });
}

function networkFirst(request) {
  return fetch(request).then(function (response) {
    if (response && response.ok) {
      var copy = response.clone();
      caches.open(RUNTIME_CACHE).then(function (cache) { cache.put(request, copy); });
    }
    return response;
  }).catch(function () {
    return caches.match(request).then(function (cached) {
      return cached || (request.mode === 'navigate' ? caches.match('./index.html') : Response.error());
    });
  });
}

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (isStaticAsset(event.request)) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  event.respondWith(networkFirst(event.request));
});
