import { ref, get, set, update, remove, query, orderByChild, equalTo, onValue, off, push, limitToLast } from 'firebase/database'
import { rtdb } from './firebase'

const snap2list = (snapshot) => {
  const items = []
  snapshot.forEach((child) => {
    items.push({ id: child.key, ...child.val() })
  })
  return items
}

// --- Catalog ---

export const getProducers = async () => {
  const snapshot = await get(query(ref(rtdb, 'producers'), orderByChild('order')))
  return snap2list(snapshot)
}

export const getYears = async (producerId) => {
  const snapshot = await get(
    query(ref(rtdb, 'years'), orderByChild('producerId'), equalTo(producerId))
  )
  return snap2list(snapshot).sort((a, b) => b.year - a.year)
}

export const getSets = (yearId) =>
  get(query(ref(rtdb, 'sets'), orderByChild('year_id'), equalTo(yearId))).then(snap2list)

export const getSurprises = (setId) =>
  get(query(ref(rtdb, 'surprises'), orderByChild('set_id'), equalTo(setId))).then(snap2list)

export const getSet = async (setId) => {
  const snap = await get(ref(rtdb, `sets/${setId}`))
  return snap.exists() ? { id: snap.key, ...snap.val() } : null
}

export const getSurprise = async (surpriseId) => {
  const snap = await get(ref(rtdb, `surprises/${surpriseId}`))
  return snap.exists() ? { id: snap.key, ...snap.val() } : null
}

// --- User ---

export const getUsername = (uid) =>
  new Promise((resolve, reject) => {
    const r = ref(rtdb, `uids/${uid}`)
    onValue(r, (snap) => {
      off(r)
      resolve(snap.exists() ? snap.val().username : null)
    }, reject, { onlyOnce: true })
  })

export const updateUserCountry = (username, country) =>
  update(ref(rtdb, `users/${username}`), { country })

export const checkUsernameExists = async (username) => {
  const snap = await get(ref(rtdb, `users/${username}`))
  return snap.exists()
}

export const createUserProfile = async (uid, email, username, country, provider) => {
  const emailKey = email.replace(/\./g, ',')
  const privacyAcceptedAt = new Date().toISOString()
  await set(ref(rtdb, `uids/${uid}`), { uid, username, provider })
  await set(ref(rtdb, `users/${username}`), { email: emailKey, username, country, provider, privacyAcceptedAt })
}

// --- Missing list ---

export const getMissingIds = async (username) => {
  const snap = await get(ref(rtdb, `missings/${username}`))
  return snap.val() || {}
}

export const addMissing = (username, surpriseId, sortCode) =>
  set(ref(rtdb, `missings/${username}/${surpriseId}`), sortCode)

export const removeMissing = (username, surpriseId) =>
  remove(ref(rtdb, `missings/${username}/${surpriseId}`))

// --- Doubles list ---

export const getDoublesIds = async (username) => {
  const snap = await get(ref(rtdb, `user_doubles/${username}`))
  return snap.val() || {}
}

export const addDouble = (username, surpriseId, sortCode) =>
  Promise.all([
    set(ref(rtdb, `user_doubles/${username}/${surpriseId}`), sortCode),
    set(ref(rtdb, `surprise_doubles/${surpriseId}/${username}`), true),
  ])

export const removeDouble = (username, surpriseId) =>
  Promise.all([
    remove(ref(rtdb, `user_doubles/${username}/${surpriseId}`)),
    remove(ref(rtdb, `surprise_doubles/${surpriseId}/${username}`)),
  ])

// --- Trade matching ---

export const getUserProfile = async (username) => {
  const snap = await get(ref(rtdb, `users/${username}`))
  return snap.exists() ? { username, ...snap.val() } : null
}

export const getOwnersForSurprise = async (surpriseId) => {
  const snap = await get(ref(rtdb, `surprise_doubles/${surpriseId}`))
  if (!snap.exists()) return []
  const usernames = Object.keys(snap.val())
  const users = await Promise.all(usernames.map(getUserProfile))
  return users.filter(Boolean)
}

export const getOtherSurprisesForYou = async (ownerUsername, myMissingIds) => {
  const results = await Promise.all(
    myMissingIds.map(async (id) => {
      const snap = await get(ref(rtdb, `user_doubles/${ownerUsername}/${id}`))
      if (!snap.exists()) return null
      return getSurprise(id)
    })
  )
  return results.filter(Boolean)
}

// --- Account deletion ---

