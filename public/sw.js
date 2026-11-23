// Creature Circuit service worker — makes the production build playable offline.
// Pages: network-first (so updates arrive). Static assets: cache-first (hashed filenames).
const CACHE = 'creature-circuit-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com');
  if (!sameOrigin && !isFont) return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});

// The server pushed: a turn (or an offer) is waiting. Quiet if the player is already looking at the game, and
// if the open tab has just shown the same thing, it isn't rung twice.
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { /* not ours */ }
  e.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (open.some((c) => c.focused)) return;
    const shown = await self.registration.getNotifications({ tag: 'cc-turn' });
    const recent = shown.some((n) => Date.now() - ((n.data && n.data.at) || 0) < 20000);
    await self.registration.showNotification('Creature Circuit', { body: d.text || 'It\u2019s your turn!', tag: 'cc-turn', icon: 'assets/types/astral.png', renotify: !recent, silent: recent, data: { at: Date.now(), room: d.room } });
  })());
});

// A turn notification was tapped: bring the game back to the front, or open its room.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const room = e.notification.data && /^[A-Z]{5}$/.test(e.notification.data.room || '') ? `?room=${e.notification.data.room}` : '';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => (list.length ? list[0].focus() : self.clients.openWindow(`./${room}`))));
});
