/**
 * Populates sets/{id}/codes with the sorted list of surprise codes.
 * Only processes sets where surprises have effective codes
 * (isSet_effective_code or set_effective_code = true).
 * Sets with fictional/made-up codes are skipped.
 *
 * Run (dry run):
 *   SERVICE_ACCOUNT=./scripts/serviceAccount.json node scripts/add-set-codes.mjs --dry-run
 *
 * Run (apply):
 *   SERVICE_ACCOUNT=./scripts/serviceAccount.json node scripts/add-set-codes.mjs --apply
 */

import { readFileSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const admin = require('firebase-admin')

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const APPLY   = args.includes('--apply')

if (!DRY_RUN && !APPLY) {
  console.error('Specify --dry-run or --apply')
  process.exit(1)
}

const saPath = process.env.SERVICE_ACCOUNT
if (!saPath) { console.error('Set SERVICE_ACCOUNT=<path>'); process.exit(1) }

const serviceAccount = JSON.parse(readFileSync(saPath, 'utf8'))
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('='))
    .map((l) => { const [k, ...rest] = l.split('='); return [k.trim(), rest.join('=').trim().replace(/^["']|["']$/g, '')] })
)
admin.initializeApp({ credential: admin.credential.cert(serviceAccount), databaseURL: env.VITE_FIREBASE_DATABASE_URL })

const db = admin.database()

const run = async () => {
  console.log('Loading surprises...')
  const snap = await db.ref('surprises').once('value')

  // Group surprises by set_id
  const bySet = {}
  snap.forEach((child) => {
    const s = child.val()
    if (!s.set_id) return
    if (!bySet[s.set_id]) bySet[s.set_id] = []
    bySet[s.set_id].push(s)
  })

  console.log(`Found ${Object.keys(bySet).length} sets with surprises.\n`)

  const updates = {}
  let withCodes = 0, skipped = 0

  for (const [setId, surprises] of Object.entries(bySet)) {
    const hasEffectiveCode = surprises.some((s) => s.isSet_effective_code || s.set_effective_code)

    if (!hasEffectiveCode) {
      skipped++
      continue
    }

    const codes = surprises
      .map((s) => s.code)
      .filter(Boolean)
      .sort()

    if (codes.length === 0) { skipped++; continue }

    const setName = surprises[0].set_name || setId
    console.log(`  ✓ ${setName} — ${codes.length} codici: ${codes.slice(0, 6).join(', ')}${codes.length > 6 ? ' ...' : ''}`)
    updates[`sets/${setId}/codes`] = codes
    withCodes++
  }

  console.log(`\nSerie con codici effettivi: ${withCodes}`)
  console.log(`Serie saltate (codici fittizi): ${skipped}`)

  if (APPLY && Object.keys(updates).length > 0) {
    console.log(`\nScrittura di ${Object.keys(updates).length} aggiornamenti...`)
    await db.ref().update(updates)
    console.log('Fatto.')
  } else if (DRY_RUN) {
    console.log('\n[DRY RUN] Nessuna modifica applicata.')
  }

  process.exit(0)
}

run().catch((e) => { console.error(e); process.exit(1) })
