// Service worker minimal : met en cache les fichiers pour usage hors ligne
var CACHE = 'facture-app-v10';
var FILES = [
  'index.html',
  'styles.css',
  'app.js',
  'manifest.json',
  'assets/logo-continental.png',
  'assets/logo-sailun.png',
  'assets/logo-michelin.png',
  'assets/logo-pirelli.png',
  'assets/logo-lassa.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(FILES);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) {
      if (k !== CACHE) return caches.delete(k);
    }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  if (e.request.url.indexOf(self.location.origin) !== 0) return;
  e.respondWith(
    caches.match(e.request).then(function (r) {
      return r || fetch(e.request);
    })
  );
});
