import { Box } from '@mui/material'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import YearTile from '../../components/catalog/YearTile'
import PageHeader from '../../components/catalog/PageHeader'
import ErrorMessage from '../../components/common/ErrorMessage'
import EmptyState from '../../components/common/EmptyState'
import useDatabaseQuery from '../../hooks/useDatabaseQuery'
import { getYears } from '../../services/database.service'
import { useT } from '../../store/LanguageContext'
import { useCollection } from '../../store/CollectionContext'

const YearsPage = () => {
  const { producerId } = useParams()
  const navigate = useNavigate()
  const { state } = useLocation()
  const t = useT()
  const producerLabel = state?.producerLabel || producerId

  const { producerColors } = useCollection()
  const accentColor = producerColors[producerId]

  const { data, loading, error } = useDatabaseQuery(() => getYears(producerId), [producerId])

  const crumbs = [
    { label: t.nav.catalog, path: '/catalog' },
    { label: producerLabel, path: `/catalog/${producerId}` },
  ]

  if (error) return <ErrorMessage message={error.message} />

  return (
    <>
      <PageHeader crumbs={crumbs} title={producerLabel} />
      {!loading && data.length === 0 ? (
        <EmptyState message={t.catalog.noYears} />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
          {data.map((item) => (
            <YearTile
              key={item.id}
              item={item}
              color={accentColor}
              onClick={() => navigate(`/catalog/${producerId}/${item.id}`, {
                state: { producerLabel, yearLabel: item.descr || String(item.year) },
              })}
            />
          ))}
        </Box>
      )}
    </>
  )
}

export default YearsPage
