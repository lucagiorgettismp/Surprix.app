import { useEffect, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { Box, List, CircularProgress, Button, Divider } from '@mui/material'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import { getOtherSurprisesForYou } from '../../services/database.service'
import { useT } from '../../store/LanguageContext'
import { trackTradeEmail } from '../../services/analytics.service'
import { useCollection } from '../../store/CollectionContext'
import ErrorMessage from '../../components/common/ErrorMessage'
import EmptyState from '../../components/common/EmptyState'
import CollectionItem from '../../components/lists/CollectionItem'
import PageHeader from '../../components/catalog/PageHeader'

const OtherForYouPage = () => {
  const { ownerUsername } = useParams()
  const { state } = useLocation()
  const missingIds = state?.missingIds || []
  const surpriseLabel = state?.surpriseLabel
  const ownerEmail = state?.ownerEmail
  const t = useT()
  const { username, producerColors } = useCollection()

  const [surprises, setSurprises] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getOtherSurprisesForYou(ownerUsername, missingIds)
      .then(setSurprises)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [ownerUsername])

  const crumbs = [
    { label: t.missing.title, path: '/missing' },
    { label: surpriseLabel || '...', path: -1 },
    { label: ownerUsername, path: '' },
  ]

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>
  if (error) return <ErrorMessage message={error.message} />

  return (
    <>
      <PageHeader crumbs={crumbs} title={t.trade.otherTitle(ownerUsername)} />

      {surprises.length === 0 ? (
        <EmptyState message={t.trade.noOther} />
      ) : (
        <List disablePadding>
          {surprises.map((item) => (
            <CollectionItem key={item.id} item={item} onRemove={null} accentColor={producerColors[item.set_producer_id]} />
          ))}
        </List>
      )}

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="outlined"
          startIcon={<EmailOutlinedIcon />}
          disabled={!ownerEmail || surprises.length === 0}
          onClick={() => {
            trackTradeEmail(surprises.length)
            window.location.href = `mailto:${ownerEmail}?subject=${encodeURIComponent(t.trade.emailSubject(username))}&body=${encodeURIComponent(t.trade.emailBody(ownerUsername, username, surprises))}`
          }}
          sx={{ px: 4, borderRadius: 5 }}
        >
          {t.trade.contact(ownerUsername)}
        </Button>
      </Box>
    </>
  )
}

export default OtherForYouPage
