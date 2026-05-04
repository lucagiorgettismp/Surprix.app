const CACHE_STATIC = 'surprix-static-v1'
const CACHE_IMAGES = 'surprix-images-v1'
const CACHE_API = 'surprix-api-v1'

// --- Install: pre-cacha la shell ---
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => cache.addAll(['/']))
  )
  self.skipWaiting()
})

// --- Activate: rimuovi cache vecchie ---
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_STATIC && k !== CACHE_IMAGES && k !== CACHE_API)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// --- Fetch ---
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // Solo richieste GET
  if (e.request.method !== 'GET') return

  // API collections (missing/doubles) → staleWhileRevalidate
  if (url.pathname.startsWith('/api/collections')) {
    e.respondWith(staleWhileRevalidate(e.request))
    return
  }

  // Immagini Firebase Storage → cache con TTL 24h
  if (url.hostname === 'firebasestorage.googleapis.com') {
    e.respondWith(handleImage(e.request))
    return
  }

  // index.html → network-first (garantisce aggiornamenti)
  if (url.pathname === '/' || url.pathname.endsWith('/index.html')) {
    e.respondWith(networkFirst(e.request))
    return
  }

  // Asset statici (JS, CSS, font, svg) → cache-first
  if (url.pathname.match(/\.(js|css|woff2?|svg|png|ico|webp)$/)) {
    e.respondWith(cacheFirst(e.request))
    return
  }
})

// --- Strategie ---

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    const cache = await caches.open(CACHE_STATIC)
    cache.put(request, response.clone())
    return response
  } catch {
    return new Response('', { status: 503 })
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    const cache = await caches.open(CACHE_STATIC)
    cache.put(request, response.clone())
    return response
  } catch {
    const cached = await caches.match(request)
    return cached || new Response('', { status: 503 })
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_API)
  const cached = await cache.match(request)

  // Richiesta in background per aggiornare la cache
  const fetchPromise = fetch(request)
    .then((response) => {
      cache.put(request, response.clone())
      return response
    })
    .catch(() => null)

  // Servi dalla cache subito se disponibile, altrimenti aspetta la rete
  return cached || fetchPromise
}

async function handleImage(request) {
  const cache = await caches.open(CACHE_IMAGES)
  const cached = await cache.match(request)

  // Aggiorna sempre in background (stale-while-revalidate)
  const fetchPromise = fetch(request)
    .then((response) => { cache.put(request, response.clone()); return response })
    .catch(() => null)

  // Servi dalla cache subito se disponibile, altrimenti aspetta la rete
  return cached || fetchPromise
}
