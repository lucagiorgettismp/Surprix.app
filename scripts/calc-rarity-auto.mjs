/**
 * Calcola la rarità automatica per le ultime 2 annate KS/KM.
 *
 * Algoritmo:
 *   Per ogni sorpresina calcola score = mancanti / (mancanti + doppi)
 *   Poi calcola il percentile di score DENTRO la serie (intra-serie)
 *   pct >= T3 AND doppi >= MIN_D  →  ★★★
 *   pct >= T2                     →  ★★
 *   altrimenti                    →  ★
 *   se mancanti + doppi < MIN_INT → non assegna (lascia null)
 *
 * Parametri:
 *   --t3=N         Soglia percentile per 3 stelle (default 0.80)
 *   --t2=N         Soglia percentile per 2 stelle (default 0.50)
 *   --min=N        Interazioni minime totali (default 5)
 *   --min-recent=N Interazioni minime per l'annata più recente (default 8)
 *   --min-d=N      Doppi minimi per ★★★ (default 1)
 *   --dry-run      Non scrive su Firebase
 *   --tune         Grid search ottimizzando su scripts/rarity-auto-preview.csv
 *
 * Run:
 *   SERVICE_ACCOUNT=./scripts/serviceAccount.json node scripts/calc-rarity-auto.mjs --dry-run
 *   SERVICE_ACCOUNT=./scripts/serviceAccount.json node scripts/calc-rarity-auto.mjs --tune
 *   SERVICE_ACCOUNT=./scripts/serviceAccount.json node scripts/calc-rarity-auto.mjs
 */

import { readFileSync, writeFileSync } from 'fs'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const admin = require('firebase-admin')

const args    = process.argv.slice(2)
const DRY_RUN    = args.includes('--dry-run')
const TUNE       = args.includes('--tune')
const T3         = Number(args.find(a=>a.startsWith('--t3='))?.split('=')[1] ?? 0.80)
const T2         = Number(args.find(a=>a.startsWith('--t2='))?.split('=')[1] ?? 0.50)
const MIN_INT    = Number(args.find(a=>a.startsWith('--min='))?.split('=')[1] ?? 5)
const MIN_RECENT = Number(args.find(a=>a.startsWith('--min-recent='))?.split('=')[1] ?? 8)
const MIN_M3     = Number(args.find(a=>a.startsWith('--min-m3='))?.split('=')[1] ?? 15)
const MIN_M3_D1  = Number(args.find(a=>a.startsWith('--min-m3-d1='))?.split('=')[1] ?? 15)
const MIN_M3_D0  = Number(args.find(a=>a.startsWith('--min-m3-d0='))?.split('=')[1] ?? 20)
// min_m2 per categoria — override globale se passato, altrimenti usa defaults per categoria
const MIN_M2_ARG = args.find(a=>a.startsWith('--min-m2='))?.split('=')[1] ?? null
const MIN_M2_HP  = Number(args.find(a=>a.startsWith('--min-m2-hp='))?.split('=')[1] ?? 6)
const MIN_M2_CO  = Number(args.find(a=>a.startsWith('--min-m2-co='))?.split('=')[1] ?? 10)
const MIN_M2_DEF = Number(args.find(a=>a.startsWith('--min-m2-def='))?.split('=')[1] ?? 12)
const getMinM2 = (cat) => MIN_M2_ARG !== null ? Number(MIN_M2_ARG) : cat === 'Hand_painted' ? MIN_M2_HP : cat === 'Compo' ? MIN_M2_CO : MIN_M2_DEF

