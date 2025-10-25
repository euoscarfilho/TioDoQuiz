const CACHE_NAME = 'tio-do-quiz-cache-v4'; // Aumentei a versão para forçar a atualização
// Lista de arquivos para armazenar em cache para funcionamento offline.
const urlsToCache = [
  '.', // Adiciona o diretório raiz
  'index.html',
  'style.css',
  'script.js',
  'constants.js',
  'state.js',
  'ui.js',
  'game.js',
  'api.js',
  'recording.js',
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

// Evento de Ativação: Limpa caches antigos
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Se o nome do cache não estiver na nossa lista de permissões (que só tem o cache atual),
          // ele será deletado. Isso remove caches de versões antigas.
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
  // Ignora requisições para a API Gemini (ou outras APIs externas)
  if (event.request.url.includes('generativelanguage.googleapis.com') || event.request.url.includes('api.elevenlabs.io')) {
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

