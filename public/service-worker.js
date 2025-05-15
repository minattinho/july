const CACHE_NAME = 'financeiro-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/js/0.chunk.js',
  '/static/js/bundle.js',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// Instalação do service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Ativação do service worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
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

// Estratégia de cache e network
self.addEventListener('fetch', event => {
  // Verificar se é uma requisição de API do Firebase
  if (event.request.url.includes('firebaseio.com') || 
      event.request.url.includes('googleapis.com')) {
    // Para APIs, sempre tente a rede primeiro
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    // Para arquivos estáticos, use cache com fallback para network
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Cache hit - retorna a resposta do cache
          if (response) {
            return response;
          }
          
          // Clone da requisição para poder usá-la várias vezes
          const fetchRequest = event.request.clone();
          
          return fetch(fetchRequest)
            .then(response => {
              // Verificar se obteve uma resposta válida
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Clone da resposta para poder usá-la várias vezes
              const responseToCache = response.clone();
              
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
                
              return response;
            })
            .catch(() => {
              // Se a rede falhar e não tivemos cache, retornar uma página offline
              if (event.request.mode === 'navigate') {
                return caches.match('/offline.html');
              }
            });
        })
    );
  }
});

// Sincronizar dados quando online novamente
self.addEventListener('sync', event => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  }
});

// Função para sincronizar transações
async function syncTransactions() {
  try {
    // Recupera transações offline do IndexedDB ou localStorage
    const offlineData = localStorage.getItem('offlineTransactions');
    
    if (offlineData) {
      const offlineTransactions = JSON.parse(offlineData);
      
      if (offlineTransactions.length > 0) {
        // Envia notificação de sincronização
        self.registration.showNotification('Organizador Financeiro', {
          body: 'Sincronizando suas transações...',
          icon: '/logo192.png'
        });
        
        // Aqui você enviaria as transações para o servidor
        // Como estamos usando Firebase, a sincronização será
        // feita pela aplicação quando ela estiver online
      }
    }
  } catch (error) {
    console.error('Erro ao sincronizar transações:', error);
  }
}