// --- Firebase init ---
const saPath = process.env.SERVICE_ACCOUNT
if (!saPath) { console.error('Set SERVICE_ACCOUNT=<path>'); process.exit(1) }
const serviceAccount = JSON.parse(readFileSync(saPath, 'utf8'))
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter(l=>l.includes('='))
    .map(l=>{const[k,...r]=l.split('=');return[k.trim(),r.join('=').trim().replace(/^["']|["']$/g,'')]})
)
admin.initializeApp({ credential: admin.credential.cert(serviceAccount), databaseURL: env.VITE_FIREBASE_DATABASE_URL })
const db = admin.database()

// --- Helpers ---
const rawScore = (m, d) => (m + d) === 0 ? 0 : m / (m + d)

// Percentile rank di value nell'array arr (0=minimo, 1=massimo)
const pctRank = (arr, value) => {
  const sorted = [...arr].sort((a,b)=>a-b)
  const idx = sorted.lastIndexOf(value)
  return arr.length <= 1 ? 1 : idx / (arr.length - 1)
}

// Assegna rarità combinando ratio assoluto + minimo mancanti per livello
// Per ★★★: soglia mancanti a gradini in base ai doppi disponibili
const assignRarity = (m, d, cat, t2, t3, minM3, minM3d1, minM3d0) => {
  const ratio = rawScore(m, d)
  const minM2 = getMinM2(cat)
  if (ratio >= t3) {
    if (d >= 2 && m >= minM3)   return 3
    if (d === 1 && m >= minM3d1) return 3
    if (d === 0 && m >= minM3d0) return 3
  }
  if (ratio >= t2 && m >= minM2) return 2
  return 1
}

// Calcola le rarità per l'intero dataset
const computeAll = (dataset, t2, t3, minInt, minRecent, minM3, minM3d1, minM3d0) => {
  const result = new Map()
  for (const d of dataset) {
    const threshold = d.isRecent ? minRecent : minInt
    if (d.mancanti + d.doppi < threshold) continue
    result.set(d.id, assignRarity(d.mancanti, d.doppi, d.categoria, t2, t3, minM3, minM3d1, minM3d0))
  }
  return result
}

// Accuracy vs CSV di riferimento
const accuracy = (dataset, manualMap, t2, t3, minInt, minRecent, minM3, minM3d1, minM3d0) => {
  const predicted = computeAll(dataset, t2, t3, minInt, minRecent, minM3, minM3d1, minM3d0)
  let correct = 0, total = 0, skipped = 0
  for (const d of dataset) {
    if (manualMap[d.id] === undefined) continue
    if (!predicted.has(d.id)) { skipped++; continue }
    total++
    if (predicted.get(d.id) === manualMap[d.id]) correct++
  }
  return { acc: total > 0 ? correct/total : 0, correct, total, skipped }
}

// --- Main ---
const run = async () => {
  if (DRY_RUN) console.log('DRY RUN — no writes to Firebase')

  const snap = await db.ref('surprises').once('value')

  // Ultime 2 annate per KS e KM
  const yearsByProducer = {}
  snap.forEach(c => {
    const s = c.val(); const p = s.set_producer_id; const y = Number(s.set_year_year)
    if (!p || !y) return
    if (!yearsByProducer[p]) yearsByProducer[p] = new Set()
    yearsByProducer[p].add(y)
  })
  const skipMap = {}, mostRecentYear = {}
  for (const p of ['Kinder_Sorpresa', 'Kinder_Merendero']) {
    const sorted = [...(yearsByProducer[p]||[])].sort((a,b)=>b-a)
    skipMap[p] = new Set(sorted.slice(0,2))
    mostRecentYear[p] = sorted[0]
  }
  console.log('KS anni:', [...skipMap['Kinder_Sorpresa']].join(', '), '| più recente:', mostRecentYear['Kinder_Sorpresa'])
  console.log('KM anni:', [...skipMap['Kinder_Merendero']].join(', '), '| più recente:', mostRecentYear['Kinder_Merendero'])

  // Conta mancanti e doppi globali
  const [missingsSnap, doublesSnap] = await Promise.all([
    db.ref('missings').once('value'),
    db.ref('surprise_doubles').once('value'),
  ])
  const missingCount = {}
  missingsSnap.forEach(u => u.forEach(i => { missingCount[i.key] = (missingCount[i.key]||0)+1 }))
  const doublesCount = {}
  doublesSnap.forEach(s => { doublesCount[s.key] = Object.keys(s.val()||{}).length })

  // Dataset
  const dataset = []
  snap.forEach(c => {
    const s = c.val()
    const p = s.set_producer_id; const y = Number(s.set_year_year)
    if (!skipMap[p]?.has(y)) return
    dataset.push({
      id: c.key,
      codice: s.code || '',
      descrizione: s.description || '',
      serie: s.set_name || '',
      annata: s.set_year_name || y || '',
      produttore: p === 'Kinder_Sorpresa' ? 'KS' : 'KM',
      categoria: s.set_category || '',
      mancanti: missingCount[c.key] || 0,
      doppi: doublesCount[c.key] || 0,
      isRecent: y === mostRecentYear[p],
      set_id: s.set_id || 'unknown',
    })
  })
  console.log(`Dataset: ${dataset.length} sorpresine in ${new Set(dataset.map(d=>d.set_id)).size} serie`)

  // --- TUNE ---
  if (TUNE) {
    const csvLines = readFileSync('scripts/rarity-auto-preview.csv', 'utf8').trim().split('\n').slice(1)
    const manualMap = {}
    csvLines.forEach(l => {
      const c = l.split(','); const r = Number(c[8])
      if (r >= 1 && r <= 3) manualMap[c[0]] = r
    })
    console.log(`Rarità manuali: ${Object.keys(manualMap).length}`)

    const results = []
    for (const t2 of [0.75, 0.80, 0.85])
    for (const t3 of [0.90, 0.93, 0.95])
    for (const minInt of [3, 5])
    for (const minRecent of [5, 8])
    for (const minM3 of [12, 15, 18])
    for (const minM3d1 of [12, 15])
    for (const minM3d0 of [18, 20, 25]) {
      if (t2 >= t3 || minRecent < minInt) continue
      const r = accuracy(dataset, manualMap, t2, t3, minInt, minRecent, minM3, minM3d1, minM3d0)
      results.push({ t2, t3, minInt, minRecent, minM3, minM3d1, minM3d0, ...r })
    }
    results.sort((a,b) => b.acc - a.acc || a.skipped - b.skipped)

    console.log('\n--- TOP 5 ---')
    results.slice(0,5).forEach(r =>
      console.log(`  t2=${r.t2} t3=${r.t3} min=${r.minInt} min-recent=${r.minRecent} m3=${r.minM3} m3d1=${r.minM3d1} m3d0=${r.minM3d0} → acc=${(r.acc*100).toFixed(1)}% (${r.correct}/${r.total} skipped=${r.skipped})`)
    )
    const best = results[0]
    console.log(`\nParametri ottimali: --t2=${best.t2} --t3=${best.t3} --min=${best.minInt} --min-recent=${best.minRecent} --min-m3=${best.minM3} --min-m3-d1=${best.minM3d1} --min-m3-d0=${best.minM3d0}`)

    // Errori con parametri ottimali
    const predicted = computeAll(dataset, best.t2, best.t3, best.minInt, best.minRecent, best.minM3, best.minM3d1, best.minM3d0)
    console.log('\n--- PREDIZIONI ERRATE ---')
    dataset.forEach(d => {
      if (manualMap[d.id] === undefined) return
      const p = predicted.get(d.id)
      if (p === undefined) return
      if (p !== manualMap[d.id]) {
        const score = rawScore(d.mancanti, d.doppi).toFixed(2)
        console.log(`  ${d.id}: previsto=${p} manuale=${manualMap[d.id]} (m=${d.mancanti} d=${d.doppi} ratio=${score} recente=${d.isRecent})`)
      }
    })
    process.exit(0)
  }

  // --- APPLY ---
  // Carica rarità manuali dal preview CSV se esiste
  const manualMap = {}
  try {
    readFileSync('scripts/rarity-auto-preview.csv', 'utf8').trim().split('\n').slice(1).forEach(l => {
      const c = l.split(','); const r = Number(c[8])
      if (r >= 1 && r <= 3) manualMap[c[0]] = r
    })
  } catch (_) {}

  const predicted = computeAll(dataset, T2, T3, MIN_INT, MIN_RECENT, MIN_M3, MIN_M3_D1, MIN_M3_D0)
  const updates = {}
  const csvRows = []
  let skipped = 0

  for (const d of dataset) {
    const rarity = predicted.get(d.id)
    if (rarity === undefined) { skipped++; continue }
    updates[`surprises/${d.id}/rarity`] = rarity
    updates[`surprises/${d.id}/rarity_auto`] = true
    updates[`surprises/${d.id}/missing_count`] = d.mancanti
    updates[`surprises/${d.id}/double_count`] = d.doppi
    const manuale = manualMap[d.id] ?? ''
    const diff = manuale !== '' && manuale !== rarity ? 'DIFF' : ''
    csvRows.push({ ...d, ratio: rawScore(d.mancanti, d.doppi).toFixed(2), rarity, manuale, diff })
  }

  writeFileSync('scripts/calc-rarity-result.csv',
    'id,codice,descrizione,serie,annata,produttore,categoria,mancanti,doppi,ratio,rarità_script,rarità_manuale,diff,recente\n' +
    csvRows.map(r=>`${r.id},"${r.codice}","${r.descrizione}","${r.serie}","${r.annata}",${r.produttore},${r.categoria},${r.mancanti},${r.doppi},${r.ratio},${r.rarity},${r.manuale},${r.diff},${r.isRecent}`).join('\n'))

  console.log(`\nAssegnate: ${csvRows.length}  |  Skippate: ${skipped}`)
  console.log(`Parametri: t2=${T2} t3=${T3} min=${MIN_INT} min-recent=${MIN_RECENT} min-m3=${MIN_M3} min-m3-d1=${MIN_M3_D1} min-m3-d0=${MIN_M3_D0}`)
  console.log(`min_m2: HP=${MIN_M2_HP} Compo=${MIN_M2_CO} default=${MIN_M2_DEF}`)
  console.log(`Preview: scripts/calc-rarity-result.csv`)

  if (!DRY_RUN && Object.keys(updates).length > 0) {
    const entries = Object.entries(updates)
    for (let i = 0; i < entries.length; i += 500)
      await db.ref().update(Object.fromEntries(entries.slice(i, i+500)))
    console.log('Done.')
  }
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
