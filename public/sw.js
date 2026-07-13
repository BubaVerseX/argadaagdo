const CACHE_VERSION = "argadaagdo-v1";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL = "/offline";

const APP_SHELL_URLS = [
  OFFLINE_URL,
  "/manifest.json",
  "/icons/argadaagdo-icon.svg",
  "/icons/argadaagdo-maskable.svg",
];

// The offline page is a "use client" route: its pre-rendered HTML references
// a set of build-hashed /_next/static chunks it needs to hydrate. Precaching
// only the HTML isn't enough — if those specific chunks were never fetched
// before going offline, hydration throws a ChunkLoadError that the app's own
// error boundary catches, replacing the offline message with a generic error
// screen. Parse the real HTML for its script/style dependencies at install
// time so this stays correct across rebuilds without hardcoding chunk names.
async function offlinePageDependencies() {
  const response = await fetch(OFFLINE_URL);
  const html = await response.text();
  const matches = html.matchAll(/(?:src|href)="(\/_next\/[^"]+)"/g);
  const urls = new Set();

  for (const match of matches) {
    urls.add(match[1]);
  }

  return [...urls];
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      await cache.addAll(APP_SHELL_URLS);

      const dependencies = await offlinePageDependencies().catch(() => []);
      await Promise.all(
        dependencies.map((dependencyUrl) =>
          cache.add(dependencyUrl).catch(() => {})
        )
      );

      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("argadaagdo-") && key !== APP_SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never intercept cross-origin calls (Supabase, etc.) or this app's own
  // API routes — those must always hit the network untouched.
  if (url.origin !== self.location.origin || isApiRequest(url)) return;

  // Full-page navigations: network-first so users always get the freshest
  // app shell when online, falling back to a cached copy or the offline
  // page only when the network is unavailable.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseCopy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseCopy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || (await caches.match(OFFLINE_URL));
        })
    );
    return;
  }

  // Static, same-origin assets (Next.js build output, icons, images):
  // cache-first, refreshing the cache in the background.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            const responseCopy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseCopy));
            return response;
          })
          .catch(() => cached);

        return cached || networkFetch;
      })
    );
  }
});
