import { Box, Card, CardActionArea, CardContent, CardMedia, Checkbox, Chip, Stack, Typography, Rating } from '@mui/material'
import { onImgError } from '../../utils/storage'

const ItemCard = ({ item, onClick, imagePadding = 1, imageAspectRatio, nameVariant = 'body2', wrapText = false, selecting = false, selected = false }) => {
  const hasColor = Boolean(item.color)

  return (
    <Card
      elevation={2}
      sx={{
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        ...(hasColor && { bgcolor: item.color }),
        ...(selecting && selected && { outline: '2px solid', outlineColor: 'primary.main' }),
        '&:hover .card-overlay': { opacity: 1 },
      }}
    >
      {selecting && (
        <Box
          onClick={(e) => { e.stopPropagation(); onClick?.() }}
          sx={{ position: 'absolute', top: 4, left: 4, zIndex: 3, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.85)', display: 'flex' }}
        >
          <Checkbox checked={selected} size="small" disableRipple sx={{ p: 0.5 }} />
        </Box>
      )}
      <Box
        className="card-overlay"
        sx={{
          position: 'absolute', inset: 0,
          bgcolor: 'action.hover',
          opacity: 0,
          transition: 'opacity 0.15s',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      <CardActionArea
        onClick={onClick}
        disableRipple
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch', '& .MuiCardActionArea-focusHighlight': { display: 'none' } }}
      >
        {item.imageUrl && (
          <CardMedia
            component="img"
            image={item.imageUrl}
            alt={item.name}
            draggable={false}
            onError={onImgError}
            onContextMenu={(e) => e.preventDefault()}
            sx={{
              width: '100%',
              ...(imageAspectRatio
                ? { aspectRatio: imageAspectRatio, objectFit: 'cover' }
                : { height: 'auto', objectFit: 'contain', p: imagePadding }),
            }}
          />
        )}
        <CardContent
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            textAlign: item.centerText ? 'center' : 'left',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.5 }}>
            <Typography
              variant={nameVariant}
              noWrap={!item.centerText && !wrapText}
              sx={{ fontWeight: 700, flex: 1, ...(hasColor ? { color: '#fff' } : {}), ...(wrapText && { overflowWrap: 'break-word', hyphens: 'auto' }) }}
            >
              {item.name}
            </Typography>
            {item.chips?.length > 0 && (
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, justifyContent: 'flex-end', flexShrink: 0 }}>
                {item.chips.map((chip) => {
                  const label = typeof chip === 'string' ? chip : chip.label
                  const color = typeof chip === 'object' && chip.primary ? 'primary' : 'default'
                  return <Chip key={label} label={label} size="small" variant="outlined" color={color} sx={{ height: 18, fontSize: '0.6rem' }} />
                })}
              </Stack>
            )}
          </Box>
          {item.subtitle && (
            <Typography
              variant="caption"
              color={hasColor ? 'rgba(255,255,255,0.8)' : 'text.secondary'}
              noWrap={!wrapText}
              display="block"
              sx={wrapText ? { overflowWrap: 'break-word', hyphens: 'auto' } : {}}
            >
              {item.subtitle}
            </Typography>
          )}
          {'rating' in item && (
            <Rating value={item.rating} readOnly size="small" max={3} sx={{ mt: 0.5 }} />
          )}
          {item.codes?.length > 0 && (
            <Typography variant="caption" color="text.disabled" noWrap sx={{ mt: 0.5, display: 'block', fontSize: '0.6rem', letterSpacing: 0.5 }}>
              {item.codes.join(' · ')}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
      {item.actions && (
        <Box sx={{ px: 1, pb: 1, position: 'relative', zIndex: 2 }}>
          {item.actions}
        </Box>
      )}
    </Card>
  )
}

export default ItemCard
