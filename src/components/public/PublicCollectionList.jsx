import { Box, List, ListItem, Skeleton, Typography, Button, Stack } from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { useNavigate } from 'react-router-dom'
import CollectionItem from '../lists/CollectionItem'
import { useT } from '../../store/LanguageContext'

const Skeleton_ = () => (
  <List disablePadding>
    {Array.from({ length: 4 }).map((_, i) => (
      <ListItem key={i} sx={{ bgcolor: 'background.paper', mb: 1, borderRadius: 2, gap: 2 }}>
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

const PublicCollectionList = ({ items, isLoading, loginWallAfter = 10, isLoggedIn }) => {
  const t = useT()
  const navigate = useNavigate()

  if (isLoading) return <Skeleton_ />

  if (!items.length) return (
    <Box sx={{ py: 4, textAlign: 'center' }}>
      <Typography color="text.secondary">{t.public.emptyList}</Typography>
    </Box>
  )

  const visible = isLoggedIn ? items : items.slice(0, loginWallAfter)
  const showWall = !isLoggedIn && items.length > loginWallAfter

  return (
    <Box>
      <List disablePadding sx={{ display: { md: 'grid' }, gridTemplateColumns: { md: 'repeat(auto-fill, minmax(360px, 1fr))' }, gap: { md: 1 } }}>
        {visible.map((item) => (
          <CollectionItem key={item.id} item={item} />
        ))}
      </List>

      {showWall && (
        <Box sx={{ textAlign: 'center', pt: 2, pb: 3 }}>
          <LockOutlinedIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t.public.loginWall(items.length - loginWallAfter)}
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center">
            <Button variant="contained" size="small" onClick={() => navigate('/login')}>
              {t.public.signIn}
            </Button>
            <Button variant="outlined" size="small" onClick={() => navigate('/signup')}>
              {t.public.createAccount}
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  )
}

export default PublicCollectionList
