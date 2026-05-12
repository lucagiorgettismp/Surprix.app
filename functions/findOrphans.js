/**
 * findOrphans.js — trova nodi orfani in surprises/
 *
 * Un nodo è "orfano" se il campo `id` nel suo valore differisce dalla chiave RTDB:
 * significa che è stato migrato a una nuova chiave ma il vecchio nodo non è stato eliminato.
 *
 * Usage:
 *   node findOrphans.js            → solo report
 *   node findOrphans.js --delete   → elimina i nodi orfani confermati
 *
 * Credentials: imposta GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccount.json
 * oppure scarica la chiave da Firebase Console → Impostazioni progetto → Account di servizio.
 */

const admin = require('firebase-admin')

const DO_DELETE = process.argv.includes('--delete')

admin.initializeApp({ databaseURL: 'https://collectionhelper.firebaseio.com' })
const db = admin.database()

async function main() {
  console.log('Caricamento surprises...')
  const snap = await db.ref('surprises').once('value')

  const all = []
  snap.forEach(child => {
    all.push({ rtdbKey: child.key, ...child.val() })
  })
  console.log(`Totale nodi: ${all.length}\n`)

  // 1. Nodi con data.id != rtdbKey (stale id dal campo dato)
  const staleId = all.filter(s => s.id && s.id !== s.rtdbKey)
  console.log(`=== Nodi con data.id ≠ chiave RTDB: ${staleId.length} ===`)
  staleId.forEach(s =>
    console.log(`  chiave: ${s.rtdbKey}  →  data.id: ${s.id}  (set_id: ${s.set_id})`)
  )

  // 2. Chiavi duplicate per set_name + code (stessa sorpresina, nodo duplicato)
  const byContent = {}
  all.forEach(s => {
    const fingerprint = `${s.set_id}|${s.code}|${s.description}`
    if (!byContent[fingerprint]) byContent[fingerprint] = []
    byContent[fingerprint].push(s.rtdbKey)
  })
  const dupsContent = Object.entries(byContent).filter(([, keys]) => keys.length > 1)
  console.log(`\n=== Sorpresine con contenuto duplicato: ${dupsContent.length} ===`)
  dupsContent.forEach(([fp, keys]) => console.log(`  ${fp}\n    chiavi: ${keys.join(', ')}`))

  // 3. Chiavi che non seguono il pattern atteso Producer_Anno_Set_N
  const pattern = /^[A-Za-z_]+_\d{4}_[A-Za-z0-9]+_\d+$/
  const badKeys = all.filter(s => !pattern.test(s.rtdbKey))
  console.log(`\n=== Nodi con chiave fuori formato: ${badKeys.length} ===`)
  badKeys.forEach(s => console.log(`  ${s.rtdbKey}`))

  if (!DO_DELETE) {
    console.log('\nModalità sola lettura. Aggiungi --delete per correggere i campi id stale.')
    process.exit(0)
  }

  // Fix: allinea data.id alla chiave RTDB per tutti i 55 nodi
  if (staleId.length === 0) {
    console.log('\nNessun campo id da correggere.')
    process.exit(0)
  }

  console.log(`\nCorreggo ${staleId.length} campi id...`)
  const updates = {}
  staleId.forEach(s => { updates[`surprises/${s.rtdbKey}/id`] = s.rtdbKey })
  await db.ref().update(updates)
  console.log('Fatto.')
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
