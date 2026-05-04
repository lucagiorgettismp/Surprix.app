import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Box, List, ListItem, ListItemText, ListItemAvatar, Avatar, Typography, CircularProgress, Chip, ListItemButton } from '@mui/material'
import { getOwnersForSurprise, getUserProfile } from '../../services/database.service'
import { useCollection } from '../../store/CollectionContext'
import { getCountryName } from '../../utils/locale'
import { useT, useLanguage } from '../../store/LanguageContext'
import ErrorMessage from '../../components/common/ErrorMessage'
import EmptyState from '../../components/common/EmptyState'
import PageHeader from '../../components/catalog/PageHeader'

const MissingOwnersPage = () => {
  const { surpriseId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { username, missing } = useCollection()

  const [owners, setOwners] = useState([])
  const [myProfile, setMyProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const surpriseLabel = state?.surpriseLabel || surpriseId
  const t = useT()
  const { lang } = useLanguage()

  useEffect(() => {
    Promise.all([
      getOwnersForSurprise(surpriseId),
      username ? getUserProfile(username) : Promise.resolve(null),
    ])
      .then(([fetchedOwners, profile]) => {
        setMyProfile(profile)
        const myCountry = profile?.country
        const sorted = [...fetchedOwners].sort((a, b) => {
          if (a.country === myCountry && b.country !== myCountry) return -1
          if (b.country === myCountry && a.country !== myCountry) return 1
          return 0
        })
        setOwners(sorted)
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [surpriseId, username])

  const crumbs = [
    { label: t.missing.title, path: '/missing' },
    { label: surpriseLabel, path: '' },
  ]

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>
  if (error) return <ErrorMessage message={error.message} />

  return (
    <>
      <PageHeader crumbs={crumbs} title={t.trade.ownersTitle} />
      {owners.length === 0 ? (
        <EmptyState message={t.trade.noOwners} />
      ) : (
        <List disablePadding>
          {owners.map((owner) => {
            const sameCountry = owner.country && owner.country === myProfile?.country
            return (
              <ListItem
                key={owner.username}
                disablePadding
                sx={{ bgcolor: 'background.paper', mb: 1, borderRadius: 2 }}
              >
                <ListItemButton
                  sx={{ borderRadius: 2 }}
                  onClick={() =>
                    navigate(`/other-for-you/${owner.username}`, {
                      state: {
                        ownerUsername: owner.username,
                        ownerEmail: owner.email?.replace(/,/g, '.'),
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
                  />
                  {sameCountry && <Chip label={t.trade.sameCountry} size="small" color="primary" variant="outlined" />}
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
