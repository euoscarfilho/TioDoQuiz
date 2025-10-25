const CACHE_NAME = 'tio-do-quiz-cache-v5'; // Versão do cache atualizada
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
  // REMOVEMOS os arquivos de mídia pesados (mp4, mp3) do cache
  'files/logo.png',
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
  
  // CORREÇÃO: Ignora APIs externas e arquivos de mídia (streaming)
  const url = event.request.url;
  if (
    url.includes('generativelanguage.googleapis.com') || 
    url.includes('api.elevenlabs.io') ||
    url.includes('.mp4') ||
    url.includes('.mp3')
  ) {
    return fetch(event.request); // Deixa o navegador lidar com isso
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se encontrar no cache, retorna o arquivo cacheado.
        if (response) {
          return response;
        }
        
        // Senão, busca na rede, clona e salva no cache
        return fetch(event.request).then(
          (networkResponse) => {
            // Verifica se a resposta é válida
            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clona a resposta. Um stream só pode ser consumido uma vez.
            // Precisamos de um clone para o cache e outro para o navegador.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        );
      })
  );
});

