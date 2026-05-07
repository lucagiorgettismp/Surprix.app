import { useTheme } from '@mui/material/styles'
import { Box, Card, CardActionArea, Checkbox, Typography } from '@mui/material'
import { gsToHttps } from '../../utils/storage'

const ProducerCard = ({ item, onClick, selecting = false, selected = false }) => {
  const theme = useTheme()
  const tintAmount = theme.palette.mode === 'dark' ? '8%' : '6%'
  const tintedBg = item.color
    ? `color-mix(in srgb, ${item.color} ${tintAmount}, ${theme.palette.background.paper})`
    : theme.palette.background.paper

  return (
  <Card
    elevation={1}
    sx={{ overflow: 'hidden', height: '100%', bgcolor: tintedBg, outline: selected ? '2px solid' : 'none', outlineColor: 'primary.main' }}
  >
    <CardActionArea
      onClick={onClick}
      sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', p: 2, gap: 2, height: '100%' }}
    >
      {selecting && (
        <Checkbox checked={selected} size="small" sx={{ p: 0, mr: 0.5, flexShrink: 0 }} disableRipple />
      )}
      <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>{item.name}</Typography>
      {item.img_path ? (
        <Box
          component="img"
          src={gsToHttps(item.img_path)}
          alt={item.name}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          sx={{ width: 42, height: 42, objectFit: 'contain', flexShrink: 0, borderRadius: 1 }}
        />
      ) : (
        <Box sx={{ width: 42, height: 42, flexShrink: 0 }} />
      )}
    </CardActionArea>
  </Card>
  )
}

export default ProducerCard
