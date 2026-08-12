const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret }      = require('firebase-functions/params')
const { logger }            = require('firebase-functions')
const admin                 = require('firebase-admin')
const fs                    = require('fs')
const path                  = require('path')
const QRCode                = require('qrcode')

admin.initializeApp({ databaseURL: 'https://collectionhelper.firebaseio.com' })
const db = admin.database()

const telegramToken   = defineSecret('TELEGRAM_TOKEN')
const TELEGRAM_CHAT_ID = '135432052'
const RTDB_URL = 'https://collectionhelper.firebaseio.com'

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

// --- Telegram webhook per comandi admin ---
// Menu comandi nativo (☰ accanto alla chat box). Va registrato una tantum
// (o dopo ogni modifica alla lista) inviando /setupmenu al bot.
const TELEGRAM_COMMANDS = [
  { command: 'stats',   description: '📊 Panoramica generale' },
  { command: 'missing', description: '🔍 Sorpresine più cercate' },
  { command: 'doubles', description: '📦 Sorpresine più doppie' },
  { command: 'sets',    description: '📂 Serie con più mancanti' },
  { command: 'rare',    description: '💎 Sorpresine più rare' },
  { command: 'serie',   description: '📂 Statistiche di una serie (es. /serie 001)' },
]

// Pulsantiera persistente sotto il campo testo (come trackbot), al posto
// della tastiera di sistema. Ogni bottone manda il proprio testo come
// messaggio: viene rimappato sul comando corrispondente più sotto.
const KEYBOARD_LAYOUT = [
  ['📊 Panoramica', '🔍 Più cercate'],
  ['📦 Più doppie',  '📂 Top serie'],
  ['💎 Più rare',    '🔎 Cerca serie'],
]
const TEXT_TO_CMD = {
  '📊 Panoramica':  '/stats',
  '🔍 Più cercate': '/missing',
  '📦 Più doppie':  '/doubles',
  '📂 Top serie':   '/sets',
  '💎 Più rare':    '/rare',
  '🔎 Cerca serie': '/serie',
}

const SERIE_PROMPT = "📂 Invia l'ID della serie (es. 001):"

