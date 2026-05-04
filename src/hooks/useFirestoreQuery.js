import { useState, useEffect } from 'react'

const useFirestoreQuery = (queryFn, deps = []) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    queryFn()
      .then((snap) => {
        if (!cancelled)
          setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      })
      .catch((e) => { if (!cancelled) setError(e) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error }
}

export default useFirestoreQuery
