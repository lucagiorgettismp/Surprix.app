import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import {
  getUsername,
  getMissingIds,
  getDoublesIds,
  getSurprisesByIds,
  getProducers,
  addMissing,
  removeMissing,
  addDouble,
  removeDouble,
  subscribeUserChats,
  markAsRead,
} from '../services/database.service'
import { trackToggleMissing, trackToggleDoubles, trackAddAllMissing } from '../services/analytics.service'
import { cacheData, getCachedData } from '../utils/dataCache'

const CollectionContext = createContext(null)

const sortCode = (surprise) =>
  surprise.isSet_effective_code ? surprise.code : `ZZZ_${surprise.id}`

const cacheKey = (uid) => `surprix_uname_${uid}`
const getCached = (uid) => sessionStorage.getItem(cacheKey(uid)) ?? null
const setCached = (uid, uname) => {
  if (uname) sessionStorage.setItem(cacheKey(uid), uname)
  else sessionStorage.removeItem(cacheKey(uid))
}

const fetchItems = async (uname) => {
  const [missingMap, doublesMap] = await Promise.all([
    getMissingIds(uname),
    getDoublesIds(uname),
  ])
  const [missingItems, doublesItems] = await Promise.all([
    getSurprisesByIds(Object.keys(missingMap)),
    getSurprisesByIds(Object.keys(doublesMap)),
  ])
  return { missingItems, doublesItems }
}

