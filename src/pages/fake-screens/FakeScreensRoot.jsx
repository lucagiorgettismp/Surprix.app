import { lazy, Suspense } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { Box, Typography, List, ListItem, ListItemButton, Chip } from '@mui/material'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const Screen01 = lazy(() => import('./screens/Screen01'))
const Screen02 = lazy(() => import('./screens/Screen02'))
const Screen03 = lazy(() => import('./screens/Screen03'))
const Screen04 = lazy(() => import('./screens/Screen04'))
const Screen05 = lazy(() => import('./screens/Screen05'))
const Screen06 = lazy(() => import('./screens/Screen06'))
const Screen07 = lazy(() => import('./screens/Screen07'))
const Screen08 = lazy(() => import('./screens/Screen08'))
const Screen10 = lazy(() => import('./screens/Screen10'))

const SCREENS = [
  { id: '01', label: 'Profilo completo', sub: 'mariorossi • logged in • self • mancanti' },
  { id: '02', label: 'Profilo da browser', sub: 'non loggato • login wall visibile' },
  { id: '03', label: 'Lista mancanti', sub: 'Kinder 2026 • VC259 + random' },
  { id: '04', label: 'Lista doppi', sub: 'S-556 Winx + HPANI_06 + altri' },
  { id: '05', label: 'Selezione multipla', sub: 'Kinder_2026_001 • 5 selezionati • FAB visibile' },
  { id: '06', label: 'Dettaglio serie', sub: 'Kinder_2026_002 — grid completo con mancanti' },
  { id: '07', label: 'Chat conversazione', sub: 'mariorossi ↔ giuliaverdi • 4 messaggi' },
  { id: '08', label: 'Recensioni profilo', sub: 'mariorossi • tab recensioni' },
  { id: '10', label: 'Device: Desktop', sub: 'browser chrome + profilo mariorossi (16:9 desktop)' },
]

const IndexPage = () => (
  <Box sx={{ p: 3, maxWidth: 600 }}>
    <Typography variant="h4" fontWeight={800} gutterBottom>🎬 Fake Screens</Typography>
    <Typography variant="body2" color="text.secondary" gutterBottom>
      Solo in development. Cattura con: <code>node scripts/capture-screens.js</code>
    </Typography>
    <List disablePadding sx={{ mt: 2 }}>
      {SCREENS.map(s => (
        <ListItem key={s.id} disablePadding sx={{ mb: 1 }}>
          <ListItemButton
            component={Link}
            to={`/fake-screens/${s.id}`}
            sx={{ borderRadius: 2, bgcolor: 'background.paper', '&:hover': { bgcolor: 'action.hover' } }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label={s.id} size="small" color="primary" variant="outlined" sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
                <Typography variant="body1" fontWeight={600}>{s.label}</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">{s.sub}</Typography>
            </Box>
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  </Box>
)

const FakeScreensRoot = () => (
  <Suspense fallback={<LoadingSpinner fullScreen />}>
    <Routes>
      <Route index element={<IndexPage />} />
      <Route path="01" element={<Screen01 />} />
      <Route path="02" element={<Screen02 />} />
      <Route path="03" element={<Screen03 />} />
      <Route path="04" element={<Screen04 />} />
      <Route path="05" element={<Screen05 />} />
      <Route path="06" element={<Screen06 />} />
      <Route path="07" element={<Screen07 />} />
      <Route path="08" element={<Screen08 />} />
      <Route path="10" element={<Screen10 />} />
    </Routes>
  </Suspense>
)

export default FakeScreensRoot
