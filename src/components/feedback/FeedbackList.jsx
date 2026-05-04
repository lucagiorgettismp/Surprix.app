import { Avatar, Box, Divider, Typography, IconButton } from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { useT } from '../../store/LanguageContext'
import EggRating from './EggRating'

const FeedbackList = ({ feedbacks, limit, myUsername, onEdit }) => {
  const t = useT()
  const items = limit ? feedbacks.slice(0, limit) : feedbacks

  if (!items.length) return (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <Typography color="text.secondary">{t.feedback.noFeedback}</Typography>
    </Box>
  )

  return (
    <Box>
      {items.map((fb, i) => (
        <Box key={fb.id}>
          <Box sx={{ display: 'flex', gap: 2, py: 1.5, alignItems: 'flex-start' }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: '0.9rem' }}>
              {fb.from?.[0]?.toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="body2" fontWeight={600}>{fb.from}</Typography>
                <EggRating value={fb.rating} readOnly size="small" />
                {myUsername && fb.from === myUsername && onEdit && (
                  <IconButton size="small" onClick={() => onEdit(fb)} sx={{ ml: 'auto' }}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
              {fb.comment && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  {fb.comment}
                </Typography>
              )}
              <Typography variant="caption" color="text.disabled">
                {new Date(fb.createdAt).toLocaleDateString()}
                {fb.updatedAt && ` · ${t.feedback.edited}`}
              </Typography>
            </Box>
          </Box>
          {i < items.length - 1 && <Divider />}
        </Box>
      ))}
    </Box>
  )
}

export default FeedbackList
