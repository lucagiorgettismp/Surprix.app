import { Box, Skeleton } from '@mui/material'
import ItemCard from './ItemCard'

const ItemGrid = ({ items, loading, onItemClick, minItemWidth = 150, imagePadding, imageAspectRatio, nameVariant, selecting = false, selectedIds, mobileColumns, wrapText = false }) => {
  const gridSx = {
    display: 'grid',
    gridTemplateColumns: mobileColumns
      ? { xs: `repeat(${mobileColumns}, 1fr)`, sm: `repeat(auto-fill, minmax(${minItemWidth}px, 1fr))` }
      : `repeat(auto-fill, minmax(${minItemWidth}px, 1fr))`,
    gap: 2,
  }

  if (loading) {
    return (
      <Box sx={gridSx}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={190} sx={{ borderRadius: 2 }} />
        ))}
      </Box>
    )
  }

  return (
    <Box sx={gridSx}>
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          onClick={() => onItemClick(item)}
          imagePadding={imagePadding}
          imageAspectRatio={imageAspectRatio}
          nameVariant={nameVariant}
          wrapText={wrapText}
          selecting={selecting}
          selected={selectedIds?.has(item.id) ?? false}
        />
      ))}
    </Box>
  )
}

export default ItemGrid
