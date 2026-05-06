import { useState, useEffect } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography, CircularProgress } from '@mui/material'
import { addFeedback, updateFeedback } from '../../services/database.service'
import { useT } from '../../store/LanguageContext'
import EggRating from './EggRating'

const LeaveFeedbackDialog = ({ open, onClose, onSuccess, targetUsername, fromUsername, reviewId, initialRating, initialComment }) => {
  const t = useT()
  const isEdit = !!reviewId
  const [rating, setRating] = useState(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setRating(isEdit ? initialRating : null)
    setComment(isEdit ? (initialComment || '') : '')
  }, [open])

  const handleSubmit = async () => {
    if (!rating) return
    setLoading(true)
    try {
      if (isEdit) await updateFeedback(targetUsername, reviewId, rating, comment)
      else await addFeedback(targetUsername, fromUsername, rating, comment)
      onSuccess?.()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{isEdit ? t.feedback.editTitle : t.feedback.title}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Box sx={{ textAlign: 'center', bgcolor: 'background.default', borderRadius: 2, py: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t.feedback.eggScore}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 0.5 }}>
              <EggRating value={rating} onChange={(_, v) => setRating(v)} size="large" precision={1} />
            </Box>
            <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>
              {t.feedback.ratingLow} · {t.feedback.ratingHigh}
            </Typography>
          </Box>
          <TextField
            label={t.feedback.comment}
            multiline
            minRows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 200))}
            helperText={`${comment.length}/200`}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t.common.cancel}</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!rating || loading}>
          {loading ? <CircularProgress size={20} /> : t.feedback.submit}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default LeaveFeedbackDialog
