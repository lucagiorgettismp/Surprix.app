import Rating from '@mui/material/Rating'
import { SvgIcon } from '@mui/material'

const EGG_PATH = 'M 14.4 2 C 11.4 2 7.2 6.5 7.2 13 c 0 5.3 3.24 9 7.2 9 s 7.2 -3.7 7.2 -9 c 0 -6.5 -4.2 -11 -7.2 -11 z'

const EggFilled = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d={EGG_PATH} />
  </SvgIcon>
)

const EggOutline = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <path d={EGG_PATH} fill="none" stroke="currentColor" strokeWidth="1.5" />
  </SvgIcon>
)

const EggRating = ({ value, onChange, size = 'medium', readOnly, precision = 0.5 }) => (
  <Rating
    value={value}
    onChange={onChange}
    precision={precision}
    size={size}
    readOnly={readOnly}
    icon={<EggFilled fontSize="inherit" />}
    emptyIcon={<EggOutline fontSize="inherit" />}
  />
)

export default EggRating
