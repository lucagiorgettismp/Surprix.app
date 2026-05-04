/**
 * One-time migration: writes set_producer_id on every surprise
 * by following the chain: surprise.set_id → set.year_id → year.producerId
 *
 * Run with: node scripts/migrate-producer-id.mjs
 */

import { readFileSync } from 'fs'
import { initializeApp } from 'firebase/app'
import { getDatabase, ref, get, update } from 'firebase/database'

// Parse .env.local manually (no dotenv dependency needed)
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => l.split('=').map((s) => s.trim()))
)

const app = initializeApp({
  apiKey:            env.VITE_FIREBASE_API_KEY,
  authDomain:        env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             env.VITE_FIREBASE_APP_ID,
  databaseURL:       env.VITE_FIREBASE_DATABASE_URL,
})

const db = getDatabase(app)

const fetchAll = async (path) => {
  const snap = await get(ref(db, path))
  const result = {}
  snap.forEach((child) => { result[child.key] = { id: child.key, ...child.val() } })
  return result
}

const run = async () => {
  console.log('Fetching data...')
  const [surprises, sets, years] = await Promise.all([
    fetchAll('surprises'),
    fetchAll('sets'),
    fetchAll('years'),
  ])

  console.log(`Surprises: ${Object.keys(surprises).length}`)
  console.log(`Sets:      ${Object.keys(sets).length}`)
  console.log(`Years:     ${Object.keys(years).length}`)

  const updates = {}
  let ok = 0, skipped = 0

  for (const [id, surprise] of Object.entries(surprises)) {
    const set = sets[surprise.set_id]
    if (!set) { console.warn(`  ⚠ set not found for surprise ${id} (set_id: ${surprise.set_id})`); skipped++; continue }

    const year = years[set.year_id]
    if (!year) { console.warn(`  ⚠ year not found for set ${set.id} (year_id: ${set.year_id})`); skipped++; continue }

    const producerId = year.producerId
    if (!producerId) { console.warn(`  ⚠ producerId missing on year ${year.id}`); skipped++; continue }

    if (surprise.set_producer_id === producerId) { ok++; continue } // already correct

    updates[`surprises/${id}/set_producer_id`] = producerId
    ok++
  }

  const writeCount = Object.keys(updates).length
  if (writeCount === 0) {
    console.log('Nothing to update — all surprises already have set_producer_id.')
    process.exit(0)
  }

  console.log(`\nWriting ${writeCount} updates (${skipped} skipped)...`)

  // Firebase update() accepts max ~1000 keys at once — chunk if needed
  const entries = Object.entries(updates)
  const CHUNK = 500
  for (let i = 0; i < entries.length; i += CHUNK) {
    const chunk = Object.fromEntries(entries.slice(i, i + CHUNK))
    await update(ref(db), chunk)
    console.log(`  ${Math.min(i + CHUNK, entries.length)} / ${entries.length}`)
  }

  console.log(`\nDone. ${writeCount} surprises updated, ${skipped} skipped.`)
  process.exit(0)
}

run().catch((e) => { console.error(e); process.exit(1) })
