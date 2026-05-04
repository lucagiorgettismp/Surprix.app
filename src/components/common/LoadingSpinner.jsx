import { Box, CircularProgress } from '@mui/material'

const LoadingSpinner = ({ fullScreen }) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      ...(fullScreen ? { height: '100vh' } : { py: 8 }),
    }}
  >
    <CircularProgress color="primary" />
  </Box>
)

export default LoadingSpinner
