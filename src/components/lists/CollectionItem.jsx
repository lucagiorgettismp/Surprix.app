import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '@mui/material/styles'
import { ListItem, ListItemText, IconButton, Box, Stack, Dialog, DialogContent, Chip, Typography } from '@mui/material'
import BrushIcon from '@mui/icons-material/Brush'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import { gsToHttps, onImgError } from '../../utils/storage'
import { useLanguage } from '../../store/LanguageContext'
import { getCategoryLabel } from '../../utils/locale'
import RarityBadge from '../common/RarityBadge'

const SWIPE_THRESHOLD = 72

const surpriseLabel = (item) =>
  (item.isSet_effective_code || item.set_effective_code) && item.code
    ? `${item.code} · ${item.description}`
    : item.description || item.id

const CollectionItem = ({ item, onRemove, onFindTrade, accentColor, disableSetLink = false }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const isHSwipe = useRef(false)
  const { lang } = useLanguage()
  const navigate = useNavigate()
  const theme = useTheme()
  const tintAmount = theme.palette.mode === 'dark' ? '8%' : '6%'
  const tintedBg = accentColor
    ? `color-mix(in srgb, ${accentColor} ${tintAmount}, ${theme.palette.background.paper})`
    : theme.palette.background.paper
  const title = surpriseLabel(item)
  const year = item.set_year_name || item.set_year_year

  const handleNavigateToSet = (e) => {
    e.stopPropagation()
    if (!item.set_id || !item.set_producer_id || !item.set_year_id) return
    navigate(`/catalog/${item.set_producer_id}/${item.set_year_id}/${item.set_id}`, {
      state: {
        producerLabel: item.set_producer_name || item.set_producer_id,
        yearLabel: item.set_year_name || item.set_year_year || item.set_year_id,
        setLabel: item.set_name,
      },
    })
  }

  const handleTouchStart = (e) => {
    if (!onRemove) return
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isHSwipe.current = false
  }

  const handleTouchMove = (e) => {
    if (!onRemove || touchStartX.current === null) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current
    if (!isHSwipe.current) {
      if (Math.abs(dy) > Math.abs(dx) || dx > 0) return
      isHSwipe.current = true
    }
    setSwipeX(Math.max(dx, -120))
  }

  const handleTouchEnd = () => {
    if (!onRemove) return
    if (swipeX < -SWIPE_THRESHOLD) onRemove(item)
    setSwipeX(0)
    touchStartX.current = null
    isHSwipe.current = false
  }

  return (
    <Box sx={{ position: 'relative', mb: { xs: 1, md: 0 }, borderRadius: 2, overflow: 'hidden', boxShadow: 1, bgcolor: tintedBg }}>
      {onRemove && (
        <Box sx={{
          position: 'absolute',
          inset: 0,
          bgcolor: swipeX < -SWIPE_THRESHOLD ? 'error.dark' : 'error.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          pr: 2.5,
          opacity: Math.min(Math.abs(swipeX) / SWIPE_THRESHOLD, 1),
          transition: 'background-color 0.15s',
        }}>
          <DeleteOutlinedIcon sx={{ color: 'white', fontSize: 28 }} />
        </Box>
      )}
      <ListItem
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        secondaryAction={
          <Stack direction="column" sx={{ alignItems: 'center' }} spacing={0.5}>
            {onFindTrade && (
              <IconButton size="small" onClick={() => onFindTrade(item)} color="primary">
                <SwapHorizIcon />
              </IconButton>
            )}
            {onRemove && (
              <IconButton size="small" onClick={() => onRemove(item)} color="error">
                <DeleteOutlinedIcon />
              </IconButton>
            )}
          </Stack>
        }
        sx={{
          bgcolor: tintedBg,
          borderRadius: 2,
          px: 2,
          py: 0.5,
          pr: 6,
          overflow: 'hidden',
          touchAction: 'pan-y',
          transform: `translateX(${swipeX}px)`,
          transition: swipeX === 0 ? 'transform 0.3s ease' : 'none',
          willChange: swipeX !== 0 ? 'transform' : 'auto',
        }}
      >
        {item.img_path && (
          <>
            <Box
              component="img"
              src={gsToHttps(item.img_path)}
              alt={item.description}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              onClick={() => setLightboxOpen(true)}
              onError={onImgError}
              sx={{ width: 72, height: 88, objectFit: 'contain', borderRadius: 1, mr: 2, flexShrink: 0, cursor: 'zoom-in' }}
            />
            <Dialog open={lightboxOpen} onClose={() => setLightboxOpen(false)} maxWidth={false}>
              <DialogContent
                onClick={() => setLightboxOpen(false)}
                onContextMenu={(e) => e.preventDefault()}
                sx={{ p: 0, cursor: 'zoom-out', lineHeight: 0, '&:first-of-type': { pt: 0 } }}
              >
                <Box
                  component="img"
                  src={gsToHttps(item.img_path)}
                  draggable={false}
                  sx={{ display: 'block', width: 360, height: 440, maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }}
                />
              </DialogContent>
            </Dialog>
          </>
        )}
        <ListItemText
          disableTypography
          primary={
            <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'break-word', hyphens: 'auto' }}>
              {title}
            </Typography>
          }
          secondary={
            <Box>
              {item.set_name && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  onClick={item.set_id && !disableSetLink ? handleNavigateToSet : undefined}
                  sx={{
                    display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mt: 0.25,
                    ...(item.set_id && !disableSetLink && { cursor: 'pointer', '&:hover': { color: 'primary.main' } }),
                  }}
                >
                  {item.set_name}{item.set_id && !disableSetLink ? ' ›' : ''}
                </Typography>
              )}
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {item.set_producer_name && (
                  <Chip
                    label={item.set_producer_name}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      ...(accentColor
                        ? { bgcolor: `${accentColor}22`, color: accentColor, border: `1px solid ${accentColor}55` }
                        : {}),
                    }}
                  />
                )}
                {year && (
                  <Chip
                    label={year}
                    size="small"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                )}
                {item.set_category && (
                  <Chip
                    label={getCategoryLabel(item.set_category, lang)}
                    icon={{ Hand_painted: <BrushIcon />, Compo: <SmartToyIcon /> }[item.set_category]}
                    size="small"
                    variant="outlined"
                    color="primary"
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                )}
              </Stack>
              <Box sx={{ mt: 0.5 }}>
                <RarityBadge
                  rarity={item.rarity}
                  rarityAuto={item.rarity_auto}
                  missingCount={item.missing_count}
                  doubleCount={item.double_count}
                />
              </Box>
            </Box>
          }
        />
      </ListItem>
    </Box>
  )
}

export default CollectionItem
