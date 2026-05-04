import { Box, Card, CardActionArea, Typography } from '@mui/material'

const YearTile = ({ item, onClick }) => (
  <Card elevation={2} sx={{ overflow: 'hidden' }}>
    <CardActionArea onClick={onClick} sx={{ py: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1 }}>
        {item.descr || item.year}
      </Typography>
    </CardActionArea>
  </Card>
)

export default YearTile
