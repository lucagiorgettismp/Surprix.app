import { useState } from 'react'
import { AppBar, Box, Toolbar, Typography, IconButton, Avatar, Menu, MenuItem } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useNavigate, useLocation } from 'react-router-dom'
import SearchIcon from '@mui/icons-material/Search'
import RefreshIcon from '@mui/icons-material/Refresh'
import { APP_NAME } from '../../constants'
import { useAuth } from '../../store/AuthContext'
import { useCollection } from '../../store/CollectionContext'
import { useT } from '../../store/LanguageContext'
import { logout } from '../../services/auth.service'

const Topbar = () => {
  const { user } = useAuth()
  const { username, refresh, refreshing } = useCollection()
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const [anchor, setAnchor] = useState(null)

  const handleOpen = (e) => setAnchor(e.currentTarget)
  const handleClose = () => setAnchor(null)

  const handleLogout = async () => {
    handleClose()
    await logout()
    navigate('/login')
  }

  const theme = useTheme()
  const initial = (username?.[0] || user?.email?.[0] || '').toUpperCase()

  return (
    <AppBar position="fixed" elevation={0} sx={{ bgcolor: theme.palette.mode === 'dark' ? '#111111' : 'primary.main', paddingTop: 'env(safe-area-inset-top)' }}>
      <Toolbar>
        <Typography variant="h6" onClick={() => navigate('/')} sx={{ color: 'white', fontWeight: 700, letterSpacing: 1, cursor: 'pointer' }}>
          {APP_NAME}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {location.pathname.startsWith('/catalog') && location.pathname !== '/search' && (
          <IconButton size="small" onClick={() => navigate('/search')} sx={{ color: 'white', mr: 0.5 }}>
            <SearchIcon />
          </IconButton>
        )}
        {username && !location.pathname.startsWith('/catalog') && (
          <IconButton size="small" onClick={refresh} disabled={refreshing} sx={{ color: 'white', mr: 0.5 }}>
            <RefreshIcon sx={{ transition: 'transform 0.6s linear', ...(refreshing && { animation: 'spin 0.8s linear infinite', '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }) }} />
          </IconButton>
        )}
        <IconButton onClick={handleOpen} size="small">
          <Avatar sx={{ width: 34, height: 34, bgcolor: 'white', color: 'primary.main', fontSize: 14, fontWeight: 700 }}>
            {initial}
          </Avatar>
        </IconButton>
        <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={handleClose}>
          <MenuItem onClick={() => { handleClose(); navigate('/profile') }}>{t.nav.profile}</MenuItem>
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>{t.profile.logout}</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}

export default Topbar
