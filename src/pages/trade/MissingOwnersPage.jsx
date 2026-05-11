import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Box, List, ListItem, ListItemText, ListItemAvatar, Avatar, Typography, CircularProgress, ListItemButton } from '@mui/material'
import { getOwnersForSurprise, getFeedbackFor } from '../../services/database.service'
import { useCollection } from '../../store/CollectionContext'
import { getCountryName } from '../../utils/locale'
import { useT, useLanguage } from '../../store/LanguageContext'
import ErrorMessage from '../../components/common/ErrorMessage'
import EmptyState from '../../components/common/EmptyState'
import PersonSearchIcon from '@mui/icons-material/PersonSearch'
import PageHeader from '../../components/catalog/PageHeader'
import RatingBadge from '../../components/feedback/RatingBadge'

const MissingOwnersPage = () => {
  const { surpriseId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { username, userCountry, missing } = useCollection()

  const [owners, setOwners] = useState([])
  const [ratings, setRatings] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const surpriseLabel = state?.surpriseLabel || surpriseId
  const t = useT()
  const { lang } = useLanguage()

  useEffect(() => {
    getOwnersForSurprise(surpriseId)
      .then(async (fetchedOwners) => {
        const sorted = [...fetchedOwners].sort((a, b) => {
          if (a.country === userCountry && b.country !== userCountry) return -1
          if (b.country === userCountry && a.country !== userCountry) return 1
          return 0
        })
        setOwners(sorted)
        const feedbacks = await Promise.all(sorted.map((o) => getFeedbackFor(o.username)))
        const map = {}
        sorted.forEach((o, i) => {
          const fbs = feedbacks[i]
          map[o.username] = {
            count: fbs.length,
            avg: fbs.length ? fbs.reduce((s, f) => s + f.rating, 0) / fbs.length : 0,
          }
        })
        setRatings(map)
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [surpriseId])

  const crumbs = [
    { label: t.missing.title, path: '/missing' },
    { label: surpriseLabel, path: '' },
  ]

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>
  if (error) return <ErrorMessage message={error.message} />

  return (
    <>
      <PageHeader crumbs={crumbs} title={t.trade.ownersTitle} backButton />
      {owners.length === 0 ? (
        <EmptyState icon={PersonSearchIcon} message={t.trade.noOwners} hint={t.trade.noOwnersHint} />
      ) : (
        <List disablePadding>
          {owners.map((owner) => {
            return (
              <ListItem
                key={owner.username}
                disablePadding
                sx={{ bgcolor: 'background.paper', mb: 1, borderRadius: 2, boxShadow: 1 }}
              >
                <ListItemButton
                  sx={{ borderRadius: 2 }}
                  onClick={() =>
                    navigate(`/other-for-you/${owner.username}`, {
                      state: {
                        ownerUsername: owner.username,
                        missingIds: missing.map((m) => m.id),
                        surpriseLabel,
                      },
                    })
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {owner.username?.[0]?.toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={owner.username}
                    secondary={getCountryName(owner.country, lang)}
                    slotProps={{ primary: { sx: { fontWeight: 700 } } }}
                  />
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5, flexShrink: 0 }}>
                    {ratings[owner.username] && (
                      <>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          {t.feedback.eggScore}
                        </Typography>
                        <RatingBadge value={ratings[owner.username].avg} count={ratings[owner.username].count} showCount={false} />
                      </>
                    )}
                  </Box>
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
      )}
    </>
  )
}

export default MissingOwnersPage
