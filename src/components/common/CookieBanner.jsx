import { useState, useEffect } from 'react'
import { Paper, Typography, Button, Stack, Slide, Box } from '@mui/material'
import { useT } from '../../store/LanguageContext'
import { getConsent, setConsent, injectGA4 } from '../../utils/consent'

const CookieBanner = () => {
  const t = useT()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = getConsent()
    if (consent === 'accepted') injectGA4()
    else if (consent === null) setVisible(true)
  }, [])

  const accept = () => {
    setConsent('accepted')
    injectGA4()
    setVisible(false)
  }

  const reject = () => {
    setConsent('rejected')
    setVisible(false)
  }

  return (
    <Slide direction="up" in={visible} mountOnEnter unmountOnExit>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1400,
          px: 2.5,
          pt: 2.5,
          pb: 'calc(20px + env(safe-area-inset-bottom))',
          borderRadius: '16px 16px 0 0',
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ fontSize: 40, lineHeight: 1, flexShrink: 0, mt: 0.25 }}>🍪</Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
              {t.cookies.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              {t.cookies.description}{' '}
              <a href="/privacy" style={{ color: 'inherit', textDecorationColor: 'inherit' }}>
                {t.cookies.learnMore}
              </a>
            </Typography>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button size="small" variant="outlined" color="inherit" onClick={reject}>
                {t.cookies.reject}
              </Button>
              <Button size="small" variant="contained" onClick={accept}>
                {t.cookies.accept}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </Slide>
  )
}

export default CookieBanner
