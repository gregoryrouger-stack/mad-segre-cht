// Service worker minimal — sert uniquement à satisfaire les critères
// d'installabilité de Chrome (icône "Installer" dans la barre d'adresse).
// Ne fait aucune mise en cache : l'appli continue de fonctionner en ligne normalement.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // laisse passer toutes les requêtes normalement (pas de cache offline)
  event.respondWith(fetch(event.request));
});
