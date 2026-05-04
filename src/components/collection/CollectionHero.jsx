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
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <Typography variant="caption" sx={{ color: primary ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', lineHeight: 1.2 }}>
        {label}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1, mt: 0.25, color: primary ? 'white' : 'rgba(255,255,255,0.45)' }}>
        {animated}
      </Typography>
    </Box>
  )
}

const CollectionHero = ({ title, count, seriesCount, seriesLabel, counters = [], search, setSearch, activeFilters = [], onOpenFilter, activeCount = 0 }) => {
  const t = useT()
  const { refreshCount } = useCollection()
  const theme = useTheme()
  const heroBg = theme.palette.mode === 'dark' ? '#111111' : 'primary.main'
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
        bgcolor: heroBg,
        px: 2,
        pt: 1.25,
        pb: 1,
        transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-end' }}>
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
              bgcolor: 'rgba(255,255,255,0.15)',
              borderRadius: 3,
              color: 'white',
              '& fieldset': { border: 'none' },
            },
            '& input::placeholder': { color: 'rgba(255,255,255,0.6)', opacity: 1 },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'rgba(255,255,255,0.6)' }} fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')} sx={{ color: 'rgba(255,255,255,0.6)' }}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />
        <IconButton onClick={onOpenFilter} sx={{ color: 'white' }}>
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
