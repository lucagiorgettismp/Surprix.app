import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import useCountUp from '../../hooks/useCountUp'

const StatCounter = ({ value, label, primary = false }) => {
  const animated = useCountUp(value ?? 0)
  const theme = useTheme()
  const bg = primary ? theme.palette.secondary.container : theme.palette.background.default
  const labelColor = primary ? theme.palette.secondary.onContainer : 'text.secondary'
  const valueColor = primary ? theme.palette.secondary.onContainer : 'text.primary'

  return (
    <Box sx={{ flex: 1, borderRadius: 2, px: 1.5, py: 1, bgcolor: bg, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <Typography variant="caption" sx={{ color: labelColor, fontWeight: 600, fontSize: '0.7rem', letterSpacing: 1.2, textTransform: 'uppercase', lineHeight: 1.2, overflowWrap: 'break-word', hyphens: 'auto', whiteSpace: 'normal' }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1, mt: 0.25, color: valueColor }}>
        {value != null ? animated.toLocaleString('it-IT') : '—'}
      </Typography>
    </Box>
  )
}

export default StatCounter
