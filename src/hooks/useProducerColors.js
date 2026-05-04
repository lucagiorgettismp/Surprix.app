import { useEffect, useState } from 'react'
import { getProducers } from '../services/database.service'

let cache = null

export const useProducerColors = () => {
  const [colorMap, setColorMap] = useState(cache || {})

  useEffect(() => {
    if (cache) return
    getProducers().then((producers) => {
      const map = {}
      producers.forEach((p) => { if (p.color) map[p.name] = p.color })
      cache = map
      setColorMap(map)
    })
  }, [])

  return colorMap
}
