import { Box, List, ListItem, Skeleton, Typography, Link } from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { useNavigate } from 'react-router-dom'
import CollectionItem from '../lists/CollectionItem'
import EmptyState from '../common/EmptyState'
import { useT } from '../../store/LanguageContext'

const Skeleton_ = () => (
  <List disablePadding>
    {Array.from({ length: 4 }).map((_, i) => (
      <ListItem key={i} sx={{ bgcolor: 'background.paper', mb: 1, borderRadius: 2, gap: 2, boxShadow: 1 }}>
        <Skeleton variant="rounded" width={72} height={88} sx={{ flexShrink: 0 }} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" height={24} />
          <Skeleton variant="text" width="80%" height={18} />
          <Skeleton variant="text" width={72} height={18} />
        </Box>
      </ListItem>
    ))}
  </List>
)

const PublicCollectionList = ({ items, isLoading, loginWallAfter = 10, isLoggedIn, emptyMessage, emptyIcon }) => {
  const t = useT()
  const navigate = useNavigate()

  if (isLoading) return <Skeleton_ />

  if (!items.length) return (
    <EmptyState icon={emptyIcon} message={emptyMessage || t.public.emptyList} />
  )

  const visible = isLoggedIn ? items : items.slice(0, loginWallAfter)
  const showWall = !isLoggedIn && items.length > loginWallAfter

  return (
    <Box>
      <List disablePadding sx={{ display: { md: 'grid' }, gridTemplateColumns: { md: 'repeat(auto-fill, minmax(360px, 1fr))' }, gap: { md: 1 } }}>
        {visible.map((item) => (
          <CollectionItem key={item.id} item={item} disableSetLink={!isLoggedIn} />
        ))}
      </List>

      {showWall && (
        <Box sx={{ textAlign: 'center', pt: 2, pb: 3 }}>
          <LockOutlinedIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            <Link component="button" onClick={() => navigate('/login')} sx={{ fontWeight: 600, verticalAlign: 'baseline' }}>
              {t.public.signIn}
            </Link>
            {' '}{t.public.loginWall(items.length - loginWallAfter)}
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default PublicCollectionList
