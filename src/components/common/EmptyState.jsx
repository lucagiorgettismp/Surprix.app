import { Box, Typography, Button } from '@mui/material'
import InboxIcon from '@mui/icons-material/Inbox'

const EmptyState = ({ message, hint, action, icon: IconComponent = InboxIcon }) => (
  <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary', px: 3 }}>
    <IconComponent sx={{ fontSize: 64, mb: 2, opacity: 0.35 }} />
    <Typography variant="body1" sx={{ fontWeight: 600 }}>{message || 'Nessun elemento trovato.'}</Typography>
    {hint && (
      <Typography variant="body2" color="text.disabled" sx={{ mt: 1, maxWidth: 320, mx: 'auto' }}>
        {hint}
      </Typography>
    )}
    {action && (
      <Button variant="contained" onClick={action.onClick} sx={{ mt: 3 }}>
        {action.label}
      </Button>
    )}
  </Box>
)

export default EmptyState
