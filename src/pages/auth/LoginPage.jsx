import { useState, useEffect } from 'react'
import { Box, Button, Dialog, DialogContent, DialogTitle, Divider, Paper, TextField, Typography, CircularProgress, Alert } from '@mui/material'
import GoogleIcon from '@mui/icons-material/Google'
import { useTheme, alpha } from '@mui/material/styles'
import { useNavigate } from 'react-router-dom'
import { loginWithEmail, loginWithGoogle, resetPassword, handleRedirectResult } from '../../services/auth.service'
import { useT } from '../../store/LanguageContext'
import AppLogo from '../../components/common/AppLogo'
import PublicFooter from '../../components/layout/PublicFooter'

const LoginPage = () => {
  const navigate = useNavigate()
  const t = useT()
  const theme = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetOpen, setResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetSent, setResetSent] = useState(false)

  useEffect(() => {
    handleRedirectResult()
      .then((result) => { if (result?.user) navigate('/', { replace: true }) })
      .catch(() => {})
  }, [])

  const mapError = (e) => {
    const errs = t.login.errors
    switch (e.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found': return errs.invalidCredential
      case 'auth/invalid-email': return errs.invalidEmail
      case 'auth/user-disabled': return errs.userDisabled
      case 'auth/too-many-requests': return errs.tooManyRequests
      case 'auth/network-request-failed': return errs.networkError
      case 'auth/account-exists-with-different-credential': return errs.accountExistsDifferentCredential
      case 'auth/popup-blocked': return errs.popupBlocked
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request': return errs.popupClosedByUser
      default: return errs.generic
    }
  }

  const handleReset = async () => {
    setResetError('')
    setResetLoading(true)
    try {
      await resetPassword(resetEmail)
      setResetSent(true)
    } catch (e) {
      setResetError(mapError(e))
    } finally {
      setResetLoading(false)
    }
  }

  const closeReset = () => {
    setResetOpen(false)
    setResetEmail('')
    setResetError('')
    setResetSent(false)
  }

  const handle = async (fn) => {
    setLoading(true)
    setError('')
    try {
      await fn()
      navigate('/', { replace: true })
    } catch (e) {
      setError(mapError(e))
    } finally {
      setLoading(false)
    }
  }

  const heroGradient = `radial-gradient(ellipse at 50% 0%, ${alpha(theme.palette.secondary.container, 0.4)} 0%, ${theme.palette.background.default} 60%)`

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: heroGradient }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 3 }}>
        <AppLogo size={90} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 4 }}>
          {t.common.tagline}
        </Typography>

        <Box sx={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 2 }}>

          <Paper elevation={2} sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label={t.login.email}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label={t.login.password}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              size="small"
            />
            <Typography
              variant="caption"
              color="primary"
              sx={{ cursor: 'pointer', alignSelf: 'flex-end', mt: -1 }}
              onClick={() => { setResetEmail(email); setResetOpen(true) }}
            >
              {t.login.forgotPassword}
            </Typography>
            {error && (
              <Typography variant="caption" color="error" sx={{ mt: -1 }}>
                {error}
              </Typography>
            )}
            <Button
              variant="contained"
              fullWidth
              size="large"
              disabled={loading || !email || !password}
              onClick={() => handle(() => loginWithEmail(email, password))}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : t.login.signIn}
            </Button>

            <Divider sx={{ my: 0.5 }}>{t.login.or}</Divider>

            <Button
              variant="outlined"
              fullWidth
              startIcon={<GoogleIcon />}
              onClick={() => handle(loginWithGoogle)}
              disabled={loading}
            >
              {t.login.continueWithGoogle}
            </Button>

            <Typography variant="body2" sx={{ textAlign: 'center' }} color="text.secondary">
              {t.login.noAccount}{' '}
              <Typography component="span" variant="body2" color="primary" sx={{ cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/signup', { replace: true })}>
                {t.login.signUp}
              </Typography>
            </Typography>
          </Paper>
        </Box>
      </Box>

      <Dialog open={resetOpen} onClose={closeReset} maxWidth="xs" fullWidth>
        <DialogTitle>{t.login.resetPassword}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          {resetSent ? (
            <Alert severity="success">{t.login.resetPasswordSent}</Alert>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">{t.login.resetPasswordSubtitle}</Typography>
              <TextField
                label={t.login.email}
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                fullWidth
                size="small"
                autoFocus
              />
              {resetError && <Alert severity="error">{resetError}</Alert>}
              <Button
                variant="contained"
                fullWidth
                disabled={resetLoading || !resetEmail}
                onClick={handleReset}
              >
                {resetLoading ? <CircularProgress size={22} color="inherit" /> : t.login.resetPassword}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      <PublicFooter />
    </Box>
  )
}

export default LoginPage
