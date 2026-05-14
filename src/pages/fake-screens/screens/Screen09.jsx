// Screen 09 — Recensione dettaglio (giuliaverdi → mariorossi, 5 uova, commento esteso)
import { Box, Avatar, Paper, Typography, Divider } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { FakeAuthProvider, FakeCollectionProvider } from '../FakeProviders'
import { MARIO_AUTH_USER, MARIO_PROFILE, AVG_RATING, FAKE_FEEDBACKS } from '../fakeData'
import Topbar from '../../../components/layout/Topbar'
import FakeBottomNav from '../FakeBottomNav'
import EggRating from '../../../components/feedback/EggRating'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { IconButton } from '@mui/material'

const EXTENDED_REVIEW = {
  id: 'fb1',
  from: 'giuliaverdi',
  rating: 5,
  comment:
    'Ottimo collezionista, ci riscambierei senza dubbio! Molto disponibile nella comunicazione, ha spedito appena ci siamo accordati. La sorpresina era perfettamente imballata e arrivata in ottime condizioni. Lo consiglio a tutti i collezionisti — è una persona seria e affidabile.',
  createdAt: new Date('2026-05-10').getTime(),
}

const Inner = () => {
  const theme = useTheme()

  return (
    <Box>
      <Topbar />
      <Box sx={{ height: { xs: 56, sm: 64 } }} />

      {/* Sub-header */}
      <Box sx={{
        position: 'fixed',
        top: { xs: 56, sm: 64 },
        left: 0, right: 0,
        height: 56,
        bgcolor: 'background.paper',
        display: 'flex', alignItems: 'center', gap: 1, px: 1, zIndex: 10,
      }}>
        <IconButton size="small"><ArrowBackIcon /></IconButton>
        <Typography variant="h6" fontWeight={700} noWrap>Recensione</Typography>
      </Box>
      <Box sx={{ height: 56 }} />

      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pb: 10 }}>
        {/* Profile summary */}
        <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Avatar sx={{ width: 48, height: 48, bgcolor: theme.palette.secondary.container, color: theme.palette.secondary.onContainer, fontSize: '1.25rem', fontWeight: 700 }}>
            M
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700}>{MARIO_PROFILE.username}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EggRating value={AVG_RATING} readOnly size="small" />
              <Typography variant="caption" color="text.secondary">
                {AVG_RATING.toFixed(1)} · {FAKE_FEEDBACKS.length} recensioni
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Featured review */}
        <Paper elevation={2} sx={{ p: 3, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', color: 'white', width: 44, height: 44, fontSize: '1.1rem', fontWeight: 700 }}>
              G
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body1" fontWeight={700}>{EXTENDED_REVIEW.from}</Typography>
              <EggRating value={EXTENDED_REVIEW.rating} readOnly size="medium" />
            </Box>
            <Typography variant="caption" color="text.disabled">
              {new Date(EXTENDED_REVIEW.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Typography>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Typography variant="body1" color="text.primary" sx={{ lineHeight: 1.6 }}>
            "{EXTENDED_REVIEW.comment}"
          </Typography>


        </Paper>

        {/* Other reviews preview */}
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 3, mb: 1 }}>
          Altre {FAKE_FEEDBACKS.length - 1} recensioni
        </Typography>
        {FAKE_FEEDBACKS.slice(1, 3).map(fb => (
          <Paper key={fb.id} elevation={0} sx={{ p: 2, mb: 1.5, borderRadius: 2, display: 'flex', gap: 1.5, alignItems: 'flex-start', opacity: 0.6 }}>
            <Avatar sx={{ bgcolor: 'secondary.main', color: 'white', width: 32, height: 32, fontSize: '0.8rem' }}>
              {fb.from[0].toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                <Typography variant="body2" fontWeight={700}>{fb.from}</Typography>
                <EggRating value={fb.rating} readOnly size="small" />
              </Box>
              <Typography variant="caption" color="text.secondary">{fb.comment}</Typography>
            </Box>
          </Paper>
        ))}
      </Box>

      <FakeBottomNav />
    </Box>
  )
}

const Screen09 = () => (
  <Box data-screen-ready="true" sx={{ minHeight: '100dvh' }}>
    <FakeAuthProvider user={MARIO_AUTH_USER}>
      <FakeCollectionProvider username="mariorossi" missing={[]} doubles={[]}>
        <Inner />
      </FakeCollectionProvider>
    </FakeAuthProvider>
  </Box>
)

export default Screen09
