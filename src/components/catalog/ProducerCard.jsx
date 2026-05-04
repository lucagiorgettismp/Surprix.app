import { Box, Card, CardActionArea, Checkbox, Typography } from '@mui/material'
import { gsToHttps } from '../../utils/storage'

const ProducerCard = ({ item, onClick, selecting = false, selected = false }) => (
  <Card
    elevation={2}
    sx={{ overflow: 'hidden', height: '100%', outline: selected ? '2px solid' : 'none', outlineColor: 'primary.main' }}
  >
    <CardActionArea
      onClick={onClick}
      sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', p: 1.5, gap: 1.5, height: '100%' }}
    >
      {selecting && (
        <Checkbox checked={selected} size="small" sx={{ p: 0, mr: 0.5, flexShrink: 0 }} disableRipple />
      )}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>{item.name}</Typography>
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

export default ProducerCard
