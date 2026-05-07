import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { List, Box, Skeleton, ListItem } from '@mui/material'
import { useCollection } from '../../store/CollectionContext'
import CollectionItem from '../../components/lists/CollectionItem'
import CollectionFilterPopover from '../../components/lists/CollectionFilterPopover'
import CollectionHero from '../../components/collection/CollectionHero'
import EmptyState from '../../components/common/EmptyState'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import SearchOffIcon from '@mui/icons-material/SearchOff'
import { useCollectionFilter } from '../../hooks/useCollectionFilter'
import PullToRefresh from '../../components/common/PullToRefresh'
import { useT, useLanguage } from '../../store/LanguageContext'
import { useSnackbar } from '../../store/SnackbarContext'
import { trackSearch, trackFilter } from '../../services/analytics.service'

const CollectionSkeleton = () => (
  <List disablePadding>
    {Array.from({ length: 5 }).map((_, i) => (
      <ListItem key={i} sx={{ bgcolor: 'background.paper', mb: 1, borderRadius: 2, pr: 7, gap: 2 }}>
        <Skeleton variant="rounded" width={72} height={88} sx={{ flexShrink: 0 }} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" height={24} />
          <Skeleton variant="text" width="80%" height={18} />
          <Skeleton variant="text" width={72} height={18} />
        </Box>
      </ListItem>
    ))}
  </List>
)

const DoublesPage = () => {
  const { doubles, itemsLoading, toggleDoubles, producerColors, refresh } = useCollection()
  const navigate = useNavigate()
  const t = useT()
  const { lang } = useLanguage()
  const { showUndo } = useSnackbar()

  const handleRemove = async (item) => {
    const index = doubles.findIndex((d) => d.id === item.id)
    await toggleDoubles(item)
    showUndo(t.undo.removedFromDoubles, () => toggleDoubles(item, index))
  }
  const [anchorEl, setAnchorEl] = useState(null)
  const { filtered, search, setSearch, selected, toggleFilter, clearFilters, activeCount, options } = useCollectionFilter(doubles)

  const didSearchRef = useRef(false)
  useEffect(() => {
    if (search && !didSearchRef.current) { didSearchRef.current = true; trackSearch('doubles') }
    if (!search) didSearchRef.current = false
  }, [search])

  const prevActiveCount = useRef(0)
  useEffect(() => {
    if (activeCount > 0 && prevActiveCount.current === 0) trackFilter('doubles')
    prevActiveCount.current = activeCount
  }, [activeCount])
const categoryCounters = (() => {
    const map = {}
    doubles.forEach((i) => { if (i.set_category) map[i.set_category] = (map[i.set_category] || 0) + 1 })
    return ['Hand_painted', 'Compo'].map((cat) => ({ label: cat === 'Hand_painted' ? t.catalog.handPaintedShort : t.catalog.compoShort, value: map[cat] || 0 }))
  })()

  const activeFilters = [
    ...selected.category.map((v) => ({ label: v, onRemove: () => toggleFilter('category', v) })),
    ...selected.producer.map((v) => ({ label: v, onRemove: () => toggleFilter('producer', v) })),
    ...selected.year.map((v) => ({ label: v, onRemove: () => toggleFilter('year', v) })),
  ]

  return (
    <PullToRefresh onRefresh={refresh}>
      <CollectionHero
        title={t.doubles.title}
        count={doubles.length}
        search={search}
        setSearch={setSearch}
        activeFilters={activeFilters}
        onOpenFilter={(e) => setAnchorEl(e.currentTarget)}
        activeCount={activeCount}
        counters={categoryCounters}
      />


      <Box>
        {itemsLoading ? (
          <CollectionSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={doubles.length === 0 ? AutoAwesomeIcon : SearchOffIcon}
            message={doubles.length === 0 ? t.doubles.empty : t.doubles.noResults}
            hint={doubles.length === 0 ? t.doubles.emptyHint : undefined}
            action={doubles.length === 0 ? { label: t.nav.catalog, onClick: () => navigate('/catalog') } : undefined}
          />
        ) : (
          <List disablePadding sx={{ display: { md: 'grid' }, gridTemplateColumns: { md: 'repeat(auto-fill, minmax(360px, 1fr))' }, gap: { md: 1 } }}>
            {filtered.map((item) => (
              <CollectionItem key={item.id} item={item} onRemove={handleRemove} accentColor={producerColors[item.set_producer_id]} />
            ))}
          </List>
        )}
      </Box>

      <CollectionFilterPopover
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        options={options}
        selected={selected}
        onToggle={toggleFilter}
        onClear={clearFilters}
        activeCount={activeCount}
      />
    </PullToRefresh>
  )
}

export default DoublesPage
