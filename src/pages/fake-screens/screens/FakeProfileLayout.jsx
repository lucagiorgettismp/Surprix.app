/**
 * Shared profile layout for Screens 01, 02, 08, 09.
 * Renders PublicProfilePage-equivalent with injected fake data.
 */
import { useState } from 'react'
import {
  Box, Avatar, Typography, Button, Paper, Divider,
  IconButton,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ShareIcon from '@mui/icons-material/Share'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import Topbar from '../../../components/layout/Topbar'
import PublicCollectionList from '../../../components/public/PublicCollectionList'
import FeedbackList from '../../../components/feedback/FeedbackList'
import EggRating from '../../../components/feedback/EggRating'
import { FakeAuthProvider, FakeCollectionProvider } from '../FakeProviders'
import {
  MARIO_AUTH_USER, MARIO_PROFILE, FAKE_FEEDBACKS, AVG_RATING,
} from '../fakeData'

const TOPBAR_H = { xs: 56, sm: 64 }

const ProfileContent = ({
  profile,
  missing,
  doubles,
  feedbacks,
  avgRating,
  initialTab,
  isLoggedIn,
  isSelf,
}) => {
  const [tab, setTab] = useState(initialTab ?? 0)
  const theme = useTheme()

  return (
    <Box>
      <Topbar />
      <Box sx={{ height: TOPBAR_H }} />

      {/* Sub-header */}
      <Box sx={{
        position: 'fixed',
        top: TOPBAR_H,
        left: 0, right: 0,
        height: 56,
        bgcolor: 'background.paper',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1,
        zIndex: 10,
      }}>
        <IconButton size="small"><ArrowBackIcon /></IconButton>
        <Typography variant="h6" fontWeight={700} noWrap>{profile.username}</Typography>
      </Box>
      <Box sx={{ height: 56 }} />

      <Box sx={{ maxWidth: { xs: 600, md: 980 }, mx: 'auto', pb: 6, px: 2, mt: 1 }}>
        <Box sx={{ display: { md: 'grid' }, gridTemplateColumns: { md: '300px 1fr' }, gap: { md: 3 }, alignItems: 'flex-start' }}>

          {/* Left sidebar */}
          <Box>
            <Paper elevation={0} sx={{ p: 3, mb: 2, borderRadius: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ width: 56, height: 56, bgcolor: theme.palette.secondary.container, color: theme.palette.secondary.onContainer, fontSize: '1.5rem' }}>
                  {profile.username?.[0]?.toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" fontWeight={700}>{profile.username}</Typography>
                  <Typography variant="body2" color="text.secondary">Italia</Typography>
                </Box>
              </Box>

              {/* Egg rating box */}
              <Box sx={{ textAlign: 'center', py: 2.5, mb: 2, bgcolor: theme.palette.secondary.container, borderRadius: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: theme.palette.secondary.onContainer, opacity: 0.7 }}>
                  Punteggio uova
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <EggRating value={avgRating} readOnly size="large" />
                </Box>
                {feedbacks.length > 0 && (
                  <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.2, color: theme.palette.secondary.onContainer, mt: 0.5 }}>
                    {avgRating.toFixed(1)}
                  </Typography>
                )}
                <Typography variant="caption" display="block" sx={{ color: theme.palette.secondary.onContainer, opacity: 0.7, mt: 0.5 }}>
                  {feedbacks.length} recensioni
                </Typography>
              </Box>

              {/* Counters */}
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Box sx={{ flex: 1, textAlign: 'center', py: 1.5, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 800 }} color="warning.main">{missing.length}</Typography>
                  <Typography variant="caption" color="text.secondary">Mancanti</Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center', py: 1.5, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 800 }} color="info.main">{doubles.length}</Typography>
                  <Typography variant="caption" color="text.secondary">Doppi</Typography>
                </Box>
              </Box>

              {isSelf && (
                <Button size="small" variant="outlined" startIcon={<ShareIcon />} fullWidth>
                  Condividi profilo
                </Button>
              )}
              {isLoggedIn && !isSelf && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" variant="outlined">Scrivi</Button>
                  <Button size="small" variant="outlined">Recensisci</Button>
                </Box>
              )}
              {!isLoggedIn && (
                <Button size="small" variant="contained" fullWidth>
                  Accedi per scambiare
                </Button>
              )}
            </Paper>
          </Box>

          {/* Right column */}
          <Box>
            {/* Tabs */}
            <Paper elevation={0} sx={{ borderRadius: 3, p: 0.5, mb: 2, display: 'flex', gap: 0.5 }}>
              {[
                `Mancanti (${missing.length})`,
                `Doppi (${doubles.length})`,
                `Recensioni (${feedbacks.length})`,
              ].map((label, i) => (
                <Box
                  key={i}
                  onClick={() => setTab(i)}
                  sx={{
                    flex: 1, textAlign: 'center', py: 0.75, borderRadius: 2.5,
                    bgcolor: tab === i ? theme.palette.secondary.container : 'transparent',
                    color: tab === i ? theme.palette.secondary.onContainer : 'text.secondary',
                    cursor: 'pointer', transition: 'background-color 0.2s', userSelect: 'none',
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: tab === i ? 700 : 400 }}>{label}</Typography>
                </Box>
              ))}
            </Paper>

            {tab === 0 && (
              <PublicCollectionList
                items={missing}
                isLoading={false}
                loginWallAfter={5}
                isLoggedIn={isLoggedIn}
                emptyIcon={EmojiEventsIcon}
                emptyMessage="Nessun mancante"
              />
            )}
            {tab === 1 && (
              <PublicCollectionList
                items={doubles}
                isLoading={false}
                loginWallAfter={5}
                isLoggedIn={isLoggedIn}
                emptyIcon={AutoAwesomeIcon}
                emptyMessage="Nessun doppio"
              />
            )}
            {tab === 2 && (
              <FeedbackList feedbacks={feedbacks} myUsername={isSelf ? profile.username : null} />
            )}

            {!isLoggedIn && (
              <Box sx={{ textAlign: 'center', mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Crea un account gratuito per vedere tutte le liste e scambiare!
                </Typography>
                <Button variant="contained">Crea account</Button>
              </Box>
            )}
          </Box>

        </Box>
      </Box>
    </Box>
  )
}

const FakeProfileScreen = ({
  missing = [],
  doubles = [],
  feedbacks = FAKE_FEEDBACKS,
  avgRating = AVG_RATING,
  initialTab = 0,
  isLoggedIn = true,
  isSelf = true,
  producerColors = {},
}) => {
  const user = isLoggedIn ? MARIO_AUTH_USER : null
  const username = isLoggedIn ? MARIO_PROFILE.username : null

  return (
    <FakeAuthProvider user={user}>
      <FakeCollectionProvider username={username} missing={missing} doubles={doubles} producerColors={producerColors}>
        <ProfileContent
          profile={MARIO_PROFILE}
          missing={missing}
          doubles={doubles}
          feedbacks={feedbacks}
          avgRating={avgRating}
          initialTab={initialTab}
          isLoggedIn={isLoggedIn}
          isSelf={isSelf}
        />
      </FakeCollectionProvider>
    </FakeAuthProvider>
  )
}

export default FakeProfileScreen
