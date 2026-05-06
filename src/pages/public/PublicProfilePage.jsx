import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Box, Avatar, Typography, CircularProgress, Button, Divider, Paper, IconButton } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ShareIcon from '@mui/icons-material/Share'
import Topbar from '../../components/layout/Topbar'
import PublicFooter from '../../components/layout/PublicFooter'
import { getUserProfile, getPublicMissing, getPublicDoubles, getFeedbackFor, getChatId } from '../../services/database.service'
import { useAuth } from '../../store/AuthContext'
import { useCollection } from '../../store/CollectionContext'
import { useT, useLanguage } from '../../store/LanguageContext'
import { useSnackbar } from '../../store/SnackbarContext'
import { usePageMeta } from '../../hooks/usePageMeta'
import { getCountryName } from '../../utils/locale'
import PublicCollectionList from '../../components/public/PublicCollectionList'
import FeedbackList from '../../components/feedback/FeedbackList'
import EggRating from '../../components/feedback/EggRating'
import LeaveFeedbackDialog from '../../components/feedback/LeaveFeedbackDialog'

const LOGIN_WALL_AFTER = 10
const REVIEWS_PAGE_SIZE = 5

const PublicProfilePage = () => {
  const { username: profileUsername } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const canGoBack = location.key !== 'default'
  const { user } = useAuth()
  const { username: myUsername } = useCollection()
  const t = useT()
  const { lang } = useLanguage()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [tab, setTab] = useState(0)
  const [profile, setProfile] = useState(null)
  const [missing, setMissing] = useState([])
  const [doubles, setDoubles] = useState([])
  const [feedbacks, setFeedbacks] = useState([])
  const [visibleReviews, setVisibleReviews] = useState(REVIEWS_PAGE_SIZE)
  const [loading, setLoading] = useState(true)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [editingReview, setEditingReview] = useState(null)

  const isLoggedIn = !!user
  const isSelf = myUsername === profileUsername
  const { showSnackbar } = useSnackbar()

  const handleShare = async () => {
    const url = `${window.location.origin}/u/${profileUsername}`
    if (navigator.share) {
      await navigator.share({ title: `Lista di ${profileUsername} su Surprix`, url })
    } else {
      await navigator.clipboard.writeText(url)
      showSnackbar(t.common.linkCopied)
    }
  }

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

  const metaDesc = profile
    ? `${profile.username} ha ${missing.length} mancanti e ${doubles.length} doppi su Surprix${avgRating ? `. Punteggio uova: ${avgRating.toFixed(1)}/5` : ''}.`
    : undefined

  usePageMeta({
    title: profile ? `${profile.username} — Surprix` : undefined,
    description: metaDesc,
    url: profile ? `https://surprix.app/u/${profile.username}` : undefined,
    type: 'profile',
  })

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
    <Box>
      <Topbar />
      <Box sx={{ height: { xs: 'calc(56px + env(safe-area-inset-top))', sm: 'calc(64px + env(safe-area-inset-top))' } }} />

      {/* Page header */}
      <Box sx={{
        position: 'fixed',
        top: { xs: 'calc(56px + env(safe-area-inset-top))', sm: 'calc(64px + env(safe-area-inset-top))' },
        left: 0, right: 0,
        height: '56px',
        bgcolor: isDark ? '#111111' : 'primary.main',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1,
        zIndex: 10,
      }}>
        <IconButton onClick={() => canGoBack ? navigate(-1) : navigate('/', { replace: true })} sx={{ color: 'inherit' }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight={700} noWrap>
          {profile.username}
        </Typography>
      </Box>
      <Box sx={{ height: '56px' }} />

    <Box sx={{ maxWidth: 600, mx: 'auto', pb: 6, px: 2, mt: 1 }}>
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
          </Box>
        </Box>

        {/* Rating */}
        <Box sx={{ textAlign: 'center', py: 1.5, mb: 2, bgcolor: 'background.default', borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t.feedback.eggScore}
          </Typography>
          <Box sx={{ mt: 0.5 }}>
            <EggRating value={avgRating} readOnly size="large" />
          </Box>
          {feedbacks.length > 0 && (
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              {avgRating.toFixed(1)}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" display="block">
            {t.feedback.reviewCount(feedbacks.length)}
          </Typography>
        </Box>

        {/* Counters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Box sx={{ flex: 1, textAlign: 'center', py: 1.5, bgcolor: 'background.default', borderRadius: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }} color="warning.main">{missing.length}</Typography>
            <Typography variant="caption" color="text.secondary">{t.missing.title}</Typography>
          </Box>
          <Box sx={{ flex: 1, textAlign: 'center', py: 1.5, bgcolor: 'background.default', borderRadius: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }} color="info.main">{doubles.length}</Typography>
            <Typography variant="caption" color="text.secondary">{t.doubles.title}</Typography>
          </Box>
        </Box>

        {isLoggedIn && !isSelf && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" onClick={() => navigate(`/chat/${getChatId(myUsername, profileUsername)}`, { state: { with: profileUsername } })}>
              {t.chat.startChat}
            </Button>
            <Button size="small" variant="outlined" onClick={() => setFeedbackOpen(true)}>
              {t.feedback.title}
            </Button>
          </Box>
        )}
        {isSelf && (
          <Button size="small" variant="outlined" startIcon={<ShareIcon />} onClick={handleShare} fullWidth>
            {t.common.shareList}
          </Button>
        )}
      </Paper>

      {/* Tabs */}
      <Paper elevation={0} sx={{ borderRadius: 3, p: 0.5, mb: 2, display: 'flex', gap: 0.5 }}>
        {[
          `${t.missing.title} (${missing.length})`,
          `${t.doubles.title} (${doubles.length})`,
          `${t.feedback.reviews} (${feedbacks.length})`,
        ].map((label, i) => (
          <Box
            key={i}
            onClick={() => setTab(i)}
            sx={{
              flex: 1,
              textAlign: 'center',
              py: 0.75,
              borderRadius: 2.5,
              bgcolor: tab === i ? (isDark ? 'primary.dark' : 'primary.main') : 'transparent',
              color: tab === i ? 'white' : 'text.secondary',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              userSelect: 'none',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: tab === i ? 700 : 400 }}>
              {label}
            </Typography>
          </Box>
        ))}
      </Paper>

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
            feedbacks={feedbacks.slice(0, visibleReviews)}
            myUsername={myUsername}
            onEdit={(fb) => setEditingReview(fb)}
          />
          {feedbacks.length > visibleReviews && (
            <>
              <Divider sx={{ my: 1 }} />
              <Button fullWidth onClick={() => setVisibleReviews((v) => v + REVIEWS_PAGE_SIZE)}>
                {t.feedback.loadMore}
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

      <PublicFooter />

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
    </Box>
  )
}

export default PublicProfilePage
