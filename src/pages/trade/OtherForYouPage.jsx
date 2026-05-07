import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Box, List, CircularProgress, Button } from '@mui/material'
import { ChatBubbleOutlined as ChatBubbleOutlineIcon, PersonOutlined as PersonOutlinedIcon } from '@mui/icons-material'
import { getOtherSurprisesForYou, getChatId } from '../../services/database.service'
import { useT } from '../../store/LanguageContext'
import { useCollection } from '../../store/CollectionContext'
import ErrorMessage from '../../components/common/ErrorMessage'
import EmptyState from '../../components/common/EmptyState'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import CollectionItem from '../../components/lists/CollectionItem'
import PageHeader from '../../components/catalog/PageHeader'

const OtherForYouPage = () => {
  const { ownerUsername } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const missingIds = state?.missingIds || []
  const surpriseLabel = state?.surpriseLabel
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

  const handleContact = () => {
    const chatId = getChatId(username, ownerUsername)
    const initialText = t.trade.chatMessage(ownerUsername, username, surprises)
    navigate(`/chat/${chatId}`, { state: { with: ownerUsername, initialText } })
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>
  if (error) return <ErrorMessage message={error.message} />

  return (
    <>
      <PageHeader crumbs={crumbs} title={t.trade.otherTitle(ownerUsername)} backButton />

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<ChatBubbleOutlineIcon />}
          disabled={surprises.length === 0}
          onClick={handleContact}
          sx={{ borderRadius: 5 }}
        >
          {t.trade.contact(ownerUsername)}
        </Button>
        <Button
          variant="outlined"
          startIcon={<PersonOutlinedIcon />}
          onClick={() => navigate(`/u/${ownerUsername}`)}
          sx={{ borderRadius: 5 }}
        >
          {t.trade.viewProfile}
        </Button>
      </Box>

      {surprises.length === 0 ? (
        <EmptyState icon={SwapHorizIcon} message={t.trade.noOther} hint={t.trade.noOtherHint} />
      ) : (
        <List disablePadding>
          {surprises.map((item) => (
            <CollectionItem key={item.id} item={item} onRemove={null} accentColor={producerColors[item.set_producer_id]} />
          ))}
        </List>
      )}
    </>
  )
}

export default OtherForYouPage
