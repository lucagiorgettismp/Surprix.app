import { useRef, useState, useLayoutEffect } from 'react'
import { Box, Breadcrumbs, Link, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useScrollDirection } from '../../hooks/useScrollDirection'
import { useTheme } from '@mui/material/styles'

const PageHeader = ({ crumbs, title, subtitle, children }) => {
  const navigate = useNavigate()
  const isVisible = useScrollDirection()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const ref = useRef(null)
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    if (ref.current) setHeight(ref.current.offsetHeight)
  })

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
          bgcolor: isDark ? '#111111' : 'primary.main',
          color: isDark ? 'text.primary' : 'white',
          px: 2,
          pt: 1.25,
          pb: 1,
          transition: 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
          pointerEvents: isVisible ? 'auto' : 'none',
        }}
      >
        {crumbs?.length > 1 && (
          <Breadcrumbs sx={{ fontSize: '0.82rem', color: 'inherit', '& .MuiBreadcrumbs-separator': { color: 'inherit' } }} aria-label="breadcrumb">
            {crumbs.slice(0, -1).map((crumb) => (
              <Link
                key={crumb.path}
                underline="hover"
                color="inherit"
                sx={{ cursor: 'pointer', opacity: isDark ? 1 : 0.75 }}
                onClick={() => navigate(crumb.path, { state: crumb.state })}
              >
                {crumb.label}
              </Link>
            ))}
          </Breadcrumbs>
        )}
        {title && (
          <Typography variant="h6" color="inherit" mt={crumbs?.length > 0 ? 0.25 : 0}>
            {title}
          </Typography>
        )}
        {subtitle && (
          <Typography variant="caption" color="inherit" sx={{ fontWeight: 500, opacity: isDark ? 0.7 : 0.8 }}>
            {subtitle}
          </Typography>
        )}
        {children && (
          <Box sx={{
            mt: 1,
            ...(!isDark && {
              '& .MuiChip-root': { color: 'white', borderColor: 'rgba(255,255,255,0.5)' },
              '& .MuiChip-filled': { bgcolor: 'rgba(255,255,255,0.2)' },
              '& .MuiButton-root': { color: 'white', borderColor: 'rgba(255,255,255,0.5)' },
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255,255,255,0.15)',
                color: 'white',
                '& fieldset': { border: 'none' },
              },
              '& input::placeholder': { color: 'rgba(255,255,255,0.6)', opacity: 1 },
              '& .MuiInputAdornment-root .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.6)' },
            }),
          }}>
            {children}
          </Box>
        )}
      </Box>

      <Box sx={{ height, mt: -2, mb: 1 }} />
    </>
  )
}

export default PageHeader
