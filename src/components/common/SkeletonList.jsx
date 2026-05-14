import { Box, Skeleton } from '@mui/material'

const SkeletonListItem = ({ hasAvatar = true }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.25, bgcolor: 'background.paper', borderRadius: 2, mb: 1 }}>
    {hasAvatar && <Skeleton variant="circular" width={40} height={40} sx={{ flexShrink: 0 }} />}
    <Box sx={{ flex: 1 }}>
      <Skeleton variant="text" width="50%" height={18} sx={{ mb: 0.5 }} />
      <Skeleton variant="text" width="75%" height={14} />
    </Box>
  </Box>
)

const SkeletonList = ({ rows = 5, hasAvatar = true }) => (
  <Box>
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonListItem key={i} hasAvatar={hasAvatar} />
    ))}
  </Box>
)

export default SkeletonList
