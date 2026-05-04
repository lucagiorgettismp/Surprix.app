import { Breadcrumbs, Link, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'

const BreadcrumbNav = ({ crumbs }) => {
  const navigate = useNavigate()

  return (
    <Breadcrumbs sx={{ mb: 2, fontSize: '0.82rem' }} aria-label="breadcrumb">
      {crumbs.slice(0, -1).map((crumb) => (
        <Link
          key={crumb.path}
          underline="hover"
          color="inherit"
          sx={{ cursor: 'pointer' }}
          onClick={() => navigate(crumb.path, { state: crumb.state })}
        >
          {crumb.label}
        </Link>
      ))}
      <Typography color="text.primary" fontSize="0.82rem">
        {crumbs[crumbs.length - 1]?.label}
      </Typography>
    </Breadcrumbs>
  )
}

export default BreadcrumbNav
