const CACHE_NAME = 'bluey-pwa-cache-v3';
const API_CACHE_NAME = 'bluey-api-cache-v1';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './js/main.js',
  './js/api.js',
  './js/config.js',
  './manifest.json',
  './img/pwa-icon.png',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Caché dinámico para la API de TMDB y sus imágenes
  if (url.hostname.includes('themoviedb.org') || url.hostname.includes('tmdb.org')) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          // Vamos a la red por datos frescos
          const fetchPromise = fetch(event.request).then(networkResponse => {
            // Guardamos la respuesta en caché si fue exitosa
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(err => {
            // Si la red falla y no hay caché, tiramos el error original
            if (!response) throw err;
          });
          
          // Devolvemos el caché si existe (respuesta instantánea), de lo contrario esperamos la red
          return response || fetchPromise;
        });
      })
    );
    return; // Evitamos que caiga en la lógica normal
  }

  // Caché normal para los archivos del proyecto (App Shell)
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME, API_CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
