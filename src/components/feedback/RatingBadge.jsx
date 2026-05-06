import { Box, Typography } from '@mui/material'
import EggRating from './EggRating'
import { useT } from '../../store/LanguageContext'

const RatingBadge = ({ value, count, size = 'small', showCount = true }) => {
  const t = useT()
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <EggRating value={value} readOnly size={size} />
      {count > 0 && (
        <Typography variant="body2" sx={{ fontWeight: 700 }} color="text.primary">
          {value.toFixed(1)}
        </Typography>
      )}
      {showCount && (
        <Typography variant="caption" color="text.secondary">
          ({t.feedback.reviewCount(count)})
        </Typography>
      )}
    </Box>
  )
}

export default RatingBadge
