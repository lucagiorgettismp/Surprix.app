/**
 * Cattura gli screen fake come PNG per marketing social.
 *
 * Prerequisiti:
 *   npm install --save-dev puppeteer
 *   npm run dev  (deve girare su localhost:5173)
 *
 * Uso:
 *   node scripts/capture-screens.js
 *   node scripts/capture-screens.js --screen 01   # solo uno screen
 */

import puppeteer from 'puppeteer'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT, 'fake-screens-export')
const BASE_URL = 'http://localhost:5173'

// ------------------------------------------------------------------
// Formati di output
// ------------------------------------------------------------------
// deviceScaleFactor = 1080 / cssWidth → immagine fisica 1080px wide
const FORMATS = [
  {
    name: '9x16',
    cssWidth: 390,
    cssHeight: 693,
    scale: 2.769,     // 390×2.769=1080, 693×2.769≈1918
    label: '1080×1920 (stories 9:16)',
  },
  {
    name: 'canva',
    cssWidth: 440,
    cssHeight: 956,
    scale: 3,         // 440×3=1320, 956×3=2868
    label: '1320×2868 (Canva)',
  },
]

const SCREENS = [
  { id: '01', name: 'profilo_completo' },
  { id: '02', name: 'profilo_da_browser' },
  { id: '03', name: 'lista_mancanti' },
  { id: '04', name: 'lista_doppi' },
  { id: '05', name: 'selezione_multipla' },
  { id: '06', name: 'scheda_sorpresina_rara' },
  { id: '07', name: 'chat_conversazione' },
  { id: '08', name: 'recensioni_profilo' },
  { id: '10', name: 'device_browser_desktop', formats: ['desktop'] },
]

// Viewport per desktop: più largo del frame, la clip viene dal bounding box dell'elemento
const DESKTOP_FORMAT = {
  name: 'device',
  cssWidth: 1100,
  cssHeight: 700,
  scale: 2,
  label: 'desktop frame (clip su elemento)',
  isMobile: false,
  clipToElement: true,  // usa il bounding box di [data-screen-ready] come clip
}

// ------------------------------------------------------------------
// Helper: attende che l'attributo data-screen-ready appaia nel DOM
// ------------------------------------------------------------------
async function waitForReady(page, timeoutMs = 15000) {
  await page.waitForSelector('[data-screen-ready="true"]', { timeout: timeoutMs })
  await waitForImages(page)
  // Verifica che i colori produttore siano effettivamente applicati
  // (se color-mix non è presente nessun item ha bgcolor != background.paper)
  await waitForColors(page)
}

async function waitForColors(page, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const result = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-screen-ready] .MuiCard-root, [data-screen-ready] .MuiListItem-root'))
      if (cards.length === 0) return 'no-cards'
      const hasColor = cards.some(el => {
        const bg = getComputedStyle(el).backgroundColor
        return bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'rgb(255, 255, 255)' && bg !== 'rgb(18, 18, 18)'
      })
      return hasColor ? 'ok' : 'waiting'
    })
    if (result !== 'waiting') return
    await new Promise(r => setTimeout(r, 200))
  }
}

// ------------------------------------------------------------------
// Helper: attende che tutte le <img> visibili abbiano finito di caricare
// ------------------------------------------------------------------
async function waitForImages(page, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const allLoaded = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'))
      return imgs.every(img => img.complete && img.naturalHeight > 0)
    })
    if (allLoaded) break
    await new Promise(r => setTimeout(r, 150))
  }

  // Aspetta che il browser abbia effettivamente dipinto l'ultimo frame
  // (DOM aggiornato ≠ paint avvenuto — doppio rAF garantisce il flush)
  await page.evaluate(() => new Promise(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  ))
}

