import { readFileSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const admin = require('firebase-admin')

const serviceAccount = JSON.parse(readFileSync(new URL('./serviceAccount.json', import.meta.url)))
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://collectionhelper.firebaseio.com',
})

const auth = admin.auth()
const db = admin.database()

// Ritorna Map uid → authUser
async function getAllAuthUsers() {
  const map = new Map()
  let pageToken
  do {
    const result = await auth.listUsers(1000, pageToken)
    result.users.forEach((u) => map.set(u.uid, u))
    pageToken = result.pageToken
  } while (pageToken)
  return map
}

const [authMap, uidsSnap, usersSnap] = await Promise.all([
  getAllAuthUsers(),
  db.ref('uids').get(),
  db.ref('users').get(),
])

const dbUidsVal = uidsSnap.exists() ? uidsSnap.val() : {}
const dbUsersVal = usersSnap.exists() ? usersSnap.val() : {}
const dbUids = new Set(Object.keys(dbUidsVal))
const dbUsers = new Set(Object.keys(dbUsersVal))

// Mappa email → username da users/
const emailToUsername = {}
for (const [username, val] of Object.entries(dbUsersVal)) {
  if (val.email) emailToUsername[val.email.replace(/,/g, '.')] = username
}

console.log('\n=== CONTEGGI ===')
console.log(`Auth users:  ${authMap.size}`)
console.log(`DB uids/:    ${dbUids.size}`)
console.log(`DB users/:   ${dbUsers.size}`)

// --- Auth senza uids/ ---
const authOnlyUids = [...authMap.keys()].filter((uid) => !dbUids.has(uid))
console.log(`\n=== Auth senza uids/: ${authOnlyUids.length} ===`)
let withTrace = 0
for (const uid of authOnlyUids) {
  const u = authMap.get(uid)
  const matchedUsername = u.email ? emailToUsername[u.email] : null
  const trace = matchedUsername ? `⚠️  ha users/${matchedUsername}` : 'nessuna traccia nel DB'
  if (matchedUsername) withTrace++
  console.log(`  ${uid} (${u.email || 'no email'}) → ${trace}`)
}
console.log(`\n  Con users/ record: ${withTrace}  |  Solo Auth: ${authOnlyUids.length - withTrace}`)

// --- uids/ orfani ---
const orphanedUids = Object.entries(dbUidsVal).filter(([uid]) => !authMap.has(uid))
console.log(`\n=== uids/ orfani (Auth eliminato): ${orphanedUids.length} ===`)
for (const [uid, val] of orphanedUids) {
  console.log(`  uid=${uid}  username=${val.username}`)
}

// --- Disallineamento uids/ vs users/ ---
const uidsUsernames = new Set(Object.values(dbUidsVal).map((v) => v.username))
const uidsNotInUsers = [...uidsUsernames].filter((u) => !dbUsers.has(u))
const usersNotInUids = [...dbUsers].filter((u) => !uidsUsernames.has(u))
console.log(`\n=== uids/ username non in users/: ${uidsNotInUsers.length} ===`)
if (uidsNotInUsers.length) console.log(' ', uidsNotInUsers)
console.log(`=== users/ non in uids/:          ${usersNotInUids.length} ===`)
if (usersNotInUids.length) console.log(' ', usersNotInUids)

console.log('\nDone.')
process.exit(0)
