// Screen 03 — Lista mancanti (VC259 + altri da Kinder_2026_001)
import { Box } from '@mui/material'
import { getSurprises, getSurprise } from '../../../services/database.service'
import useDatabaseQuery from '../../../hooks/useDatabaseQuery'
import useProducerColors from '../useProducerColors'
import { FakeAuthProvider, FakeCollectionProvider } from '../FakeProviders'
import { MARIO_AUTH_USER, VC259_ID, VC259_FAKE_STATS, applyFakeStats } from '../fakeData'
import Topbar from '../../../components/layout/Topbar'
import FakeBottomNav from '../FakeBottomNav'
import MissingPage from '../../collection/MissingPage'

const Screen03 = () => {
  const { data: seriesItems, loading: l1 } = useDatabaseQuery(() => getSurprises('Kinder_2026_001'), [])
  const { data: dbVC259,     loading: l2 } = useDatabaseQuery(() => getSurprise(VC259_ID), [])
  const { producerColors, loading: l3 } = useProducerColors()

  const ready = !l1 && !l2 && !l3

  const vc259   = applyFakeStats(dbVC259, VC259_FAKE_STATS)
  const extras  = (seriesItems || []).filter(i => i.id !== VC259_ID).slice(0, 11)
  const missing = [vc259, ...extras].filter(Boolean).slice(0, 12)

  return (
    <Box data-screen-ready={ready ? 'true' : undefined} sx={{ minHeight: '100dvh' }}>
      <FakeAuthProvider user={MARIO_AUTH_USER}>
        <FakeCollectionProvider username="mariorossi" missing={missing} doubles={[]} producerColors={producerColors}>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
            <Topbar />
            <Box sx={{ height: { xs: 56, sm: 64 } }} />
            <Box component="main" sx={{ flex: 1, p: 2, pb: 10 }}>
              <MissingPage />
            </Box>
            <FakeBottomNav activePath="/missing" />
          </Box>
        </FakeCollectionProvider>
      </FakeAuthProvider>
    </Box>
  )
}

export default Screen03
