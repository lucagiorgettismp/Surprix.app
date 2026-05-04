/**
 * Lists all users whose country field is not a valid ISO 3166-1 alpha-2 code.
 *
 * Run with:
 *   SERVICE_ACCOUNT=./scripts/serviceAccount.json node scripts/check-country-codes.mjs
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

const ISO_CODES = new Set([
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
])

const run = async () => {
  const snap = await db.ref('users').once('value')
  if (!snap.exists()) { console.log('No users found.'); process.exit(0) }

  const invalid = []

  snap.forEach((child) => {
    const country = child.val()?.country
    if (!country) return
    if (!ISO_CODES.has(country.trim().toUpperCase())) {
      invalid.push({ username: child.key, country })
    }
  })

  if (invalid.length === 0) {
    console.log('All users have valid ISO country codes.')
  } else {
    console.log(`Found ${invalid.length} user(s) with non-ISO country:\n`)
    for (const { username, country } of invalid) {
      console.log(`  ${username}: "${country}"`)
    }
  }

  process.exit(0)
}

run().catch((e) => { console.error(e); process.exit(1) })
