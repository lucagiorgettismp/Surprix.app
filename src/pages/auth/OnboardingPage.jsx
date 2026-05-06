import { useState } from 'react'
import { Box, Button, Checkbox, FormControlLabel, TextField, Typography, CircularProgress, Alert } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { useCollection } from '../../store/CollectionContext'
import { checkUsernameExists, createUserProfile } from '../../services/database.service'
import { logout } from '../../services/auth.service'
import { useT } from '../../store/LanguageContext'
import AppLogo from '../../components/common/AppLogo'
import CountrySelect from '../../components/common/CountrySelect'
import PolicyDialog from '../../components/common/PolicyDialog'
import PublicFooter from '../../components/layout/PublicFooter'

const OnboardingPage = () => {
  const t = useT()
  const { user } = useAuth()
  const { refreshProfile } = useCollection()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [country, setCountry] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [policyAccepted, setPolicyAccepted] = useState(false)
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [policyOpen, setPolicyOpen] = useState(false)

  const provider = user?.providerData?.[0]?.providerId || 'password'

  const handleSubmit = async () => {
    setError(null)
    if (!username || !country) return setError(t.signup.allFields)
    if (!ageConfirmed) return setError(t.onboarding.mustConfirmAge)
    if (!policyAccepted) return setError(t.onboarding.mustAcceptPolicy)
    setLoading(true)
    try {
      const exists = await checkUsernameExists(username)
      if (exists) return setError(t.signup.usernameExists)
      await createUserProfile(user.uid, user.email, username, country, provider)
      await refreshProfile()
      navigate('/', { replace: true })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 3 }}>
      <AppLogo size={90} />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>{t.onboarding.title}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 6 }} textAlign="center">{t.onboarding.subtitle}</Typography>

      <Box sx={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField label={t.signup.username} value={username} onChange={(e) => setUsername(e.target.value)} fullWidth size="small" />
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
          {loading ? <CircularProgress size={22} color="inherit" /> : t.onboarding.submit}
        </Button>
        <Typography variant="body2" sx={{ textAlign: 'center' }} color="text.secondary">
          {t.onboarding.wrongAccount}{' '}
          <Typography component="span" variant="body2" color="primary" sx={{ cursor: 'pointer', fontWeight: 600 }} onClick={() => logout().then(() => navigate('/login', { replace: true }))}>
            {t.onboarding.signOut}
          </Typography>
        </Typography>
      </Box>

      <PolicyDialog open={policyOpen} onClose={() => setPolicyOpen(false)} />
      </Box>
      <PublicFooter />
    </Box>
  )
}

export default OnboardingPage
