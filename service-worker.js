var CACHE_NAME = 'hyphsworld-shell-v3';
var RUNTIME_CACHE = 'hyphsworld-runtime-v3';
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
      return /^hyphsworld-(shell|runtime)-/.test(key) && key !== CACHE_NAME && key !== RUNTIME_CACHE;
    }).map(function (key) { return caches.delete(key); }));
  }).then(function () { return self.clients.claim(); }));
});

function remember(request, response, event) {
  if (!response || !response.ok) return;
  var copy = response.clone();
  event.waitUntil(caches.open(RUNTIME_CACHE).then(function (cache) {
    return cache.put(request, copy);
  }).catch(function () {})); // Full or unavailable storage must not break loading.
}

function fallback(request) {
  return caches.match(request).then(function (cached) {
    if (cached) return cached;
    var path = new URL(request.url).pathname;
    if (request.mode === 'navigate' && (path === '/' || path === '/index.html')) {
      return caches.match('./index.html').then(function (home) { return home || Response.error(); });
    }
    return Response.error(); // Never substitute the homepage for another page or a script.
  }).catch(function () { return Response.error(); });
}

function networkFirst(request, event) {
  return fetch(request).then(function (response) {
    if (response.status >= 500) {
      return caches.match(request).then(function (cached) { return cached || response; })
        .catch(function () { return response; });
    }
    remember(request, response, event);
    return response;
  }).catch(function () { return fallback(request); });
}

function staleWhileRevalidate(request, event) {
  var network = fetch(request).then(function (response) {
    remember(request, response, event);
    return response;
  });
  event.waitUntil(network.catch(function () {}));
  return caches.match(request).catch(function () { return undefined; }).then(function (cached) {
    return cached || network.catch(function () { return Response.error(); });
  });
}

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Stream media directly; full tracks/videos and partial responses do not belong in the shell cache.
  if (event.request.headers.has('range') || /\.(?:mp3|m4a|mp4|webm|zip|pdf)$/i.test(url.pathname)) return;
  if (/\.(?:png|jpg|jpeg|webp|gif|svg|woff2?)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event.request, event));
    return;
  }
  // HTML, scripts, and styles must agree with the latest deployment.
  event.respondWith(networkFirst(event.request, event));
});
