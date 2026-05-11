/**
 * Migrates Facebook-only users to email+password by setting a random temporary
 * password on each account. After running, users can log in via "Forgot password"
 * on the login page to set their own password.
 *
 * Output: CSV with email, displayName, uid (for use in bulk email campaigns)
 *
 * Run:
 *   SERVICE_ACCOUNT=... node scripts/migrate-facebook-users.mjs --dry-run
 *   SERVICE_ACCOUNT=... node scripts/migrate-facebook-users.mjs
 */

import { readFileSync, writeFileSync } from 'fs'
import { randomBytes } from 'crypto'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const admin = require('firebase-admin')

const args    = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')

const saPath = process.env.SERVICE_ACCOUNT
if (!saPath) { console.error('Set SERVICE_ACCOUNT=<path>'); process.exit(1) }
const serviceAccount = JSON.parse(readFileSync(saPath, 'utf8'))
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('='))
    .map((l) => { const [k, ...rest] = l.split('='); return [k.trim(), rest.join('=').trim().replace(/^["']|["']$/g, '')] })
)
admin.initializeApp({ credential: admin.credential.cert(serviceAccount), databaseURL: env.VITE_FIREBASE_DATABASE_URL })
const auth  = admin.auth()
const db    = admin.database()

const randomPassword = () => randomBytes(20).toString('hex')

const getCountry = async (uid) => {
  const uidSnap = await db.ref(`uids/${uid}`).once('value')
  const username = uidSnap.val()?.username
  if (!username) return ''
  const userSnap = await db.ref(`users/${username}/country`).once('value')
  return userSnap.val() ?? ''
}

const run = async () => {
  if (DRY_RUN) console.log('DRY RUN — no changes made\n')

  // Collect all Facebook users (paginate through all users)
  const facebookUsers = []
  let pageToken
  do {
    const result = await auth.listUsers(1000, pageToken)
    for (const user of result.users) {
      const hasFacebook = user.providerData.some((p) => p.providerId === 'facebook.com')
      if (hasFacebook) facebookUsers.push(user)
    }
    pageToken = result.pageToken
  } while (pageToken)

  console.log(`Facebook users found: ${facebookUsers.length}`)

  const noEmail = facebookUsers.filter((u) => !u.email)
  if (noEmail.length > 0) {
    console.warn(`\nUsers without email (skipped — cannot migrate):`)
    for (const u of noEmail) console.warn(`  uid=${u.uid}  displayName=${u.displayName ?? '—'}`)
  }

  const withEmail = facebookUsers.filter((u) => u.email)
  console.log(`\nUsers with email: ${withEmail.length}`)

  if (DRY_RUN) {
    for (const u of withEmail) console.log(`  ${u.email}  (${u.displayName ?? '—'})`)
    console.log('\nDry run — no changes made.')
    process.exit(0)
  }

  const rows = [['email', 'displayName', 'uid', 'country', 'status']]
  for (const u of withEmail) {
    try {
      const [country] = await Promise.all([
        getCountry(u.uid),
        auth.updateUser(u.uid, { password: randomPassword() }),
      ])
      rows.push([u.email, u.displayName ?? '', u.uid, country, 'OK'])
      console.log(`  OK  ${u.email}  (${country || '—'})`)
    } catch (e) {
      rows.push([u.email, u.displayName ?? '', u.uid, '', `ERROR: ${e.message}`])
      console.error(`  ERR ${u.email}: ${e.message}`)
    }
  }

  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const outPath = 'scripts/facebook-migration.csv'
  writeFileSync(outPath, csv, 'utf8')
  console.log(`\nSaved to ${outPath}`)
  process.exit(0)
}

run().catch((e) => { console.error(e); process.exit(1) })