// ------------------------------------------------------------------
// Cattura un singolo screen in un formato
// ------------------------------------------------------------------
async function captureScreen(page, screen, format) {
  const url = `${BASE_URL}/fake-screens/${screen.id}`
  console.log(`  → ${format.label} — navigando su ${url}`)

  const mobile = format.isMobile !== false
  await page.setViewport({
    width: format.cssWidth,
    height: format.cssHeight,
    deviceScaleFactor: format.scale,
    isMobile: mobile,
    hasTouch: mobile,
  })

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })

  // Disabilita animazioni per screenshot puliti (deve essere dopo goto)
  await page.addStyleTag({
    content: `*, *::before, *::after { animation-duration: 0ms !important; transition-duration: 0ms !important; }`,
  })

  try {
    await waitForReady(page)
  } catch {
    console.warn(`    ⚠ Timeout waiting for [data-screen-ready] su screen ${screen.id} — cattura ugualmente`)
  }

  // Diagnostics — stampa info utili per debug colori
  const diag = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.MuiCard-root, .MuiListItem-root')).slice(0, 2)
    return {
      cardCount: document.querySelectorAll('.MuiCard-root, .MuiListItem-root').length,
      firstBg: cards[0] ? getComputedStyle(cards[0]).backgroundColor : 'n/a',
      firstStyleAttr: cards[0]?.style?.backgroundColor || 'no inline style',
      colorMixSupported: CSS.supports('background', 'color-mix(in srgb, red 10%, white)'),
    }
  })
  console.log(`    🔍 cards:${diag.cardCount} bg:"${diag.firstBg}" style:"${diag.firstStyleAttr}" color-mix:${diag.colorMixSupported}`)

  const isDevice = screen.formats?.includes('device')
  const filename = isDevice
    ? `${screen.id}_${screen.name}.png`
    : `${screen.id}_${screen.name}_${format.name}.png`
  const filepath = path.join(OUTPUT_DIR, filename)

  // Inietta status bar per formato canva (sposta anche tutti i fixed elements)
  if (format.name === 'canva') {
    await page.evaluate(() => {
      const H = 44 // altezza status bar in CSS px

      // Sposta solo gli elementi fixed nella metà superiore (top-anchored).
      // Gli elementi bottom-anchored (BottomNav) hanno top > vpH/2 e vengono saltati.
      const vpH = window.innerHeight
      document.querySelectorAll('*').forEach(el => {
        const cs = window.getComputedStyle(el)
        if (cs.position === 'fixed') {
          const topPx = parseFloat(cs.top)
          if (!isNaN(topPx) && topPx < vpH / 2) {
            el.style.top = (topPx + H) + 'px'
          }
        }
      })

      // Spinge il contenuto in-flow (spacer box del Topbar, ecc.)
      document.body.style.paddingTop = H + 'px'

      // Crea la status bar
      const sb = document.createElement('div')
      sb.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'right:0',
        `height:${H}px`, 'background:#ffffff',
        'display:flex', 'align-items:center', 'justify-content:space-between',
        'padding:8px 22px 0', 'z-index:999999',
        'font-size:15px', 'font-weight:600',
        'font-family:-apple-system,BlinkMacSystemFont,SF Pro Display,sans-serif',
        'box-sizing:border-box',
      ].join(';')
      sb.innerHTML = `
        <span>9:41</span>
        <span style="display:flex;align-items:center;gap:7px">
          <svg width="17" height="11" viewBox="0 0 17 11" fill="black" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="7" width="3" height="4" rx="0.8"/>
            <rect x="4.7" y="4.5" width="3" height="6.5" rx="0.8"/>
            <rect x="9.4" y="2" width="3" height="9" rx="0.8"/>
            <rect x="14" y="0" width="3" height="11" rx="0.8"/>
          </svg>
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0.5 3.8 Q8 -0.5 15.5 3.8" stroke="black" stroke-width="1.6" stroke-linecap="round"/>
            <path d="M3 6.8 Q8 3.5 13 6.8" stroke="black" stroke-width="1.6" stroke-linecap="round"/>
            <path d="M5.5 9.5 Q8 7.8 10.5 9.5" stroke="black" stroke-width="1.6" stroke-linecap="round"/>
            <circle cx="8" cy="11.5" r="1.3" fill="black"/>
          </svg>
          <svg width="26" height="13" viewBox="0 0 26 13" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.5" y="0.5" width="22" height="12" rx="2.5" stroke="black" stroke-width="1"/>
            <rect x="23" y="3.5" width="2.5" height="6" rx="1.5" fill="black"/>
            <rect x="2" y="2" width="18.5" height="9" rx="1.5" fill="black"/>
          </svg>
        </span>
      `
      document.body.prepend(sb)
    })

    // Lascia al browser il tempo di dipingere
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))
  }

  if (format.clipToElement) {
    const box = await page.$eval('[data-screen-ready]', el => {
      const r = el.getBoundingClientRect()
      return { x: r.left, y: r.top, width: r.width, height: r.height }
    })
    await page.screenshot({
      path: filepath,
      type: 'png',
      clip: { x: box.x, y: box.y, width: box.width, height: box.height },
    })
  } else {
    await page.screenshot({
      path: filepath,
      type: 'png',
      clip: { x: 0, y: 0, width: format.cssWidth, height: format.cssHeight },
    })
  }

  console.log(`    ✓ Salvato: ${filepath}`)
  return filepath
}

// ------------------------------------------------------------------
// Entrypoint
// ------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2)
  const onlyScreenIdx = args.indexOf('--screen')
  const onlyId = onlyScreenIdx !== -1 ? args[onlyScreenIdx + 1] : null
  const targets = onlyId ? SCREENS.filter(s => s.id === onlyId) : SCREENS

  if (targets.length === 0) {
    console.error(`Screen "${onlyId}" non trovato. Opzioni: ${SCREENS.map(s => s.id).join(', ')}`)
    process.exit(1)
  }

  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true })
    console.log(`📁 Cartella creata: ${OUTPUT_DIR}`)
  }

  console.log('🚀 Avvio Puppeteer...')
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--font-render-hinting=none',
    ],
  })

  const saved = []

  try {
    const page = await browser.newPage()

    // Forza tema chiaro e nasconde il cookie banner su ogni documento caricato
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('themeMode', 'light')
      localStorage.setItem('surprix_cookie_consent', 'accepted')
    })

    for (const screen of targets) {
      console.log(`\n📸 Screen ${screen.id} — ${screen.name}`)
      const formats = screen.formats?.includes('desktop')
        ? [DESKTOP_FORMAT]
        : FORMATS
      for (const format of formats) {
        const fp = await captureScreen(page, screen, format)
        saved.push(fp)
      }
    }
  } finally {
    await browser.close()
  }

  console.log(`\n✅ Completato! ${saved.length} PNG salvati in:\n   ${OUTPUT_DIR}`)
  saved.forEach(f => console.log(`   • ${path.basename(f)}`))
}

main().catch(err => {
  console.error('❌ Errore:', err)
  process.exit(1)
})
