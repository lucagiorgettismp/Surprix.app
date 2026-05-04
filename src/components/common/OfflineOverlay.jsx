import { useEffect, useState } from 'react'
import { Box, Typography } from '@mui/material'
import WifiOffIcon from '@mui/icons-material/WifiOff'

const OfflineOverlay = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <WifiOffIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, textAlign: 'center' }}>
        Connessione assente
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', textAlign: 'center', px: 2 }}>
        Controlla la tua connessione di rete per continuare
      </Typography>
    </Box>
  )
}

export default OfflineOverlay
