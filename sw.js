const CACHE_NAME = 'tio-do-quiz-cache-v3'; // Versão do cache atualizada
// Lista de arquivos para armazenar em cache para funcionamento offline.
const urlsToCache = [
  '/',
  'index.html',
  'style.css',
  'script.js',
  'constants.js',
  'state.js',
  'ui.js',
  'game.js',
  'api.js',
  'recording.js', // Adicionado novo módulo
  'files/logo.png',
  'files/BG.mp4',
  'files/tick.mp3',
  'files/correct.mp3',
  'files/final.mp3',
  'files/icon-192.png',
  'files/icon-512.png',
  'manifest.json'
];

// Evento de Instalação: Adiciona os arquivos ao cache.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        // Adiciona todos os arquivos de uma vez
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Força o novo service worker a assumir o controle imediatamente
        return self.skipWaiting();
      })
  );
});

// NOVO EVENTO: Ativação e Limpeza de Caches Antigos
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        // Assume o controle de todas as abas abertas imediatamente
        return self.clients.claim();
    })
  );
});


// Evento de Fetch: Serve os arquivos do cache primeiro, se disponíveis.
self.addEventListener('fetch', event => {
  // Ignora requisições da API Gemini
  if (event.request.url.includes('generativelanguage.googleapis.com')) {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se encontrar no cache, retorna o arquivo cacheado.
        if (response) {
          return response;
        }
        // Senão, busca na rede.
        return fetch(event.request);
      })
  );
});

