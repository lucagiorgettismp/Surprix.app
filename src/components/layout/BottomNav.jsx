import { Box, Paper, Portal, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useLocation, useNavigate } from 'react-router-dom'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import StarIcon from '@mui/icons-material/Star'
import DifferenceOutlinedIcon from '@mui/icons-material/DifferenceOutlined'
import DifferenceIcon from '@mui/icons-material/Difference'
import { useT } from '../../store/LanguageContext'

const NavItem = ({ icon, activeIcon, label, active, onClick }) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  return (
    <Box
      onClick={onClick}
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 1,
        gap: 0.4,
        cursor: 'pointer',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 0.5,
          borderRadius: 3,
          bgcolor: active
            ? isDark ? 'primary.dark' : 'primary.main'
            : 'transparent',
          transition: 'background-color 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {active
          ? <Box sx={{ color: 'white', display: 'flex' }}>{activeIcon || icon}</Box>
          : <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>
        }
      </Box>
      <Typography
        variant="caption"
        sx={{
          fontSize: '0.7rem',
          fontWeight: active ? 700 : 400,
          color: active ? 'primary.main' : 'text.secondary',
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
    </Box>
  )
}

const BottomNav = () => {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const theme = useTheme()
  const t = useT()

  const tabs = [
    {
      label: t.nav.missing,
      path: '/missing',
      icon: <StarBorderIcon fontSize="small" />,
      activeIcon: <StarIcon fontSize="small" />,
    },
    {
      label: t.nav.doubles,
      path: '/doubles',
      icon: <DifferenceOutlinedIcon fontSize="small" />,
      activeIcon: <DifferenceIcon fontSize="small" />,
    },
    {
      label: t.nav.catalog,
      path: '/catalog',
      icon: <MenuBookIcon fontSize="small" />,
    },
  ]

  return (
    <Portal>
      <Box
        sx={{
          position: 'fixed',
          bottom: 'calc(12px + env(safe-area-inset-bottom))',
          left: 0,
          right: 0,
          px: { xs: 4, sm: 0 },
          maxWidth: { xs: '100%', sm: 320 },
          mx: 'auto',
          zIndex: 1100,
        }}
      >
        <Paper
          elevation={8}
          sx={{
            borderRadius: 5,
            overflow: 'hidden',
            bgcolor: theme.palette.mode === 'dark' ? '#1e1e1e' : 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', height: 60 }}>
            {tabs.map((tab) => (
              <NavItem
                key={tab.path}
                icon={tab.icon}
                activeIcon={tab.activeIcon}
                label={tab.label}
                active={pathname.startsWith(tab.path)}
                onClick={() => navigate(tab.path)}
              />
            ))}
          </Box>
        </Paper>
      </Box>
    </Portal>
  )
}

export default BottomNav
