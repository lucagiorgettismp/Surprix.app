import { useState, useEffect } from 'react'
import { Box, Typography, Avatar, Button, Divider, Paper, ToggleButtonGroup, ToggleButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, IconButton } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import ShareIcon from '@mui/icons-material/Share'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { useCollection } from '../../store/CollectionContext'
import { useThemeMode } from '../../store/ThemeContext'
import { useLanguage, useT } from '../../store/LanguageContext'
import { logout, changePassword, deleteAccount, reauthWithGoogle, reauthWithFacebook } from '../../services/auth.service'
import { getUserProfile, updateUserCountry, deleteUserData } from '../../services/database.service'
import { getCountryName, resolveCountryCode } from '../../utils/locale'
import { useSnackbar } from '../../store/SnackbarContext'
import CountrySelect from '../../components/common/CountrySelect'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import PublicFooter from '../../components/layout/PublicFooter'

const ProfilePage = () => {
  const { user } = useAuth()
  const { username } = useCollection()
  const { mode, toggleTheme } = useThemeMode()
  const { lang, setLang } = useLanguage()
  const t = useT()
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwError, setPwError] = useState(null)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [country, setCountry] = useState('')
  const [savedCountry, setSavedCountry] = useState('')
  const [countryOpen, setCountryOpen] = useState(false)
  const [countryLoading, setCountryLoading] = useState(false)
  const [policyOpen, setPolicyOpen] = useState(false)
  const [tosOpen, setTosOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [reauthOpen, setReauthOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    if (!username) return
    getUserProfile(username).then((profile) => {
      if (profile?.country) {
        const code = resolveCountryCode(profile.country)
        const resolved = code || profile.country
        setCountry(resolved)
        setSavedCountry(resolved)
      }
    })
  }, [username])

  const handleCancelCountry = () => {
    setCountry(savedCountry)
    setCountryOpen(false)
  }

  const handleSaveCountry = async () => {
    setCountryLoading(true)
    await updateUserCountry(username, country)
    setSavedCountry(country)
    setCountryLoading(false)
    setCountryOpen(false)
  }

  const isEmailUser = user?.providerData?.some((p) => p.providerId === 'password')
  const isGoogleUser = user?.providerData?.some((p) => p.providerId === 'google.com')
  const isFacebookUser = user?.providerData?.some((p) => p.providerId === 'facebook.com')

  const handleChangePw = async () => {
    setPwError(null)
    if (!oldPw || !newPw) return setPwError(t.profile.oldPasswordWrong)
    if (newPw.length < 6) return setPwError(t.profile.passwordTooShort)
    setPwLoading(true)
    try {
      await changePassword(oldPw, newPw)
      setPwSuccess(true)
      setOldPw('')
      setNewPw('')
    } catch (e) {
      setPwError(e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential'
        ? t.profile.oldPasswordWrong
        : e.message)
    } finally {
      setPwLoading(false)
    }
  }

  const handleClosePw = () => {
    setPwOpen(false)
    setPwError(null)
    setPwSuccess(false)
    setOldPw('')
    setNewPw('')
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const performDelete = async () => {
    await deleteUserData(user.uid, username)
    await deleteAccount()
    navigate('/login', { replace: true })
  }

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      await performDelete()
    } catch (e) {
      if (e.code === 'auth/requires-recent-login') {
        setDeleteConfirmOpen(false)
        setReauthOpen(true)
      } else {
        setDeleteError(e.message)
      }
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleReauth = async () => {
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      if (isGoogleUser) await reauthWithGoogle()
      else if (isFacebookUser) await reauthWithFacebook()
      await performDelete()
    } catch (e) {
      setDeleteError(e.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  const { showSnackbar } = useSnackbar()

  const handleShare = async () => {
    const url = `${window.location.origin}/u/${username}`
    if (navigator.share) {
      await navigator.share({ title: `${username} su Surprix`, url })
    } else {
      await navigator.clipboard.writeText(url)
      showSnackbar(t.common.linkCopied)
    }
  }

  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const initial = (username?.[0] || user?.email?.[0] || '').toUpperCase()

  const reauthMessage = isGoogleUser
    ? t.profile.deleteAccountReauthGoogle
    : isFacebookUser
      ? t.profile.deleteAccountReauthFacebook
      : null

  return (
    <Box sx={{ maxWidth: { xs: 600, md: 980 }, mx: 'auto', px: 2 }}>
      {/* Page header */}
      <Box sx={{
        position: 'fixed',
        top: { xs: 'calc(56px + env(safe-area-inset-top))', sm: 'calc(64px + env(safe-area-inset-top))' },
        left: 0, right: 0,
        height: '56px',
        bgcolor: 'background.paper',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1,
        zIndex: 10,
      }}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight={700}>{t.nav.settings}</Typography>
      </Box>
      <Box sx={{ height: '56px' }} />

      <Box sx={{ display: { md: 'grid' }, gridTemplateColumns: { md: '300px 1fr' }, gap: { md: 3 }, alignItems: 'flex-start' }}>

        {/* Left: avatar + identity */}
        <Box sx={{ position: { md: 'sticky' }, top: { md: 'calc(128px + env(safe-area-inset-top))' } }}>
          <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, mb: { xs: 2, md: 0 }, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
            <Avatar sx={{ width: 80, height: 80, mb: 2, bgcolor: theme.palette.secondary.container, color: theme.palette.secondary.onContainer, fontSize: 32, fontWeight: 700 }}>
              {initial}
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'center' }}>
              {username || user?.displayName || t.profile.user}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', wordBreak: 'break-all', px: 1 }}>
              {user?.email}
            </Typography>
            {username && (
              <Box sx={{ display: 'flex', gap: 1, mt: 2, px: 1, width: '100%' }}>
                <Button size="small" variant="outlined" fullWidth onClick={() => navigate(`/u/${username}`)}>
                  {t.nav.viewProfile}
                </Button>
                <Button size="small" variant="outlined" fullWidth startIcon={<ShareIcon />} onClick={handleShare}>
                  {t.common.shareProfile}
                </Button>
              </Box>
            )}
          </Box>
        </Box>

        {/* Right: settings + actions */}
        <Box>
          <Paper elevation={1} sx={{ borderRadius: 2, mb: 2, overflow: 'hidden' }}>
            <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2">{mode === 'light' ? t.profile.lightMode : t.profile.darkMode}</Typography>
              <ToggleButtonGroup value={mode} exclusive onChange={(_, val) => val && toggleTheme()} size="small" color="primary">
                <ToggleButton value="light"><LightModeIcon fontSize="small" /></ToggleButton>
                <ToggleButton value="dark"><DarkModeIcon fontSize="small" /></ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Divider />
            <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2">{t.profile.language}</Typography>
              <ToggleButtonGroup value={lang} exclusive onChange={(_, val) => val && setLang(val)} size="small" color="primary">
                <ToggleButton value="it">🇮🇹 IT</ToggleButton>
                <ToggleButton value="en">🇬🇧 EN</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Divider />
            <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2">{t.profile.changeCountry}</Typography>
              <Button size="small" variant="outlined" onClick={() => setCountryOpen(true)}>
                {country ? getCountryName(country, lang) : '—'}
              </Button>
            </Box>
          </Paper>

          <Box sx={{ pt: 1, pb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {isEmailUser && (
              <Button variant="outlined" fullWidth onClick={() => setPwOpen(true)}>
                {t.profile.changePassword}
              </Button>
            )}
            <Button variant="outlined" color="error" fullWidth onClick={() => setConfirmOpen(true)}>
              {t.profile.logout}
            </Button>
            <Button variant="text" color="error" fullWidth size="small" onClick={() => { setDeleteError(null); setDeleteConfirmOpen(true) }}>
              {t.profile.deleteAccount}
            </Button>
          </Box>
        </Box>

      </Box>

      {/* Change password dialog */}
      <Dialog open={pwOpen} onClose={handleClosePw} fullWidth maxWidth="xs">
        <DialogTitle>{t.profile.changePassword}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {pwSuccess && <Alert severity="success">{t.profile.passwordChanged}</Alert>}
            {pwError && <Alert severity="error">{pwError}</Alert>}
            <TextField
              label={t.profile.oldPassword}
              type="password"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label={t.profile.newPassword}
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              fullWidth
              size="small"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePw}>{t.common.cancel}</Button>
          <Button variant="contained" onClick={handleChangePw} disabled={pwLoading}>
            {t.common.confirm}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change country dialog */}
      <Dialog open={countryOpen} onClose={handleCancelCountry} fullWidth maxWidth="xs">
        <DialogTitle>{t.profile.changeCountry}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <CountrySelect value={country} onChange={setCountry} label={t.signup.country} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelCountry}>{t.common.cancel}</Button>
          <Button variant="contained" onClick={handleSaveCountry} disabled={countryLoading || !country}>
            {t.common.confirm}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete account confirm dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t.profile.deleteAccount}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="body2">{t.profile.deleteAccountConfirm}</Typography>
            <Typography variant="caption" color="text.secondary">{t.profile.deleteAccountSummary}</Typography>
            {deleteError && <Alert severity="error">{deleteError}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>{t.common.cancel}</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm} disabled={deleteLoading}>
            {t.common.confirm}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Re-auth dialog (for Google/Facebook users) */}
      <Dialog open={reauthOpen} onClose={() => { setReauthOpen(false); setDeleteError(null) }} fullWidth maxWidth="xs">
        <DialogTitle>{t.profile.reauthenticate}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="body2">{reauthMessage}</Typography>
            {deleteError && <Alert severity="error">{deleteError}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setReauthOpen(false); setDeleteError(null) }}>{t.common.cancel}</Button>
          <Button variant="contained" color="error" onClick={handleReauth} disabled={deleteLoading}>
            {t.profile.reauthenticate}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title={t.profile.logout}
        message={t.profile.logoutConfirm}
        onConfirm={handleLogout}
        onCancel={() => setConfirmOpen(false)}
      />

      <PublicFooter />
    </Box>
  )
}

export default ProfilePage
