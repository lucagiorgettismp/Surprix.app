import { Box, Container, Typography } from '@mui/material'
import { useLanguage, useT } from '../../store/LanguageContext'
import { getPolicy } from '../../constants/policy'
import AppLogo from '../../components/common/AppLogo'
import PublicFooter from '../../components/layout/PublicFooter'

const PrivacyPage = () => {
  const { lang } = useLanguage()
  const t = useT()

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <Container maxWidth="sm" sx={{ flex: 1, py: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
          <AppLogo size={56} />
        </Box>
        <Typography variant="h6" gutterBottom>{t.policy.title}</Typography>
        <Box
          sx={{ typography: 'body2', color: 'text.secondary', '& div': { mb: 1 }, '& p': { mb: 1 } }}
          dangerouslySetInnerHTML={{ __html: getPolicy(lang) }}
        />
      </Container>
      <PublicFooter />
    </Box>
  )
}

export default PrivacyPage
