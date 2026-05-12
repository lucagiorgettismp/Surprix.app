import { useRef, useState, useLayoutEffect } from 'react'
import { Box, Breadcrumbs, Link, Typography, IconButton } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useNavigate } from 'react-router-dom'
import { useScrollDirection } from '../../hooks/useScrollDirection'
const PageHeader = ({ crumbs, title, subtitle, children, backButton }) => {
  const navigate = useNavigate()
  const isVisible = useScrollDirection()

  const ref = useRef(null)
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    if (ref.current) setHeight(ref.current.offsetHeight)
  })

  const handleBack = () => {
    const backCrumb = crumbs?.[crumbs.length - 2]
    if (backCrumb) navigate(backCrumb.path, { state: backCrumb.state })
    else navigate(-1)
  }

  return (
    <>
      <Box
        ref={ref}
        sx={{
          position: 'fixed',
          top: { xs: 'calc(56px + env(safe-area-inset-top))', sm: 'calc(64px + env(safe-area-inset-top))' },
          left: 0,
          right: 0,
          zIndex: 10,
          bgcolor: 'background.paper',
          px: backButton ? 1 : 2,
          pt: backButton ? 0 : 1.25,
          pb: backButton ? 0 : 1,
          transition: 'opacity 0.2s ease, transform 0.2s ease',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
          pointerEvents: isVisible ? 'auto' : 'none',
          ...(backButton && { display: 'flex', alignItems: 'center', gap: 1, height: '56px' }),
        }}
      >
        {backButton ? (
          <>
            <IconButton onClick={handleBack}>
              <ArrowBackIcon />
            </IconButton>
            {title && (
              <Typography variant="h6" fontWeight={700} noWrap>
                {title}
              </Typography>
            )}
          </>
        ) : (
          <>
            {crumbs?.length > 1 && (
              <Breadcrumbs sx={{ fontSize: '0.82rem', '& .MuiBreadcrumbs-separator': { color: 'text.disabled' } }} aria-label="breadcrumb">
                {crumbs.slice(0, -1).map((crumb) => (
                  <Link
                    key={crumb.path}
                    underline="hover"
                    color="text.secondary"
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(crumb.path, { state: crumb.state })}
                  >
                    {crumb.label}
                  </Link>
                ))}
              </Breadcrumbs>
            )}
            {title && (
              <Typography variant="h6" mt={crumbs?.length > 0 ? 0.25 : 0}>
                {title}
              </Typography>
            )}
          </>
        )}
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
            {subtitle}
          </Typography>
        )}
        {children && <Box sx={{ mt: 1 }}>{children}</Box>}
      </Box>

      <Box sx={{ height, mt: -2, mb: 1 }} />
    </>
  )
}

export default PageHeader
