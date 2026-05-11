import { Box } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import ProducerCard from '../../components/catalog/ProducerCard'
import PageHeader from '../../components/catalog/PageHeader'
import EmptyState from '../../components/common/EmptyState'
import { useCollection } from '../../store/CollectionContext'
import { useT } from '../../store/LanguageContext'

const ProducersPage = () => {
  const navigate = useNavigate()
  const t = useT()
  const { producers } = useCollection()

  return (
    <>
      <PageHeader title={t.nav.catalog} />
      {producers.length === 0 ? (
        <EmptyState message={t.catalog.noProducers} />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
          {producers.map((item) => (
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
