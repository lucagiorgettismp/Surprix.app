import { Box, Typography, Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import AppLogo from '../components/common/AppLogo'

const NotFoundPage = () => {
  const navigate = useNavigate()
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3, bgcolor: 'background.default' }}>
      <AppLogo size={72} />
      <Typography variant="h5" fontWeight={700}>Pagina non trovata</Typography>
      <Typography variant="body2" color="text.secondary">La pagina che cerchi non esiste o è stata spostata.</Typography>
      <Button variant="contained" onClick={() => navigate('/', { replace: true })}>Torna alla home</Button>
    </Box>
  )
}

export default NotFoundPage
