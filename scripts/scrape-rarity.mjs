/**
 * Scrapes prices from nonsolosorpresine.it and assigns rarity to surprises.
 *
 * For each series on the site:
 *  1. Extracts item codes and prices
 *  2. Matches codes to Firebase surprises (field `code`)
 *  3. Ranks prices within the series by percentile
 *  4. Writes rarity (1/2/3) + rarity_auto=true to Firebase
 *
 * Run:
 *   SERVICE_ACCOUNT=./scripts/serviceAccount.json node scripts/scrape-rarity.mjs
 *   SERVICE_ACCOUNT=./scripts/serviceAccount.json node scripts/scrape-rarity.mjs --dry-run
 *   SERVICE_ACCOUNT=./scripts/serviceAccount.json node scripts/scrape-rarity.mjs --series-url=http://...
 *
 * Options:
 *   --dry-run        Print assignments without writing to Firebase
 *   --series-url=U   Process only one series page (for testing)
 *   --t3=N           Price percentile threshold for 3 stars (default: 0.80)
 *   --t2=N           Price percentile threshold for 2 stars (default: 0.50)
 */

import { readFileSync, writeFileSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const admin   = require('firebase-admin')
const fetch   = require('node-fetch')
const cheerio = require('cheerio')

// --- Args ---
const args     = process.argv.slice(2)
const DRY_RUN    = args.includes('--dry-run')
const SERIES_URL = args.find((a) => a.startsWith('--series-url='))?.split('=').slice(1).join('=') ?? null
const FROM_CSV   = args.find((a) => a.startsWith('--from-csv='))?.split('=')[1] ?? null
const R2         = Number(args.find((a) => a.startsWith('--r2='))?.split('=')[1] ?? 2)
const R3         = Number(args.find((a) => a.startsWith('--r3='))?.split('=')[1] ?? 4)
const OUT_CSV    = args.find((a) => a.startsWith('--out='))?.split('=')[1] ?? 'scripts/scrape-rarity-preview.csv'

const CATEGORY_URLS = [
  'http://www.nonsolosorpresine.it/vendita/sorpresine-kinder-italia/1338',
  'http://www.nonsolosorpresine.it/vendita/sorpresine-kinder-joy-merendero/1346',
  'http://www.nonsolosorpresine.it/vendita/sorpresine-kinder-componibili/19615',
]

const BASE_URL = 'http://www.nonsolosorpresine.it'

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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const fetchHtml = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)
  return res.text()
}

const parsePrice = (raw) => {
  const clean = raw.replace(/[€\s ]/g, '').replace(',', '.')
  const n = parseFloat(clean)
  return isNaN(n) || n <= 0 ? null : n
}

// Normalise a raw code string from the site to match our DB `code` field.
// Site format examples: "01 VQ278 - Coniglio Pic-Nic" → "VQ278"
//                       "2 MPG S-01" → "MPG S-01"
const extractCode = (raw) => {
  // Remove leading number + space
  const withoutNum = raw.replace(/^\d+\s+/, '').trim()
  // Take the part before the first " - " if present
  const code = withoutNum.split(/\s+-\s+/)[0].trim()
  return code.toUpperCase()
}

const assignRarity = (price, minPrice) => {
  if (price > minPrice * R3) return 3
  if (price > minPrice * R2) return 2
  return 1
}

// --- Scraping ---
const getSeriesUrls = async (categoryUrl) => {
  console.log(`\nFetching category: ${categoryUrl}`)
  const html = await fetchHtml(categoryUrl)
  const $ = cheerio.load(html)
  const urls = []
  $('table#table2 a[href]').each((_, el) => {
    const href = $(el).attr('href')
    if (href && href.startsWith('/vendita/')) {
      urls.push(BASE_URL + href)
    }
  })
  console.log(`  Found ${urls.length} series`)
  return [...new Set(urls)]
}

const scrapeSeriesItems = async (seriesUrl) => {
  const html = await fetchHtml(seriesUrl)
  const $ = cheerio.load(html)
  const items = []

  // Product rows alternate bgcolor #FFFFFF / #E3F4D8
  $('tr[bgcolor="#FFFFFF"], tr[bgcolor="#E3F4D8"]').each((_, row) => {
    const tds = $(row).find('td')
    if (tds.length < 2) return

    const descRaw = $(tds[0]).find('b').first().text().trim()
    const priceRaw = $(tds[1]).text().trim()

    if (!descRaw) return
    const price = parsePrice(priceRaw)
    if (price === null) return

    items.push({ code: extractCode(descRaw), price, descRaw })
  })

  return items
}

// --- Apply from CSV ---
const runFromCsv = async (csvPath) => {
  if (DRY_RUN) console.log('DRY RUN — no writes to Firebase')
  console.log(`\nReading CSV: ${csvPath}`)
  const lines = readFileSync(csvPath, 'utf8').trim().split('\n').slice(1) // skip header
  const updates = {}
  let skipped = 0

  for (const line of lines) {
    const cols = line.split(',')
    const id = cols[0]?.trim()
    const rarity = Number(cols[4]?.trim())
    if (!id || !rarity || rarity < 1 || rarity > 3) { skipped++; continue }
    updates[`surprises/${id}/rarity`] = rarity
    updates[`surprises/${id}/rarity_auto`] = true
  }

  console.log(`Updates: ${Object.keys(updates).length / 2}  |  Skippate (rarity non valida): ${skipped}`)

  if (!DRY_RUN && Object.keys(updates).length > 0) {
    console.log('Writing to Firebase...')
    const entries = Object.entries(updates)
    for (let i = 0; i < entries.length; i += 500) {
      await db.ref().update(Object.fromEntries(entries.slice(i, i + 500)))
    }
    console.log('Done.')
  }
  process.exit(0)
}

