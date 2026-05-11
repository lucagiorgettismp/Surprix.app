import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Box, Button, IconButton, Stack, TextField, Tooltip, InputAdornment, Chip } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import RemoveDoneIcon from '@mui/icons-material/RemoveDone'
import CloseIcon from '@mui/icons-material/Close'
import { useLanguage, useT } from '../../store/LanguageContext'
import { useCollection } from '../../store/CollectionContext'
import { trackSelectMode, trackAddSelected } from '../../services/analytics.service'
import ItemGrid from '../../components/catalog/ItemGrid'
import PageHeader from '../../components/catalog/PageHeader'
import ErrorMessage from '../../components/common/ErrorMessage'
import EmptyState from '../../components/common/EmptyState'
import useDatabaseQuery from '../../hooks/useDatabaseQuery'
import { getSets, getSurprises } from '../../services/database.service'
import { getCountryName, getCategoryLabel } from '../../utils/locale'
import { gsToHttps } from '../../utils/storage'

const SetsPage = () => {
  const { producerId, yearId } = useParams()
  const navigate = useNavigate()
  const { state } = useLocation()
  const producerLabel = state?.producerLabel || producerId
  const yearLabel = state?.yearLabel || yearId
  const { lang } = useLanguage()
  const t = useT()
  const { addAllMissing, producerColors } = useCollection()
  const accentColor = producerColors[producerId]

  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [addingAll, setAddingAll] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState([])

  const { data, loading, error } = useDatabaseQuery(() => getSets(yearId), [yearId])

  const crumbs = [
    { label: t.nav.catalog, path: '/catalog' },
    { label: producerLabel, path: `/catalog/${producerId}`, state: { producerLabel } },
    { label: yearLabel, path: `/catalog/${producerId}/${yearId}` },
  ]

  const toggleSelect = (id) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const exitSelect = () => { setSelecting(false); setSelected(new Set()) }
  const enterSelect = () => { trackSelectMode('sets'); setSelecting(true) }

  useEffect(() => { setSelected(new Set()) }, [search, categoryFilter])

  if (error) return <ErrorMessage message={error.message} />

  const allItems = data.map((s) => ({
    ...s,
    name: s.name,
    imageUrl: gsToHttps(s.img_path),
    chips: [
      s.category ? { label: getCategoryLabel(s.category, lang), primary: true } : null,
      s.nation ? { label: getCountryName(s.nation, lang) } : null,
    ].filter(Boolean),
    codes: s.codes || [],
  }))

  const items = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allItems.filter((s) => {
      if (categoryFilter.length > 0 && !categoryFilter.includes(s.category)) return false
      if (!q) return true
      if (s.name?.toLowerCase().includes(q)) return true
      if ((s.codes || []).some((c) => c.toLowerCase().includes(q))) return true
      return false
    })
  }, [allItems, search, categoryFilter])

  const visibleSelected = items.filter((s) => selected.has(s.id)).length

  const toggleSelectAll = () =>
    setSelected(visibleSelected === items.length ? new Set() : new Set(items.map((s) => s.id)))

  const handleAddSelected = async () => {
    setAddingAll(true)
    const selectedSets = items.filter((s) => selected.has(s.id))
    const allSurprises = (await Promise.all(selectedSets.map((s) => getSurprises(s.id)))).flat()
    await addAllMissing(allSurprises)
    trackAddSelected(visibleSelected, 'sets')
    setAddingAll(false)
    setSelecting(false)
    setSelected(new Set())
  }

  return (
    <>
      <PageHeader crumbs={crumbs} title={yearLabel}>
        {!loading && data.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder={t.catalog.searchSets}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
            />
            <Stack direction="row" sx={{ gap: 0.75, alignItems: 'center', justifyContent: 'space-between' }}>
              <Stack direction="row" sx={{ gap: 0.75 }}>
                {['Hand_painted', 'Compo'].map((cat) => {
                  const active = categoryFilter.includes(cat)
                  return (
                    <Chip
                      key={cat}
                      label={getCategoryLabel(cat, lang)}
                      size="small"
                      variant={active ? 'filled' : 'outlined'}
                      onClick={() => setCategoryFilter((prev) =>
                        prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
                      )}
                      sx={active && accentColor ? { bgcolor: `${accentColor}22`, color: accentColor, borderColor: `${accentColor}55`, fontWeight: 700 } : {}}
                    />
                  )
                })}
              </Stack>
              {selecting ? (
                <Stack direction="row" sx={{ gap: 0.5 }}>
                  <Tooltip title={visibleSelected === items.length ? t.catalog.deselectAll : t.catalog.selectAll}>
                    <IconButton size="small" onClick={toggleSelectAll} sx={{ color: 'inherit' }}>
                      {visibleSelected === items.length ? <RemoveDoneIcon fontSize="small" /> : <DoneAllIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t.common.cancel}>
                    <IconButton size="small" onClick={exitSelect} sx={{ color: 'inherit' }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ) : (
                <Button size="small" variant="outlined" onClick={enterSelect}>
                  {t.catalog.select}
                </Button>
              )}
            </Stack>
          </Box>
        )}
      </PageHeader>

      {selecting && visibleSelected > 0 && (
        <Box sx={{ position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom))', left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 9 }}>
          <Button
            variant="contained"
            disabled={addingAll}
            onClick={handleAddSelected}
            sx={{ px: 4, borderRadius: 5, boxShadow: 4, pointerEvents: 'auto' }}
          >
            {addingAll ? t.catalog.loading : t.catalog.addSelectedMissing(visibleSelected)}
          </Button>
        </Box>
      )}

      {!loading && allItems.length === 0 ? (
        <EmptyState message={t.catalog.noSets} />
      ) : !loading && items.length === 0 ? (
        <EmptyState message={t.catalog.noResults} />
      ) : (
        <ItemGrid
          items={items}
          loading={loading}
          minItemWidth={320}
          imageAspectRatio="400/185"
          nameVariant="subtitle1"
          wrapText
          selecting={selecting}
          selectedIds={selected}
          accentColor={accentColor}
          onItemClick={(item) => {
            if (selecting) { toggleSelect(item.id); return }
            navigate(`/catalog/${producerId}/${yearId}/${item.id}`, {
              state: { producerLabel, yearLabel, setLabel: item.name },
            })
          }}
        />
      )}

    </>
  )
}

export default SetsPage
