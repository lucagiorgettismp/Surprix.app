/**
 * One-time migration: replaces full country names in users[*].country
 * with ISO 3166-1 alpha-2 codes (e.g. "Italy" → "IT", "Włochy" → "IT").
 *
 * Prerequisites:
 *   1. Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   2. Save the JSON file somewhere (e.g. scripts/serviceAccount.json)
 *
 * Run with:
 *   SERVICE_ACCOUNT=./scripts/serviceAccount.json node scripts/migrate-country-codes.mjs
 */

import { readFileSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const admin   = require('firebase-admin')

const saPath = process.env.SERVICE_ACCOUNT
if (!saPath) {
  console.error('Set SERVICE_ACCOUNT=<path-to-serviceAccount.json>')
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync(saPath, 'utf8'))

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => { const [k, ...rest] = l.split('='); return [k.trim(), rest.join('=').trim().replace(/^["']|["']$/g, '')] })
)

admin.initializeApp({
  credential:  admin.credential.cert(serviceAccount),
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
})

const db = admin.database()

// --- Country resolution ---

const ISO_CODES = [
  'AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ',
  'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS',
  'BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN',
  'CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE',
  'EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF',
  'GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM',
  'HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM',
  'JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC',
  'LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK',
  'ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA',
  'NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG',
  'PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW',
  'SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS',
  'ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO',
  'TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI',
  'VN','VU','WF','WS','YE','YT','ZA','ZM','ZW',
]

const LANGS = ['en','it','pl','es','ca','fr','de','pt','nl','cs','ro','hr','sk','hu','sv','da','fi','el','tr','ru','uk']

const displays = LANGS.map((l) => { try { return new Intl.DisplayNames([l], { type: 'region' }) } catch { return null } }).filter(Boolean)

const nameToCode = new Map()
for (const code of ISO_CODES) {
  for (const d of displays) {
    try {
      const name = d.of(code)?.toLowerCase()
      if (name && name !== code.toLowerCase()) nameToCode.set(name, code)
    } catch { /* skip */ }
  }
}

const resolveCode = (value) => {
  if (!value) return null
  const upper = value.trim().toUpperCase()
  if (ISO_CODES.includes(upper)) return upper
  return nameToCode.get(value.trim().toLowerCase()) || null
}

// --- Migration ---

const run = async () => {
  console.log('Fetching users...')
  const snap = await db.ref('users').once('value')
  if (!snap.exists()) { console.log('No users found.'); process.exit(0) }

  const updates = {}
  let alreadyOk = 0, resolved = 0, unresolved = 0

  snap.forEach((child) => {
    const username = child.key
    const country  = child.val()?.country

    if (!country) return

    if (ISO_CODES.includes(country.trim().toUpperCase())) { alreadyOk++; return }

    const code = resolveCode(country)
    if (code) {
      updates[`users/${username}/country`] = code
      console.log(`  ${username}: "${country}" → "${code}"`)
      resolved++
    } else {
      console.warn(`  ⚠ ${username}: cannot resolve "${country}"`)
      unresolved++
    }
  })

  console.log(`\nSummary: ${alreadyOk} already OK, ${resolved} to update, ${unresolved} unresolvable.`)

  if (Object.keys(updates).length === 0) {
    console.log('Nothing to write.')
    process.exit(0)
  }

  console.log('Writing updates...')
  await db.ref().update(updates)
  console.log('Done.')
  process.exit(0)
}

run().catch((e) => { console.error(e); process.exit(1) })
