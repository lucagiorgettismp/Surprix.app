// Screen 05 — Selezione multipla (Kinder_2026_001, 5 item selezionati, FAB visibile)
import { useState } from 'react'
import { useCollection } from '../../../store/CollectionContext'
import {
  Box, Card, Checkbox, IconButton, Typography, Chip,
  Stack, Tooltip, Button,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import DifferenceOutlinedIcon from '@mui/icons-material/DifferenceOutlined'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import CloseIcon from '@mui/icons-material/Close'
import { getSurprises, getSurprise } from '../../../services/database.service'
import useDatabaseQuery from '../../../hooks/useDatabaseQuery'
import { FakeAuthProvider, FakeCollectionProvider } from '../FakeProviders'
import useProducerColors from '../useProducerColors'
import { MARIO_AUTH_USER, VC259_ID, VC259_FAKE_STATS, applyFakeStats } from '../fakeData'
import Topbar from '../../../components/layout/Topbar'
import FakeBottomNav from '../FakeBottomNav'
import PageHeader from '../../../components/catalog/PageHeader'
import RarityBadge from '../../../components/common/RarityBadge'
import { gsToHttps, onImgError } from '../../../utils/storage'
import { useT } from '../../../store/LanguageContext'
import { getCategoryLabel, getCountryName } from '../../../utils/locale'
import { useLanguage } from '../../../store/LanguageContext'

const GRID_SX = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
  gap: 1,
}

const Inner = ({ items, missingSet }) => {
  const t = useT()
  const { lang } = useLanguage()
  const theme = useTheme()
  const { producerColors } = useCollection()

  const [selected, setSelected] = useState(() => new Set(items.slice(0, 3).map(i => i.id)))

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })

  // Use producer color from the first item (real DB value)
  const producerId = items[0]?.set_producer_id
  const tintColor = producerId ? producerColors[producerId] : null
  const tintAmount = theme.palette.mode === 'dark' ? '8%' : '6%'
  const tintedBg = tintColor
    ? `color-mix(in srgb, ${tintColor} ${tintAmount}, ${theme.palette.background.paper})`
    : theme.palette.background.paper

  // Derive set metadata from first item (real DB data)
  const first = items[0] || {}
  const setLabel = first.set_name || first.set_id || 'Serie'
  const producerLabel = first.set_producer_name || first.set_producer_id || 'Produttore'
  const yearLabel = first.set_year_name || String(first.set_year_year || '')

  const crumbs = [
    { label: t.nav.catalog, path: '/catalog' },
    { label: producerLabel, path: `/catalog/${producerId}` },
    { label: yearLabel, path: `/catalog/${producerId}/${first.set_year_id}` },
    { label: setLabel, path: `/catalog/${producerId}/${first.set_year_id}/${first.set_id}` },
  ]

  const categoryChip = first.set_category
    ? getCategoryLabel(first.set_category, lang)
    : null
  const nationChip = first.set_nation
    ? getCountryName(first.set_nation, lang)
    : null

  return (
    <>
      <PageHeader crumbs={crumbs} title={setLabel}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, justifyContent: 'space-between' }}>
          <Stack direction="row" sx={{ gap: 0.75 }}>
            {categoryChip && <Chip label={categoryChip} size="small" variant="outlined" color="primary" />}
            {nationChip   && <Chip label={nationChip}   size="small" variant="outlined" />}
          </Stack>
          <Stack direction="row" sx={{ gap: 0.5 }}>
            <Tooltip title={t.catalog.selectAll}>
              <IconButton size="small" sx={{ color: 'inherit' }}><DoneAllIcon fontSize="small" /></IconButton>
            </Tooltip>
            <Tooltip title={t.common.cancel}>
              <IconButton size="small" sx={{ color: 'inherit' }}><CloseIcon fontSize="small" /></IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </PageHeader>

      <Box sx={GRID_SX}>
        {items.map((s) => {
          const isSelected = selected.has(s.id)
          const imageUrl = gsToHttps(s.img_path)
          return (
            <Card
              key={s.id}
              elevation={1}
              onClick={() => toggleSelect(s.id)}
              sx={{
                display: 'flex', borderRadius: 2, overflow: 'hidden', alignItems: 'center',
                px: 2, py: 0.5, gap: 2, boxShadow: 1, position: 'relative',
                bgcolor: tintedBg, cursor: 'pointer',
                ...(isSelected && { outline: '2px solid', outlineColor: 'primary.main' }),
              }}
            >
              <Checkbox checked={isSelected} size="small" disableRipple sx={{ p: 0, flexShrink: 0 }} />
              {imageUrl && (
                <Box
                  component="img"
                  src={imageUrl}
                  draggable={false}
                  onContextMenu={e => e.preventDefault()}
                  onError={onImgError}
                  sx={{ width: 72, height: 88, objectFit: 'contain', flexShrink: 0, borderRadius: 1 }}
                />
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {s.code && <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.code}</Typography>}
                {s.description && <Typography variant="caption" color="text.secondary" display="block">{s.description}</Typography>}
                <Box sx={{ mt: 0.5 }}>
                  <RarityBadge rarity={s.rarity} rarityAuto={s.rarity_auto} missingCount={s.missing_count} doubleCount={s.double_count} />
                </Box>
              </Box>
              <Stack direction="column" alignItems="center" justifyContent="center" sx={{ gap: 0.25, flexShrink: 0, pr: 0.5 }}>
                <IconButton size="small" color={missingSet.has(s.id) ? 'warning' : 'default'}>
                  <StarBorderIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" color="info">
                  <DifferenceOutlinedIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Card>
          )
        })}
      </Box>

      {selected.size > 0 && (
        <Box sx={{ position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom))', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 9 }}>
          <Button variant="contained" sx={{ px: 4, borderRadius: 5, boxShadow: 4 }}>
            {t.catalog.addSelectedPiecesMissing(selected.size)}
          </Button>
        </Box>
      )}
    </>
  )
}

const Screen05 = () => {
  const { data: allItems, loading: l1 } = useDatabaseQuery(() => getSurprises('Kinder_2026_001'), [])
  const { data: dbVC259,  loading: l2 } = useDatabaseQuery(() => getSurprise(VC259_ID), [])

  const { producerColors, loading: l3 } = useProducerColors()
  const ready = !l1 && !l2 && !l3

  const vc259  = applyFakeStats(dbVC259, VC259_FAKE_STATS)
  const others = (allItems || []).filter(i => i.id !== VC259_ID)
  const items  = [vc259, ...others].filter(Boolean).slice(0, 10)
  const missingSet = new Set([VC259_ID])

  return (
    <Box data-screen-ready={ready ? 'true' : undefined} sx={{ minHeight: '100dvh' }}>
      <FakeAuthProvider user={MARIO_AUTH_USER}>
        <FakeCollectionProvider username="mariorossi" missing={vc259 ? [vc259] : []} doubles={[]} producerColors={producerColors}>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
            <Topbar />
            <Box sx={{ height: { xs: 56, sm: 64 } }} />
            <Box component="main" sx={{ flex: 1, p: 2, pb: 10 }}>
              {ready && <Inner items={items} missingSet={missingSet} />}
            </Box>
            <FakeBottomNav activePath="/catalog" />
          </Box>
        </FakeCollectionProvider>
      </FakeAuthProvider>
    </Box>
  )
}

export default Screen05
