import { useMemo } from 'react'
import { getProducers } from '../../services/database.service'
import useDatabaseQuery from '../../hooks/useDatabaseQuery'

const useProducerColors = () => {
  const { data: producers, loading } = useDatabaseQuery(() => getProducers(), [])

  const producerColors = useMemo(() => {
    const map = {}
    ;(producers || []).forEach((p) => { if (p.color) map[p.id] = p.color })
    return map
  }, [producers])

  return { producerColors, loading }
}

export default useProducerColors
