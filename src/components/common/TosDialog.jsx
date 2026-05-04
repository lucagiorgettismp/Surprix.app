import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box } from '@mui/material'
import { useT, useLanguage } from '../../store/LanguageContext'
import { getTos } from '../../constants/tos'

const TosDialog = ({ open, onClose }) => {
  const t = useT()
  const { lang } = useLanguage()

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle>{t.tos.title}</DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{ typography: 'body2', color: 'text.secondary', '& div': { mb: 1 }, '& p': { mb: 1 }, '& ul': { pl: 2.5, mb: 1 }, '& li': { mb: 0.5 } }}
          dangerouslySetInnerHTML={{ __html: getTos(lang) }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t.policy.close}</Button>
      </DialogActions>
    </Dialog>
  )
}

export default TosDialog
