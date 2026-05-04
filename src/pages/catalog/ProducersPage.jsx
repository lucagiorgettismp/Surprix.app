import { Box } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import ProducerCard from '../../components/catalog/ProducerCard'
import PageHeader from '../../components/catalog/PageHeader'
import ErrorMessage from '../../components/common/ErrorMessage'
import EmptyState from '../../components/common/EmptyState'
import useDatabaseQuery from '../../hooks/useDatabaseQuery'
import { getProducers } from '../../services/database.service'
import { useT } from '../../store/LanguageContext'

const ProducersPage = () => {
  const navigate = useNavigate()
  const t = useT()
  const { data, loading, error } = useDatabaseQuery(getProducers, [])

  if (error) return <ErrorMessage message={error.message} />

  return (
    <>
      <PageHeader title={t.nav.catalog} />
      {!loading && data.length === 0 ? (
        <EmptyState message={t.catalog.noProducers} />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1.5 }}>
          {data.map((item) => (
            <ProducerCard
              key={item.id}
              item={item}
              onClick={() => navigate(`/catalog/${item.id}`, { state: { producerLabel: item.name } })}
            />
          ))}
        </Box>
      )}
    </>
  )
}

export default ProducersPage
