// Service Worker to intercept synchronous XMLHttpRequest calls from Pyodide Web Worker
const pendingRequests = new Map();

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname === '/api/input') {
    const promptText = url.searchParams.get('prompt') || 'Input requested by Python script:';
    const requestId = Math.random().toString(36).substring(7);
    
    const responsePromise = new Promise((resolve) => {
      pendingRequests.set(requestId, resolve);
    });

    // Notify all open client pages about the input request
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'INPUT_REQUEST',
          requestId,
          prompt: promptText
        });
      });
    });

    event.respondWith(
      responsePromise.then((text) => {
        return new Response(text, {
          headers: { 
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-cache'
          }
        });
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INPUT_RESPONSE') {
    const { requestId, text } = event.data;
    const resolve = pendingRequests.get(requestId);
    if (resolve) {
      resolve(text);
      pendingRequests.delete(requestId);
    }
  } else if (event.data && event.data.type === 'CLAIM_CLIENTS') {
    self.clients.claim();
  }
});
