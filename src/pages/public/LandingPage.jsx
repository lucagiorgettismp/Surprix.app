import { Box, Typography, Button, Stack, Paper, ToggleButtonGroup, ToggleButton } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useTheme, alpha } from '@mui/material/styles'
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import ForumIcon from '@mui/icons-material/Forum'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import AppLogo from '../../components/common/AppLogo'
import StatCounter from '../../components/common/StatCounter'
import PublicFooter from '../../components/layout/PublicFooter'
import { useT, useLanguage } from '../../store/LanguageContext'
import { useThemeMode } from '../../store/ThemeContext'
import useDatabaseQuery from '../../hooks/useDatabaseQuery'
import { getStats } from '../../services/database.service'

const STAT_KEYS = [
  { field: 'surprises', labelKey: 'statsSurprises', fallback: '4.000' },
  { field: 'sets',      labelKey: 'statsSeries',    fallback: '200' },
  { field: 'users',     labelKey: 'statsUsers',      fallback: '850' },
]

const fmt = (n) => n?.toLocaleString('it-IT') ?? null

const FEATURES = [
  { Icon: PlaylistAddCheckIcon, titleKey: 'feature1Title', descKey: 'feature1Desc' },
  { Icon: SwapHorizIcon,        titleKey: 'feature2Title', descKey: 'feature2Desc' },
  { Icon: ForumIcon,            titleKey: 'feature3Title', descKey: 'feature3Desc' },
]

const SCREENSHOTS = [
  '/screenshots/missing.png',
  '/screenshots/sets.png',
  '/screenshots/chat.png',
  '/screenshots/feedback.png',
]

const LandingPage = () => {
  const navigate = useNavigate()
  const theme = useTheme()
  const t = useT()
  const l = t.landing
  const { mode, toggleTheme } = useThemeMode()
  const { lang, setLang } = useLanguage()
  const { data: stats } = useDatabaseQuery(getStats, [])

  const heroGradient = `radial-gradient(ellipse at 50% 0%, ${alpha(theme.palette.secondary.container, 0.5)} 0%, ${theme.palette.background.default} 60%)`

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: heroGradient }}>

      {/* Top controls */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 1.5 }}>
        <ToggleButtonGroup value={lang} exclusive onChange={(_, val) => val && setLang(val)} size="small">
          <ToggleButton value="it" sx={{ px: 1.5, fontSize: '0.75rem' }}>IT</ToggleButton>
          <ToggleButton value="en" sx={{ px: 1.5, fontSize: '0.75rem' }}>EN</ToggleButton>
        </ToggleButtonGroup>
        <ToggleButtonGroup value={mode} exclusive onChange={(_, val) => val && toggleTheme()} size="small">
          <ToggleButton value="light"><LightModeIcon fontSize="small" /></ToggleButton>
          <ToggleButton value="dark"><DarkModeIcon fontSize="small" /></ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Hero */}
      <Box sx={{ pt: { xs: 6, sm: 8 }, pb: 4, px: 3, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5 }}>
        <AppLogo size={72} />

        <Typography variant="h5" fontWeight={800} sx={{ maxWidth: 500, lineHeight: 1.3 }}>
          {l.headline}
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 440 }}>
          {l.subheadline}
        </Typography>

        {/* Stats */}
        <Stack direction="row" spacing={1} sx={{ width: '100%', maxWidth: 440 }}>
          {STAT_KEYS.map(({ field, labelKey }) => (
            <StatCounter key={field} value={stats?.[field] ?? null} label={l[labelKey]} primary />
          ))}
        </Stack>

        {/* CTAs */}
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button variant="contained" size="large" onClick={() => navigate('/signup')}>
            {l.cta}
          </Button>
          <Button variant="outlined" size="large" onClick={() => navigate('/login')}>
            {l.ctaSignIn}
          </Button>
        </Stack>
      </Box>

      {/* Features */}
      <Box sx={{ px: 3, pb: 6, maxWidth: 900, mx: 'auto', width: '100%' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
          {FEATURES.map(({ Icon, titleKey, descKey }) => (
            <Paper key={titleKey} elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: alpha(theme.palette.secondary.container, 0.25) }}>
              <Icon sx={{ fontSize: 32, color: 'secondary.main', mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                {l[titleKey]}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {l[descKey]}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>

      {/* Screenshots */}
      <Box sx={{ px: 2, pb: 8, overflowX: 'auto' }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{ justifyContent: 'center', minWidth: 'min-content', mx: 'auto' }}
        >
          {SCREENSHOTS.map((src) => (
            <Box
              key={src}
              component="img"
              src={src}
              alt=""
              draggable={false}
              sx={{ width: { xs: 150, sm: 180, md: 200 }, display: 'block', flexShrink: 0 }}
            />
          ))}
        </Stack>
      </Box>

      <Box sx={{ flex: 1 }} />
      <PublicFooter />
    </Box>
  )
}

export default LandingPage
