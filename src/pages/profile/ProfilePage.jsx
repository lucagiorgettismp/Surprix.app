import { useState, useEffect } from 'react'
import { Box, Typography, Avatar, Button, Divider, Paper, ToggleButtonGroup, ToggleButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, Skeleton } from '@mui/material'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { useCollection } from '../../store/CollectionContext'
import { useThemeMode } from '../../store/ThemeContext'
import { useLanguage, useT } from '../../store/LanguageContext'
import { logout, changePassword, deleteAccount, reauthWithGoogle, reauthWithFacebook } from '../../services/auth.service'
import { getUserProfile, updateUserCountry, deleteUserData } from '../../services/database.service'
import { getCountryName, resolveCountryCode } from '../../utils/locale'
import CountrySelect from '../../components/common/CountrySelect'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import PolicyDialog from '../../components/common/PolicyDialog'
import TosDialog from '../../components/common/TosDialog'

const ProfilePage = () => {
  const { user } = useAuth()
  const { username, missing, doubles, itemsLoading } = useCollection()
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
    navigate('/login')
  }

  const performDelete = async () => {
    await deleteUserData(user.uid, username)
    await deleteAccount()
    navigate('/login')
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

  const initial = (username?.[0] || user?.email?.[0] || '').toUpperCase()

  const reauthMessage = isGoogleUser
    ? t.profile.deleteAccountReauthGoogle
    : isFacebookUser
      ? t.profile.deleteAccountReauthFacebook
      : null

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
        <Avatar sx={{ width: 80, height: 80, mb: 2, bgcolor: 'primary.main', color: 'white', fontSize: 32, fontWeight: 700 }}>
          {initial}
        </Avatar>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {username || user?.displayName || t.profile.user}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {user?.email}
        </Typography>
      </Box>

      <Paper elevation={2} sx={{ borderRadius: 2, mb: 2, overflow: 'hidden' }}>
        <Box sx={{ py: 2.5, display: 'flex', justifyContent: 'space-around' }}>
          <Box sx={{ textAlign: 'center' }}>
            {itemsLoading
              ? <Skeleton variant="text" width={48} height={56} sx={{ mx: 'auto' }} />
              : <Typography variant="h4" sx={{ fontWeight: 800 }} color="warning.main">{missing.length}</Typography>
            }
            <Typography variant="caption" color="text.secondary">{t.missing.title}</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            {itemsLoading
              ? <Skeleton variant="text" width={48} height={56} sx={{ mx: 'auto' }} />
              : <Typography variant="h4" sx={{ fontWeight: 800 }} color="info.main">{doubles.length}</Typography>
            }
            <Typography variant="caption" color="text.secondary">{t.doubles.title}</Typography>
          </Box>
        </Box>
      </Paper>

      <Paper elevation={2} sx={{ borderRadius: 2, mb: 2, overflow: 'hidden' }}>
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

      <Paper elevation={2} sx={{ borderRadius: 2, mb: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2">{t.policy.title}</Typography>
          <Button size="small" variant="outlined" onClick={() => setPolicyOpen(true)}>
            {t.policy.viewPolicy}
          </Button>
        </Box>
        <Divider />
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2">{t.tos.title}</Typography>
          <Button size="small" variant="outlined" onClick={() => setTosOpen(true)}>
            {t.tos.viewTos}
          </Button>
        </Box>
        <Divider />
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2">{t.profile.contactUs}</Typography>
            <Typography variant="caption" color="text.secondary">{t.profile.contactUsSummary}</Typography>
          </Box>
          <Button size="small" variant="outlined" onClick={() => { window.location.href = 'mailto:info.surprix@gmail.com' }} sx={{ flexShrink: 0 }}>
            info.surprix@gmail.com
          </Button>
        </Box>
      </Paper>

      <Box sx={{ pt: 1, pb: 6, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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

      <PolicyDialog open={policyOpen} onClose={() => setPolicyOpen(false)} />
      <TosDialog open={tosOpen} onClose={() => setTosOpen(false)} />
    </Box>
  )
}

export default ProfilePage
