/**
 * Calculates and optionally updates rarity for the last N years of surprises.
 *
 * Rarity is computed per-series using a ranking approach:
 *   ratio = missing_count / (missing_count + doubles_count)
 *   Pieces are ranked by ratio within each series → bottom third = 1, middle = 2, top = 3
 *   Pieces with fewer than MIN_INTERACTIONS are skipped (keep existing rarity).
 *
 * Run (simulation):
 *   SERVICE_ACCOUNT=./scripts/serviceAccount.json node scripts/calc-rarity.mjs --dry-run
 *
 * Run (apply):
 *   SERVICE_ACCOUNT=./scripts/serviceAccount.json node scripts/calc-rarity.mjs --apply
 *
 * Options:
 *   --years N       Number of most recent years to process (default: 2)
 *   --min N         Minimum interactions (missing+doubles) to trust data (default: 10)
 *   --dry-run       Print results without writing to Firebase
 *   --apply         Write rarity updates to Firebase
 */

import { readFileSync, writeFileSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const admin = require('firebase-admin')

// --- Args ---
const args = process.argv.slice(2)
const DRY_RUN  = args.includes('--dry-run')
const APPLY    = args.includes('--apply')
const CSV_OUT  = args.find((a) => a.startsWith('--csv='))?.split('=')[1] ?? null
const YEARS       = Number(args.find((a) => a.startsWith('--years='))?.split('=')[1] ?? 2)
const FROM_YEAR   = args.find((a) => a.startsWith('--from-year='))?.split('=')[1] ?? null
const MIN_INT     = Number(args.find((a) => a.startsWith('--min='))?.split('=')[1] ?? 8)
const MIN_DOUBLES = Number(args.find((a) => a.startsWith('--min-doubles='))?.split('=')[1] ?? 5)

if (!DRY_RUN && !APPLY && !CSV_OUT) {
  console.error('Specify --dry-run, --apply, or --csv=output.csv')
  process.exit(1)
}

// --- Firebase init ---
const saPath = process.env.SERVICE_ACCOUNT
if (!saPath) { console.error('Set SERVICE_ACCOUNT=<path>'); process.exit(1) }

const serviceAccount = JSON.parse(readFileSync(saPath, 'utf8'))
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('='))
    .map((l) => { const [k, ...rest] = l.split('='); return [k.trim(), rest.join('=').trim().replace(/^["']|["']$/g, '')] })
)
admin.initializeApp({ credential: admin.credential.cert(serviceAccount), databaseURL: env.VITE_FIREBASE_DATABASE_URL })
const db = admin.database()

// --- Helpers ---
const snap2map = (snap) => {
  const m = {}
  snap.forEach((child) => { m[child.key] = child.val() })
  return m
}

const rarityLabel = (r) => r === 3 ? '★★★' : r === 2 ? '★★☆' : '★☆☆'
const arrow = (from, to) => from === to ? '=' : (to > from ? '↑' : '↓')

// --- Rarity from absolute thresholds ---
// ratio < 0.65              → 1 (comune)
// ratio 0.65–0.85           → 2 (non comune)
// ratio ≥ 0.85              → 3 (raro)
// doubles < MIN_DOUBLES     → cap a 1 (serie troppo nuova, dati doppi insufficienti)
const assignRarities = (pieces, minDoubles) => {
  const result = {}
  for (const p of pieces) {
    if (p.d < minDoubles) { result[p.id] = 1; continue }
    result[p.id] = p.ratio >= 0.85 ? 3 : p.ratio >= 0.65 ? 2 : 1
  }
  return result
}

// --- Main ---
const run = async () => {
  console.log(`\nLoading data from Firebase...`)

  const [surprisesSnap, missingsSnap, doublesSnap] = await Promise.all([
    db.ref('surprises').once('value'),
    db.ref('missings').once('value'),
    db.ref('surprise_doubles').once('value'),
  ])

  const surprises   = snap2map(surprisesSnap)   // surpriseId → surprise
  const missingsRaw = snap2map(missingsSnap)     // username → {surpriseId: sortCode}
  const doublesRaw  = snap2map(doublesSnap)      // surpriseId → {username: true}

  // Build missing count per surprise: surpriseId → count
  const missingCount = {}
  for (const [, userMissings] of Object.entries(missingsRaw)) {
    for (const surpriseId of Object.keys(userMissings || {})) {
      missingCount[surpriseId] = (missingCount[surpriseId] || 0) + 1
    }
  }

  // Build doubles count per surprise
  const doublesCount = {}
  for (const [surpriseId, users] of Object.entries(doublesRaw)) {
    doublesCount[surpriseId] = Object.keys(users || {}).length
  }

  // Find all years present and pick last N
  const allYears = new Set()
  for (const s of Object.values(surprises)) {
    if (s.set_year_name) allYears.add(String(s.set_year_name))
  }
  const sortedYears = [...allYears].sort((a, b) => Number(b) - Number(a))
  const yearMatches = (y, from) => {
    const parts = y.split('/').map(Number).filter(Boolean)
    return parts.some((p) => p >= Number(from))
  }
  const targetYears = FROM_YEAR
    ? new Set(sortedYears.filter((y) => yearMatches(y, FROM_YEAR)))
    : new Set(sortedYears.slice(0, YEARS))

  console.log(`All years found: ${sortedYears.join(', ')}`)
  console.log(`Processing last ${YEARS} year(s): ${[...targetYears].join(', ')}`)
  console.log(`Min interactions threshold: ${MIN_INT}`)
  console.log(`Min doubles for rarity > 1: ${MIN_DOUBLES}`)
  console.log(DRY_RUN ? '\n=== DRY RUN (no writes) ===\n' : '\n=== APPLYING UPDATES ===\n')

  // Group surprises by series (set_id), filtered to target years
  const bySeries = {}
  for (const [id, s] of Object.entries(surprises)) {
    if (!targetYears.has(String(s.set_year_name))) continue
    if (!s.set_id) continue
    if (!bySeries[s.set_id]) bySeries[s.set_id] = []
    bySeries[s.set_id].push({ id, ...s })
  }

  let totalSeries = 0, totalUpdated = 0, totalSkipped = 0, totalUnchanged = 0
  const updates = {}
  const csvRows = [['annata', 'serie', 'categoria', 'codice', 'descrizione', 'mancanti', 'doppi', 'interazioni', 'ratio', 'rarità_attuale', 'rarità_calcolata', 'stato']]

  for (const [setId, pieces] of Object.entries(bySeries)) {
    const setName     = pieces[0]?.set_name || setId
    const yearName    = pieces[0]?.set_year_name || '?'
    const category    = pieces[0]?.set_category || '?'
    totalSeries++

    const withData = []
    const withoutData = []

    for (const p of pieces) {
      const m = missingCount[p.id] || 0
      const d = doublesCount[p.id] || 0
      const total = m + d
      if (total >= MIN_INT) {
        withData.push({ id: p.id, code: p.code, description: p.description, ratio: m / total, currentRarity: p.rarity ?? 0, m, d })
      } else {
        withoutData.push({ id: p.id, code: p.code, description: p.description, m, d, currentRarity: p.rarity ?? 0 })
      }
    }

    const newRarities = assignRarities(withData, MIN_DOUBLES)

    console.log(`── ${yearName} | ${setName} (${category}) — ${pieces.length} pezzi, ${withData.length} con dati, ${withoutData.length} skippati`)

    for (const p of withData) {
      const newR = newRarities[p.id]
      const cur  = Number(p.currentRarity) || 0
      const changed = newR !== cur
      const tag = changed ? arrow(cur, newR) : '='
      console.log(`   ${changed ? '→' : ' '} ${String(p.code || p.description || p.id).padEnd(20)} m:${String(p.m).padStart(4)} d:${String(p.d).padStart(4)} ratio:${p.ratio.toFixed(2)}  ${rarityLabel(cur)} ${tag} ${rarityLabel(newR)}`)
      if (changed) {
        updates[`surprises/${p.id}/rarity`] = newR
        totalUpdated++
      } else {
        totalUnchanged++
      }
      csvRows.push([yearName, setName, category, p.code || '', p.description || '', p.m, p.d, p.m + p.d, p.ratio.toFixed(3), cur, newR, changed ? 'aggiornato' : 'invariato'])
    }

    for (const p of withoutData) {
      console.log(`   ⊘ ${String(p.code || p.description || p.id).padEnd(20)} m:${String(p.m).padStart(4)} d:${String(p.d).padStart(4)} (dati insufficienti, rarity attuale: ${p.currentRarity})`)
      totalSkipped++
      csvRows.push([yearName, setName, category, p.code || '', p.description || '', p.m, p.d, p.m + p.d, '', p.currentRarity, '', 'skippato'])
    }

    console.log()
  }

  console.log('─'.repeat(60))
  console.log(`Serie elaborate:    ${totalSeries}`)
  console.log(`Pezzi aggiornati:   ${totalUpdated}`)
  console.log(`Pezzi invariati:    ${totalUnchanged}`)
  console.log(`Pezzi skippati:     ${totalSkipped} (dati < ${MIN_INT})`)

  if (CSV_OUT) {
    const csv = csvRows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    writeFileSync(CSV_OUT, '﻿' + csv, 'utf8')
    console.log(`\nCSV esportato in: ${CSV_OUT}`)
  }

  if (APPLY && Object.keys(updates).length > 0) {
    console.log(`\nScrittura di ${Object.keys(updates).length} aggiornamenti...`)
    await db.ref().update(updates)
    console.log('Fatto.')
  } else if (DRY_RUN) {
    console.log('\n[DRY RUN] Nessuna modifica applicata.')
  }

  process.exit(0)
}

run().catch((e) => { console.error(e); process.exit(1) })
