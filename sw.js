/* TOTAL4COACH · modo sin conexión (service worker)
   - Al abrir la app con conexión se guardan en el dispositivo todos sus archivos.
   - Con conexión: se usa siempre la versión más reciente publicada (y se actualiza la copia guardada).
   - Sin conexión (o con wifi muy lenta): se usa la copia guardada. Tus DATOS nunca pasan por aquí: viven en el dispositivo.
   Al publicar una versión nueva, cambia VERSION (así se limpia la copia antigua). */
const VERSION = '2.1.1';
const CACHE = 't4c-' + VERSION;
const LOCAL = ['./', 'index.html', 'manifest.webmanifest',
  'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'icons/favicon.ico', 'icons/favicon.svg',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  'ext/vtc-safe.js', 'ext/vtc-sports.js', 'ext/vtc-library.js', 'ext/vtc-groups.js', 'ext/vtc-pdf.js', 'ext/vtc-isolation.js'];
/* Librerías que la app descarga bajo demanda (importar listas de Excel/PDF en Grupos). Si no hay red al instalar, se ignoran. */
const CDN = ['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'];
const TIMEOUT = 2500;

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(LOCAL.map(u => c.add(new Request(u, { cache: 'reload' }))));   // todo o nada: la copia local debe estar completa
    await Promise.all(CDN.map(async u => { try { const r = await fetch(u, { mode: 'no-cors' }); await c.put(u, r); } catch (_) {} }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('t4c-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function fromCache(req) {
  const c = await caches.open(CACHE);
  let r = await c.match(req, { ignoreSearch: true });
  if (!r && req.mode === 'navigate') r = (await c.match('index.html')) || (await c.match('./'));
  return r;
}

async function networkFirst(req) {
  if (self.navigator && self.navigator.onLine === false) {
    const r = await fromCache(req); if (r) return r;
  }
  const net = fetch(req, { cache: 'no-cache' }).then(async res => {
    if (res && res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
    return res;
  });
  const timer = new Promise(res => setTimeout(() => res(null), TIMEOUT));
  try {
    const first = await Promise.race([net, timer]);
    if (first) return first;
    const cached = await fromCache(req);          // red lenta: copia guardada
    return cached || net;
  } catch (_) {
    const cached = await fromCache(req);          // sin red
    if (cached) return cached;
    throw _;
  }
}

async function cacheFirst(req) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req.url);
  if (hit) return hit;
  const res = await fetch(req);
  try { if (res && (res.ok || res.type === 'opaque')) c.put(req.url, res.clone()); } catch (_) {}
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (/\/sw\.js$/.test(url.pathname)) return;     // el propio service worker siempre desde la red
    e.respondWith(networkFirst(req));
  } else if (CDN.indexOf(req.url) >= 0) {
    e.respondWith(cacheFirst(req));
  }
  /* el resto (YouTube, modelo de IA de AutoCam...) necesita Internet y no se toca */
});
