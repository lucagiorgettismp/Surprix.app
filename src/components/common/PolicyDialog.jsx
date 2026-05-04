import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box } from '@mui/material'
import { useT, useLanguage } from '../../store/LanguageContext'
import { getPolicy } from '../../constants/policy'

const PolicyDialog = ({ open, onClose }) => {
  const t = useT()
  const { lang } = useLanguage()

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle>{t.policy.title}</DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{ typography: 'body2', color: 'text.secondary', '& div': { mb: 1 }, '& p': { mb: 1 } }}
          dangerouslySetInnerHTML={{ __html: getPolicy(lang) }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t.policy.close}</Button>
      </DialogActions>
    </Dialog>
  )
}

export default PolicyDialog
