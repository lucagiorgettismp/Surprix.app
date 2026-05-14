// Screen 08 — Profilo mariorossi con tab Recensioni attiva
import { Box } from '@mui/material'
import { getSurprises, getSurprise } from '../../../services/database.service'
import useDatabaseQuery from '../../../hooks/useDatabaseQuery'
import useProducerColors from '../useProducerColors'
import FakeProfileScreen from './FakeProfileLayout'
import { VC259_ID, S556_ID, HPANI06_ID, VC259_FAKE_STATS, S556_FAKE_STATS, HPANI06_FAKE_STATS, applyFakeStats } from '../fakeData'

const Screen08 = () => {
  const { data: seriesItems, loading: l1 } = useDatabaseQuery(() => getSurprises('Kinder_2026_001'), [])
  const { data: dbVC259, loading: l2 } = useDatabaseQuery(() => getSurprise(VC259_ID),   [])
  const { data: dbS556,  loading: l3 } = useDatabaseQuery(() => getSurprise(S556_ID),    [])
  const { data: dbHPANI, loading: l4 } = useDatabaseQuery(() => getSurprise(HPANI06_ID), [])
  const { producerColors, loading: l5 } = useProducerColors()

  const ready = !l1 && !l2 && !l3 && !l4 && !l5

  const vc259   = applyFakeStats(dbVC259, VC259_FAKE_STATS)
  const s556    = applyFakeStats(dbS556,  S556_FAKE_STATS)
  const hpani   = applyFakeStats(dbHPANI, HPANI06_FAKE_STATS)
  const extras  = (seriesItems || []).filter(i => i.id !== VC259_ID).slice(0, 11)
  const missing = [vc259, ...extras].filter(Boolean).slice(0, 14)
  const doubles = [s556, hpani, ...extras.slice(0, 4)].filter(Boolean).slice(0, 7)

  return (
    <Box data-screen-ready={ready ? 'true' : undefined} sx={{ minHeight: '100dvh' }}>
      <FakeProfileScreen missing={missing} doubles={doubles} producerColors={producerColors} initialTab={2} isLoggedIn isSelf />
    </Box>
  )
}

export default Screen08