export const deleteUserData = async (uid, username) => {
  const doublesSnap = await get(ref(rtdb, `user_doubles/${username}`))
  const reverseRemovals = []
  if (doublesSnap.exists()) {
    doublesSnap.forEach((child) => {
      reverseRemovals.push(remove(ref(rtdb, `surprise_doubles/${child.key}/${username}`)))
    })
  }
  await Promise.all([
    ...reverseRemovals,
    remove(ref(rtdb, `users/${username}`)),
    remove(ref(rtdb, `missings/${username}`)),
    remove(ref(rtdb, `user_doubles/${username}`)),
  ])
  await remove(ref(rtdb, `uids/${uid}`))
}

// --- Public profile ---

export const getPublicMissing = async (username) => {
  const map = await getMissingIds(username)
  return getSurprisesByIds(Object.keys(map))
}

export const getPublicDoubles = async (username) => {
  const map = await getDoublesIds(username)
  return getSurprisesByIds(Object.keys(map))
}

// --- Feedback ---

export const addFeedback = (targetUsername, fromUsername, rating, comment) =>
  push(ref(rtdb, `feedback/${targetUsername}`), {
    from: fromUsername, rating, comment: comment || '', createdAt: new Date().toISOString()
  })

export const updateFeedback = (targetUsername, reviewId, rating, comment) =>
  update(ref(rtdb, `feedback/${targetUsername}/${reviewId}`), {
    rating, comment: comment || '', updatedAt: new Date().toISOString()
  })

export const getFeedbackFor = (username) =>
  get(ref(rtdb, `feedback/${username}`)).then(snap2list)

// --- Chat ---

export const getChatId = (u1, u2) => [u1, u2].sort().join('_')

export const sendMessage = async (chatId, fromUsername, toUsername, text) => {
  const createdAt = new Date().toISOString()
  const msgRef = push(ref(rtdb, `chats/${chatId}/messages`))
  const preview = text.length > 40 ? text.slice(0, 40) + '…' : text
  await Promise.all([
    set(msgRef, { from: fromUsername, text, createdAt }),
    update(ref(rtdb, `userChats/${fromUsername}/${chatId}`), { with: toUsername, lastMessage: preview, lastAt: createdAt, unread: false }),
    update(ref(rtdb, `userChats/${toUsername}/${chatId}`), { with: fromUsername, lastMessage: preview, lastAt: createdAt, unread: true }),
  ])
}

export const getMessages = (chatId) =>
  get(query(ref(rtdb, `chats/${chatId}/messages`), limitToLast(50))).then(snap2list)

export const getUserChats = (username) =>
  get(ref(rtdb, `userChats/${username}`)).then((snap) => {
    if (!snap.exists()) return []
    return Object.entries(snap.val())
      .map(([chatId, val]) => ({ chatId, ...val }))
      .sort((a, b) => (b.lastAt || '').localeCompare(a.lastAt || ''))
  })

export const subscribeUserChats = (username, callback) => {
  const r = ref(rtdb, `userChats/${username}`)
  onValue(r, (snap) => {
    if (!snap.exists()) { callback([]); return }
    const result = Object.entries(snap.val())
      .map(([chatId, val]) => ({ chatId, ...val }))
      .sort((a, b) => (b.lastAt || '').localeCompare(a.lastAt || ''))
    callback(result)
  })
  return () => off(r)
}

export const markAsRead = async (username, chatId) => {
  const r = ref(rtdb, `userChats/${username}/${chatId}`)
  const snap = await get(r)
  if (snap.exists()) await update(r, { unread: false })
}

export const deleteMessage = (chatId, messageId) =>
  update(ref(rtdb, `chats/${chatId}/messages/${messageId}`), { deleted: true, text: '' })

export const deleteChatForUser = async (username, chatId, otherUsername) => {
  await Promise.all([
    remove(ref(rtdb, `userChats/${username}/${chatId}`)),
    set(ref(rtdb, `chatDeletions/${chatId}/${username}`), true),
  ])
  const deletionsSnap = await get(ref(rtdb, `chatDeletions/${chatId}`))
  const deletions = deletionsSnap.val() || {}
  if (deletions[username] && deletions[otherUsername]) {
    await Promise.all([
      remove(ref(rtdb, `chats/${chatId}`)),
      remove(ref(rtdb, `chatDeletions/${chatId}`)),
    ])
  }
}

// --- Search ---

export const fetchAllSurprises = () => get(ref(rtdb, 'surprises')).then(snap2list)

// --- Batch load surprises by IDs ---

export const getSurprisesByIds = (ids) =>
  Promise.all(
    ids.map((id) =>
      get(ref(rtdb, `surprises/${id}`)).then((snap) =>
        snap.exists() ? { id: snap.key, ...snap.val() } : null
      )
    )
  ).then((results) => results.filter(Boolean))
