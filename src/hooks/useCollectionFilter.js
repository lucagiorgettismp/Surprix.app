import { useMemo, useState } from 'react'

const normalize = (s) => (s || '').toLowerCase()

export const useCollectionFilter = (items) => {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState({ category: [], producer: [], year: [] })

  const options = useMemo(() => {
    const categories = [...new Set(items.map((i) => i.set_category).filter(Boolean))].sort()
    const producers = [...new Set(items.map((i) => i.set_producer_name).filter(Boolean))].sort()
    const years = [...new Set(items.map((i) => i.set_year_name || String(i.set_year_year)).filter(Boolean))].sort()
    return { categories, producers, years }
  }, [items])

  const toggleFilter = (group, value) =>
    setSelected((prev) => {
      const cur = prev[group]
      return { ...prev, [group]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] }
    })

  const clearFilters = () => {
    setSearch('')
    setSelected({ category: [], producer: [], year: [] })
  }

  const activeCount = selected.category.length + selected.producer.length + selected.year.length

  const filtered = useMemo(() => {
    const q = normalize(search)
    return items.filter((item) => {
      if (q) {
        const label = normalize(item.code) + ' ' + normalize(item.description) + ' ' + normalize(item.set_name)
        if (!label.includes(q)) return false
      }
      if (selected.category.length && !selected.category.includes(item.set_category)) return false
      if (selected.producer.length && !selected.producer.includes(item.set_producer_name)) return false
      const yearLabel = item.set_year_name || String(item.set_year_year)
      if (selected.year.length && !selected.year.includes(yearLabel)) return false
      return true
    })
  }, [items, search, selected])

  return { filtered, search, setSearch, selected, toggleFilter, clearFilters, activeCount, options }
}
