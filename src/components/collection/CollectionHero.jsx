import { useRef, useState, useLayoutEffect } from 'react'
import { Box, Typography, TextField, IconButton, Badge, InputAdornment } from '@mui/material'
import TuneIcon from '@mui/icons-material/Tune'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import { useTheme } from '@mui/material/styles'
import { useT } from '../../store/LanguageContext'
import { useCollection } from '../../store/CollectionContext'
import useCountUp from '../../hooks/useCountUp'
import { useScrollDirection } from '../../hooks/useScrollDirection'

const AnimatedCounter = ({ value, label, primary = false }) => {
  const animated = useCountUp(value ?? 0)
  const theme = useTheme()
  const bg = primary ? theme.palette.secondary.container : 'background.default'
  const labelColor = primary ? theme.palette.secondary.onContainer : 'text.secondary'
  const valueColor = primary ? theme.palette.secondary.onContainer : 'text.primary'
  return (
    <Box sx={{ flex: 1, borderRadius: 2, px: 1.5, py: 1, bgcolor: bg, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <Typography variant="caption" sx={{ color: labelColor, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', lineHeight: 1.2, overflowWrap: 'break-word', hyphens: 'auto', whiteSpace: 'normal' }}>
        {label}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1, mt: 0.25, color: valueColor }}>
        {animated}
      </Typography>
    </Box>
  )
}

const CollectionHero = ({ title, count, seriesCount, seriesLabel, counters = [], search, setSearch, activeFilters = [], onOpenFilter, activeCount = 0 }) => {
  const t = useT()
  const { refreshCount } = useCollection()
  const isVisible = useScrollDirection()
  const ref = useRef(null)
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    if (ref.current) setHeight(ref.current.offsetHeight)
  })

  return (
    <>
    <Box
      ref={ref}
      sx={{
        position: 'fixed',
        top: { xs: 'calc(56px + env(safe-area-inset-top))', sm: 'calc(64px + env(safe-area-inset-top))' },
        left: 0,
        right: 0,
        zIndex: 10,
        bgcolor: 'background.paper',
        px: 2,
        pt: 1.25,
        pb: 1,
        transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <Box sx={{ display: 'flex', mb: 1, maxWidth: 800, mx: 'auto', width: '100%' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flex: 1 }}>
          <AnimatedCounter key={`main-${refreshCount}`} value={count} label={title} primary />
          {seriesCount != null && seriesLabel && (
            <AnimatedCounter key={`series-${refreshCount}`} value={seriesCount} label={seriesLabel} />
          )}
          {counters.map((c) => (
            <AnimatedCounter key={`${c.label}-${refreshCount}`} value={c.value} label={c.label} />
          ))}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          size="small"
          fullWidth
          placeholder={t.filters.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'action.hover',
              borderRadius: 3,
              '& fieldset': { border: 'none' },
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.disabled' }} fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />
        <IconButton onClick={onOpenFilter} disabled={count === 0}>
          <Badge badgeContent={activeCount} color="error">
            <TuneIcon />
          </Badge>
        </IconButton>
      </Box>
    </Box>
    <Box sx={{ height, mt: -2, mb: 1 }} />
    </>
  )
}

export default CollectionHero
