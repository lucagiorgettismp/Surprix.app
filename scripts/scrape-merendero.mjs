/**
 * Scrapes all Kinder Joy / Merendero series from nonsolosorpresine.it and
 * produces a CSV ready for manual completion.
 *
 * Columns written automatically:
 *   serie_nome, codice, nome, prezzo, rarita, in_surprix
 *
 * Columns left empty for manual fill:
 *   serie_codice, anno, serie_img_path, img_path
 *
 * Run:
 *   SERVICE_ACCOUNT=./scripts/serviceAccount.json node scripts/scrape-merendero.mjs
 *   SERVICE_ACCOUNT=./scripts/serviceAccount.json node scripts/scrape-merendero.mjs --out=scripts/out.csv
 */

import { readFileSync, writeFileSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const admin   = require('firebase-admin')
const fetch   = require('node-fetch')
const cheerio = require('cheerio')

const BASE_URL     = 'http://www.nonsolosorpresine.it'
const CATEGORY_URL = 'http://www.nonsolosorpresine.it/vendita/sorpresine-kinder-joy-merendero/1346'

const args    = process.argv.slice(2)
const OUT_CSV = args.find((a) => a.startsWith('--out='))?.split('=').slice(1).join('=') ?? 'scripts/scrape-merendero.csv'

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

const fetchHtml = async (url, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.text()
    } catch (e) {
      if (attempt === retries) throw new Error(`${e.message} — ${url}`)
      console.warn(`  Retry ${attempt}/${retries - 1} for ${url}: ${e.message}`)
      await sleep(1000 * attempt)
    }
  }
}

const parsePrice = (raw) => {
  const clean = raw.replace(/[€\s ]/g, '').replace(',', '.')
  const n = parseFloat(clean)
  return isNaN(n) || n <= 0 ? null : n
}

// Two formats from the site:
//   "01 VQ278 - Coniglio Pic-Nic"  → code="VQ278",  name="Coniglio Pic-Nic"
//   "03 Capitan Hippo"             → code="03",      name="Capitan Hippo"
// Distinguisher: if the part after the seq-number contains digits → it's an alphanumeric code;
// if it's pure letters/spaces (a proper name) → the seq-number is the code.
const parseItem = (raw) => {
  const seqMatch = raw.match(/^(\d+)\s+(.+)$/)
  if (!seqMatch) return { code: raw.trim().toUpperCase(), name: '' }
  const seqNum = seqMatch[1]
  const rest   = seqMatch[2].trim()

  // Explicit " - " separator: "VQ278 - Coniglio Pic-Nic"
  const sepIdx = rest.search(/\s+-\s+/)
  if (sepIdx !== -1) {
    return {
      code: rest.slice(0, sepIdx).trim().toUpperCase(),
      name: rest.slice(sepIdx).replace(/^\s*-\s*/, '').trim(),
    }
  }

  // No separator: if rest contains digits → alphanumeric code (e.g. "MPG S-01"), no name
  //               otherwise → pure name, use seq-number as code
  if (/\d/.test(rest)) return { code: rest.toUpperCase(), name: '' }
  return { code: seqNum, name: rest }
}

const assignRarity = (price, minPrice) => {
  if (price > minPrice * 4) return 3
  if (price > minPrice * 2) return 2
  return 1
}

const csvEscape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

// --- Scraping ---
const getSeriesLinks = async () => {
  console.log(`Fetching category: ${CATEGORY_URL}`)
  const html = await fetchHtml(CATEGORY_URL)
  const $ = cheerio.load(html)
  const seen = new Set()
  const series = []
  $('table#table2 a[href]').each((_, el) => {
    const href = $(el).attr('href')
    const name = $(el).text().trim()
    if (href?.startsWith('/vendita/') && !seen.has(href)) {
      seen.add(href)
      series.push({ url: BASE_URL + href, name })
    }
  })
  console.log(`Found ${series.length} series\n`)
  return series
}

const scrapeSeriesPage = async (url) => {
  const html = await fetchHtml(url)
  const $ = cheerio.load(html)

  // Series name from h2: "SORPRESINE»Kinder Joy (Merendero) »Super Mario (2025)" → "Super Mario (2025)"
  const h2 = $('h2').first().text().trim()
  const rawName = h2.split('»').pop()?.trim() || url.split('/').slice(-2, -1)[0].replace(/-/g, ' ')
  // Extract trailing year in parentheses: "Super Mario (2025)" → name="Super Mario", anno="2025"
  const yearMatch = rawName.match(/^(.*?)\s*\((\d{4})\)\s*$/)
  const serieName = yearMatch ? yearMatch[1].trim() : rawName
  const serieAnno = yearMatch ? yearMatch[2] : ''

  const items = []
  $('tr[bgcolor="#FFFFFF"], tr[bgcolor="#E3F4D8"]').each((_, row) => {
    const tds = $(row).find('td')
    if (tds.length < 2) return
    const descRaw  = $(tds[0]).find('b').first().text().trim()
    const priceRaw = $(tds[1]).text().trim()
    if (!descRaw) return
    const price = parsePrice(priceRaw)
    if (price === null) return
    const { code, name } = parseItem(descRaw)
    if (/^SC|^CA/i.test(code) || /cartina|foglietto/i.test(descRaw)) return
    items.push({ code, name, price })
  })

  return { serieName, serieAnno, items }
}

// --- Main ---
const run = async () => {
  console.log('Loading surprises from Firebase...')
  const snap = await db.ref('surprises').once('value')
  const knownCodes = new Set()
  snap.forEach((child) => {
    const code = child.val()?.code
    if (code) knownCodes.add(code.toUpperCase())
  })
  console.log(`${knownCodes.size} distinct codes in Surprix\n`)

  const allSeries = await getSeriesLinks()
  const csvRows = []

  for (const { url } of allSeries) {
    let serieName, items
    let serieAnno
    try {
      ;({ serieName, serieAnno, items } = await scrapeSeriesPage(url))
    } catch (e) {
      console.warn(`  ERROR scraping ${url}: ${e.message}`)
      await sleep(1000)
      continue
    }

    console.log(`Scraping: ${serieName}`)

    if (items.length === 0) {
      console.log('  No items found, skipping')
      await sleep(300)
      continue
    }

    const minPrice = Math.min(...items.map((i) => i.price))
    console.log(`  ${items.length} items (min price: ${minPrice})`)

    for (const item of items) {
      csvRows.push({
        serie_nome:      serieName,
        serie_codice:    '',
        anno:            serieAnno,
        serie_img_path:  '',
        category:        '',
        codice:          item.code,
        nome:            item.name,
        prezzo:          item.price,
        rarita:          assignRarity(item.price, minPrice),
        img_path:        '',
        in_surprix:      knownCodes.has(item.code) ? 'SI' : 'NO',
      })
    }

    await sleep(400)
  }

  const HEADER = 'serie_nome,serie_codice,anno,serie_img_path,category,codice,nome,prezzo,rarita,img_path,in_surprix'
  const body = csvRows.map((r) =>
    [r.serie_nome, r.serie_codice, r.anno, r.serie_img_path, r.category, r.codice, r.nome, r.prezzo, r.rarita, r.img_path, r.in_surprix]
      .map(csvEscape).join(',')
  ).join('\n')

  writeFileSync(OUT_CSV, HEADER + '\n' + body, 'utf8')
  console.log(`\nCSV scritto: ${OUT_CSV}  (${csvRows.length} righe, ${allSeries.length} serie)`)
  process.exit(0)
}

run().catch((e) => { console.error(e); process.exit(1) })
