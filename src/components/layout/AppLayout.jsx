import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Outlet } from 'react-router-dom'
import Topbar from './Topbar'
import BottomNav from './BottomNav'

const AppLayout = () => {
  const theme = useTheme()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowX: 'hidden' }}>
      <Topbar />
      <Box sx={{ height: { xs: 'calc(56px + env(safe-area-inset-top))', sm: 'calc(64px + env(safe-area-inset-top))' } }} />
      <Box component="main" sx={{ flex: 1, p: 2, pb: 'calc(80px + env(safe-area-inset-bottom))' }}>
        <Outlet />
      </Box>
      <BottomNav />
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 'calc(90px + env(safe-area-inset-bottom))',
          background: `linear-gradient(to bottom, transparent, ${theme.palette.background.default})`,
          zIndex: 1099,
          pointerEvents: 'none',
        }}
      />
    </Box>
  )
}

export default AppLayout
