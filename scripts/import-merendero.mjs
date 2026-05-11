/**
 * Imports Kinder Merendero series from a filled CSV into Firebase.
 *
 * CSV columns:
 *   serie_nome, serie_codice, anno, serie_img_path, category,
 *   codice, nome, prezzo, rarita, img_path, in_surprix
 *
 * Conventions:
 *   - serie_codice padded to 3 digits  (1 → 001)
 *   - numeric item codes padded to 2 digits  (1 → 01)
 *   - effective_code = false when all item codes are numeric
 *   - codes array omitted from set when effective_code = false
 *   - img_path auto-generated when empty:
 *       numeric series  → gs://.../Kinder_Merendero/{anno}/{anno}_{set}_{code}.jpg
 *       other series    → gs://.../Kinder_Merendero/{anno}/{code}.jpg
 *   - serie_img_path auto-generated when empty: .../BPZ_{anno}_{set}.jpg
 *   - category normalised to PascalCase (compo → Compo, hand_painted → Hand_painted…)
 *   - rarity_auto = false (manual rarities from CSV)
 *   - nation hardcoded to "eur"
 *   - rows with empty serie_codice or anno are skipped
 *   - existing sets/surprises are skipped unless --overwrite
 *
 * Run:
 *   SERVICE_ACCOUNT=... node scripts/import-merendero.mjs --dry-run
 *   SERVICE_ACCOUNT=... node scripts/import-merendero.mjs
 *   SERVICE_ACCOUNT=... node scripts/import-merendero.mjs --overwrite
 *   SERVICE_ACCOUNT=... node scripts/import-merendero.mjs --csv=scripts/other.csv
 */

import { readFileSync } from 'fs'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const admin   = require('firebase-admin')

const args      = process.argv.slice(2)
const DRY_RUN   = args.includes('--dry-run')
const OVERWRITE = args.includes('--overwrite')
const CSV_PATH  = args.find((a) => a.startsWith('--csv='))?.split('=').slice(1).join('=') ?? 'scripts/scrape-merendero.csv'

const PRODUCER_ID    = 'Kinder_Merendero'
const PRODUCER_NAME  = 'Kinder Merendero / Joy'
const PRODUCER_COLOR = 'Orange'
const NATION         = 'eur'
const GS_BASE        = 'gs://collectionhelper.appspot.com/Kinder_Merendero'

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

// --- CSV parsing ---
const parseCsvLine = (line) => {
  const result = []
  let cur = '', inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      result.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur)
  return result
}

const parseCsv = (text) => {
  const lines = text.trim().split(/\r?\n/)
  const header = parseCsvLine(lines[0])
  return lines.slice(1).map((line) => {
    const vals = parseCsvLine(line)
    return Object.fromEntries(header.map((h, i) => [h.trim(), (vals[i] ?? '').trim()]))
  })
}

// --- Helpers ---
const pad3 = (v) => String(v).padStart(3, '0')
const pad2 = (v) => String(v).padStart(2, '0')

const mkSetId      = (anno, code)                => `Kinder_${anno}_${pad3(code)}`
const mkYearId     = (anno)                      => `${PRODUCER_ID}_${anno}`
const mkSurpriseId = (anno, setCode, code, num)  => `Kinder_${anno}_${pad3(setCode)}_${num ? pad2(code) : code}`

const mkSetImgPath = (anno, setCode) =>
  `${GS_BASE}/${anno}/BPZ_${anno}_${pad3(setCode)}.jpg`

const mkSurpriseImgPath = (anno, setCode, paddedCode, numeric) =>
  numeric
    ? `${GS_BASE}/${anno}/${anno}_${pad3(setCode)}_${paddedCode}.jpg`
    : `${GS_BASE}/${anno}/${paddedCode}.jpg`

const isNumeric = (code) => /^\d+$/.test(code)

const hasEffectiveCode = (surprises) => !surprises.every((s) => isNumeric(s.codice))

const CATEGORY_MAP = {
  compo: 'Compo', hand_painted: 'Hand_painted', metallic: 'Metallic',
  flocked: 'Flocked', glow: 'Glow', special: 'Special',
}
const normalizeCategory = (cat) =>
  CATEGORY_MAP[String(cat || '').toLowerCase()] ?? (cat || 'Compo')

