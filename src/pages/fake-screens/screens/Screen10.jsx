// Screen 10 — Browser desktop (1920×1080): profilo mariorossi visto da desktop
import { useState } from 'react'
import {
  Box, Typography, Avatar, Paper, Button, Divider, IconButton,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ShareIcon from '@mui/icons-material/Share'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { getSurprises, getSurprise } from '../../../services/database.service'
import useDatabaseQuery from '../../../hooks/useDatabaseQuery'
import useProducerColors from '../useProducerColors'
import { FakeAuthProvider, FakeCollectionProvider } from '../FakeProviders'
import {
  MARIO_AUTH_USER, MARIO_PROFILE,
  FAKE_FEEDBACKS, AVG_RATING,
  VC259_ID, S556_ID, HPANI06_ID,
  VC259_FAKE_STATS, S556_FAKE_STATS, HPANI06_FAKE_STATS,
  applyFakeStats,
} from '../fakeData'
import PublicCollectionList from '../../../components/public/PublicCollectionList'
import FeedbackList from '../../../components/feedback/FeedbackList'
import EggRating from '../../../components/feedback/EggRating'
import { APP_NAME } from '../../../constants'

// Dimensioni app simulata (desktop ~1000px wide)
const APP_W = 1020
const APP_H = 660
const SCALE = 0.84
const FRAME_W = Math.round(APP_W * SCALE)  // ~857px
const FRAME_H = Math.round(APP_H * SCALE)  // ~554px

// Topbar statico (non fixed) per il frame desktop
const StaticTopbar = ({ username }) => {
  const theme = useTheme()
  return (
    <Box sx={{
      width: '100%', height: 56, display: 'flex', alignItems: 'center',
      px: 2.5, gap: 2, bgcolor: 'background.paper',
      borderBottom: `1px solid ${theme.palette.divider}`,
    }}>
      <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: 1 }}>{APP_NAME}</Typography>
      <Box sx={{ flex: 1 }} />
      <Avatar sx={{ width: 34, height: 34, bgcolor: theme.palette.secondary.container, color: theme.palette.secondary.onContainer, fontSize: 14, fontWeight: 700 }}>
        {username?.[0]?.toUpperCase()}
      </Avatar>
    </Box>
  )
}

// Layout profilo adatto al desktop (2 colonne, nessun fixed/Portal)
const DesktopProfileContent = ({ missing, doubles }) => {
  const [tab, setTab] = useState(0)
  const theme = useTheme()

  return (
    <Box sx={{ maxWidth: 980, mx: 'auto', px: 3, py: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 3, alignItems: 'flex-start' }}>

        {/* Left sidebar */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar sx={{ width: 52, height: 52, bgcolor: theme.palette.secondary.container, color: theme.palette.secondary.onContainer, fontSize: '1.4rem' }}>
              {MARIO_PROFILE.username[0].toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={700}>{MARIO_PROFILE.username}</Typography>
              <Typography variant="body2" color="text.secondary">Italia</Typography>
            </Box>
          </Box>

          <Box sx={{ textAlign: 'center', py: 2, mb: 2, bgcolor: theme.palette.secondary.container, borderRadius: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: theme.palette.secondary.onContainer, opacity: 0.7 }}>
              Punteggio uova
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <EggRating value={AVG_RATING} readOnly size="large" />
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.2, color: theme.palette.secondary.onContainer, mt: 0.5 }}>
              {AVG_RATING.toFixed(1)}
            </Typography>
            <Typography variant="caption" display="block" sx={{ color: theme.palette.secondary.onContainer, opacity: 0.7, mt: 0.25 }}>
              {FAKE_FEEDBACKS.length} recensioni
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Box sx={{ flex: 1, textAlign: 'center', py: 1.25, bgcolor: 'background.default', borderRadius: 2 }}>
              <Typography variant="h4" fontWeight={800} color="warning.main">{missing.length}</Typography>
              <Typography variant="caption" color="text.secondary">Mancanti</Typography>
            </Box>
            <Box sx={{ flex: 1, textAlign: 'center', py: 1.25, bgcolor: 'background.default', borderRadius: 2 }}>
              <Typography variant="h4" fontWeight={800} color="info.main">{doubles.length}</Typography>
              <Typography variant="caption" color="text.secondary">Doppi</Typography>
            </Box>
          </Box>

          <Button size="small" variant="outlined" startIcon={<ShareIcon />} fullWidth>
            Condividi profilo
          </Button>
        </Paper>

        {/* Right column */}
        <Box>
          <Paper elevation={0} sx={{ borderRadius: 3, p: 0.5, mb: 2, display: 'flex', gap: 0.5 }}>
            {[`Mancanti (${missing.length})`, `Doppi (${doubles.length})`, `Recensioni (${FAKE_FEEDBACKS.length})`].map((label, i) => (
              <Box
                key={i}
                onClick={() => setTab(i)}
                sx={{
                  flex: 1, textAlign: 'center', py: 0.75, borderRadius: 2.5, cursor: 'pointer',
                  bgcolor: tab === i ? theme.palette.secondary.container : 'transparent',
                  color: tab === i ? theme.palette.secondary.onContainer : 'text.secondary',
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: tab === i ? 700 : 400 }}>{label}</Typography>
              </Box>
            ))}
          </Paper>

          {tab === 0 && (
            <PublicCollectionList items={missing} isLoading={false} loginWallAfter={999} isLoggedIn emptyIcon={EmojiEventsIcon} emptyMessage="" />
          )}
          {tab === 1 && (
            <PublicCollectionList items={doubles} isLoading={false} loginWallAfter={999} isLoggedIn emptyIcon={AutoAwesomeIcon} emptyMessage="" />
          )}
          {tab === 2 && (
            <FeedbackList feedbacks={FAKE_FEEDBACKS} myUsername={MARIO_PROFILE.username} />
          )}
        </Box>

      </Box>
    </Box>
  )
}

