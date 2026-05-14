// Screen 06 — Dettaglio serie Kinder_2026_002 (layout identico a SurprisesPage)
import { useState } from 'react'
import {
  Box, Card, Typography, Chip, IconButton, Stack, Tooltip,
  Button, Dialog, DialogContent,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import StarIcon from '@mui/icons-material/Star'
import DifferenceOutlinedIcon from '@mui/icons-material/DifferenceOutlined'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import { getSurprises, getSet } from '../../../services/database.service'
import useDatabaseQuery from '../../../hooks/useDatabaseQuery'
import useProducerColors from '../useProducerColors'
import { FakeAuthProvider, FakeCollectionProvider } from '../FakeProviders'
import { MARIO_AUTH_USER } from '../fakeData'
import Topbar from '../../../components/layout/Topbar'
import FakeBottomNav from '../FakeBottomNav'
import PageHeader from '../../../components/catalog/PageHeader'
import RarityBadge from '../../../components/common/RarityBadge'
import { gsToHttps, onImgError } from '../../../utils/storage'
import { useT } from '../../../store/LanguageContext'
import { useLanguage } from '../../../store/LanguageContext'
import { getCategoryLabel, getCountryName } from '../../../utils/locale'
import { useCollection } from '../../../store/CollectionContext'

const SET_ID = 'Kinder_2025_002'

const GRID_SX = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
  gap: 1,
}

const Grid = ({ items, missingSet, setImageUrl, setLabel: setLabelProp }) => {
  const t = useT()
  const { lang } = useLanguage()
  const theme = useTheme()
  const { producerColors } = useCollection()
  const [lightboxUrl, setLightboxUrl] = useState(null)

  const first = items[0] || {}
  const producerId = first.set_producer_id
  const tintColor = producerId ? producerColors[producerId] : null
  const tintAmount = theme.palette.mode === 'dark' ? '8%' : '6%'
  const tintedBg = tintColor
    ? `color-mix(in srgb, ${tintColor} ${tintAmount}, ${theme.palette.background.paper})`
    : theme.palette.background.paper

  const setLabel    = setLabelProp || first.set_name || SET_ID
  const producerLbl = first.set_producer_name || producerId || ''
  const yearLbl     = first.set_year_name || String(first.set_year_year || '')
  const yearId      = first.set_year_id || ''
  const catLabel    = first.set_category ? getCategoryLabel(first.set_category, lang) : null
  const natLabel    = first.set_nation   ? getCountryName(first.set_nation, lang)    : null

  const crumbs = [
    { label: t.nav.catalog, path: '/catalog' },
    { label: producerLbl, path: `/catalog/${producerId}` },
    { label: yearLbl, path: `/catalog/${producerId}/${yearId}` },
    { label: setLabel, path: `/catalog/${producerId}/${yearId}/${SET_ID}` },
  ]

  return (
    <>
      <PageHeader crumbs={crumbs} title={setLabel}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, justifyContent: 'space-between' }}>
          <Stack direction="row" sx={{ gap: 0.75 }}>
            {catLabel && <Chip label={catLabel} size="small" variant="outlined" color="primary" />}
            {natLabel && <Chip label={natLabel} size="small" variant="outlined" />}
          </Stack>
          <Button size="small" variant="outlined">{t.catalog.select}</Button>
        </Stack>
      </PageHeader>

      {setImageUrl && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
          <Box component="img" src={setImageUrl} draggable={false} onContextMenu={e => e.preventDefault()} sx={{ maxWidth: '100%', maxHeight: 220, borderRadius: 2, display: 'block' }} />
        </Box>
      )}

      <Box sx={GRID_SX}>
        {items.map((s) => {
          const isMissing = missingSet.has(s.id)
          const imageUrl  = gsToHttps(s.img_path)
          return (
            <Card
              key={s.id}
              elevation={1}
              sx={{
                display: 'flex', borderRadius: 2, overflow: 'hidden', alignItems: 'center',
                px: 2, py: 0.5, gap: 2, bgcolor: tintedBg,
              }}
            >
              {imageUrl && (
                <Box
                  component="img"
                  src={imageUrl}
                  draggable={false}
                  onContextMenu={e => e.preventDefault()}
                  onError={onImgError}
                  onClick={() => setLightboxUrl(imageUrl)}
                  sx={{ width: 72, height: 88, objectFit: 'contain', flexShrink: 0, cursor: 'zoom-in', borderRadius: 1 }}
                />
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {s.code && <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.code}</Typography>}
                {s.description && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {s.description}
                  </Typography>
                )}
                <Box sx={{ mt: 0.5 }}>
                  <RarityBadge rarity={s.rarity} rarityAuto={s.rarity_auto} missingCount={s.missing_count} doubleCount={s.double_count} />
                </Box>
              </Box>
              <Stack direction="column" alignItems="center" justifyContent="center" sx={{ gap: 0.25, flexShrink: 0, pr: 0.5 }}>
                <IconButton size="small" color="warning">
                  {isMissing ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                </IconButton>
                <IconButton size="small" color="info">
                  <DifferenceOutlinedIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Card>
          )
        })}
      </Box>

      <Dialog open={Boolean(lightboxUrl)} onClose={() => setLightboxUrl(null)} maxWidth={false}>
        <DialogContent
          onClick={() => setLightboxUrl(null)}
          onContextMenu={e => e.preventDefault()}
          sx={{ p: 0, cursor: 'zoom-out', lineHeight: 0, '&:first-of-type': { pt: 0 } }}
        >
          {lightboxUrl && (
            <Box
              component="img"
              src={lightboxUrl}
              draggable={false}
              sx={{ display: 'block', width: 360, height: 440, maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

const Screen06 = () => {
  const { data: items,   loading: l1 } = useDatabaseQuery(() => getSurprises(SET_ID), [])
  const { data: setData, loading: l2 } = useDatabaseQuery(() => getSet(SET_ID), [])
  const { producerColors, loading: l3 } = useProducerColors()
  const ready = !l1 && !l2 && !l3

  const setImageUrl = setData?.img_path ? gsToHttps(setData.img_path) : null

  const missingSet = new Set((items || []).slice(0, 4).map(s => s.id))
  const missing    = (items || []).slice(0, 4)

  return (
    <Box data-screen-ready={ready ? 'true' : undefined} sx={{ minHeight: '100dvh' }}>
      <FakeAuthProvider user={MARIO_AUTH_USER}>
        <FakeCollectionProvider
          username="mariorossi"
          missing={missing}
          doubles={[]}
          producerColors={producerColors}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
            <Topbar />
            <Box sx={{ height: { xs: 56, sm: 64 } }} />
            <Box component="main" sx={{ flex: 1, p: 2, pb: 10 }}>
              {ready && <Grid items={items || []} missingSet={missingSet} setImageUrl={setImageUrl} setLabel={setData?.name} />}
            </Box>
            <FakeBottomNav activePath="/catalog" />
          </Box>
        </FakeCollectionProvider>
      </FakeAuthProvider>
    </Box>
  )
}

export default Screen06