// --- Main ---
const run = async () => {
  if (DRY_RUN) console.log('DRY RUN — no writes\n')

  // Parse and group CSV rows by set
  const sets = new Map()
  for (const row of parseCsv(readFileSync(CSV_PATH, 'utf8'))) {
    if (!row.serie_codice || !row.codice || !row.anno) continue
    if (/\s/.test(row.codice)) { console.warn(`  SKIP (spazio nel codice): "${row.codice}" — ${row.serie_nome}`); continue }
    const key = `${row.anno}_${row.serie_codice}`
    if (!sets.has(key)) {
      sets.set(key, {
        meta: {
          anno:           row.anno,
          serie_codice:   row.serie_codice,
          serie_nome:     row.serie_nome,
          serie_img_path: row.serie_img_path,
          category:       normalizeCategory(row.category),
        },
        surprises: [],
      })
    }
    sets.get(key).surprises.push({
      codice:   row.codice,
      nome:     row.nome,
      rarita:   Number(row.rarita) || null,
      img_path: row.img_path,
    })
  }

  console.log(`Sets to import: ${sets.size}`)
  if (sets.size === 0) {
    console.log('Nothing to import — fill in serie_codice and anno in the CSV first.')
    process.exit(0)
  }

  // Load existing data from Firebase
  const [existingSetsSnap, existingSurprisesSnap, existingYearsSnap] = await Promise.all([
    db.ref('sets').once('value'),
    db.ref('surprises').once('value'),
    db.ref('years').once('value'),
  ])
  const existingSetIds      = new Set(Object.keys(existingSetsSnap.val() ?? {}))
  const existingSurpriseIds = new Set(Object.keys(existingSurprisesSnap.val() ?? {}))
  const existingYearIds     = new Set(Object.keys(existingYearsSnap.val() ?? {}))

  const updates = {}
  let setsCreated = 0, setsSkipped = 0, surprisesCreated = 0, surprisesSkipped = 0

  // Pre-collect sets per new year so we can embed them in the year object,
  // avoiding ancestor-path conflicts in Firebase multi-path updates.
  const newYearSets = {}  // yearId → { anno, sids: Set }
  for (const [, { meta }] of sets) {
    const yid = mkYearId(meta.anno)
    if (!existingYearIds.has(yid)) {
      if (!newYearSets[yid]) newYearSets[yid] = { anno: meta.anno, sids: new Set() }
      newYearSets[yid].sids.add(mkSetId(meta.anno, meta.serie_codice))
    }
  }

  // Write new years (with sets map embedded to avoid ancestor-path conflict)
  for (const [yid, { anno, sids }] of Object.entries(newYearSets)) {
    console.log(`  + year: ${yid}`)
    updates[`years/${yid}`] = {
      id:         yid,
      year:       Number(anno),
      descr:      anno,
      producerId: PRODUCER_ID,
      sets:       Object.fromEntries([...sids].map((sid) => [sid, true])),
    }
    updates[`producers/${PRODUCER_ID}/years/${yid}`] = true
    existingYearIds.add(yid)
  }

  // Process each set
  for (const [, { meta, surprises }] of sets) {
    const sid    = mkSetId(meta.anno, meta.serie_codice)
    const yid    = mkYearId(meta.anno)
    const annoN  = Number(meta.anno)
    const effCode = hasEffectiveCode(surprises)
    const allNum  = !effCode

    // Build surprises
    const surprisesMap = {}
    for (const s of surprises) {
      const paddedCode = allNum ? pad2(s.codice) : s.codice
      const spid = mkSurpriseId(meta.anno, meta.serie_codice, s.codice, allNum)
      if (existingSurpriseIds.has(spid) && !OVERWRITE) { surprisesSkipped++; continue }
      updates[`surprises/${spid}`] = {
        id:                 spid,
        code:               paddedCode,
        description:        s.nome,
        img_path:           s.img_path || mkSurpriseImgPath(meta.anno, meta.serie_codice, paddedCode, allNum),
        set_id:             sid,
        set_name:           meta.serie_nome,
        set_year_year:      annoN,
        set_year_id:        yid,
        set_year_name:      meta.anno,
        set_producer_name:  PRODUCER_NAME,
        set_producer_id:    PRODUCER_ID,
        set_nation:         NATION,
        set_category:       meta.category,
        set_effective_code: effCode,
        ...(s.rarita != null ? { rarity: s.rarita, rarity_auto: false } : {}),
      }
      surprisesMap[spid] = true
      surprisesCreated++
    }

    // Write set
    if (existingSetIds.has(sid) && !OVERWRITE) {
      console.log(`  ~ set already exists (skip): ${sid}`)
      for (const spid of Object.keys(surprisesMap)) {
        updates[`sets/${sid}/surprises/${spid}`] = true
      }
      setsSkipped++
    } else {
      console.log(`  + set: ${sid} — ${meta.serie_nome}`)
      updates[`sets/${sid}`] = {
        id:             sid,
        name:           meta.serie_nome,
        year_id:        yid,
        producer_id:    PRODUCER_ID,
        producer_color: PRODUCER_COLOR,
        nation:         NATION,
        img_path:       meta.serie_img_path || mkSetImgPath(meta.anno, meta.serie_codice),
        category:       meta.category,
        effective_code: effCode,
        ...(effCode && { codes: surprises.map((s) => s.codice) }),
        surprises:      surprisesMap,
      }
      // For existing years, add the set reference as a child path.
      // For new years, the reference is already embedded in the year object above.
      if (!newYearSets[yid]) {
        updates[`years/${yid}/sets/${sid}`] = true
      }
      setsCreated++
    }
  }

  console.log(`\nSets:      ${setsCreated} to create, ${setsSkipped} skipped`)
  console.log(`Surprises: ${surprisesCreated} to create, ${surprisesSkipped} skipped`)
  console.log(`Total update paths: ${Object.keys(updates).length}`)

  if (DRY_RUN) { console.log('\nDry run — no writes.'); process.exit(0) }
  if (Object.keys(updates).length === 0) { console.log('Nothing to write.'); process.exit(0) }

  const entries = Object.entries(updates)
  for (let i = 0; i < entries.length; i += 500) {
    await db.ref().update(Object.fromEntries(entries.slice(i, i + 500)))
  }
  console.log('\nDone.')
  process.exit(0)
}

run().catch((e) => { console.error(e); process.exit(1) })
