const { onSchedule } = require('firebase-functions/v2/scheduler')
const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret }      = require('firebase-functions/params')
const { logger }            = require('firebase-functions')
const admin                 = require('firebase-admin')
const fs                    = require('fs')
const path                  = require('path')

admin.initializeApp({ databaseURL: 'https://collectionhelper.firebaseio.com' })
const db = admin.database()

const telegramToken   = defineSecret('TELEGRAM_TOKEN')
const TELEGRAM_CHAT_ID = '135432052'

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
const RTDB_URL    = 'https://collectionhelper.firebaseio.com'
const HOSTING_URL = 'https://surprix.app'

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

exports.profilemeta = onRequest(
  { region: 'europe-west1', invoker: 'public' },
  async (req, res) => {
    const match = req.path.match(/^\/u\/([^/?#]+)/)
    if (!match) { res.status(404).send('Not found'); return }
    const username = match[1]

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
