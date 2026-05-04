import { useEffect, useCallback, useRef } from 'react'
import { removeMissing, removeDouble } from '../services/database.service'

const DB_NAME = 'surprix-offline'
const STORE_NAME = 'pending-actions'

// Inizializza IndexedDB
const initDB = () => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

// Aggiungi un'azione pending
const addPendingAction = async (action, surpriseId, username) => {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.add({ action, surpriseId, username, timestamp: Date.now() })
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
  })
}

// Recupera tutte le azioni pending
const getPendingActions = async () => {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.getAll()
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
  })
}

// Elimina un'azione pending
const removePendingAction = async (id) => {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(id)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve()
  })
}

// Esegui un'azione pendente
const executeAction = async (action, surpriseId, username) => {
  if (action === 'missing') {
    await removeMissing(username, surpriseId)
  } else if (action === 'double') {
    await removeDouble(username, surpriseId)
  } else {
    throw new Error(`Unknown action: ${action}`)
  }
}

export const useOfflineQueue = () => {
  const isSyncing = useRef(false)

  // Aggiungi un'azione alla coda offline
  const queueAction = useCallback(async (action, surpriseId, username) => {
    try {
      await addPendingAction(action, surpriseId, username)
      // Se online, sincronizza subito
      if (navigator.onLine) {
        await syncQueue()
      }
    } catch (err) {
      console.error('Error queuing action:', err)
    }
  }, [])

  // Sincronizza tutte le azioni pending
  const syncQueue = useCallback(async () => {
    if (isSyncing.current) return
    isSyncing.current = true

    try {
      const pending = await getPendingActions()
      for (const item of pending) {
        const { id, action, surpriseId, username } = item
        try {
          // Esegui l'azione (Firebase call)
          await executeAction(action, surpriseId, username)
          // Se succede, rimuovi dalla coda
          await removePendingAction(id)
          console.log(`[Sync] Successfully synced ${action} ${surpriseId}`)
        } catch (err) {
          console.error(`[Sync] Failed to sync ${action} ${surpriseId}:`, err)
          // Se fallisce, rimane in coda per il prossimo tentativo
        }
      }
    } catch (err) {
      console.error('[Sync] Error syncing queue:', err)
    } finally {
      isSyncing.current = false
    }
  }, [])

  // Ascolta il cambio di stato della rete
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Sync] Network online, syncing queue...')
      syncQueue()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [syncQueue])

  return { queueAction, syncQueue }
}
