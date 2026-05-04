const { onSchedule } = require('firebase-functions/v2/scheduler')
const { logger }     = require('firebase-functions')
const admin          = require('firebase-admin')

admin.initializeApp()
const db = admin.database()

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
    if (d >= 2 && m >= MIN_M3)   return 3
    if (d === 1 && m >= MIN_M3_D1) return 3
    if (d === 0 && m >= MIN_M3_D0) return 3
  }
  if (ratio >= T2 && m >= minM2) return 2
  return 1
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
    updates[`surprises/${c.key}/rarity`]         = rarity
    updates[`surprises/${c.key}/rarity_auto`]    = true
    updates[`surprises/${c.key}/missing_count`]  = m
    updates[`surprises/${c.key}/double_count`]   = d
    assigned++
  })

  logger.info(`Assegnate: ${assigned} | Skippate: ${skipped}`)

  // Scrivi in chunk da 500
  const entries = Object.entries(updates)
  for (let i = 0; i < entries.length; i += 500) {
    await db.ref().update(Object.fromEntries(entries.slice(i, i + 500)))
  }

  logger.info('calcRarityAuto: done')
}

// Schedulata ogni domenica alle 3:00 (Europe/Rome)
exports.calcRarityAutoWeekly = onSchedule(
  { schedule: 'every sunday 03:00', timeZone: 'Europe/Rome', region: 'europe-west1' },
  async () => { await calcRarityAuto() }
)

// Callable manuale via Firebase Console o CLI
exports.calcRarityAutoManual = require('firebase-functions/v2/https').onCall(
  { region: 'europe-west1' },
  async (req) => {
    if (!req.auth) throw new Error('Unauthenticated')
    await calcRarityAuto()
    return { success: true }
  }
)