const Screen10 = () => {
  const { data: seriesItems, loading: l1 } = useDatabaseQuery(() => getSurprises('Kinder_2026_001'), [])
  const { data: dbVC259,  loading: l2 } = useDatabaseQuery(() => getSurprise(VC259_ID),   [])
  const { data: dbS556,   loading: l3 } = useDatabaseQuery(() => getSurprise(S556_ID),    [])
  const { data: dbHPANI,  loading: l4 } = useDatabaseQuery(() => getSurprise(HPANI06_ID), [])

  const { producerColors, loading: l5 } = useProducerColors()
  const ready = !l1 && !l2 && !l3 && !l4 && !l5

  const vc259   = applyFakeStats(dbVC259, VC259_FAKE_STATS)
  const s556    = applyFakeStats(dbS556,  S556_FAKE_STATS)
  const hpani   = applyFakeStats(dbHPANI, HPANI06_FAKE_STATS)
  const extras  = (seriesItems || []).filter(i => i.id !== VC259_ID).slice(0, 11)
  const missing = [vc259, ...extras].filter(Boolean).slice(0, 14)
  const doubles = [s556, hpani, ...extras.slice(0, 4)].filter(Boolean).slice(0, 7)

  // Root = solo il frame, nessuno sfondo attorno (Puppeteer cattura con fullPage + omitBackground)
  return (
    <FakeAuthProvider user={MARIO_AUTH_USER}>
      <FakeCollectionProvider username="mariorossi" missing={missing} doubles={doubles} producerColors={producerColors}>
        <Box
          data-screen-ready={ready ? 'true' : undefined}
          sx={{
            display: 'inline-block',
            bgcolor: '#e0e0e0',
            borderRadius: '12px 12px 6px 6px',
            overflow: 'hidden',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.10)',
          }}
        >
          {/* Toolbar */}
          <Box sx={{ bgcolor: '#d4d4d4', px: 2, py: 0.75, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {['#FF5F57', '#FEBC2E', '#28C840'].map((c, i) => (
              <Box key={i} sx={{ width: 11, height: 11, bgcolor: c, borderRadius: '50%', flexShrink: 0 }} />
            ))}
            <Box sx={{
              flex: 1, mx: 2, px: 1.5, py: 0.4, bgcolor: '#fff', borderRadius: '5px',
              display: 'flex', alignItems: 'center', gap: 0.75,
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)',
            }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#28C840', flexShrink: 0 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.68rem' }}>
                surprix.app/u/mariorossi
              </Typography>
            </Box>
          </Box>

          {/* App content */}
          <Box sx={{ width: FRAME_W, height: FRAME_H, overflow: 'hidden', bgcolor: 'background.default' }}>
            <Box sx={{
              width: APP_W, height: APP_H,
              transform: `scale(${SCALE})`, transformOrigin: '0 0',
              bgcolor: 'background.default', overflow: 'hidden',
            }}>
              <StaticTopbar username="mariorossi" />
              <Box sx={{ height: APP_H - 56, overflowY: 'hidden' }}>
                <DesktopProfileContent missing={missing} doubles={doubles} />
              </Box>
            </Box>
          </Box>
        </Box>
      </FakeCollectionProvider>
    </FakeAuthProvider>
  )
}

export default Screen10