export const CollectionProvider = ({ children }) => {
  const { user } = useAuth()
  const [username, setUsername] = useState(undefined)
  const [missing, setMissing] = useState([])
  const [doubles, setDoubles] = useState([])
  const missingRef = useRef([])
  const doublesRef = useRef([])
  const [loading, setLoading] = useState(true)
  const [itemsLoading, setItemsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)
  const [producerColors, setProducerColors] = useState({})
  const [unreadChats, setUnreadChats] = useState(0)
  const [chats, setChats] = useState(null)
  const activeChatIdRef = useRef(null)
  const setActiveChatId = (id) => { activeChatIdRef.current = id }

  useEffect(() => { missingRef.current = missing }, [missing])
  useEffect(() => { doublesRef.current = doubles }, [doubles])

  useEffect(() => {
    if (!username) {
      setChats(null)
      return
    }
    const unsubscribe = subscribeUserChats(username, (c) => {
      const valid = c.filter((ch) => !!ch.with)
      const activeId = activeChatIdRef.current
      if (activeId) {
        const active = valid.find((ch) => ch.chatId === activeId)
        if (active?.unread) markAsRead(username, activeId).catch(() => {})
      }
      const normalized = valid.map((ch) =>
        ch.chatId === activeId ? { ...ch, unread: false } : ch
      )
      setChats(normalized)
      setUnreadChats(normalized.filter((x) => x.unread).length)
    })
    return unsubscribe
  }, [username])

  useEffect(() => {
    getProducers().then((producers) => {
      const map = {}
      producers.forEach((p) => { if (p.color) map[p.id] = p.color })
      setProducerColors(map)
    })
  }, [])

  useEffect(() => {
    if (user === undefined) return

    if (user === null) {
      setUsername(null)
      setMissing([])
      setDoubles([])
      setLoading(false)
      setItemsLoading(false)
      return
    }

    let cancelled = false
    const cached = getCached(user.uid)

    if (cached) {
      setUsername(cached)
      setLoading(false)
    } else {
      setUsername(undefined)
      setLoading(true)
    }
    setItemsLoading(true)

    const load = async () => {
      try {
        const uname = await getUsername(user.uid)
        if (cancelled) return

        if (uname) {
          setCached(user.uid, uname)
          setUsername(uname)
          setLoading(false)

          // Mostra cache IndexedDB subito se disponibile
          const [cachedMissing, cachedDoubles] = await Promise.all([
            getCachedData('missing'),
            getCachedData('doubles'),
          ])
          if (!cancelled && (cachedMissing || cachedDoubles)) {
            if (cachedMissing) setMissing(cachedMissing)
            if (cachedDoubles) setDoubles(cachedDoubles)
            setItemsLoading(false)
          }

          // Fetch RTDB in background (aggiorna silenziosamente)
          const { missingItems, doublesItems } = await fetchItems(uname)
          if (cancelled) return
          setMissing(missingItems)
          setDoubles(doublesItems)
          setItemsLoading(false)
          cacheData('missing', missingItems)
          cacheData('doubles', doublesItems)
        } else if (!cached) {
          setUsername(null)
          setLoading(false)
          setItemsLoading(false)
        }
      } catch (e) {
        console.error('[Collection] load error:', e)
        if (!cancelled) setTimeout(load, 800)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user])

  const refreshProfile = async () => {
    if (!user) return
    const uname = await getUsername(user.uid)
    if (uname) {
      setCached(user.uid, uname)
      setUsername(uname)
    }
  }

  const refresh = useCallback(async () => {
    if (!username || refreshing) return
    setRefreshing(true)
    try {
      const { missingItems, doublesItems } = await fetchItems(username)
      setMissing(missingItems)
      setDoubles(doublesItems)
      cacheData('missing', missingItems)
      cacheData('doubles', doublesItems)
    } catch (e) {
      console.error('[Collection] refresh error:', e)
    } finally {
      setRefreshing(false)
      setRefreshCount((c) => c + 1)
    }
  }, [username, refreshing])

  const toggleMissing = useCallback(async (surprise, insertAtIndex = -1) => {
    if (!username) return
    const exists = missingRef.current.find((m) => m.id === surprise.id)
    let newMissing
    if (exists) {
      newMissing = missingRef.current.filter((m) => m.id !== surprise.id)
      trackToggleMissing('remove')
    } else {
      if (insertAtIndex >= 0 && insertAtIndex < missingRef.current.length) {
        newMissing = [...missingRef.current]
        newMissing.splice(insertAtIndex, 0, surprise)
      } else {
        newMissing = [...missingRef.current, surprise]
      }
      trackToggleMissing('add')
    }
    setMissing(newMissing)
    cacheData('missing', newMissing)
    try {
      if (exists) await removeMissing(username, surprise.id)
      else await addMissing(username, surprise.id, sortCode(surprise))
    } catch (err) {
      console.error('Error toggling missing:', err)
    }
  }, [username])

  const addAllMissing = async (surprises) => {
    if (!username) return
    const toAdd = surprises.filter((s) => !missingRef.current.find((m) => m.id === s.id))
    if (toAdd.length === 0) return
    await Promise.all(toAdd.map((s) => addMissing(username, s.id, sortCode(s))))
    const newMissing = [...missingRef.current, ...toAdd]
    setMissing(newMissing)
    cacheData('missing', newMissing)
    trackAddAllMissing(toAdd.length)
  }

  const toggleDoubles = useCallback(async (surprise, insertAtIndex = -1) => {
    if (!username) return
    const exists = doublesRef.current.find((d) => d.id === surprise.id)
    let newDoubles
    if (exists) {
      newDoubles = doublesRef.current.filter((d) => d.id !== surprise.id)
      trackToggleDoubles('remove')
    } else {
      if (insertAtIndex >= 0 && insertAtIndex < doublesRef.current.length) {
        newDoubles = [...doublesRef.current]
        newDoubles.splice(insertAtIndex, 0, surprise)
      } else {
        newDoubles = [...doublesRef.current, surprise]
      }
      trackToggleDoubles('add')
    }
    setDoubles(newDoubles)
    cacheData('doubles', newDoubles)
    try {
      if (exists) await removeDouble(username, surprise.id)
      else await addDouble(username, surprise.id, sortCode(surprise))
    } catch (err) {
      console.error('Error toggling double:', err)
    }
  }, [username])

  return (
    <CollectionContext.Provider
      value={{ username, missing, doubles, loading, itemsLoading, refreshing, refreshCount, producerColors, unreadChats, setUnreadChats, chats, setChats, setActiveChatId, toggleMissing, toggleDoubles, addAllMissing, refreshProfile, refresh }}
    >
      {children}
    </CollectionContext.Provider>
  )
}

export const useCollection = () => useContext(CollectionContext)
