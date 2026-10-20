// Terra Compute service worker (plain JS, not bundled).
// Scope is the folder this file lives in: the site root, or /TERRA_COMPUTE_GAME/ on GitHub Pages.
// - Same-origin GET of hashed build files under assets/ (name-HASH.js/.css/.woff2): cache-first. Images and the
//   ~250 MB of videos are left to the normal HTTP cache, so the service worker never grows huge or serves stale art.
// - App shell (navigations and index.html): network-first with cache fallback, so updates arrive when online.
// - Never intercepts non-GET requests, cross-origin requests (Nostr relays, TURN, CDNs) or Range requests (media).
const CACHE_VERSION = 'v2';
const CACHE = `terra-compute-${CACHE_VERSION}`;
const SCOPE = self.registration.scope; // absolute URL ending in '/'
const SHELL = `${SCOPE}index.html`;
const ASSETS = `${SCOPE}assets/`;
const HASHED = /-[A-Za-z0-9_-]{8}\.(?:js|css|woff2?)$/;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // best effort: a failed precache must not block installation
    await cache.add(new Request(SHELL, { cache: 'reload' })).catch(() => {});
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('terra-compute-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(SCOPE)) return;
  if (req.headers.has('range')) return; // partial responses cannot be cached; let the browser handle media seeking

  if (req.mode === 'navigate' || url.href === SHELL) {
    event.respondWith(networkFirst(req));
  } else if (url.href.startsWith(ASSETS) && HASHED.test(url.pathname)) {
    event.respondWith(cacheFirst(req));
  }
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(SHELL, res.clone()).catch(() => {});
    return res;
  } catch {
    return (await cache.match(SHELL)) || Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.status === 200) cache.put(req, res.clone()).catch(() => {});
  return res;
}
