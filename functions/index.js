const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onRequest, onCall } = require('firebase-functions/v2/https')
const { defineSecret }      = require('firebase-functions/params')
const { logger }            = require('firebase-functions')
const admin                 = require('firebase-admin')

admin.initializeApp({ databaseURL: 'https://collectionhelper.firebaseio.com' })
const db = admin.database()

const telegramToken   = defineSecret('TELEGRAM_TOKEN')
const TELEGRAM_CHAT_ID = '135432052'

// --- Parametri algoritmo ---
const T2         = 0.80
const T3         = 0.93
const MIN_INT    = 3
const MIN_RECENT = 5
const MIN_M3     = 12   // soglia mancanti per ★★★ con d >= 2
const MIN_M3_D1  = 12   // soglia mancanti per ★★★ con d == 1
const MIN_M3_D0  = 18   // soglia mancanti per ★★★ con d == 0
const MIN_M2_HP  = 6    // soglia mancanti per ★★ — Hand_painted
const MIN_M2_CO  = 10   // soglia mancanti per ★★ — Compo
const MIN_M2_DEF = 12   // soglia mancanti per ★★ — default

// --- Helpers ---
const rawScore = (m, d) => (m + d) === 0 ? 0 : m / (m + d)

const getMinM2 = (cat) =>
  cat === 'Hand_painted' ? MIN_M2_HP : cat === 'Compo' ? MIN_M2_CO : MIN_M2_DEF

const assignRarity = (m, d, cat) => {
  const ratio = rawScore(m, d)
  const minM2 = getMinM2(cat)
  if (ratio >= T3) {
    if (d >= 2 && m >= MIN_M3)     return 3
    if (d === 1 && m >= MIN_M3_D1) return 3
    if (d === 0 && m >= MIN_M3_D0) return 3
  }
  if (ratio >= T2 && m >= minM2) return 2
  return 1
}

const sendTelegram = async (token, text) => {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
  }).catch(err => logger.warn('Telegram notify failed', err))
}

// --- Funzione principale ---
const calcRarityAuto = async () => {
  logger.info('calcRarityAuto: start')

  const [surprisesSnap, missingsSnap, doublesSnap] = await Promise.all([
    db.ref('surprises').once('value'),
    db.ref('missings').once('value'),
    db.ref('surprise_doubles').once('value'),
  ])

  // Contatori globali
  const mc = {}, dc = {}
  missingsSnap.forEach(u => u.forEach(i => { mc[i.key] = (mc[i.key] || 0) + 1 }))
  doublesSnap.forEach(s => { dc[s.key] = Object.keys(s.val() || {}).length })

  // Ultime 2 annate per KS e KM
  const yearsByP = {}
  surprisesSnap.forEach(c => {
    const s = c.val(); const p = s.set_producer_id; const y = Number(s.set_year_year)
    if (!p || !y) return
    if (!yearsByP[p]) yearsByP[p] = new Set()
    yearsByP[p].add(y)
  })

  const skipMap = {}, mostRecentYear = {}
  for (const p of ['Kinder_Sorpresa', 'Kinder_Merendero']) {
    if (!yearsByP[p]) continue
    const sorted = [...yearsByP[p]].sort((a, b) => b - a)
    skipMap[p] = new Set(sorted.slice(0, 2))
    mostRecentYear[p] = sorted[0]
  }

  logger.info('Target anni', { KS: [...(skipMap['Kinder_Sorpresa'] || [])], KM: [...(skipMap['Kinder_Merendero'] || [])] })

  // Calcola e aggiorna
  const updates = {}
  let assigned = 0, skipped = 0

  surprisesSnap.forEach(c => {
    const s = c.val()
    const p = s.set_producer_id; const y = Number(s.set_year_year)
    if (!skipMap[p]?.has(y)) return

    // Non sovrascrivere rarità impostate manualmente
    if (s.rarity != null && s.rarity_auto === false) return

    const m = mc[c.key] || 0
    const d = dc[c.key] || 0
    const isRecent = y === mostRecentYear[p]
    const threshold = isRecent ? MIN_RECENT : MIN_INT

    if (m + d < threshold) { skipped++; return }

    const rarity = assignRarity(m, d, s.set_category || '')
    updates[`surprises/${c.key}/rarity`]        = rarity
    updates[`surprises/${c.key}/rarity_auto`]   = true
    updates[`surprises/${c.key}/missing_count`] = m
    updates[`surprises/${c.key}/double_count`]  = d
    assigned++
  })

  logger.info(`Assegnate: ${assigned} | Skippate: ${skipped}`)

  // Scrivi in chunk da 500
  const entries = Object.entries(updates)
  for (let i = 0; i < entries.length; i += 500) {
    await db.ref().update(Object.fromEntries(entries.slice(i, i + 500)))
  }

  logger.info('calcRarityAuto: done')
  return { assigned, skipped }
}

