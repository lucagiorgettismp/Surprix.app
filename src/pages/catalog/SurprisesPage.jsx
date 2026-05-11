import { useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useTheme } from '@mui/material/styles'
import { Box, Button, Card, Checkbox, Chip, Dialog, DialogContent, IconButton, Skeleton, Stack, Tooltip, Typography } from '@mui/material'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import StarIcon from '@mui/icons-material/Star'
import DifferenceIcon from '@mui/icons-material/Difference'
import DifferenceOutlinedIcon from '@mui/icons-material/DifferenceOutlined'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import RemoveDoneIcon from '@mui/icons-material/RemoveDone'
import CloseIcon from '@mui/icons-material/Close'
import PageHeader from '../../components/catalog/PageHeader'
import RarityBadge from '../../components/common/RarityBadge'
import ErrorMessage from '../../components/common/ErrorMessage'
import EmptyState from '../../components/common/EmptyState'
import useDatabaseQuery from '../../hooks/useDatabaseQuery'
import { getSurprises, getSet } from '../../services/database.service'
import { gsToHttps, onImgError } from '../../utils/storage'
import { getCountryName, getCategoryLabel } from '../../utils/locale'
import { useCollection } from '../../store/CollectionContext'
import { useLanguage, useT } from '../../store/LanguageContext'
import { useSnackbar } from '../../store/SnackbarContext'
import { trackLightbox, trackSelectMode, trackAddSelected } from '../../services/analytics.service'

const GRID_SX = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
  gap: 1,
}

const SurpriseCardSkeleton = () => (
  <Box sx={GRID_SX}>
    {Array.from({ length: 6 }).map((_, i) => (
      <Card key={i} elevation={1} sx={{ display: 'flex', borderRadius: 2, overflow: 'hidden', height: 88 }}>
        <Skeleton variant="rectangular" width={70} height={88} />
        <Box sx={{ flex: 1, p: 1.5 }}>
          <Skeleton variant="text" width="60%" height={20} />
          <Skeleton variant="text" width="40%" height={16} />
          <Skeleton variant="text" width={72} height={16} />
        </Box>
      </Card>
    ))}
  </Box>
)

