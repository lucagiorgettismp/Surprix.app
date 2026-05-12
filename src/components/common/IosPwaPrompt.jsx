import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Paper, Typography, Slide, Box, IconButton, Button, Divider } from '@mui/material'
import IosShareIcon from '@mui/icons-material/IosShare'
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined'
import CloseIcon from '@mui/icons-material/Close'
import { useTheme } from '@mui/material/styles'
import { useT } from '../../store/LanguageContext'
import { incrementVisit, shouldShowPwa, dismissPwa } from '../../utils/pwaInstall'

const Step = ({ icon, label }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
    <Box sx={{
      width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: 'action.hover',
    }}>
      {icon}
    </Box>
    <Typography variant="body2">{label}</Typography>
  </Box>
)

const IosPwaPrompt = () => {
  const t = useT()
  const theme = useTheme()
  const { pathname } = useLocation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    incrementVisit()
    if (shouldShowPwa()) setVisible(true)
  }, [pathname])

  const handleDismiss = () => {
    dismissPwa()
    setVisible(false)
  }

  return (
    <Slide direction="up" in={visible} mountOnEnter unmountOnExit>
      <Paper elevation={12} sx={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1400,
        borderRadius: '20px 20px 0 0',
        overflow: 'hidden',
        pb: 'env(safe-area-inset-bottom)',
      }}>
        {/* Header */}
        <Box sx={{
          px: 2.5, pt: 2.5, pb: 2,
          display: 'flex', alignItems: 'center', gap: 2,
        }}>
          <Box
            component="img"
            src="/icon-192.png"
            sx={{ width: 52, height: 52, borderRadius: '14px', flexShrink: 0 }}
          />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {t.pwa.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t.pwa.subtitle}
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleDismiss} sx={{ alignSelf: 'flex-start', mr: -0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Divider />

        {/* Steps */}
        <Box sx={{ px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Step
            icon={<IosShareIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />}
            label={t.pwa.step1}
          />
          <Step
            icon={<AddBoxOutlinedIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />}
            label={t.pwa.step2}
          />
        </Box>

        {/* CTA */}
        <Box sx={{ px: 2.5, pb: 2.5 }}>
          <Button fullWidth variant="contained" onClick={handleDismiss}>
            {t.pwa.cta}
          </Button>
        </Box>
      </Paper>
    </Slide>
  )
}

export default IosPwaPrompt
