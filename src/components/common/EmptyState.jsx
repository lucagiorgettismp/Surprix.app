import { Box, Typography, Button } from '@mui/material'
import InboxIcon from '@mui/icons-material/Inbox'

const EmptyState = ({ message, hint, action }) => (
  <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary', px: 3 }}>
    <InboxIcon sx={{ fontSize: 64, mb: 2, opacity: 0.4 }} />
    <Typography variant="body1">{message || 'Nessun elemento trovato.'}</Typography>
    {hint && (
      <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
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
