import { readFileSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const admin = require('firebase-admin')

const DRY_RUN = !process.argv.includes('--execute')

const serviceAccount = JSON.parse(readFileSync(new URL('./serviceAccount.json', import.meta.url)))
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://collectionhelper.firebaseio.com',
})

const auth = admin.auth()
const db = admin.database()

if (DRY_RUN) console.log('\n⚠️  DRY RUN — nessuna modifica. Aggiungi --execute per eseguire.\n')
else console.log('\n🚨 EXECUTE — modifiche reali in corso.\n')

// --- Fetch all Auth users ---
async function getAllAuthUsers() {
  const users = []
  let pageToken
  do {
    const result = await auth.listUsers(1000, pageToken)
    result.users.forEach((u) => users.push(u))
    pageToken = result.pageToken
  } while (pageToken)
  return users
}

const [authUsers, uidsSnap] = await Promise.all([
  getAllAuthUsers(),
  db.ref('uids').get(),
])

const authMap = new Map(authUsers.map((u) => [u.uid, u]))
const dbUids = uidsSnap.exists() ? uidsSnap.val() : {}

// --- 1. Auth senza uids/ (onboarding non completato) ---
const authWithoutDb = authUsers.filter((u) => !dbUids[u.uid])
console.log(`=== Auth senza uids/: ${authWithoutDb.length} utenti ===`)
for (const u of authWithoutDb) {
  console.log(`  DELETE Auth: ${u.uid} (${u.email || 'no email'}, creato: ${u.metadata.creationTime})`)
  if (!DRY_RUN) await auth.deleteUser(u.uid)
}

// --- 2. uids/ orfani (account Auth eliminato) ---
const orphanedUids = Object.entries(dbUids).filter(([uid]) => !authMap.has(uid))
console.log(`\n=== uids/ orfani: ${orphanedUids.length} record ===`)
for (const [uid, val] of orphanedUids) {
  const username = val.username
  console.log(`  DELETE DB: uid=${uid} username=${username}`)

  if (!DRY_RUN) {
    // Pulisce doubles dal reverse index
    const doublesSnap = await db.ref(`user_doubles/${username}`).get()
    const reverseRemovals = []
    if (doublesSnap.exists()) {
      doublesSnap.forEach((child) => {
        reverseRemovals.push(db.ref(`surprise_doubles/${child.key}/${username}`).remove())
      })
    }
    await Promise.all([
      ...reverseRemovals,
      db.ref(`uids/${uid}`).remove(),
      db.ref(`users/${username}`).remove(),
      db.ref(`missings/${username}`).remove(),
      db.ref(`user_doubles/${username}`).remove(),
    ])
  }
}

console.log('\n=== RIEPILOGO ===')
console.log(`Auth eliminati:      ${authWithoutDb.length}`)
console.log(`Record DB puliti:    ${orphanedUids.length}`)
if (DRY_RUN) console.log('\nRiesegui con --execute per applicare le modifiche.')
else console.log('\nPulizia completata.')

process.exit(0)
