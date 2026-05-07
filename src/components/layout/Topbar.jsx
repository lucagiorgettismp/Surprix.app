import { useState } from 'react'
import { AppBar, Box, Toolbar, Typography, IconButton, Avatar, Menu, MenuItem, Button } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useNavigate, useLocation } from 'react-router-dom'
import SearchIcon from '@mui/icons-material/Search'
import { APP_NAME } from '../../constants'
import { useAuth } from '../../store/AuthContext'
import { useCollection } from '../../store/CollectionContext'
import { useT } from '../../store/LanguageContext'
import { logout } from '../../services/auth.service'

const Topbar = () => {
  const { user } = useAuth()
  const { username } = useCollection()
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const [anchor, setAnchor] = useState(null)
  const isChat = location.pathname.startsWith('/chat')

  const handleOpen = (e) => setAnchor(e.currentTarget)
  const handleClose = () => setAnchor(null)

  const handleLogout = async () => {
    handleClose()
    await logout()
    navigate('/login', { replace: true })
  }

  const theme = useTheme()
  const initial = (username?.[0] || user?.email?.[0] || '').toUpperCase()

  return (
    <AppBar position="fixed" color="default" elevation={0} sx={{ bgcolor: 'background.paper', paddingTop: 'env(safe-area-inset-top)' }}>
      <Toolbar>
        <Typography variant="h6" onClick={() => navigate('/')} sx={{ fontWeight: 700, letterSpacing: 1, cursor: 'pointer' }}>
          {APP_NAME}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {!isChat && location.pathname.startsWith('/catalog') && location.pathname !== '/search' && (
          <IconButton size="small" onClick={() => navigate('/search')} sx={{ color: 'text.secondary', mr: 0.5 }}>
            <SearchIcon />
          </IconButton>
        )}
        {user ? (
          <>
            <IconButton onClick={handleOpen} size="small">
              <Avatar sx={{ width: 34, height: 34, bgcolor: theme.palette.secondary.container, color: theme.palette.secondary.onContainer, fontSize: 14, fontWeight: 700 }}>
                {initial}
              </Avatar>
            </IconButton>
            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={handleClose}>
              <MenuItem onClick={() => { handleClose(); navigate(`/u/${username}`) }}>{t.nav.viewProfile}</MenuItem>
              <MenuItem onClick={() => { handleClose(); navigate('/settings') }}>{t.nav.settings}</MenuItem>
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>{t.profile.logout}</MenuItem>
            </Menu>
          </>
        ) : (
          <Button size="small" variant="outlined" color="primary" onClick={() => navigate('/login')}>
            {t.login.signIn}
          </Button>
        )}
      </Toolbar>
    </AppBar>
  )
}

export default Topbar
