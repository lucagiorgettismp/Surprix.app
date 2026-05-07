import { Box, Popover, Typography, Chip, Button, Divider, Stack } from '@mui/material'
import BrushIcon from '@mui/icons-material/Brush'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import { useT, useLanguage } from '../../store/LanguageContext'
import { getCategoryLabel } from '../../utils/locale'

const CATEGORY_ICONS = {
  Hand_painted: <BrushIcon fontSize="small" />,
  Compo: <SmartToyIcon fontSize="small" />,
}

const FilterGroup = ({ label, options, selected, onToggle, getLabel, getIcon }) => {
  if (!options.length) return null
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
        {options.map((opt) => (
          <Chip
            key={opt}
            label={getLabel ? getLabel(opt) : opt}
            icon={getIcon ? getIcon(opt) : undefined}
            size="small"
            onClick={() => onToggle(opt)}
            color={selected.includes(opt) ? 'primary' : 'default'}
            variant={selected.includes(opt) ? 'filled' : 'outlined'}
          />
        ))}
      </Stack>
    </Box>
  )
}

const CollectionFilterPopover = ({ anchorEl, onClose, options, selected, onToggle, onClear, activeCount }) => {
  const t = useT()
  const { lang } = useLanguage()
  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { sx: { mt: 1, p: 2, width: 300, maxHeight: '60vh', overflowY: 'auto' } } }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t.filters.title}</Typography>
        {activeCount > 0 && (
          <Button size="small" color="error" onClick={onClear} sx={{ minWidth: 0 }}>
            {t.filters.removeAll}
          </Button>
        )}
      </Box>
      <Divider sx={{ mb: 2 }} />
      <FilterGroup label={t.filters.category} options={options.categories} selected={selected.category} onToggle={(v) => onToggle('category', v)} getLabel={(v) => getCategoryLabel(v, lang)} getIcon={(v) => CATEGORY_ICONS[v]} />
      <FilterGroup label={t.filters.producer} options={options.producers} selected={selected.producer} onToggle={(v) => onToggle('producer', v)} />
      <FilterGroup label={t.filters.year} options={options.years} selected={selected.year} onToggle={(v) => onToggle('year', v)} />
    </Popover>
  )
}

export default CollectionFilterPopover
