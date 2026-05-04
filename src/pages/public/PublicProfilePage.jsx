import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Avatar, Typography, Tab, Tabs, CircularProgress, Button, Divider, Paper } from '@mui/material'
import { getUserProfile, getPublicMissing, getPublicDoubles, getFeedbackFor } from '../../services/database.service'
import { useAuth } from '../../store/AuthContext'
import { useCollection } from '../../store/CollectionContext'
import { useT, useLanguage } from '../../store/LanguageContext'
import { getCountryName } from '../../utils/locale'
import PublicCollectionList from '../../components/public/PublicCollectionList'
import FeedbackList from '../../components/feedback/FeedbackList'
import EggRating from '../../components/feedback/EggRating'
import LeaveFeedbackDialog from '../../components/feedback/LeaveFeedbackDialog'

const LOGIN_WALL_AFTER = 10
const REVIEWS_PREVIEW = 5

const PublicProfilePage = () => {
  const { username: profileUsername } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { username: myUsername } = useCollection()
  const t = useT()
  const { lang } = useLanguage()

  const [tab, setTab] = useState(0)
  const [profile, setProfile] = useState(null)
  const [missing, setMissing] = useState([])
  const [doubles, setDoubles] = useState([])
  const [feedbacks, setFeedbacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [editingReview, setEditingReview] = useState(null)

  const isLoggedIn = !!user
  const isSelf = myUsername === profileUsername

  useEffect(() => {
    Promise.allSettled([
      getUserProfile(profileUsername),
      getPublicMissing(profileUsername),
      getPublicDoubles(profileUsername),
      getFeedbackFor(profileUsername),
    ])
      .then(([p, m, d, f]) => {
        setProfile(p.status === 'fulfilled' ? p.value : null)
        setMissing(m.status === 'fulfilled' ? m.value : [])
        setDoubles(d.status === 'fulfilled' ? d.value : [])
        setFeedbacks(f.status === 'fulfilled' ? f.value : [])
      })
      .finally(() => setLoading(false))
  }, [profileUsername])

  const avgRating = useMemo(() => {
    if (!feedbacks.length) return 0
    return feedbacks.reduce((sum, fb) => sum + fb.rating, 0) / feedbacks.length
  }, [feedbacks])

  useEffect(() => {
    if (!profile) return
    document.title = `${profile.username} — Surprix`
    const desc = `Lista mancanti e doppi di ${profile.username} su Surprix`
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', document.title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', desc)
    return () => { document.title = 'Surprix' }
  }, [profile])

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}>
      <CircularProgress />
    </Box>
  )

  if (!profile) return (
    <Box sx={{ textAlign: 'center', pt: 10 }}>
      <Typography color="text.secondary">Utente non trovato.</Typography>
    </Box>
  )

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', pb: 6 }}>
      {/* Header */}
      <Paper elevation={0} sx={{ p: 3, mb: 2, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: '1.5rem' }}>
            {profile.username?.[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={700}>{profile.username}</Typography>
            {profile.country && (
              <Typography variant="body2" color="text.secondary">
                {getCountryName(profile.country, lang)}
              </Typography>
            )}
            {feedbacks.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <EggRating value={avgRating} readOnly size="small" />
                <Typography variant="caption" color="text.secondary">
                  ({feedbacks.length})
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {isLoggedIn && !isSelf && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" onClick={() => setFeedbackOpen(true)}>
              {t.feedback.title}
            </Button>
          </Box>
        )}
      </Paper>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`${t.missing.title} (${missing.length})`} />
        <Tab label={`${t.doubles.title} (${doubles.length})`} />
        <Tab label={`${t.feedback.title} (${feedbacks.length})`} />
      </Tabs>

      {tab === 0 && (
        <PublicCollectionList
          items={missing}
          isLoading={false}
          loginWallAfter={LOGIN_WALL_AFTER}
          isLoggedIn={isLoggedIn}
        />
      )}

      {tab === 1 && (
        <PublicCollectionList
          items={doubles}
          isLoading={false}
          loginWallAfter={LOGIN_WALL_AFTER}
          isLoggedIn={isLoggedIn}
        />
      )}

      {tab === 2 && (
        <Box>
          <FeedbackList
            feedbacks={feedbacks}
            limit={REVIEWS_PREVIEW}
            myUsername={myUsername}
            onEdit={(fb) => setEditingReview(fb)}
          />
          {feedbacks.length > REVIEWS_PREVIEW && (
            <>
              <Divider sx={{ my: 1 }} />
              <Button fullWidth onClick={() => navigate(`/u/${profileUsername}/reviews`)}>
                {t.feedback.viewAll}
              </Button>
            </>
          )}
        </Box>
      )}

      {/* Footer CTA */}
      {!isLoggedIn && (
        <Box sx={{ textAlign: 'center', mt: 6, p: 3, bgcolor: 'background.paper', borderRadius: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t.public.joinCta}
          </Typography>
          <Button variant="contained" onClick={() => navigate('/signup')}>
            {t.public.createAccount}
          </Button>
        </Box>
      )}

      <LeaveFeedbackDialog
        open={feedbackOpen || !!editingReview}
        onClose={() => { setFeedbackOpen(false); setEditingReview(null) }}
        onSuccess={() => getFeedbackFor(profileUsername).then(setFeedbacks)}
        targetUsername={profileUsername}
        fromUsername={myUsername}
        reviewId={editingReview?.id}
        initialRating={editingReview?.rating}
        initialComment={editingReview?.comment}
      />
    </Box>
  )
}

export default PublicProfilePage
