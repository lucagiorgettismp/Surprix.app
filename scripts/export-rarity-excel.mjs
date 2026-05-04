/**
 * Exports rarity simulation data to an Excel file with configurable thresholds.
 *
 * The Excel file has two sheets:
 *   - Parametri: editable cells for T3, T2, weights, MIN_INT, MIN_DOUBLES
 *   - Dati: raw data + formulas that auto-recalculate when you change parameters
 *
 * Run:
 *   SERVICE_ACCOUNT=./scripts/serviceAccount.json node scripts/export-rarity-excel.mjs --from-year=2025
 *   SERVICE_ACCOUNT=./scripts/serviceAccount.json node scripts/export-rarity-excel.mjs --years=2
 *
 * Options:
 *   --from-year=YYYY   Process years >= YYYY
 *   --years=N          Process last N years (default: 2)
 *   --min=N            Min total interactions to include piece (default: 8)
 *   --out=file.xlsx    Output file (default: scripts/rarity-analysis.xlsx)
 */

import { readFileSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const admin   = require('firebase-admin')
const ExcelJS = require('exceljs')

// --- Args ---
const args      = process.argv.slice(2)
const FROM_YEAR = args.find((a) => a.startsWith('--from-year='))?.split('=')[1] ?? null
const YEARS     = Number(args.find((a) => a.startsWith('--years='))?.split('=')[1] ?? 2)
const MIN_INT   = Number(args.find((a) => a.startsWith('--min='))?.split('=')[1] ?? 8)
const OUT_FILE  = args.find((a) => a.startsWith('--out='))?.split('=')[1] ?? 'scripts/rarity-analysis.xlsx'

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

const snap2map = (snap) => { const m = {}; snap.forEach((c) => { m[c.key] = c.val() }); return m }

const pctRank = (arr, value) => {
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = sorted.lastIndexOf(value)
  return arr.length <= 1 ? 1 : idx / (arr.length - 1)
}

const yearMatches = (y, from) => y.split('/').map(Number).filter(Boolean).some((p) => p >= Number(from))

// --- Excel helpers ---
const RARITY_COLORS = { 1: 'FF90EE90', 2: 'FFFFD700', 3: 'FFFF6B6B' }
const RARITY_LABELS = { 1: '★☆☆', 2: '★★☆', 3: '★★★' }

const cell = (ws, addr, value, opts = {}) => {
  const c = ws.getCell(addr)
  c.value = value
  if (opts.bold)   c.font = { ...(c.font || {}), bold: true }
  if (opts.bg)     c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg } }
  if (opts.border) c.border = { bottom: { style: 'thin' } }
  if (opts.fmt)    c.numFmt = opts.fmt
  if (opts.align)  c.alignment = { horizontal: opts.align }
  return c
}

