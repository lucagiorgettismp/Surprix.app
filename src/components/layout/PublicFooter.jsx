import { useState } from 'react'
import { Box, Typography, Link } from '@mui/material'
import { useT } from '../../store/LanguageContext'
import PolicyDialog from '../common/PolicyDialog'
import TosDialog from '../common/TosDialog'

const PublicFooter = () => {
  const t = useT()
  const [policyOpen, setPolicyOpen] = useState(false)
  const [tosOpen, setTosOpen] = useState(false)

  return (
    <Box component="footer" sx={{ py: 3, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Link component="button" variant="caption" color="text.secondary" underline="hover" onClick={() => setPolicyOpen(true)}>
          {t.policy.title}
        </Link>
        <Link component="button" variant="caption" color="text.secondary" underline="hover" onClick={() => setTosOpen(true)}>
          {t.tos.title}
        </Link>
        <Link component="button" onClick={() => { window.location.href = 'mailto:info.surprix@gmail.com' }} variant="caption" color="text.secondary" underline="hover">
          info.surprix@gmail.com
        </Link>
      </Box>
      <Typography variant="caption" color="text.disabled">
        © {new Date().getFullYear()} Surprix
      </Typography>
      <PolicyDialog open={policyOpen} onClose={() => setPolicyOpen(false)} />
      <TosDialog open={tosOpen} onClose={() => setTosOpen(false)} />
    </Box>
  )
}

export default PublicFooter
