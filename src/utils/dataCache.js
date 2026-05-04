const DB_NAME = 'surprix-data'
const STORE_MISSING = 'missing'
const STORE_DOUBLES = 'doubles'

const initDB = () => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_MISSING)) {
        db.createObjectStore(STORE_MISSING)
      }
      if (!db.objectStoreNames.contains(STORE_DOUBLES)) {
        db.createObjectStore(STORE_DOUBLES)
      }
    }
  })
}

export const cacheData = async (type, data) => {
  try {
    const db = await initDB()
    const store = type === 'missing' ? STORE_MISSING : STORE_DOUBLES
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      const objectStore = tx.objectStore(store)
      const req = objectStore.put(data, 'data')
      req.onerror = () => reject(req.error)
      req.onsuccess = () => resolve()
    })
  } catch (err) {
    console.error(`Error caching ${type} data:`, err)
  }
}

export const getCachedData = async (type) => {
  try {
    const db = await initDB()
    const store = type === 'missing' ? STORE_MISSING : STORE_DOUBLES
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly')
      const objectStore = tx.objectStore(store)
      const req = objectStore.get('data')
      req.onerror = () => reject(req.error)
      req.onsuccess = () => resolve(req.result || null)
    })
  } catch (err) {
    console.error(`Error retrieving cached ${type} data:`, err)
    return null
  }
}