// Schedulata ogni 2 giorni alle 3:00 (Europe/Rome)
exports.calcRarityAutoWeekly = onSchedule(
  { schedule: '0 3 */2 * *', timeZone: 'Europe/Rome', region: 'europe-west1', secrets: [telegramToken] },
  async () => {
    const { assigned, skipped } = await calcRarityAuto()
    await sendTelegram(
      telegramToken.value(),
      `Surprix — calcolo rarita completato\nAssegnate: ${assigned}\nSkippate: ${skipped}`
    )
  }
)

// Callable manuale via Firebase Console o CLI
exports.calcRarityAutoManual = onCall(
  { region: 'europe-west1', secrets: [telegramToken] },
  async (req) => {
    if (!req.auth) throw new Error('Unauthenticated')
    const { assigned, skipped } = await calcRarityAuto()
    await sendTelegram(
      telegramToken.value(),
      `Surprix — calcolo rarita completato (manuale)\nAssegnate: ${assigned}\nSkippate: ${skipped}`
    )
    return { success: true, assigned, skipped }
  }
)

// --- OG meta injector per /u/:username ---
const RTDB_URL    = 'https://collectionhelper.firebaseio.com'
const HOSTING_URL = 'https://surprix.app'

const escapeHtml = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')

exports.profilemeta = onRequest(
  { region: 'europe-west1', invoker: 'public' },
  async (req, res) => {
    const match = req.path.match(/^\/u\/([^/?#]+)/)
    if (!match) { res.status(404).send('Not found'); return }
    const username = match[1]

    const [profileRes, pageRes] = await Promise.all([
      fetch(`${RTDB_URL}/users/${username}.json`).catch(() => null),
      fetch(`${HOSTING_URL}/index.html`).catch(() => null),
    ])

    const profile = profileRes?.ok ? await profileRes.json().catch(() => null) : null
    const html    = pageRes?.ok    ? await pageRes.text()                       : null

    if (!html) { res.status(503).send('Service unavailable'); return }

    const title = escapeHtml(`${username} — Surprix`)
    const desc  = escapeHtml(
      profile
        ? `Scopri la collezione di ${username} su Surprix.`
        : 'Tieni in ordine le tue collezioni di sorprese Kinder.'
    )
    const modified = html
      .replace(/(<meta\s+property="og:title"[^>]*>)/i,        `<meta property="og:title" content="${title}"/>`)
      .replace(/(<meta\s+property="og:description"[^>]*>)/i,  `<meta property="og:description" content="${desc}"/>`)
      .replace(/(<meta\s+property="og:type"[^>]*>)/i,         `<meta property="og:type" content="profile"/>`)
      .replace(/(<meta\s+property="og:url"[^>]*>)/i,          `<meta property="og:url" content="${HOSTING_URL}/u/${username}"/>`)
      .replace(/(<meta\s+property="og:image"[^>]*>)/i,        `<meta property="og:image" content="${HOSTING_URL}/og-image.png?v=2"/>`)
      .replace(/(<meta\s+name="twitter:title"[^>]*>)/i,       `<meta name="twitter:title" content="${title}"/>`)
      .replace(/(<meta\s+name="twitter:description"[^>]*>)/i, `<meta name="twitter:description" content="${desc}"/>`)
      .replace(/(<meta\s+name="twitter:image"[^>]*>)/i,       `<meta name="twitter:image" content="${HOSTING_URL}/og-image.png?v=2"/>`)

    res.set('Content-Type', 'text/html;charset=UTF-8')
    res.set('Cache-Control', 'public, max-age=300')
    res.send(modified)
  }
)