// --- Main ---
const run = async () => {
  console.log('Loading data from Firebase...')
  const [surprisesSnap, missingsSnap, doublesSnap] = await Promise.all([
    db.ref('surprises').once('value'),
    db.ref('missings').once('value'),
    db.ref('surprise_doubles').once('value'),
  ])

  const surprises   = snap2map(surprisesSnap)
  const missingsRaw = snap2map(missingsSnap)
  const doublesRaw  = snap2map(doublesSnap)

  const missingCount = {}
  for (const [, userMissings] of Object.entries(missingsRaw))
    for (const id of Object.keys(userMissings || {}))
      missingCount[id] = (missingCount[id] || 0) + 1

  const doublesCount = {}
  for (const [id, users] of Object.entries(doublesRaw))
    doublesCount[id] = Object.keys(users || {}).length

  const allYears = [...new Set(Object.values(surprises).map((s) => String(s.set_year_name)).filter(Boolean))]
    .sort((a, b) => Number(b.split('/')[0]) - Number(a.split('/')[0]))
  const targetYears = new Set(
    FROM_YEAR ? allYears.filter((y) => yearMatches(y, FROM_YEAR)) : allYears.slice(0, YEARS)
  )

  console.log(`Anni: ${[...targetYears].join(', ')}  |  Min interazioni: ${MIN_INT}`)

  // Group by series
  const bySeries = {}
  for (const [id, s] of Object.entries(surprises)) {
    if (!targetYears.has(String(s.set_year_name)) || !s.set_id) continue
    if (!bySeries[s.set_id]) bySeries[s.set_id] = []
    bySeries[s.set_id].push({ id, ...s })
  }

  // Build rows with per-series percentile ranks
  const rows = []
  for (const pieces of Object.values(bySeries)) {
    const withData = pieces.map((p) => ({
      ...p,
      m: missingCount[p.id] || 0,
      d: doublesCount[p.id] || 0,
    })).filter((p) => p.m + p.d >= MIN_INT)

    const skipped = pieces.filter((p) => {
      const m = missingCount[p.id] || 0
      const d = doublesCount[p.id] || 0
      return m + d < MIN_INT
    })

    const mValues = withData.map((p) => p.m)
    const dValues = withData.map((p) => p.d)

    for (const p of withData) {
      rows.push({
        annata:      p.set_year_name || '',
        serie:       p.set_name || '',
        categoria:   p.set_category || '',
        codice:      p.code || '',
        desc:        p.description || '',
        m:           p.m,
        d:           p.d,
        tot:         p.m + p.d,
        pct_m:       pctRank(mValues, p.m),
        pct_d_inv:   1 - pctRank(dValues, p.d),
        cur_rarity:  Number(p.rarity) || 0,
        stato:       'con dati',
      })
    }

    for (const p of skipped) {
      const m = missingCount[p.id] || 0
      const d = doublesCount[p.id] || 0
      rows.push({
        annata:    p.set_year_name || '',
        serie:     p.set_name || '',
        categoria: p.set_category || '',
        codice:    p.code || '',
        desc:      p.description || '',
        m, d, tot: m + d,
        pct_m: '', pct_d_inv: '',
        cur_rarity: Number(p.rarity) || 0,
        stato: 'skippato',
      })
    }
  }

  // Sort: by year desc, then series name
  rows.sort((a, b) => {
    const yA = Number(a.annata.split('/')[0]) || 0
    const yB = Number(b.annata.split('/')[0]) || 0
    if (yB !== yA) return yB - yA
    return a.serie.localeCompare(b.serie)
  })

  // --- Build Excel ---
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Surprix'

  // ── Sheet 1: Parametri ──
  const wsP = wb.addWorksheet('Parametri')
  wsP.getColumn('A').width = 28
  wsP.getColumn('B').width = 14

  // Row 1: title
  wsP.mergeCells('A1:B1')
  const titleCell = wsP.getCell('A1')
  titleCell.value = 'PARAMETRI — modifica le celle gialle'
  titleCell.font  = { bold: true, color: { argb: 'FFFFFFFF' } }
  titleCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
  wsP.getRow(1).height = 22

  const addSection = (r, label) => {
    wsP.mergeCells(`A${r}:B${r}`)
    const c = wsP.getCell(`A${r}`)
    c.value = label
    c.font  = { bold: true }
    c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } }
  }
  const addParam = (r, label, value) => {
    wsP.getCell(`A${r}`).value = label
    const c = wsP.getCell(`B${r}`)
    c.value  = value
    c.numFmt = '0.00'
    c.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } }
    c.alignment = { horizontal: 'center' }
  }

  addSection(2, 'SOGLIE RARITÀ')
  addParam(3, 'T3 — soglia rarità 3', 0.82)
  addParam(4, 'T2 — soglia rarità 2', 0.68)
  addSection(5, 'PESI SCORE')
  addParam(6, 'Peso mancanti (0–1)', 0.60)
  addParam(7, 'Peso doppi inv. (0–1)', 0.40)
  addSection(8, 'FILTRI')
  addParam(9, 'Min interazioni totali', MIN_INT)

  // T3=B3, T2=B4, W_M=B6, W_D=B7

  // ── Sheet 2: Dati ──
  const wsD = wb.addWorksheet('Dati')
  const headers = [
    'Annata', 'Serie', 'Categoria', 'Codice', 'Descrizione',
    'Mancanti', 'Doppi', 'Tot. interazioni',
    'Pct mancanti', 'Pct doppi inv.',
    'Score', 'Rarità calcolata', 'Rarità attuale', 'Stato',
  ]
  const colWidths = [14, 30, 14, 10, 30, 10, 8, 16, 12, 12, 10, 16, 14, 10]
  headers.forEach((h, i) => {
    wsD.getColumn(i + 1).width = colWidths[i]
    const c = wsD.getCell(1, i + 1)
    c.value = h
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
    c.alignment = { horizontal: 'center' }
  })
  wsD.getRow(1).height = 20

  // P sheet row references:
  // T3 = Parametri!B3, T2 = Parametri!B4, W_M = Parametri!B7, W_D = Parametri!B8
  rows.forEach((row, i) => {
    const r = i + 2
    const hasData = row.stato === 'con dati'

    wsD.getCell(r, 1).value  = row.annata
    wsD.getCell(r, 2).value  = row.serie
    wsD.getCell(r, 3).value  = row.categoria
    wsD.getCell(r, 4).value  = row.codice
    wsD.getCell(r, 5).value  = row.desc
    wsD.getCell(r, 6).value  = row.m
    wsD.getCell(r, 7).value  = row.d
    wsD.getCell(r, 8).value  = row.tot

    if (hasData) {
      // pct_missing and pct_doubles_inv are pre-computed values
      const cPm = wsD.getCell(r, 9)
      cPm.value = row.pct_m
      cPm.numFmt = '0.000'

      const cPd = wsD.getCell(r, 10)
      cPd.value = row.pct_d_inv
      cPd.numFmt = '0.000'

      // Score formula: W_M*pct_m + W_D*pct_d_inv
      const cScore = wsD.getCell(r, 11)
      cScore.value = { formula: `Parametri!$B$6*I${r}+Parametri!$B$7*J${r}` }
      cScore.numFmt = '0.000'

      // Rarity formula
      const cRar = wsD.getCell(r, 12)
      cRar.value = { formula: `IF(K${r}>=Parametri!$B$3,3,IF(K${r}>=Parametri!$B$4,2,1))` }
    } else {
      wsD.getCell(r, 9).value  = 'n/d'
      wsD.getCell(r, 10).value = 'n/d'
      wsD.getCell(r, 11).value = 'n/d'
      wsD.getCell(r, 12).value = 'skippato'
    }

    wsD.getCell(r, 13).value = row.cur_rarity || ''
    wsD.getCell(r, 14).value = row.stato

    // Row coloring based on current rarity
    if (hasData) {
      const bg = RARITY_COLORS[row.cur_rarity] || 'FFFFFFFF'
      // Light stripe for readability
      if (i % 2 === 0) {
        for (let c = 1; c <= 14; c++) {
          const cell = wsD.getCell(r, c)
          if (!cell.fill?.fgColor) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
          }
        }
      }
    } else {
      for (let c = 1; c <= 14; c++)
        wsD.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } }
    }
  })

  // Freeze header row + autofilter
  wsD.views = [{ state: 'frozen', ySplit: 1 }]
  wsD.autoFilter = { from: 'A1', to: `N1` }

  // ── Sheet 3: Istruzioni ──
  const wsI = wb.addWorksheet('Istruzioni')
  wsI.getColumn('A').width = 70
  const istruzioni = [
    ['COME USARE QUESTO FILE'],
    [''],
    ['1. Vai al foglio "Parametri" e modifica le celle GIALLE:'],
    ['   • T3 (default 0.82): score minimo per rarità 3 — abbassa per più pezzi a 3'],
    ['   • T2 (default 0.68): score minimo per rarità 2 — abbassa per più pezzi a 2'],
    ['   • Peso mancanti (default 0.60): importanza dei mancanti nello score'],
    ['   • Peso doppi inv. (default 0.40): importanza dei doppi nello score'],
    [''],
    ['2. Il foglio "Dati" si aggiorna automaticamente con le nuove rarità calcolate.'],
    [''],
    ['3. Colonne chiave:'],
    ['   • Pct mancanti: percentile del pezzo nella serie per mancanti (0=meno, 1=più)'],
    ['   • Pct doppi inv.: 1 - percentile per doppi (0=molti doppi, 1=pochi doppi)'],
    ['   • Score: combinazione pesata dei due percentili'],
    ['   • Rarità calcolata: risultato basato sulle soglie T3/T2'],
    ['   • Rarità attuale: valore attuale nel database'],
    [''],
    ['4. Usa i filtri sulla riga 1 del foglio Dati per filtrare per serie o annata.'],
    [''],
    ['5. Le righe grigie sono pezzi skippati per dati insufficienti.'],
  ]

  istruzioni.forEach(([text], i) => {
    const c = wsI.getCell(i + 1, 1)
    c.value = text
    if (i === 0) { c.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } } }
  })

  await wb.xlsx.writeFile(OUT_FILE)
  console.log(`\nExcel esportato: ${OUT_FILE}  (${rows.length} righe)`)
  process.exit(0)
}

run().catch((e) => { console.error(e); process.exit(1) })