exports.telegramWebhook = onRequest(
  { region: 'europe-west1', secrets: [telegramToken] },
  async (req, res) => {
    const token = telegramToken.value()

    const tgPost = (method, body) => fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const send = (text) => tgPost('sendMessage', { chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' })

    const countUsers = async () => {
      const r = await fetch(`${RTDB_URL}/users.json?shallow=true`)
      const data = await r.json()
      return data ? Object.keys(data).length : 0
    }

    const top = (map, n = 10) =>
      Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n)

    const loadStatsData = async () => {
      const [missingsSnap, doublesSnap, surprisesSnap, setsSnap] = await Promise.all([
        db.ref('missings').once('value'),
        db.ref('user_doubles').once('value'),
        db.ref('surprises').once('value'),
        db.ref('sets').once('value'),
      ])

      const missings  = missingsSnap.exists()  ? missingsSnap.val()  : {}
      const doubles   = doublesSnap.exists()   ? doublesSnap.val()   : {}
      const surprises = surprisesSnap.exists() ? surprisesSnap.val() : {}
      const sets      = setsSnap.exists()      ? setsSnap.val()      : {}

      const missingCount = {}, doubleCount = {}
      for (const user of Object.values(missings))
        for (const id of Object.keys(user))
          missingCount[id] = (missingCount[id] || 0) + 1
      for (const user of Object.values(doubles))
        for (const id of Object.keys(user))
          doubleCount[id] = (doubleCount[id] || 0) + 1

      const sDetail = (id) => {
        const s = surprises[id]
        if (!s) return id
        const code     = s.code ? `#${s.code}` : ''
        const desc     = s.description || s.name || id
        const serie    = s.set_name || sets[s.set_id]?.name || ''
        const year     = s.set_year_year || ''
        const producer = (s.set_producer_id || '').replace(/_/g, ' ')
        return [code, desc, serie, [producer, year].filter(Boolean).join(' · ')]
          .filter(Boolean).join('\n    ')
      }

      return { missings, doubles, surprises, sets, missingCount, doubleCount, sDetail }
    }

    const msg = req.body?.message
    if (!msg) { res.sendStatus(200); return }

    const chatId = String(msg.chat?.id ?? '')
    if (chatId !== TELEGRAM_CHAT_ID) { res.sendStatus(200); return }

    const text = msg.text?.trim() || ''
    const [cmdRaw, ...rawArgs] = text.split(/\s+/)
    const cmdFromButton = TEXT_TO_CMD[text]
    const cmd  = cmdFromButton || cmdRaw.replace(/@\w+$/, '') // strip eventuale @NomeBot
    const args = cmdFromButton ? [] : rawArgs

    // /setupmenu → registra il menu comandi nativo (☰) e la pulsantiera persistente
    if (cmd === '/setupmenu') {
      await tgPost('setMyCommands', { commands: TELEGRAM_COMMANDS })
      await tgPost('setChatMenuButton', { menu_button: { type: 'commands' } })
      await tgPost('sendMessage', {
        chat_id: TELEGRAM_CHAT_ID,
        text: '✅ Menu e pulsantiera registrati.',
        reply_markup: {
          keyboard: KEYBOARD_LAYOUT.map(row => row.map(t => ({ text: t }))),
          resize_keyboard: true,
          is_persistent: true,
        },
      })
      res.sendStatus(200); return
    }

    // top 5 più cercate e top 5 più doppie di una serie
    const sendSerieStats = async (setId) => {
      try {
        const { surprises, sets, missingCount, doubleCount, sDetail } = await loadStatsData()

        if (!sets[setId]) {
          await send(`Serie "${setId}" non trovata.`)
          return
        }

        const setSurpriseIds = Object.entries(surprises)
          .filter(([, s]) => s.set_id === setId)
          .map(([id]) => id)

        const setMissing = {}, setDoubles = {}
        for (const id of setSurpriseIds) {
          if (missingCount[id]) setMissing[id] = missingCount[id]
          if (doubleCount[id])  setDoubles[id] = doubleCount[id]
        }

        const fmt = (map) => top(map, 5).length
          ? top(map, 5).map(([id, c], i) => `${i + 1}. ${sDetail(id)}\n    ${c}x`)
          : ['—']

        const meta = surprises[setSurpriseIds[0]]
        const producer = (meta?.set_producer_id || '').replace(/_/g, ' ')
        const year = meta?.set_year_year || ''

        const lines = [
          `<b>📂 ${[sets[setId].name || setId, [producer, year].filter(Boolean).join(' · ')].filter(Boolean).join('\n')}</b>`,
          ``,
          `<b>🔍 Top 5 più cercate</b>`,
          ...fmt(setMissing),
          ``,
          `<b>📦 Top 5 più doppie</b>`,
          ...fmt(setDoubles),
        ]

        await send(lines.join('\n'))
      } catch (e) {
        logger.error('telegramWebhook serie error', e)
        await send('Errore nel calcolo della serie.')
      }
    }

    // /serie [set_id] → se l'id manca, lo chiede con un force-reply
    if (cmd === '/serie') {
      const setId = args.join(' ').trim()

      if (!setId) {
        await tgPost('sendMessage', {
          chat_id: TELEGRAM_CHAT_ID,
          text: SERIE_PROMPT,
          reply_markup: { force_reply: true, selective: true },
        })
        res.sendStatus(200); return
      }

      await sendSerieStats(setId)
      res.sendStatus(200); return
    }

    // Risposta al prompt "Invia l'ID della serie" → usa il testo come set id
    if (msg.reply_to_message?.text === SERIE_PROMPT) {
      await sendSerieStats(text)
      res.sendStatus(200); return
    }

    const ACTIONS = {
      '/stats':   'stats_overview',
      '/missing': 'stats_missing',
      '/doubles': 'stats_doubles',
      '/sets':    'stats_sets',
      '/rare':    'stats_rare',
    }
    const action = ACTIONS[cmd]
    if (!action) { res.sendStatus(200); return }

    try {
        await send('⏳ Calcolo in corso...')

        const { surprises, sets, missingCount, doubleCount, sDetail } = await loadStatsData()

        const missingBySet = {}
        for (const [id, count] of Object.entries(missingCount)) {
          const setId = surprises[id]?.set_id
          if (setId) missingBySet[setId] = (missingBySet[setId] || 0) + count
        }

        const rarityScore = {}
        for (const [id, mc] of Object.entries(missingCount)) {
          if (mc < 3) continue
          const dc = doubleCount[id] || 0
          rarityScore[id] = (mc * mc) / (mc + dc)
        }

        const totalMissings = Object.values(missingCount).reduce((a, b) => a + b, 0)
        const totalDoubles  = Object.values(doubleCount).reduce((a, b) => a + b, 0)

        const setMeta = {}
        for (const s of Object.values(surprises)) {
          if (!s.set_id || setMeta[s.set_id]) continue
          setMeta[s.set_id] = {
            year: s.set_year_year || '',
            producer: (s.set_producer_id || '').replace(/_/g, ' '),
          }
        }

        const stDetail = (id) => {
          const name     = sets[id]?.name || id
          const year     = setMeta[id]?.year || ''
          const producer = setMeta[id]?.producer || ''
          return [name, [producer, year].filter(Boolean).join(' · ')]
            .filter(Boolean).join('\n    ')
        }

        let lines = []

        if (action === 'stats_overview') {
          const usersCount = await countUsers()
          lines = [
            `<b>📊 Panoramica generale</b>`,
            ``,
            `Utenti registrati: ${usersCount.toLocaleString('it-IT')}`,
            `Mancanti totali: ${totalMissings.toLocaleString('it-IT')}`,
            `Doppi totali: ${totalDoubles.toLocaleString('it-IT')}`,
            `Pezzi a catalogo: ${Object.keys(surprises).length.toLocaleString('it-IT')}`,
            `Serie a catalogo: ${Object.keys(sets).length.toLocaleString('it-IT')}`,
          ]
        } else if (action === 'stats_missing') {
          lines = [
            `<b>🔍 Top 10 sorpresine più cercate</b>`,
            ...top(missingCount).map(([id, c], i) => `${i + 1}. ${sDetail(id)}\n    ${c}x`),
          ]
        } else if (action === 'stats_doubles') {
          lines = [
            `<b>📦 Top 10 sorpresine più doppie</b>`,
            ...top(doubleCount).map(([id, c], i) => `${i + 1}. ${sDetail(id)}\n    ${c}x`),
          ]
        } else if (action === 'stats_sets') {
          lines = [
            `<b>📂 Top 10 serie con più mancanti</b>`,
            ...top(missingBySet).map(([id, c], i) => `${i + 1}. ${stDetail(id)}\n    ${c}`),
          ]
        } else if (action === 'stats_rare') {
          lines = [
            `<b>💎 Top 10 sorpresine più rare</b>`,
            ...top(rarityScore).map(([id], i) => {
              const mc = missingCount[id] || 0
              const dc = doubleCount[id] || 0
              return `${i + 1}. ${sDetail(id)}\n    cercata ${mc}x · offerta ${dc}x`
            }),
          ]
        }

        await send(lines.join('\n'))
      } catch (e) {
        logger.error('telegramWebhook stats error', e)
        await send('Errore nel calcolo delle stats.')
      }

    res.sendStatus(200)
  }
)

// --- Admin: elimina utente da Firebase Auth ---
exports.deleteAuthUser = onCall(
  { region: 'europe-west1' },
  async (req) => {
    if (!req.auth) throw new HttpsError('unauthenticated', 'Unauthenticated')
    const callerSnap = await db.ref(`uids/${req.auth.uid}/admin`).once('value')
    if (!callerSnap.exists()) throw new HttpsError('permission-denied', 'Unauthorized')
    const { uid } = req.data
    if (!uid) throw new HttpsError('invalid-argument', 'Missing uid')
    try {
      await admin.auth().deleteUser(uid)
    } catch (e) {
      if (e.code !== 'auth/user-not-found') throw new HttpsError('internal', e.message)
    }
    return { success: true }
  }
)

// --- OG meta injector per /u/:username ---
const HOSTING_URL = 'https://surprix.app'
const BRAND_TEAL  = '#02838F'
// secondaryContainer / onSecondaryContainer del tema MD3 (src/theme/theme.js)
const CHIP_BG   = '#CDE7EB'
const CHIP_TEXT = '#324B4E'
// secondary.main del tema (piu' scuro), per la chip del codice
const CODE_CHIP_BG   = '#4A6366'
const CODE_CHIP_TEXT = '#FFFFFF'
const CARTINA_ASPECT = 120 / 55 // proporzione reale della cartina, mai tagliata ne' stirata

const TEMPLATE_SVG = fs.readFileSync(path.join(__dirname, 'og_image.svg'), 'utf8')
const FONT_OPTIONS = {
  fontFiles: [path.join(__dirname, 'fonts', 'Inter-Bold.ttf')],
  loadSystemFonts: false,
  defaultFontFamily: 'Inter',
}

const escapeHtml = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Centri X delle 5 uova nel template (sinistra → destra)
const EGG_CX = [262.32, 370.45, 478.59, 586.72, 694.85]
const eggPath = (cx) =>
  `M${cx},322.3c-19.13,0-45.9,28.69-45.9,70.13,0,33.79,20.66,57.38,45.9,57.38s45.9-23.59,45.9-57.38c0-41.44-26.78-70.13-45.9-70.13Z`

const buildEggGroup = (avgRating) => {
  const score   = avgRating ? parseFloat(avgRating) : 0
  const rounded = Math.round(score * 2) / 2
  const label   = avgRating ? avgRating.replace('.', ',') : '0,0'

  const defs = []
  const eggs = []

  EGG_CX.forEach((cx, i) => {
    const v      = i + 1
    const isFull = v <= Math.floor(rounded)
    const isHalf = v - 0.5 === rounded

    if (isHalf) {
      defs.push(`<clipPath id="ehalf${i}"><rect x="${cx - 45.9}" y="318" width="45.9" height="135"/></clipPath>`)
      eggs.push(`<path d="${eggPath(cx)}" fill="#fff" opacity="0.18" stroke="#fff" stroke-miterlimit="10" stroke-width="1.84"/>`)
      eggs.push(`<path d="${eggPath(cx)}" fill="#FAAF00" clip-path="url(#ehalf${i})"/>`)
    } else {
      const color = isFull ? '#FAAF00' : '#fff'
      const op    = isFull ? '1' : '0.18'
      eggs.push(`<path d="${eggPath(cx)}" fill="${color}" opacity="${op}" stroke="${color}" stroke-miterlimit="10" stroke-width="1.84"/>`)
    }
  })

  const defsBlock  = defs.length ? `<defs>${defs.join('')}</defs>\n    ` : ''
  const scoreText  =
    `<text transform="translate(770.48 421.25) scale(1.02 1)" fill="#fff" font-family="Inter" font-weight="700">` +
    `<tspan font-size="96">${label}</tspan>` +
    `<tspan font-size="48"> /5</tspan></text>`

  return `<g id="og-eggs">\n    ${defsBlock}${scoreText}\n    ${eggs.join('\n    ')}\n  </g>`
}

const buildOgSvg = (username, avgRating) => {
  const len      = username.length
  const fontSize = len <= 8 ? 90 : len <= 12 ? 74 : len <= 16 ? 58 : 44
  const urlSize  = (len + 14) <= 28 ? 40 : (len + 14) <= 34 ? 34 : 28
  const safe     = escapeHtml(username)

  return TEMPLATE_SVG
    .replace(
      /<text\b[^>]*\bid="og-username"[^>]*>[\s\S]*?<\/text>/,
      `<text transform="translate(600 268.82) scale(1.02 1)" text-anchor="middle" fill="#fff" font-family="Inter" font-size="${fontSize}" font-weight="700">${safe}</text>`
    )
    .replace(
      /<text\b[^>]*\bid="og-url"[^>]*>[\s\S]*?<\/text>/,
      `<text transform="translate(600 531.44) scale(1.02 1)" text-anchor="middle" fill="#fff" font-family="Inter" font-size="${urlSize}" font-weight="700">surprix.app/u/${safe}</text>`
    )
    .replace(
      /<g\b[^>]*\bid="og-eggs"[^>]*>[\s\S]*?<\/g>/,
      buildEggGroup(avgRating)
    )
}

// --- Mancolista/doppiolista personale live: /u/:username/checklist/:setId.png ---
// Stesso template e stessa logica di griglia di scripts/generate-checklist.mjs
// (la checklist generica "scopri la serie"), con badge di stato al posto della
// generica e link al profilo invece che alla pagina serie. Se si aggiorna il
// layout in uno dei due posti, aggiornare anche l'altro.
const CHECKLIST_TEMPLATE_SVG = fs.readFileSync(path.join(__dirname, 'checklist_template.svg'), 'utf8')

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

// Cache in-process della lista surprises: si scarica tutto il nodo e si filtra
// per set_id in JS invece di una query filtrata (via Admin SDK e' risultata
// inaffidabile - stesso problema risolto in scripts/generate-checklist.mjs).
// La cache evita di riscaricare l'intero catalogo su istanze "calde".
let surprisesCache = { data: null, fetchedAt: 0 }
const SURPRISES_CACHE_TTL_MS = 10 * 60 * 1000

const getAllSurprises = async () => {
  const now = Date.now()
  if (surprisesCache.data && (now - surprisesCache.fetchedAt) < SURPRISES_CACHE_TTL_MS) {
    return surprisesCache.data
  }
  const res = await fetch(`${RTDB_URL}/surprises.json`)
  const raw = res.ok ? await res.json().catch(() => null) : null
  const list = raw && typeof raw === 'object'
    ? Object.entries(raw).map(([id, val]) => ({ id, ...val }))
    : []
  surprisesCache = { data: list, fetchedAt: now }
  return list
}

// --- Layout griglia (stesse costanti/logica di scripts/generate-checklist.mjs) ---
const CL_MARGIN = 36
const CL_GAP = 14
const CL_HEADER_H = 200 // spazio extra per data di generazione + legenda badge (piu' grandi)
const CL_FOOTER_MARGIN = 24
const CL_TEXT_H = 116   // budget sotto la foto: chip codice + chip descrizione (fino a 3 righe)
const CL_NAME_FONT_SIZE = 13
const CL_NAME_LINE_H = 16
const CL_NAME_MAX_LINES = 3
const CL_CODE_CHIP_H = 30
const CL_IDEAL_ASPECT = 0.8
const CL_MIN_ROW_ITEMS = 2
const CL_CANVAS_W = 1080
const CL_MIN_CANVAS_H = CL_CANVAS_W

const CL_LAYOUT_BY_COUNT = { 8: 6, 10: 4, 12: 5, 16: 7, 24: 7, 28: 8 }

// Stringhe incorporate nell'immagine (non testo dell'app): la mancolista/
// doppiolista personale segue la lingua scelta dall'utente (passata via
// query string dal client, non c'e' altro modo di saperla lato server).
const CL_STRINGS = {
  it: {
    missing: 'Mancante',
    double: 'Doppio',
    chipTitle: 'Scopri la mia collezione su Surprix',
    generatedOn: (d) => `Generato il ${d}`,
  },
  en: {
    missing: 'Missing',
    double: 'Doubles',
    chipTitle: 'Discover my collection on Surprix',
    generatedOn: (d) => `Generated on ${d}`,
  },
}

const clFormatDate = (lang) => {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()
  return lang === 'en' ? `${mm}/${dd}/${yyyy}` : `${dd}/${mm}/${yyyy}`
}

// Costruisce la griglia per una combinazione (colonne, righe banner, colonne banner):
// il banner puo' occupare 1 o 2 righe, sempre "circa meta'" colonne (ceil o floor
// per 1 riga; solo ceil per 2 righe, altrimenti risulta stretto e sproporzionato).
// Gli item avanzati si distribuiscono in modo equo tra le eventuali 2 righe banner
// (non a riempimento greedy, altrimenti l'ultima riga puo' restare quasi vuota).
// Se restano colonne inutilizzate in ogni riga banner, il banner si allarga per
// riempirle invece di lasciare celle vuote.
const clBuildGrid = (itemCount, cols, reservedRows, reservedCols) => {
  const bannerRowItemCols = cols - reservedCols
  if (bannerRowItemCols < CL_MIN_ROW_ITEMS) return null

  let fullRows = 0
  while (fullRows * cols + reservedRows * bannerRowItemCols < itemCount) fullRows++
  const rows = fullRows + reservedRows
  const capacity = fullRows * cols + reservedRows * bannerRowItemCols
  const empty = capacity - itemCount
  const bannerZoneItems = itemCount - fullRows * cols
  if (bannerZoneItems < CL_MIN_ROW_ITEMS) return null

  const perRow = []
  if (reservedRows === 1) {
    perRow.push(bannerZoneItems)
  } else {
    const base = Math.floor(bannerZoneItems / reservedRows)
    const rem = bannerZoneItems % reservedRows
    for (let i = 0; i < reservedRows; i++) perRow.push(base + (i < rem ? 1 : 0))
  }
  const itemsInLastRow = perRow[perRow.length - 1]
  if (itemsInLastRow < CL_MIN_ROW_ITEMS) return null

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
const clChooseGrid = (itemCount, availW) => {
  const withMetrics = (grid) => {
    const cellW = (availW - (grid.cols - 1) * CL_GAP) / grid.cols
    const photoH = cellW / CL_IDEAL_ASPECT
    const cellH = photoH + CL_TEXT_H
    const contentH = grid.rows * cellH + (grid.rows - 1) * CL_GAP
    const canvasH = Math.max(CL_HEADER_H + contentH + CL_FOOTER_MARGIN, CL_MIN_CANVAS_H)
    return { ...grid, cellW, photoH, cellH, contentH, canvasH }
  }

  const knownCols = CL_LAYOUT_BY_COUNT[itemCount]
  if (knownCols) {
    const rc = Math.max(2, Math.ceil(knownCols / 2))
    return withMetrics(clBuildGrid(itemCount, knownCols, 1, rc))
  }

  const colsCandidates = [3, 4, 5, 6, 7, 8, 9, 10]
  const rrCandidates = [1, 2]
  const scoreOf = (grid) => {
    const slack = Math.max(0, grid.canvasH - CL_HEADER_H - CL_FOOTER_MARGIN - grid.contentH)
    return grid.canvasH * 100000 + slack * 10 + grid.cols * 10 + grid.empty
  }
  let best = null
  for (const cols of colsCandidates) {
    for (const reservedRows of rrCandidates) {
      const rcCandidates = reservedRows === 2
        ? [Math.max(2, Math.ceil(cols / 2))]
        : [...new Set([Math.max(2, Math.ceil(cols / 2)), Math.max(2, Math.floor(cols / 2))])]
      for (const reservedCols of rcCandidates) {
        const raw = clBuildGrid(itemCount, cols, reservedRows, reservedCols)
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

const clWrapText = (text, maxWidthPx, fontSizePx, maxLines) => {
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

// Badge di stato per cella: stella arancione (mancante) / icona "doppio" teal
// (differenza). Nessun badge per un pezzo posseduto singolo.
const STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z'

const BADGE_R = 20

const buildStatusBadge = (cx, cy, status) => {
  if (status === 'missing') {
    return `<g transform="translate(${cx},${cy})">
      <circle r="${BADGE_R}" fill="#F5A623"/>
      <g transform="scale(1.333)">
        <path d="${STAR_PATH}" transform="translate(-12,-12)" fill="#fff"/>
      </g>
    </g>`
  }
  if (status === 'double') {
    return `<g transform="translate(${cx},${cy})">
      <circle r="${BADGE_R}" fill="${BRAND_TEAL}"/>
      <g transform="scale(1.333)">
        <rect x="-7" y="-9" width="10" height="10" rx="2" fill="#fff" opacity="0.85"/>
        <rect x="-3" y="-3" width="10" height="10" rx="2" fill="#fff"/>
      </g>
    </g>`
  }
  return ''
}

const buildPersonalChecklistSvg = async (username, setId, lang = 'it') => {
  const strings = CL_STRINGS[lang] || CL_STRINGS.it
  const [setRes, allSurprises, missingRes, doubleRes] = await Promise.all([
    fetch(`${RTDB_URL}/sets/${setId}.json`),
    getAllSurprises(),
    fetch(`${RTDB_URL}/missings/${username}.json`),
    fetch(`${RTDB_URL}/user_doubles/${username}.json`),
  ])
  const setData = setRes.ok ? await setRes.json().catch(() => null) : null
  if (!setData) throw new Error('set-not-found')

  const surprises = allSurprises.filter((s) => s.set_id === setId)
  if (surprises.length === 0) throw new Error('no-pieces')
  surprises.sort((a, b) => (a.code || '').localeCompare(b.code || '', 'it', { numeric: true }))

  const missingMap = missingRes.ok ? (await missingRes.json().catch(() => null)) || {} : {}
  const doubleMap  = doubleRes.ok  ? (await doubleRes.json().catch(() => null))  || {} : {}

  const producerId = surprises[0].set_producer_id
  const year = surprises[0].set_year_year
  const producerRes = producerId ? await fetch(`${RTDB_URL}/producers/${producerId}.json`).catch(() => null) : null
  const producerData = producerRes?.ok ? await producerRes.json().catch(() => null) : null
  const producerName = producerData?.name || producerId || ''

  const availW = CL_CANVAS_W - 2 * CL_MARGIN
  const { cols, rows, cellW, cellH, photoH, reservedCols, reservedRows, positions } = clChooseGrid(surprises.length, availW)

  // Il blocco cartina+chip QR ha proporzione fissa (mai tagliata ne' stirata),
  // quindi puo' risultare piu' alto della riga(righe) banner che lo ospitano
  // (dipende da CARTINA_ASPECT, non dalla griglia). In quel caso serve spazio
  // extra in fondo al canvas, altrimenti il blocco verrebbe tagliato.
  const reservedW = cellW * reservedCols + CL_GAP * (reservedCols - 1)
  const reservedHNominal = cellH * reservedRows + CL_GAP * (reservedRows - 1)
  const bannerChipH = 76
  const bannerChipGap = 12
  const bannerCoverPad = reservedW * 0.05
  const bannerCoverW = reservedW - bannerCoverPad * 2
  const bannerCoverH = bannerCoverW / CARTINA_ASPECT
  const bannerBlockH = bannerCoverH + bannerChipGap + bannerChipH
  const extraH = Math.max(0, bannerBlockH - reservedHNominal)

  const contentH = rows * cellH + (rows - 1) * CL_GAP + extraH
  const CANVAS_H = Math.max(CL_HEADER_H + contentH + CL_FOOTER_MARGIN, CL_MIN_CANVAS_H)
  const gridTopOffset = CL_HEADER_H + (CANVAS_H - CL_FOOTER_MARGIN - CL_HEADER_H - contentH) / 2

  const posFor = (row, col) => ({ x: CL_MARGIN + col * (cellW + CL_GAP), y: gridTopOffset + row * (cellH + CL_GAP) })

  const itemImages = await Promise.all(surprises.map((s) => fetchAsDataUri(s.img_path)))
  const coverImage = await fetchAsDataUri(setData.img_path)

  const profileUrl = `${HOSTING_URL}/u/${username}`
  const qrDataUri = await QRCode.toDataURL(profileUrl, { margin: 1, width: 300, color: { dark: BRAND_TEAL, light: '#FFFFFF' } })

  const gap1 = 6    // foto -> chip codice
  const gap2 = 6    // chip codice -> chip descrizione
  const descPad = 8 // padding verticale (top+bottom) della chip descrizione
  const cells = surprises.map((s, i) => {
    const { row, col } = positions[i]
    const { x, y } = posFor(row, col)
    const img = itemImages[i]
    const codeText = escapeHtml(s.code || '')
    const nameLines = clWrapText(s.description || '', cellW - 20, CL_NAME_FONT_SIZE, CL_NAME_MAX_LINES)
    const codeChipY = y + photoH + gap1
    const descChipY = codeChipY + CL_CODE_CHIP_H + gap2
    // Alta in base al numero di righe effettive, non stirata al budget massimo.
    const descChipH = descPad * 2 + nameLines.length * CL_NAME_LINE_H
    const nameMarkup = nameLines.map((line, li) =>
      `<text x="${x + cellW / 2}" y="${descChipY + descPad + 11 + li * CL_NAME_LINE_H}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="${CL_NAME_FONT_SIZE}" fill="${CHIP_TEXT}">${escapeHtml(line)}</text>`
    ).join('')
    const status = missingMap[s.id] !== undefined ? 'missing' : doubleMap[s.id] !== undefined ? 'double' : null
    const badge = status ? buildStatusBadge(x + cellW - (BADGE_R + 3), y + BADGE_R + 3, status) : ''
    return `
    <g>
      <rect x="${x}" y="${y}" width="${cellW}" height="${photoH}" rx="10" fill="#fff" stroke="${BRAND_TEAL}" stroke-width="2"/>
      ${img ? `<image href="${img}" x="${x + 6}" y="${y + 6}" width="${cellW - 12}" height="${photoH - 12}" preserveAspectRatio="xMidYMid meet"/>` : ''}
      <rect x="${x}" y="${codeChipY}" width="${cellW}" height="${CL_CODE_CHIP_H}" rx="8" fill="${CODE_CHIP_BG}"/>
      <text x="${x + cellW / 2}" y="${codeChipY + CL_CODE_CHIP_H / 2 + 6}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="16" fill="${CODE_CHIP_TEXT}">${codeText}</text>
      ${nameLines.length ? `<rect x="${x}" y="${descChipY}" width="${cellW}" height="${descChipH}" rx="8" fill="${CHIP_BG}"/>` : ''}
      ${nameMarkup}
      ${badge}
    </g>`
  }).join('')

  // Legenda badge nell'header: solo per la mancolista personale (la checklist
  // generica non ha stati di possesso). La data di generazione va invece nel
  // blocco brand a destra, sotto "powered by Surprix" (vedi replace piu' sotto).
  const legendY = 158
  const legend = `
    ${buildStatusBadge(CL_MARGIN + 20, legendY, 'missing')}
    <text x="${CL_MARGIN + 50}" y="${legendY + 5}" font-family="Inter" font-weight="700" font-size="15" fill="#555">${strings.missing}</text>
    ${buildStatusBadge(CL_MARGIN + 190, legendY, 'double')}
    <text x="${CL_MARGIN + 220}" y="${legendY + 5}" font-family="Inter" font-weight="700" font-size="15" fill="#555">${strings.double}</text>`

  // La cartina NON viene mai tagliata ne' stirata: usa l'altezza reale
  // (CARTINA_ASPECT) gia' calcolata sopra, e il blocco cartina+chip QR viene
  // centrato verticalmente nello spazio del banner (comprensivo dell'eventuale
  // extraH, cosi' non risulta mai tagliato in fondo al canvas).
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
  const profileUrlText = `surprix.app/u/${username}`
  const urlFontSize = profileUrlText.length <= 20 ? 16 : profileUrlText.length <= 26 ? 14 : profileUrlText.length <= 32 ? 12 : 11

  const reservedBlock = `
    <g>
      ${coverImage ? `<image href="${coverImage}" x="${rx + coverPad}" y="${coverY}" width="${coverW}" height="${coverH}" preserveAspectRatio="xMidYMid meet"/>` : ''}
      <rect x="${rx}" y="${chipY}" width="${reservedW}" height="${chipH}" rx="14" fill="${CHIP_BG}"/>
      <image href="${qrDataUri}" x="${qrX}" y="${chipY + chipPad}" width="${qrSize}" height="${qrSize}"/>
      <text x="${chipTextX}" y="${chipY + chipH / 2 - 6}" font-family="Inter" font-weight="700" font-size="13" fill="${CHIP_TEXT}">${strings.chipTitle}</text>
      <text x="${chipTextX}" y="${chipY + chipH / 2 + 18}" font-family="Inter" font-weight="700" font-size="${urlFontSize}" fill="${BRAND_TEAL}">${escapeHtml(profileUrlText)}</text>
    </g>`

  const title = escapeHtml(setData.name || setId)
  const subtitle = escapeHtml([producerName, year].filter(Boolean).join(' · '))
  // Username ben in risalto (scambiato con "powered by Surprix", che diventa
  // la scritta secondaria sotto, con la data di generazione ancora sotto).
  const safeUsername = escapeHtml(username)
  const usernameFontSize = safeUsername.length <= 10 ? 26 : safeUsername.length <= 14 ? 22 : safeUsername.length <= 18 ? 18 : 15
  const dateText = escapeHtml(strings.generatedOn(clFormatDate(lang)))

  return CHECKLIST_TEMPLATE_SVG
    .replace(
      /<text\b[^>]*\bid="cl-title"[^>]*>[\s\S]*?<\/text>/,
      `<text id="cl-title" x="${CL_MARGIN}" y="70" font-family="Inter" font-weight="700" font-size="52" fill="${BRAND_TEAL}">${title}</text>`
    )
    .replace(
      /<text\b[^>]*\bid="cl-subtitle"[^>]*>[\s\S]*?<\/text>/,
      `<text id="cl-subtitle" x="${CL_MARGIN}" y="102" font-family="Inter" font-weight="700" font-size="24" fill="#666">${subtitle}</text>`
    )
    .replace(
      /<g\b[^>]*\bid="cl-brand-logo"[^>]*>/,
      '<g id="cl-brand-logo" transform="translate(980, 24) scale(0.29)" fill="#02838F">'
    )
    .replace(
      /<text\b[^>]*\bid="cl-brand-main"[^>]*>[\s\S]*?<\/text>/,
      `<text id="cl-brand-main" x="966" y="46" text-anchor="end" font-family="Inter" font-weight="700" font-size="${usernameFontSize}" fill="${BRAND_TEAL}">${safeUsername}</text>`
    )
    .replace(
      /<text\b[^>]*\bid="cl-brand-sub"[^>]*>[\s\S]*?<\/text>/,
      `<text id="cl-brand-sub" x="966" y="70" text-anchor="end" font-family="Inter" font-weight="700" font-size="14" fill="#999">powered by Surprix</text>`
    )
    .replace(
      /<text\b[^>]*\bid="cl-brand-date"[^>]*>[\s\S]*?<\/text>/,
      `<text id="cl-brand-date" x="966" y="90" text-anchor="end" font-family="Inter" font-weight="700" font-size="12" fill="#aaa">${dateText}</text>`
    )
    .replace('<!--GRID_CONTENT-->', `${legend}\n  ${cells}\n  ${reservedBlock}`)
    .replace(/viewBox="0 0 1080 1440"/, `viewBox="0 0 ${CL_CANVAS_W} ${CANVAS_H}"`)
    .replace(/width="1080" height="1440"/g, `width="${CL_CANVAS_W}" height="${CANVAS_H}"`)
}

exports.profilemeta = onRequest(
  { region: 'europe-west1', invoker: 'public' },
  async (req, res) => {
    const match = req.path.match(/^\/u\/([^/?#]+)/)
    if (!match) { res.status(404).send('Not found'); return }
    const username = match[1]

    // Serve mancolista/doppiolista personalizzata per /u/:username/checklist/:setId.png
    const checklistMatch = req.path.match(/^\/u\/[^/?#]+\/checklist\/([^/?#]+)\.png$/)
    if (checklistMatch) {
      const setId = checklistMatch[1]
      const lang = req.query.lang === 'en' ? 'en' : 'it'
      try {
        const { Resvg } = require('@resvg/resvg-js')
        const svg = await buildPersonalChecklistSvg(username, setId, lang)
        const resvg = new Resvg(svg, { font: FONT_OPTIONS })
        const png = resvg.render().asPng()
        res.set('Content-Type', 'image/png')
        // no-store: e' una mancolista/doppiolista personale, cambia ogni volta
        // che l'utente segna un pezzo mancante/doppio - niente cache lato
        // browser/CDN altrimenti condividerebbe uno stato vecchio.
        res.set('Cache-Control', 'no-store')
        // Suggerisce un nome file sensato quando il client scarica l'immagine
        // direttamente (fallback senza Web Share API, niente controllo lato JS).
        const safeName = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, '')
        const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        res.set('Content-Disposition', `inline; filename="surprix_${safeName(username)}_${safeName(setId)}_${dateStamp}.png"`)
        res.send(Buffer.from(png))
      } catch (e) {
        logger.error('Checklist image generation failed', e)
        res.status(404).send('Not found')
      }
      return
    }

    // Serve dynamic OG image for /u/:username/og.png
    if (req.path.endsWith('/og.png')) {
      try {
        const { Resvg } = require('@resvg/resvg-js')
        const feedRes  = await fetch(`${RTDB_URL}/feedback/${username}.json`).catch(() => null)
        const feedRaw  = feedRes?.ok ? await feedRes.json().catch(() => null) : null
        const feeds    = feedRaw && typeof feedRaw === 'object' ? Object.values(feedRaw) : []
        const avgRating = feeds.length > 0
          ? (feeds.reduce((s, f) => s + (f.rating || 0), 0) / feeds.length).toFixed(1)
          : null
        const svg = buildOgSvg(username, avgRating)
        const resvg = new Resvg(svg, { font: FONT_OPTIONS })
        const png = resvg.render().asPng()
        res.set('Content-Type', 'image/png')
        res.set('Cache-Control', 'public, max-age=86400')
        res.send(Buffer.from(png))
      } catch (e) {
        logger.error('OG image generation failed', e)
        res.redirect(302, `${HOSTING_URL}/og-image.png?v=2`)
      }
      return
    }

    const [profileRes, feedbackRes, missingRes, pageRes] = await Promise.all([
      fetch(`${RTDB_URL}/users/${username}.json`).catch(() => null),
      fetch(`${RTDB_URL}/feedback/${username}.json`).catch(() => null),
      fetch(`${RTDB_URL}/missings/${username}.json?shallow=true`).catch(() => null),
      fetch(`${HOSTING_URL}/index.html`).catch(() => null),
    ])

    const profile     = profileRes?.ok  ? await profileRes.json().catch(() => null)  : null
    const feedbackRaw = feedbackRes?.ok  ? await feedbackRes.json().catch(() => null) : null
    const missingRaw  = missingRes?.ok   ? await missingRes.json().catch(() => null)  : null
    const html        = pageRes?.ok      ? await pageRes.text()                       : null

    if (!html) { res.status(503).send('Service unavailable'); return }

    const feedbacks    = feedbackRaw && typeof feedbackRaw === 'object' ? Object.values(feedbackRaw) : []
    const avgRating    = feedbacks.length > 0
      ? (feedbacks.reduce((sum, fb) => sum + (fb.rating || 0), 0) / feedbacks.length).toFixed(1)
      : null
    const missingCount = missingRaw && typeof missingRaw === 'object' ? Object.keys(missingRaw).length : null

    const title = escapeHtml(`${username} — Surprix`)
    const descParts = profile
      ? [`Discover ${username}'s surprise collection on Surprix.`]
      : ['Keep track of your surprise collection on Surprix.']
    const desc  = escapeHtml(descParts.join(' • '))
    const ogImg = `${HOSTING_URL}/u/${username}/og.png`

    const modified = html
      .replace(/(<meta\s+property="og:title"[^>]*>)/i,        `<meta property="og:title" content="${title}"/>`)
      .replace(/(<meta\s+property="og:description"[^>]*>)/i,  `<meta property="og:description" content="${desc}"/>`)
      .replace(/(<meta\s+property="og:type"[^>]*>)/i,         `<meta property="og:type" content="profile"/>`)
      .replace(/(<meta\s+property="og:url"[^>]*>)/i,          `<meta property="og:url" content="${HOSTING_URL}/u/${username}"/>`)
      .replace(/(<meta\s+property="og:image"[^>]*>)/i,        `<meta property="og:image" content="${ogImg}"/>`)
      .replace(/(<meta\s+name="twitter:title"[^>]*>)/i,       `<meta name="twitter:title" content="${title}"/>`)
      .replace(/(<meta\s+name="twitter:description"[^>]*>)/i, `<meta name="twitter:description" content="${desc}"/>`)
      .replace(/(<meta\s+name="twitter:image"[^>]*>)/i,       `<meta name="twitter:image" content="${ogImg}"/>`)

    res.set('Content-Type', 'text/html;charset=UTF-8')
    res.set('Cache-Control', 'public, max-age=300')
    res.send(modified)
  }
)
