import { useState } from 'react'
import { Box, Typography, Link } from '@mui/material'
import FacebookIcon from '@mui/icons-material/Facebook'
import { useT } from '../../store/LanguageContext'
import PolicyDialog from '../common/PolicyDialog'
import TosDialog from '../common/TosDialog'
import { FACEBOOK_URL, CONTACT_EMAIL } from '../../constants'

const PublicFooter = () => {
  const t = useT()
  const [policyOpen, setPolicyOpen] = useState(false)
  const [tosOpen, setTosOpen] = useState(false)

  const reportSubject = encodeURIComponent('Segnalazione problema Surprix')

  return (
    <Box component="footer" sx={{ py: 3, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Link component="button" variant="caption" color="text.secondary" underline="hover" onClick={() => setPolicyOpen(true)}>
          {t.policy.title}
        </Link>
        <Link component="button" variant="caption" color="text.secondary" underline="hover" onClick={() => setTosOpen(true)}>
          {t.tos.title}
        </Link>
        <Link href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" variant="caption" color="text.secondary" underline="hover" sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <FacebookIcon sx={{ fontSize: 14 }} />
          Facebook
        </Link>
        <Link component="button" variant="caption" color="text.secondary" underline="hover"
          onClick={() => { window.location.href = `mailto:${CONTACT_EMAIL}?subject=${reportSubject}` }}>
          {t.common.reportIssue}
        </Link>
      </Box>
      <Typography variant="caption" color="text.disabled">
        © {new Date().getFullYear()} Surprix · v{__APP_VERSION__}
      </Typography>
      <PolicyDialog open={policyOpen} onClose={() => setPolicyOpen(false)} />
      <TosDialog open={tosOpen} onClose={() => setTosOpen(false)} />
    </Box>
  )
}

export default PublicFooter
