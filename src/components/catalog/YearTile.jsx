import { useTheme } from '@mui/material/styles'
import { Card, CardActionArea, Typography } from '@mui/material'

const YearTile = ({ item, onClick, color }) => {
  const theme = useTheme()
  const tintAmount = theme.palette.mode === 'dark' ? '8%' : '6%'
  const tintedBg = color
    ? `color-mix(in srgb, ${color} ${tintAmount}, ${theme.palette.background.paper})`
    : theme.palette.background.paper

  return (
    <Card elevation={1} sx={{ overflow: 'hidden', bgcolor: tintedBg }}>
      <CardActionArea onClick={onClick} sx={{ py: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1 }}>
          {item.descr || item.year}
        </Typography>
      </CardActionArea>
    </Card>
  )
}

export default YearTile
