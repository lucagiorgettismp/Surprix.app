/**
 * Migrates a set to a different year, updating:
 *   - /sets/<oldId>  →  /sets/<newId>  (year fields updated)
 *   - /surprises/*   →  set_id, set_year_year, set_year_id fields
 *   - /missings/{userId}/{surpriseId}  →  surprise key if it changed
 *   - /surprise_doubles/{surpriseId}   →  surprise key if it changed
 *
 * Run:
 *   SERVICE_ACCOUNT=... node scripts/migrate-set-year.mjs --from=Kinder_2016_SPNGB --to=Kinder_2017_SPNGB --dry-run
 *   SERVICE_ACCOUNT=... node scripts/migrate-set-year.mjs --from=Kinder_2016_SPNGB --to=Kinder_2017_SPNGB
 */

import { readFileSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const admin   = require('firebase-admin')

const args    = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const FROM_ID = args.find((a) => a.startsWith('--from='))?.split('=')[1]
const TO_ID   = args.find((a) => a.startsWith('--to='))?.split('=')[1]

if (!FROM_ID || !TO_ID) {
  console.error('Usage: --from=<oldSetId> --to=<newSetId>')
  process.exit(1)
}

// Derive the new year from the new ID (e.g. Kinder_2017_SPNGB → 2017)
const newYear = TO_ID.match(/_(\d{4})_/)?.[1]
const oldYear = FROM_ID.match(/_(\d{4})_/)?.[1]
if (!newYear || !oldYear) {
  console.error('Cannot extract year from set IDs — expected format Kinder_YYYY_CODE')
  process.exit(1)
}

// --- Firebase init ---
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
  if (DRY_RUN) console.log('DRY RUN — no writes\n')
  console.log(`Migrating: ${FROM_ID} → ${TO_ID}  (year ${oldYear} → ${newYear})\n`)

  // 1. Read old set
  const setSnap = await db.ref(`sets/${FROM_ID}`).once('value')
  if (!setSnap.exists()) {
    console.error(`Set not found: sets/${FROM_ID}`)
    process.exit(1)
  }
  const setData = setSnap.val()
  console.log(`Set found: "${setData.name || FROM_ID}"`)

  // 2. Build updated set data (replace year references in all string fields)
  const updatedSet = JSON.parse(
    JSON.stringify(setData).replace(new RegExp(oldYear, 'g'), newYear)
  )
  // Also patch known year fields explicitly in case format differs
  if (updatedSet.year_year)  updatedSet.year_year  = newYear
  if (updatedSet.year_id)    updatedSet.year_id     = updatedSet.year_id?.replace(oldYear, newYear)

  // 3. Find all surprises belonging to this set
  const surprisesSnap = await db.ref('surprises')
    .orderByChild('set_id').equalTo(FROM_ID).once('value')
  const surpriseIds = []
  surprisesSnap.forEach((child) => surpriseIds.push(child.key))
  console.log(`Surprises to update: ${surpriseIds.length}`)

  // Build surprise ID mapping: old → new (replace FROM_ID prefix if present)
  const idMap = {} // oldSurpriseId → newSurpriseId
  surprisesSnap.forEach((child) => {
    const oldId  = child.key
    const newId  = oldId.includes(FROM_ID) ? oldId.replace(FROM_ID, TO_ID) : oldId
    idMap[oldId] = newId
  })
  const idChanged = Object.entries(idMap).filter(([o, n]) => o !== n)
  console.log(`Surprise IDs that change: ${idChanged.length} / ${surpriseIds.length}`)
  idChanged.forEach(([o, n]) => console.log(`  ${o} → ${n}`))

  // 4. Check missings — /missings/{userId}/{surpriseId}
  const missingsSnap = await db.ref('missings').once('value')
  const affectedMissings = [] // { userId, oldSid, newSid, val }
  missingsSnap.forEach((userNode) => {
    for (const [oldSid, newSid] of Object.entries(idMap)) {
      if (oldSid === newSid) continue
      const entry = userNode.child(oldSid)
      if (entry.exists()) affectedMissings.push({ userId: userNode.key, oldSid, newSid, val: entry.val() })
    }
  })
  console.log(`Missings entries to remap: ${affectedMissings.length}`)

  // 5. Check doubles — /surprise_doubles/{surpriseId}/{...}
  const doublesSnap = await db.ref('surprise_doubles').once('value')
  const affectedDoubles = [] // { oldSid, newSid, data }
  doublesSnap.forEach((node) => {
    const newSid = idMap[node.key]
    if (newSid && newSid !== node.key) affectedDoubles.push({ oldSid: node.key, newSid, data: node.val() })
  })
  console.log(`Doubles entries to remap: ${affectedDoubles.length}`)

  // 6. Build atomic update
  const updates = {}

  // New set + delete old
  updates[`sets/${TO_ID}`]   = updatedSet
  updates[`sets/${FROM_ID}`] = null

  // Surprises: write to new ID (with updated fields), delete old ID
  surprisesSnap.forEach((child) => {
    const oldSid = child.key
    const newSid = idMap[oldSid]
    const data   = { ...child.val(), set_id: TO_ID, set_year_year: newYear }
    if (data.set_year_id) data.set_year_id = data.set_year_id.replace(oldYear, newYear)

    if (oldSid !== newSid) {
      updates[`surprises/${newSid}`] = data
      updates[`surprises/${oldSid}`] = null
    } else {
      // ID unchanged — only patch fields
      updates[`surprises/${oldSid}/set_id`]        = TO_ID
      updates[`surprises/${oldSid}/set_year_year`]  = newYear
      if (data.set_year_id) updates[`surprises/${oldSid}/set_year_id`] = data.set_year_id
    }
  })

  // Missings: move to new surprise ID
  for (const { userId, oldSid, newSid, val } of affectedMissings) {
    updates[`missings/${userId}/${newSid}`] = val
    updates[`missings/${userId}/${oldSid}`] = null
  }

  // Doubles: move to new surprise ID
  for (const { oldSid, newSid, data } of affectedDoubles) {
    updates[`surprise_doubles/${newSid}`] = data
    updates[`surprise_doubles/${oldSid}`] = null
  }

  console.log(`\nUpdate paths: ${Object.keys(updates).length}`)
  if (DRY_RUN) {
    console.log('\nPaths that would be written:')
    for (const [k, v] of Object.entries(updates)) {
      console.log(`  ${k}:`, v === null ? '(delete)' : typeof v === 'object' ? '{...}' : v)
    }
    console.log('\nDry run complete — no changes made.')
    process.exit(0)
  }

  // Write in chunks of 500
  const entries = Object.entries(updates)
  for (let i = 0; i < entries.length; i += 500) {
    await db.ref().update(Object.fromEntries(entries.slice(i, i + 500)))
  }
  console.log('\nDone.')
  process.exit(0)
}

run().catch((e) => { console.error(e); process.exit(1) })
