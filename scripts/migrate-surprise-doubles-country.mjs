/**
 * Migrates surprise_doubles entries from `true` to the owner's country string.
 *
 * Before: surprise_doubles/{surpriseId}/{username} = true
 * After:  surprise_doubles/{surpriseId}/{username} = "it"  (or true if country unknown)
 *
 * Run:
 *   SERVICE_ACCOUNT=... node scripts/migrate-surprise-doubles-country.mjs --dry-run
 *   SERVICE_ACCOUNT=... node scripts/migrate-surprise-doubles-country.mjs
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

const run = async () => {
  // Load country map from users
  console.log('Loading users...')
  const usersSnap = await db.ref('users').once('value')
  const countryByUsername = {}
  usersSnap.forEach((child) => {
    const { country } = child.val() || {}
    if (country) countryByUsername[child.key] = country
  })
  console.log(`  ${Object.keys(countryByUsername).length} users with country`)

  // Load all surprise_doubles
  console.log('Loading surprise_doubles...')
  const snap = await db.ref('surprise_doubles').once('value')
  if (!snap.exists()) { console.log('No surprise_doubles found.'); process.exit(0) }

  const updates = {}
  let migrated = 0, skipped = 0, alreadyDone = 0

  snap.forEach((surpriseSnap) => {
    surpriseSnap.forEach((userSnap) => {
      const username = userSnap.key
      const val = userSnap.val()
      if (typeof val === 'string') { alreadyDone++; return }
      const country = countryByUsername[username]
      if (country) {
        updates[`surprise_doubles/${surpriseSnap.key}/${username}`] = country
        migrated++
      } else {
        skipped++
      }
    })
  })

  console.log(`\nTo migrate: ${migrated} | Already done: ${alreadyDone} | No country: ${skipped}`)

  if (DRY_RUN || Object.keys(updates).length === 0) {
    console.log(DRY_RUN ? '\nDry run done.' : '\nNothing to write.')
    process.exit(0)
  }

  const entries = Object.entries(updates)
  for (let i = 0; i < entries.length; i += 500) {
    await db.ref().update(Object.fromEntries(entries.slice(i, i + 500)))
  }
  console.log('\nDone.')
  process.exit(0)
}

run().catch((e) => { console.error(e); process.exit(1) })
