/* Service Worker — PWA cho Sweet Premium Store
 * Chiến lược: network-first cho mọi GET cùng origin (luôn lấy bản mới khi online),
 * chỉ dùng cache khi offline. KHÔNG cache API. An toàn, không gây kẹt bản cũ.
 */
const CACHE = 'sps-cache-v1';
const PRECACHE = ['/', '/static/styles.css', '/static/candy-icon.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;     // bỏ qua CDN/cross-origin
  if (url.pathname.startsWith('/api/')) return;          // không can thiệp API

  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('/')))
  );
});
