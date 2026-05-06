import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Typography, CircularProgress, IconButton } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Topbar from '../../components/layout/Topbar'
import { getFeedbackFor } from '../../services/database.service'
import { useT } from '../../store/LanguageContext'
import FeedbackList from '../../components/feedback/FeedbackList'

const AllReviewsPage = () => {
  const { username } = useParams()
  const navigate = useNavigate()
  const t = useT()
  const [feedbacks, setFeedbacks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFeedbackFor(username)
      .then(setFeedbacks)
      .finally(() => setLoading(false))
  }, [username])

  return (
    <Box>
      <Topbar />
      <Box sx={{ height: { xs: 'calc(56px + env(safe-area-inset-top))', sm: 'calc(64px + env(safe-area-inset-top))' } }} />
    <Box sx={{ maxWidth: 600, mx: 'auto', pb: 6, px: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
        <IconButton onClick={() => navigate(`/u/${username}`)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight={700}>
          {t.feedback.viewAll} — {username}
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <FeedbackList feedbacks={feedbacks} />
      )}
    </Box>
    </Box>
  )
}

export default AllReviewsPage
