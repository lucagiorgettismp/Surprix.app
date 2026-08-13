/**
 * Genera l'immagine "scopri la serie" (checklist generica, non personalizzata)
 * per una serie del catalogo: griglia di foto+codice+nome, watermark diagonale,
 * blocco cartina+QR sempre riservato in basso a destra. Canvas fissa 3:4 (1080x1440),
 * la griglia si adatta al numero di pezzi per riempirla al meglio.
 *
 * Non è una funzione live: si lancia a mano quando una serie è pronta a catalogo
 * (nuova o storica) e produce un PNG da postare sui social.
 *
 * Run:
 *   SERVICE_ACCOUNT=./scripts/serviceAccount.json node scripts/generate-checklist.mjs --set=001
 *
 * Options:
 *   --set=<id>       ID della serie (obbligatorio)
 *   --out=<path>     Percorso di output PNG (default: ./checklist-<id>.png)
 *   --svg-out=<path> Salva anche l'SVG grezzo, utile per anteprima rapida in browser/Illustrator
 *   --lang=<it|en>   Lingua delle scritte incorporate nell'immagine (default: it)
 */

import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import QRCode from 'qrcode'

const require = createRequire(import.meta.url)
const admin = require('firebase-admin')
const { Resvg } = require('@resvg/resvg-js')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Il template vive in functions/ (non in scripts/) perche' lo usano sia questo
// script sia la Cloud Function della mancolista live - un'unica fonte di verita'.
const TEMPLATE_SVG = readFileSync(path.join(__dirname, '..', 'functions', 'checklist_template.svg'), 'utf8')

// --- Args ---
const args = process.argv.slice(2)
const SET_ID = args.find((a) => a.startsWith('--set='))?.split('=')[1]
const OUT = args.find((a) => a.startsWith('--out='))?.split('=')[1]
const SVG_OUT = args.find((a) => a.startsWith('--svg-out='))?.split('=')[1]
const LANG = args.find((a) => a.startsWith('--lang='))?.split('=')[1] === 'en' ? 'en' : 'it'

if (!SET_ID) { console.error('Specify --set=<id>'); process.exit(1) }

// Stringhe incorporate nell'immagine (non testo dello script).
const STRINGS = {
  it: { chipTitle: 'Scopri la serie su' },
  en: { chipTitle: 'Discover the series on' },
}[LANG]

// --- Firebase init (stesso pattern di calc-rarity.mjs) ---
const saPath = process.env.SERVICE_ACCOUNT
if (!saPath) { console.error('Set SERVICE_ACCOUNT=<path>'); process.exit(1) }