const SurprisesPage = () => {
  const { producerId, yearId, setId } = useParams()
  const { state } = useLocation()
  const producerLabel = state?.producerLabel || producerId
  const yearLabel = state?.yearLabel || yearId
  const setLabel = state?.setLabel || setId

  const theme = useTheme()
  const { missing, doubles, toggleMissing, toggleDoubles, addAllMissing, producerColors } = useCollection()
  const tintAmount = theme.palette.mode === 'dark' ? '8%' : '6%'
  const tintedBg = producerColors[producerId]
    ? `color-mix(in srgb, ${producerColors[producerId]} ${tintAmount}, ${theme.palette.background.paper})`
    : theme.palette.background.paper
  const { showUndo, showWarning } = useSnackbar()
  const { lang } = useLanguage()
  const t = useT()
  const [addingAll, setAddingAll] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState(null)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState(new Set())

  const toggleSelect = (id) => setSelected((prev) => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const toggleSelectAll = () => setSelected(selected.size === data.length ? new Set() : new Set(data.map((s) => s.id)))
  const exitSelect = () => { setSelecting(false); setSelected(new Set()) }
  const enterSelect = () => { trackSelectMode('surprises'); setSelecting(true) }

  const handleAddSelected = async () => {
    setAddingAll(true)
    const toAdd = data.filter((s) => selected.has(s.id) && !missing.some((m) => m.id === s.id))
    await addAllMissing(toAdd)
    trackAddSelected(toAdd.length, 'surprises')
    setAddingAll(false)
    exitSelect()
  }

  const { data, loading, error } = useDatabaseQuery(() => getSurprises(setId), [setId])
  const { data: setData } = useDatabaseQuery(() => getSet(setId), [setId])
  const setImageUrl = setData?.img_path ? gsToHttps(setData.img_path) : (state?.setImageUrl || null)

  const handleToggleMissing = async (s) => {
    const wasIn = missing.some((m) => m.id === s.id)
    const index = wasIn ? missing.findIndex((m) => m.id === s.id) : -1
    await toggleMissing(s)
    showUndo(wasIn ? t.undo.removedFromMissing : t.undo.addedToMissing, () => toggleMissing(s, index))
    if (!wasIn && doubles.some((d) => d.id === s.id)) showWarning(t.undo.bothListsWarning)
  }

  const handleToggleDoubles = async (s) => {
    const wasIn = doubles.some((d) => d.id === s.id)
    const index = wasIn ? doubles.findIndex((d) => d.id === s.id) : -1
    await toggleDoubles(s)
    showUndo(wasIn ? t.undo.removedFromDoubles : t.undo.addedToDoubles, () => toggleDoubles(s, index))
    if (!wasIn && missing.some((m) => m.id === s.id)) showWarning(t.undo.bothListsWarning)
  }

  const crumbs = [
    { label: t.nav.catalog, path: '/catalog' },
    { label: producerLabel, path: `/catalog/${producerId}`, state: { producerLabel } },
    { label: yearLabel, path: `/catalog/${producerId}/${yearId}`, state: { producerLabel, yearLabel } },
    { label: setLabel, path: `/catalog/${producerId}/${yearId}/${setId}` },
  ]

  if (error) return <ErrorMessage message={error.message} />

  const first = data[0]
  const metaChips = first ? [
    first.set_category ? { label: getCategoryLabel(first.set_category, lang), primary: true } : null,
    first.set_nation ? { label: getCountryName(first.set_nation, lang) } : null,
  ].filter(Boolean) : []

  return (
    <>
      <PageHeader crumbs={crumbs} title={setLabel}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, justifyContent: 'space-between' }}>
          <Stack direction="row" sx={{ gap: 0.75 }}>
            {metaChips.map((chip) => (
              <Chip key={chip.label} label={chip.label} size="small" variant="outlined" color={chip.primary ? 'primary' : 'default'} />
            ))}
          </Stack>
          {!loading && data.length > 0 && (
            selecting ? (
              <Stack direction="row" sx={{ gap: 0.5 }}>
                <Tooltip title={selected.size === data.length ? t.catalog.deselectAll : t.catalog.selectAll}>
                  <IconButton size="small" onClick={toggleSelectAll} sx={{ color: 'inherit' }}>
                    {selected.size === data.length ? <RemoveDoneIcon fontSize="small" /> : <DoneAllIcon fontSize="small" />}
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
            )
          )}
        </Stack>
      </PageHeader>

      {setImageUrl && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
          <Box
            component="img"
            src={setImageUrl}
            alt={setLabel}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            sx={{ maxWidth: '100%', maxHeight: 220, borderRadius: 2, display: 'block' }}
          />
        </Box>
      )}
      {setData?.thanks_to && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 1.5, fontStyle: 'italic' }}>
          Thanks to {setData.thanks_to}
        </Typography>
      )}

      {loading ? (
        <SurpriseCardSkeleton />
      ) : data.length === 0 ? (
        <EmptyState message={t.catalog.noSurprises} />
      ) : (
        <Box sx={GRID_SX}>
          {data.map((s) => {
            const isMissing = missing.some((m) => m.id === s.id)
            const isDouble = doubles.some((d) => d.id === s.id)
            const imageUrl = gsToHttps(s.img_path)
            return (
              <Card
                key={s.id}
                elevation={1}
                onClick={selecting ? () => toggleSelect(s.id) : undefined}
                sx={{
                  display: 'flex', borderRadius: 2, overflow: 'hidden', alignItems: 'center',
                  px: 2, py: 0.5, gap: 2, boxShadow: 1, position: 'relative',
                  bgcolor: tintedBg,
                  ...(selecting && selected.has(s.id) && { outline: '2px solid', outlineColor: 'primary.main' }),
                  ...(selecting && { cursor: 'pointer' }),
                }}
              >
                {selecting && (
                  <Checkbox checked={selected.has(s.id)} size="small" disableRipple sx={{ p: 0, flexShrink: 0 }} />
                )}
                {imageUrl && (
                  <Box
                    component="img"
                    src={imageUrl}
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    onClick={() => { setLightboxUrl(imageUrl); trackLightbox() }}
                    onError={onImgError}
                    sx={{ width: 72, height: 88, objectFit: 'contain', flexShrink: 0, cursor: 'zoom-in', borderRadius: 1 }}
                  />
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {s.code && (
                    <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'break-word', hyphens: 'auto' }}>
                      {s.code}
                    </Typography>
                  )}
                  {s.description && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ overflowWrap: 'break-word', hyphens: 'auto' }}>
                      {s.description}
                    </Typography>
                  )}
                  <Box sx={{ mt: 0.5 }}>
                    <RarityBadge
                      rarity={s.rarity}
                      rarityAuto={s.rarity_auto}
                      missingCount={s.missing_count}
                      doubleCount={s.double_count}
                    />
                  </Box>
                </Box>
                <Stack direction="column" alignItems="center" justifyContent="center" sx={{ gap: 0.25, flexShrink: 0, pr: 0.5 }}>
                  <IconButton size="small" color="warning" onClick={() => handleToggleMissing(s)}>
                    {isMissing ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                  </IconButton>
                  <IconButton size="small" color="info" onClick={() => handleToggleDoubles(s)}>
                    {isDouble ? <DifferenceIcon fontSize="small" /> : <DifferenceOutlinedIcon fontSize="small" />}
                  </IconButton>
                </Stack>
              </Card>
            )
          })}
        </Box>
      )}

      {selecting && selected.size > 0 && (
        <Box sx={{ position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom))', left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 9 }}>
          <Button
            variant="contained"
            disabled={addingAll}
            onClick={handleAddSelected}
            sx={{ px: 4, borderRadius: 5, boxShadow: 4, pointerEvents: 'auto' }}
          >
            {addingAll ? t.catalog.loading : t.catalog.addSelectedPiecesMissing(selected.size)}
          </Button>
        </Box>
      )}

      <Dialog open={Boolean(lightboxUrl)} onClose={() => setLightboxUrl(null)} maxWidth={false}>
        <DialogContent
          onClick={() => setLightboxUrl(null)}
          onContextMenu={(e) => e.preventDefault()}
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

export default SurprisesPage
