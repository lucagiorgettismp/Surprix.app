import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Box, Typography, Divider, Stack, Button, CircularProgress } from '@mui/material'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import StarIcon from '@mui/icons-material/Star'
import RarityBadge from '../../components/common/RarityBadge'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import PageHeader from '../../components/catalog/PageHeader'
import ErrorMessage from '../../components/common/ErrorMessage'
import { getSurprise } from '../../services/database.service'
import { gsToHttps } from '../../utils/storage'
import { getCountryName, getCategoryLabel } from '../../utils/locale'
import { useCollection } from '../../store/CollectionContext'
import { useT, useLanguage } from '../../store/LanguageContext'

const DetailRow = ({ label, value }) => {
  if (!value) return null
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  )
}

const SurpriseDetailPage = () => {
  const { producerId, yearId, setId, surpriseId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const producerLabel = state?.producerLabel || producerId
  const yearLabel = state?.yearLabel || yearId
  const setLabel = state?.setLabel || setId

  const { missing, doubles, toggleMissing, toggleDoubles } = useCollection()
  const t = useT()
  const { lang } = useLanguage()
  const [surprise, setSurprise] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getSurprise(surpriseId)
      .then((data) => {
        if (data) setSurprise(data)
        else setError(new Error('Sorpresa non trovata.'))
      })
      .catch(setError)
      .finally(() => setLoading(false))
  }, [surpriseId])

  const crumbs = [
    { label: t.nav.catalog, path: '/catalog' },
    { label: producerLabel, path: `/catalog/${producerId}`, state: { producerLabel } },
    { label: yearLabel, path: `/catalog/${producerId}/${yearId}`, state: { producerLabel, yearLabel } },
    { label: setLabel, path: `/catalog/${producerId}/${yearId}/${setId}`, state: { producerLabel, yearLabel, setLabel } },
    { label: surprise?.description || surpriseId, path: `/catalog/${producerId}/${yearId}/${setId}/${surpriseId}` },
  ]

  if (loading)
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>
  if (error) return <ErrorMessage message={error.message} />
  if (!surprise) return null

  const isMissing = missing.some((m) => m.id === surpriseId)
  const isDouble = doubles.some((d) => d.id === surpriseId)

  return (
    <>
      <PageHeader crumbs={crumbs} />

      {surprise.img_path && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Box
            component="img"
            src={gsToHttps(surprise.img_path)}
            alt={surprise.description}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            sx={{ maxWidth: '100%', maxHeight: 260, borderRadius: 2, display: 'block' }}
          />
        </Box>
      )}

      <Box sx={{ mb: 2 }}>
        {(surprise.isSet_effective_code || surprise.set_effective_code) && surprise.code ? (
          <>
            <Typography sx={{ variant:"h5", fontWeight:700 }}>{surprise.code}</Typography>
            <Typography variant="body1" color="text.secondary">{surprise.description}</Typography>
          </>
        ) : (
          <Typography variant="h5" sx={{ fontWeight: 700 }}>{surprise.description}</Typography>
        )}
      </Box>

      <Divider sx={{ mb: 1 }} />

      <DetailRow label={t.catalog.producer} value={surprise.set_producer_name} />
      <DetailRow label={t.catalog.series} value={surprise.set_name} />
      <DetailRow label={t.catalog.year} value={surprise.set_year_year} />
      <DetailRow label={t.catalog.country} value={getCountryName(surprise.set_nation, lang)} />
      <DetailRow label={t.catalog.category} value={getCategoryLabel(surprise.set_category, lang)} />

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', py: 0.75 }}>
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100, flexShrink: 0 }}>
          {t.catalog.rarity}
        </Typography>
        <RarityBadge
          rarity={surprise.rarity}
          rarityAuto={surprise.rarity_auto}
          missingCount={surprise.missing_count}
          doubleCount={surprise.double_count}
        />
      </Box>

      <Divider sx={{ my: 2 }} />

      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button
          variant={isMissing ? 'contained' : 'outlined'}
          startIcon={isMissing ? <StarIcon /> : <StarBorderIcon />}
          onClick={() => toggleMissing(surprise)}
          color="warning"
        >
          {isMissing ? t.surprise.isMissing : t.surprise.addMissing}
        </Button>
        <Button
          variant={isDouble ? 'contained' : 'outlined'}
          startIcon={<ContentCopyIcon />}
          onClick={() => toggleDoubles(surprise)}
          color="info"
        >
          {isDouble ? t.surprise.isDouble : t.surprise.addDouble}
        </Button>
        {isMissing && (
          <Button
            variant="outlined"
            startIcon={<SwapHorizIcon />}
            onClick={() => navigate(`/missing-owners/${surpriseId}`, {
              state: { surpriseLabel: surprise.code || surprise.description },
            })}
          >
            {t.surprise.findTrade}
          </Button>
        )}
      </Stack>
    </>
  )
}

export default SurpriseDetailPage
