import { readFileSync } from 'fs'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const admin   = require('firebase-admin')

const saPath = process.env.SERVICE_ACCOUNT
if (!saPath) { console.error('Set SERVICE_ACCOUNT=<path>'); process.exit(1) }

const serviceAccount = JSON.parse(readFileSync(saPath, 'utf8'))
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n').filter((l) => l.includes('='))
    .map((l) => { const [k, ...rest] = l.split('='); return [k.trim(), rest.join('=').trim().replace(/^["']|["']$/g, '')] })
)

admin.initializeApp({ credential: admin.credential.cert(serviceAccount), databaseURL: env.VITE_FIREBASE_DATABASE_URL })

const db = admin.database()

const patches = {
  'users/ada/country':        'RS',
  'users/daca96/country':     'RS',
  'users/kinderland/country': 'RS',
  'users/alexkinder/country': 'BG',
  'users/iliyan/country':     'BG',
  'users/kikozmeq/country':   'BG',
  'users/cava/country':       'IT',
  'users/aryrsj/country':     null,
}

const run = async () => {
  await db.ref().update(patches)
  console.log('Done.')
  process.exit(0)
}

run().catch((e) => { console.error(e); process.exit(1) })
