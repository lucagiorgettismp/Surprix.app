/**
 * Removes obsolete/redundant fields from existing RTDB data.
 *
 * Fields removed:
 *   surprises: intRarity, set_producer_color
 *   years:     producer_color
 *   sets:      code, year_desc, year_year, producer_name
 *   uids:      uid (field), provider
 *
 * Run:
 *   SERVICE_ACCOUNT=... node scripts/cleanup-obsolete-fields.mjs --dry-run
 *   SERVICE_ACCOUNT=... node scripts/cleanup-obsolete-fields.mjs
 */

import { readFileSync } from 'fs'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const admin = require('firebase-admin')

const DRY_RUN = process.argv.includes('--dry-run')

const saPath = process.env.SERVICE_ACCOUNT
if (!saPath) { console.error('Set SERVICE_ACCOUNT=<path>'); process.exit(1) }
const serviceAccount = JSON.parse(readFileSync(saPath, 'utf8'))
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('='))
    .map((l) => { const [k, ...rest] = l.split('='); return [k.trim(), rest.join('=').trim().replace(/^["']|["']$/g, '')] })
)
admin.initializeApp({ credential: admin.credential.cert(serviceAccount), databaseURL: env.VITE_FIREBASE_DATABASE_URL })
const db = admin.database()

if (DRY_RUN) console.log('DRY RUN — no writes\n')

const CHUNK = 500
const applyUpdates = async (updates) => {
  if (DRY_RUN) return
  const entries = Object.entries(updates)
  for (let i = 0; i < entries.length; i += CHUNK) {
    await db.ref().update(Object.fromEntries(entries.slice(i, i + CHUNK)))
  }
}

const cleanNode = async (node, fields) => {
  const snap = await db.ref(node).once('value')
  if (!snap.exists()) { console.log(`  ${node}: empty`); return }
  const updates = {}
  let count = 0
  snap.forEach((child) => {
    const val = child.val() || {}
    for (const f of fields) {
      if (f in val) {
        updates[`${node}/${child.key}/${f}`] = null
        count++
      }
    }
  })
  console.log(`  ${node}: ${count} field occurrences to remove (across ${snap.numChildren()} records)`)
  await applyUpdates(updates)
}

const run = async () => {
  console.log('Cleaning surprises...')
  await cleanNode('surprises', ['intRarity', 'set_producer_color'])

  console.log('Cleaning years...')
  await cleanNode('years', ['producer_color'])

  console.log('Cleaning sets...')
  await cleanNode('sets', ['code', 'year_desc', 'year_year', 'producer_name'])

  console.log('Cleaning uids...')
  await cleanNode('uids', ['uid', 'provider'])

  console.log(DRY_RUN ? '\nDry run done.' : '\nDone.')
  process.exit(0)
}

run().catch((e) => { console.error(e); process.exit(1) })