const serviceAccount = JSON.parse(readFileSync(saPath, 'utf8'))
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('='))
    .map((l) => { const [k, ...rest] = l.split('='); return [k.trim(), rest.join('=').trim().replace(/^["']|["']$/g, '')] })
)
admin.initializeApp({ credential: admin.credential.cert(serviceAccount), databaseURL: env.VITE_FIREBASE_DATABASE_URL })
const db = admin.database()

// --- Costanti di stile ---
// CANVAS_W, MARGIN, HEADER_H devono restare coerenti con checklist_template.svg
// (se modificate l'header nel template, aggiornate HEADER_H qui di conseguenza).
// CANVAS_H NON e' piu' fissa: si calcola dal contenuto (vedi buildChecklistSvg),
// tagliando lo spazio bianco invece di forzare sempre lo stesso 3:4.
const HOSTING_URL = 'https://surprix.app'
const BRAND_TEAL = '#02838F'
// secondaryContainer / onSecondaryContainer del tema MD3 (src/theme/theme.js)
const CHIP_BG = '#CDE7EB'
const CHIP_TEXT = '#324B4E'
// secondary.main del tema (piu' scuro), per la chip del codice
const CODE_CHIP_BG = '#4A6366'
const CODE_CHIP_TEXT = '#FFFFFF'

const CANVAS_W = 1080
const MIN_CANVAS_H = CANVAS_W // pavimento: mai piu' larga che alta (mai orizzontale)
const MARGIN = 36
const GAP = 14
const HEADER_H = 170
const FOOTER_MARGIN = 24
const TEXT_H = 116     // budget sotto la foto: chip codice + chip descrizione (fino a 3 righe)
const NAME_FONT_SIZE = 13
const NAME_LINE_H = 16
const NAME_MAX_LINES = 3
const CODE_CHIP_H = 30
const IDEAL_ASPECT = 0.8 // rapporto larghezza/altezza foto (leggermente verticale), sempre rispettato
const MIN_ROW_ITEMS = 2  // nessuna riga (banner compresa) con meno di 2 elementi
const CARTINA_ASPECT = 120 / 55 // proporzione reale della cartina, mai tagliata ne' stirata

// Layout noti per le taglie standard (numero di pezzi -> colonne), decisi a mano
// per avere un risultato prevedibile senza affidarsi solo all'euristica.
// Le taglie non elencate ("casi speciali") usano il fallback automatico sotto.
const LAYOUT_BY_COUNT = {
  8: 6,
  10: 4,
  12: 5,
  16: 7,
  24: 7,
  28: 8,
}

// --- Helpers ---
const escapeXml = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')

const gsToHttps = (gsUrl) => {
  if (!gsUrl) return null
  if (!gsUrl.startsWith('gs://')) return gsUrl
  const withoutProtocol = gsUrl.slice(5)
  const slashIndex = withoutProtocol.indexOf('/')
  const bucket = withoutProtocol.slice(0, slashIndex)
  const filePath = withoutProtocol.slice(slashIndex + 1)
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(filePath)}?alt=media`
}

const fetchAsDataUri = async (gsUrlOrHttps) => {
  const url = gsToHttps(gsUrlOrHttps)
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    return `data:${contentType};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

// Costruisce la griglia per una combinazione (colonne, righe banner, colonne banner):
// il banner puo' occupare 1 o 2 righe, sempre "circa meta'" colonne (ceil o floor
// per 1 riga; solo ceil per 2 righe, altrimenti risulta stretto e sproporzionato).
// Gli item avanzati si distribuiscono in modo equo tra le eventuali 2 righe banner
// (non a riempimento greedy, altrimenti l'ultima riga puo' restare quasi vuota).
// Se restano colonne inutilizzate in ogni riga banner, il banner si allarga per
// riempirle invece di lasciare celle vuote.
const buildGrid = (itemCount, cols, reservedRows, reservedCols) => {
  const bannerRowItemCols = cols - reservedCols
  if (bannerRowItemCols < MIN_ROW_ITEMS) return null

  let fullRows = 0
  while (fullRows * cols + reservedRows * bannerRowItemCols < itemCount) fullRows++
  const rows = fullRows + reservedRows
  const capacity = fullRows * cols + reservedRows * bannerRowItemCols
  const empty = capacity - itemCount
  const bannerZoneItems = itemCount - fullRows * cols
  if (bannerZoneItems < MIN_ROW_ITEMS) return null

  const perRow = []
  if (reservedRows === 1) {
    perRow.push(bannerZoneItems)
  } else {
    const base = Math.floor(bannerZoneItems / reservedRows)
    const rem = bannerZoneItems % reservedRows
    for (let i = 0; i < reservedRows; i++) perRow.push(base + (i < rem ? 1 : 0))
  }
  const itemsInLastRow = perRow[perRow.length - 1]
  if (itemsInLastRow < MIN_ROW_ITEMS) return null

  const positions = []
  for (let r = 0; r < fullRows; r++) for (let c = 0; c < cols; c++) positions.push({ row: r, col: c })
  for (let i = 0; i < reservedRows; i++) {
    const r = fullRows + i
    for (let c = 0; c < perRow[i]; c++) positions.push({ row: r, col: c })
  }

  const widenedReservedCols = cols - Math.max(...perRow)

  return { rows, cols, reservedCols: widenedReservedCols, reservedRows, positions, empty, itemsInLastRow }
}

// Sceglie colonne/righe-banner/colonne-banner: layout noto per le taglie standard,
// fallback automatico per i casi speciali. Priorita': 1) canvas piu' basso possibile,
// 2) a parita' meno spazio bianco residuo, 3) meno colonne (foto piu' grandi),
// 4) meno celle vuote.
const chooseGrid = (itemCount, availW) => {
  const withMetrics = (grid) => {
    const cellW = (availW - (grid.cols - 1) * GAP) / grid.cols
    const photoH = cellW / IDEAL_ASPECT
    const cellH = photoH + TEXT_H
    const contentH = grid.rows * cellH + (grid.rows - 1) * GAP
    const canvasH = Math.max(HEADER_H + contentH + FOOTER_MARGIN, MIN_CANVAS_H)
    return { ...grid, cellW, photoH, cellH, contentH, canvasH }
  }

  const knownCols = LAYOUT_BY_COUNT[itemCount]
  if (knownCols) {
    const rc = Math.max(2, Math.ceil(knownCols / 2))
    return withMetrics(buildGrid(itemCount, knownCols, 1, rc))
  }

  const colsCandidates = [3, 4, 5, 6, 7, 8, 9, 10]
  const rrCandidates = [1, 2]
  const scoreOf = (grid) => {
    const slack = Math.max(0, grid.canvasH - HEADER_H - FOOTER_MARGIN - grid.contentH)
    return grid.canvasH * 100000 + slack * 10 + grid.cols * 10 + grid.empty
  }
  let best = null
  for (const cols of colsCandidates) {
    for (const reservedRows of rrCandidates) {
      const rcCandidates = reservedRows === 2
        ? [Math.max(2, Math.ceil(cols / 2))]
        : [...new Set([Math.max(2, Math.ceil(cols / 2)), Math.max(2, Math.floor(cols / 2))])]
      for (const reservedCols of rcCandidates) {
        const raw = buildGrid(itemCount, cols, reservedRows, reservedCols)
        if (!raw) continue
        const grid = withMetrics(raw)
        const score = scoreOf(grid)
        if (!best || score < best.score) best = { ...grid, score }
      }
    }
  }
  if (!best) {
    // Fallback estremo: rilassa il vincolo sulla riga banner, prendi il meno peggio
    for (const cols of colsCandidates) {
      const rc = Math.max(2, Math.ceil(cols / 2))
      for (const reservedRows of rrCandidates) {
        const bannerRowItemCols = cols - rc
        if (bannerRowItemCols < 1) continue
        let fullRows = 0
        while (fullRows * cols + reservedRows * bannerRowItemCols < itemCount) fullRows++
        const rows = fullRows + reservedRows
        const capacity = fullRows * cols + reservedRows * bannerRowItemCols
        const grid = withMetrics({ rows, cols, reservedCols: rc, reservedRows, positions: [], empty: capacity - itemCount, itemsInLastRow: itemCount - fullRows * cols })
        if (!best || grid.itemsInLastRow > best.itemsInLastRow) best = grid
      }
    }
  }
  return best
}

// Spezza il testo su piu' righe in base a una stima caratteri/larghezza
// (resvg non offre una misura reale del testo lato Node, quindi si stima).
const wrapText = (text, maxWidthPx, fontSizePx, maxLines) => {
  const maxChars = Math.max(6, Math.floor(maxWidthPx / (fontSizePx * 0.56)))
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxChars && current) {
      lines.push(current)
      current = word
      if (lines.length === maxLines) break
    } else {
      current = candidate
    }
  }
  if (lines.length < maxLines && current) lines.push(current)
  if (lines.length === maxLines) {
    const usedWords = lines.join(' ').split(/\s+/).length
    if (usedWords < words.length) {
      let last = lines[maxLines - 1]
      while (last.length > maxChars - 1) last = last.slice(0, -1)
      lines[maxLines - 1] = last.trimEnd() + '…'
    }
  }
  return lines
}

// --- Fetch dati serie ---
// Nota: si scarica l'intero nodo "surprises" e si filtra in JS invece di usare
// orderByChild('set_id').equalTo(setId) - quella query filtrata, eseguita via
// Admin SDK, e' risultata inaffidabile (tornava risultati parziali) anche con
// l'indice giusto su set_id. Stesso approccio gia' usato in diagnose-sets.mjs.
const fetchSetData = async (setId) => {
  const [setSnap, allSurprisesSnap] = await Promise.all([
    db.ref(`sets/${setId}`).once('value'),
    db.ref('surprises').once('value'),
  ])
  if (!setSnap.exists()) throw new Error(`Serie "${setId}" non trovata`)

  const setData = setSnap.val()
  const surprises = []
  allSurprisesSnap.forEach((child) => {
    if (child.val()?.set_id === setId) surprises.push({ id: child.key, ...child.val() })
  })
  if (surprises.length === 0) throw new Error(`Nessun pezzo trovato per la serie "${setId}"`)

  surprises.sort((a, b) => (a.code || '').localeCompare(b.code || '', 'it', { numeric: true }))

  const producerId = surprises[0].set_producer_id
  const year = surprises[0].set_year_year
  const producerSnap = producerId ? await db.ref(`producers/${producerId}`).once('value') : null
  const producerName = producerSnap?.exists() ? (producerSnap.val().name || producerId) : (producerId || '')

  return { setData, surprises, producerId, producerName, year }
}

// --- Build SVG ---
const buildChecklistSvg = async (setId, { setData, surprises, producerId, producerName, year }) => {
  const availW = CANVAS_W - 2 * MARGIN
  const { cols, rows, cellW, cellH, photoH, reservedCols, reservedRows, positions } = chooseGrid(surprises.length, availW)

  // Il blocco cartina+chip QR ha proporzione fissa (mai tagliata ne' stirata),
  // quindi puo' risultare piu' alto della riga(righe) banner che lo ospitano
  // (dipende da CARTINA_ASPECT, non dalla griglia). In quel caso serve spazio
  // extra in fondo al canvas, altrimenti il blocco verrebbe tagliato.
  const reservedW = cellW * reservedCols + GAP * (reservedCols - 1)
  const reservedHNominal = cellH * reservedRows + GAP * (reservedRows - 1)
  const bannerChipH = 76
  const bannerChipGap = 12
  const bannerCoverPad = reservedW * 0.05
  const bannerCoverW = reservedW - bannerCoverPad * 2
  const bannerCoverH = bannerCoverW / CARTINA_ASPECT
  const bannerBlockH = bannerCoverH + bannerChipGap + bannerChipH
  const extraH = Math.max(0, bannerBlockH - reservedHNominal)

  // Altezza canvas tagliata sul contenuto reale, con un pavimento minimo
  // (mai piu' larga che alta) invece di forzare sempre lo stesso 3:4.
  const contentH = rows * cellH + (rows - 1) * GAP + extraH
  const CANVAS_H = Math.max(HEADER_H + contentH + FOOTER_MARGIN, MIN_CANVAS_H)
  const gridTopOffset = HEADER_H + (CANVAS_H - FOOTER_MARGIN - HEADER_H - contentH) / 2

  const posFor = (row, col) => ({
    x: MARGIN + col * (cellW + GAP),
    y: gridTopOffset + row * (cellH + GAP),
  })

  const [itemImages, coverImage] = await Promise.all([
    Promise.all(surprises.map((s) => fetchAsDataUri(s.img_path))),
    fetchAsDataUri(setData.img_path),
  ])

  const routeProducer = producerId || 'catalog'
  const routeYear = setData.year_id || ''
  const seriesUrl = `${HOSTING_URL}/catalog/${routeProducer}/${routeYear}/${setId}`
  const qrDataUri = await QRCode.toDataURL(seriesUrl, { margin: 1, width: 300, color: { dark: BRAND_TEAL, light: '#FFFFFF' } })

  const gap1 = 6    // foto -> chip codice
  const gap2 = 6    // chip codice -> chip descrizione
  const descPad = 8 // padding verticale (top+bottom) della chip descrizione
  const cells = surprises.map((s, i) => {
    const { row, col } = positions[i]
    const { x, y } = posFor(row, col)
    const img = itemImages[i]
    const codeText = escapeXml(s.code || '')
    const itemDesc = (LANG === 'en' && s.description_en) || s.description || ''
    const nameLines = wrapText(itemDesc, cellW - 20, NAME_FONT_SIZE, NAME_MAX_LINES)
    const codeChipY = y + photoH + gap1
    const descChipY = codeChipY + CODE_CHIP_H + gap2
    // Alta in base al numero di righe effettive, non stirata al budget massimo.
    const descChipH = descPad * 2 + nameLines.length * NAME_LINE_H
    const nameMarkup = nameLines.map((line, li) =>
      `<text x="${x + cellW / 2}" y="${descChipY + descPad + 11 + li * NAME_LINE_H}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="${NAME_FONT_SIZE}" fill="${CHIP_TEXT}">${escapeXml(line)}</text>`
    ).join('')
    return `
    <g>
      <rect x="${x}" y="${y}" width="${cellW}" height="${photoH}" rx="10" fill="#fff" stroke="${BRAND_TEAL}" stroke-width="2"/>
      ${img ? `<image href="${img}" x="${x + 6}" y="${y + 6}" width="${cellW - 12}" height="${photoH - 12}" preserveAspectRatio="xMidYMid meet"/>` : ''}
      <rect x="${x}" y="${codeChipY}" width="${cellW}" height="${CODE_CHIP_H}" rx="8" fill="${CODE_CHIP_BG}"/>
      <text x="${x + cellW / 2}" y="${codeChipY + CODE_CHIP_H / 2 + 6}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="16" fill="${CODE_CHIP_TEXT}">${codeText}</text>
      ${nameLines.length ? `<rect x="${x}" y="${descChipY}" width="${cellW}" height="${descChipH}" rx="8" fill="${CHIP_BG}"/>` : ''}
      ${nameMarkup}
    </g>`
  }).join('')

  // Blocco riservato cartina+QR: puo' occupare 1 o 2 righe di altezza, sempre
  // almeno meta' delle colonne di larghezza. La cartina NON viene mai tagliata
  // ne' stirata: si calcola la sua altezza reale (CARTINA_ASPECT) a partire
  // dalla larghezza disponibile, e il blocco cartina+chip QR viene centrato
  // verticalmente nello spazio del banner (comprensivo dell'eventuale extraH
  // calcolato sopra, cosi' non risulta mai tagliato in fondo al canvas).
  const bannerRow0 = rows - reservedRows
  const bannerCol0 = cols - reservedCols
  const { x: rx, y: ry } = posFor(bannerRow0, bannerCol0)
  const reservedH = reservedHNominal + extraH

  const chipH = bannerChipH
  const chipGap = bannerChipGap
  const coverPad = bannerCoverPad
  const coverW = bannerCoverW
  const coverH = bannerCoverH
  const blockH = bannerBlockH
  const blockY = ry + Math.max(0, (reservedH - blockH) / 2)
  const coverY = blockY

  const chipY = coverY + coverH + chipGap
  const chipPad = 12
  const qrSize = chipH - chipPad * 2
  // QR sempre a destra del testo (non a sinistra).
  const qrX = rx + reservedW - chipPad - qrSize
  const chipTextX = rx + chipPad

  const reservedBlock = `
    <g>
      ${coverImage ? `<image href="${coverImage}" x="${rx + coverPad}" y="${coverY}" width="${coverW}" height="${coverH}" preserveAspectRatio="xMidYMid meet"/>` : ''}
      <rect x="${rx}" y="${chipY}" width="${reservedW}" height="${chipH}" rx="14" fill="${CHIP_BG}"/>
      <image href="${qrDataUri}" x="${qrX}" y="${chipY + chipPad}" width="${qrSize}" height="${qrSize}"/>
      <text x="${chipTextX}" y="${chipY + chipH / 2 - 6}" font-family="Inter" font-weight="700" font-size="14" fill="${CHIP_TEXT}">${STRINGS.chipTitle}</text>
      <text x="${chipTextX}" y="${chipY + chipH / 2 + 18}" font-family="Inter" font-weight="700" font-size="16" fill="${BRAND_TEAL}">surprix.app</text>
    </g>`

  const title = escapeXml(setData.name || setId)
  const subtitle = escapeXml([producerName, year].filter(Boolean).join(' · '))

  // Sfondo, watermark, header e blocco brand vengono da checklist_template.svg
  // (apribile/modificabile in Illustrator). Qui sostituiamo solo i placeholder
  // per id, inseriamo la griglia calcolata al posto del marker, e adattiamo
  // viewBox/altezza del template (fisse a 1440 nel file) alla CANVAS_H reale.
  return TEMPLATE_SVG
    .replace(
      /<text\b[^>]*\bid="cl-title"[^>]*>[\s\S]*?<\/text>/,
      `<text id="cl-title" x="${MARGIN}" y="70" font-family="Inter" font-weight="700" font-size="52" fill="${BRAND_TEAL}">${title}</text>`
    )
    .replace(
      /<text\b[^>]*\bid="cl-subtitle"[^>]*>[\s\S]*?<\/text>/,
      `<text id="cl-subtitle" x="${MARGIN}" y="102" font-family="Inter" font-weight="700" font-size="24" fill="#666">${subtitle}</text>`
    )
    .replace('<!--GRID_CONTENT-->', `${cells}\n  ${reservedBlock}`)
    .replace(/viewBox="0 0 1080 1440"/, `viewBox="0 0 ${CANVAS_W} ${CANVAS_H}"`)
    .replace(/width="1080" height="1440"/g, `width="${CANVAS_W}" height="${CANVAS_H}"`)
}

// --- Main ---
const main = async () => {
  console.log(`Genero checklist per la serie "${SET_ID}"...`)
  const data = await fetchSetData(SET_ID)
  const svg = await buildChecklistSvg(SET_ID, data)

  if (SVG_OUT) {
    writeFileSync(SVG_OUT, svg)
    console.log(`SVG grezzo salvato: ${SVG_OUT}`)
  }

  const resvg = new Resvg(svg, {
    font: {
      fontFiles: [path.join(__dirname, '..', 'functions', 'fonts', 'Inter-Bold.ttf')],
      loadSystemFonts: false,
      defaultFontFamily: 'Inter',
    },
  })
  const png = resvg.render().asPng()

  const outPath = OUT || path.join(process.cwd(), `checklist-${SET_ID}.png`)
  writeFileSync(outPath, png)
  console.log(`Fatto: ${outPath} (${data.surprises.length} pezzi)`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
