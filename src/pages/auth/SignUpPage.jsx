import { useState } from 'react'
import { Box, Button, Checkbox, FormControlLabel, TextField, Typography, CircularProgress, Alert } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useCollection } from '../../store/CollectionContext'
import { registerWithEmail } from '../../services/auth.service'
import { checkUsernameExists, createUserProfile } from '../../services/database.service'
import { useT } from '../../store/LanguageContext'
import AppLogo from '../../components/common/AppLogo'
import CountrySelect from '../../components/common/CountrySelect'
import PolicyDialog from '../../components/common/PolicyDialog'
import PublicFooter from '../../components/layout/PublicFooter'

const SignUpPage = () => {
  const t = useT()
  const navigate = useNavigate()
  const { refreshProfile } = useCollection()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [country, setCountry] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [policyAccepted, setPolicyAccepted] = useState(false)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [policyOpen, setPolicyOpen] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    if (!username || !email || !password || !country) return setError(t.signup.allFields)
    if (password.length < 6) return setError(t.signup.passwordLength)
    if (!ageConfirmed) return setError(t.onboarding.mustConfirmAge)
    if (!policyAccepted) return setError(t.onboarding.mustAcceptPolicy)
    setLoading(true)
    try {
      const exists = await checkUsernameExists(username)
      if (exists) return setError(t.signup.usernameExists)
      const { user } = await registerWithEmail(email, password)
      await createUserProfile(user.uid, email, username, country, 'password')
      await refreshProfile()
      navigate('/')
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') setError(t.signup.emailInUse)
      else if (e.code === 'auth/invalid-email') setError(t.signup.emailFormat)
      else if (e.code === 'auth/weak-password') setError(t.signup.weakPassword)
      else setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 3 }}>
      <AppLogo size={90} />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 6 }}>{t.signup.title}</Typography>

      <Box sx={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField label={t.signup.username} value={username} onChange={(e) => setUsername(e.target.value)} fullWidth size="small" />
        <TextField label={t.login.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth size="small" />
        <TextField label={t.login.password} type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth size="small" />
        <CountrySelect value={country} onChange={setCountry} label={t.signup.country} />

        <FormControlLabel
          control={<Checkbox checked={ageConfirmed} onChange={(e) => setAgeConfirmed(e.target.checked)} size="small" />}
          label={<Typography variant="body2">{t.onboarding.confirmAge}</Typography>}
        />

        <FormControlLabel
          control={<Checkbox checked={policyAccepted} onChange={(e) => setPolicyAccepted(e.target.checked)} size="small" />}
          label={
            <Typography variant="body2">
              {t.onboarding.acceptPolicy}{' '}
              <Typography
                component="span"
                variant="body2"
                color="primary"
                sx={{ cursor: 'pointer', fontWeight: 600 }}
                onClick={(e) => { e.preventDefault(); setPolicyOpen(true) }}
              >
                {t.onboarding.privacyPolicy}
              </Typography>
            </Typography>
          }
        />

        {error && <Alert severity="error">{error}</Alert>}

        <Button variant="contained" fullWidth size="large" disabled={loading} onClick={handleSubmit}>
          {loading ? <CircularProgress size={22} color="inherit" /> : t.signup.submit}
        </Button>

        <Typography variant="body2" textAlign="center" color="text.secondary">
          {t.login.alreadyAccount}{' '}
          <Typography component="span" variant="body2" color="primary" sx={{ cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate('/login')}>
            {t.login.signIn}
          </Typography>
        </Typography>
      </Box>

      <PolicyDialog open={policyOpen} onClose={() => setPolicyOpen(false)} />
      </Box>
      <PublicFooter />
    </Box>
  )
}

export default SignUpPage