// --- Main ---
const run = async () => {
  if (DRY_RUN) console.log('DRY RUN — no writes to Firebase')

  // Load all surprises from Firebase (code → [{id, year}] mapping)
  console.log('\nLoading surprises from Firebase...')
  const snap = await db.ref('surprises').once('value')
  const codeToEntries = {} // code → [{id, year}]
  const manualRarity = new Set()
  snap.forEach((child) => {
    const s = child.val()
    if (s.rarity && !s.rarity_auto) manualRarity.add(child.key)
    if (s.code) {
      const key = s.code.toUpperCase()
      if (!codeToEntries[key]) codeToEntries[key] = []
      codeToEntries[key].push({ id: child.key, year: s.set_year_year ? Number(s.set_year_year) : null })
    }
  })
  console.log(`Loaded ${Object.keys(codeToEntries).length} distinct codes (${manualRarity.size} con rarità manuale, skippati)`)

  // Collect series URLs
  let seriesUrls = []
  if (SERIES_URL) {
    seriesUrls = [SERIES_URL]
  } else {
    for (const catUrl of CATEGORY_URLS) {
      const urls = await getSeriesUrls(catUrl)
      seriesUrls.push(...urls)
      await sleep(500)
    }
  }

  let totalMatched = 0
  let totalUnmatched = 0
  const updates = {}
  const csvRows = []

  for (const seriesUrl of seriesUrls) {
    console.log(`\nScraping: ${seriesUrl}`)
    let items
    try {
      items = await scrapeSeriesItems(seriesUrl)
    } catch (e) {
      console.warn(`  ERROR: ${e.message}`)
      await sleep(1000)
      continue
    }

    if (items.length === 0) {
      console.log('  No items found, skipping')
      await sleep(300)
      continue
    }

    // Extract year from site URL (e.g. .../serie-name-2025/12345 → 2025)
    const urlYear = Number(seriesUrl.match(/-(\d{4})\/\d+/)?.[1] ?? 0)

    // Keep only items that match a Firebase code
    const matched = items.filter((it) => codeToEntries[it.code])
    const unmatched = items.filter((it) => !codeToEntries[it.code])

    // Detect duplicates (same code appearing more than once in this series on the site)
    const codeCount = {}
    items.forEach((it) => { codeCount[it.code] = (codeCount[it.code] || 0) + 1 })
    const dupCodes = new Set(Object.entries(codeCount).filter(([, n]) => n > 1).map(([c]) => c))
    if (dupCodes.size > 0) {
      console.log(`  ⚠ Duplicati nel sito: ${[...dupCodes].join(', ')}`)
    }

    console.log(`  ${items.length} items scraped — ${matched.length} matched, ${unmatched.length} unmatched`)
    if (unmatched.length > 0) {
      console.log(`  Unmatched codes: ${unmatched.map((i) => i.code).join(', ')}`)
    }

    if (matched.length === 0) {
      await sleep(300)
      continue
    }

    // Assign rarity by price ratio relative to series minimum
    const minPrice = Math.min(...matched.map((i) => i.price))
    for (const item of matched) {
      const rarity = assignRarity(item.price, minPrice)
      const dup = dupCodes.has(item.code) ? 'SI' : ''

      const entries = codeToEntries[item.code]

      // If year is known, prefer entries matching the site's year
      let targets = urlYear ? entries.filter((e) => e.year === urlYear) : entries
      // Fallback: if no year match, use all entries but flag them
      const yearMismatch = urlYear && targets.length === 0
      if (yearMismatch) targets = entries

      for (const { id } of targets) {
        if (manualRarity.has(id)) continue
        updates[`surprises/${id}/rarity`] = rarity
        updates[`surprises/${id}/rarity_auto`] = true
        csvRows.push({
          id, code: item.code, price: item.price,
          ratio: (item.price / minPrice).toFixed(2),
          rarity, dup,
          note: yearMismatch ? 'anno_non_trovato' : '',
          series: seriesUrl,
        })
      }
    }

    totalMatched += matched.length
    totalUnmatched += unmatched.length
    await sleep(400)
  }

  // Write CSV preview
  const csvHeader = 'id,codice,prezzo,rapporto_min,rarità,duplicato_sito,note,serie'
  const csvBody = csvRows.map((r) => `${r.id},${r.code},${r.price},${r.ratio},${r.rarity},${r.dup},${r.note},${r.series}`).join('\n')
  writeFileSync(OUT_CSV, csvHeader + '\n' + csvBody, 'utf8')

  console.log(`\n--- Summary ---`)
  console.log(`Matched: ${totalMatched}  |  Unmatched: ${totalUnmatched}`)
  console.log(`Firebase updates: ${Object.keys(updates).length}`)
  console.log(`Preview CSV: ${OUT_CSV}`)

  if (!DRY_RUN && Object.keys(updates).length > 0) {
    console.log('\nWriting to Firebase...')
    // Write in chunks to avoid hitting limits
    const entries = Object.entries(updates)
    for (let i = 0; i < entries.length; i += 500) {
      const chunk = Object.fromEntries(entries.slice(i, i + 500))
      await db.ref().update(chunk)
    }
    console.log('Done.')
  }

  process.exit(0)
}

if (FROM_CSV) {
  runFromCsv(FROM_CSV).catch((e) => { console.error(e); process.exit(1) })
} else {
  run().catch((e) => { console.error(e); process.exit(1) })
}
