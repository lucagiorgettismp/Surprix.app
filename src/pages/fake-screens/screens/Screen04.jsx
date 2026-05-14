// Screen 04 — Lista doppi (S-556, HPANI_06 + altri da Kinder_2026_001)
import { Box } from '@mui/material'
import { getSurprises, getSurprise } from '../../../services/database.service'
import useDatabaseQuery from '../../../hooks/useDatabaseQuery'
import useProducerColors from '../useProducerColors'
import { FakeAuthProvider, FakeCollectionProvider } from '../FakeProviders'
import { MARIO_AUTH_USER, S556_ID, HPANI06_ID, S556_FAKE_STATS, HPANI06_FAKE_STATS, applyFakeStats } from '../fakeData'
import Topbar from '../../../components/layout/Topbar'
import FakeBottomNav from '../FakeBottomNav'
import DoublesPage from '../../collection/DoublesPage'

const Screen04 = () => {
  const { data: kindSeries, loading: l1 } = useDatabaseQuery(() => getSurprises('Kinder_2026_001'), [])
  const { data: dbS556,    loading: l2 } = useDatabaseQuery(() => getSurprise(S556_ID),    [])
  const { data: dbHPANI,   loading: l3 } = useDatabaseQuery(() => getSurprise(HPANI06_ID), [])
  const { producerColors, loading: l4 } = useProducerColors()

  const ready = !l1 && !l2 && !l3 && !l4

  const s556    = applyFakeStats(dbS556,  S556_FAKE_STATS)
  const hpani   = applyFakeStats(dbHPANI, HPANI06_FAKE_STATS)
  const extras  = (kindSeries || []).slice(0, 4)
  const doubles = [s556, hpani, ...extras].filter(Boolean).slice(0, 6)

  return (
    <Box data-screen-ready={ready ? 'true' : undefined} sx={{ minHeight: '100dvh' }}>
      <FakeAuthProvider user={MARIO_AUTH_USER}>
        <FakeCollectionProvider username="mariorossi" missing={[]} doubles={doubles} producerColors={producerColors}>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
            <Topbar />
            <Box sx={{ height: { xs: 56, sm: 64 } }} />
            <Box component="main" sx={{ flex: 1, p: 2, pb: 10 }}>
              <DoublesPage />
            </Box>
            <FakeBottomNav activePath="/doubles" />
          </Box>
        </FakeCollectionProvider>
      </FakeAuthProvider>
    </Box>
  )
}

export default Screen04
