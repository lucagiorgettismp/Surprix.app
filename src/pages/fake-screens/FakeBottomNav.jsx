import { Box, Paper, Portal, Typography, Badge } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import StarIcon from '@mui/icons-material/Star'
import DifferenceOutlinedIcon from '@mui/icons-material/DifferenceOutlined'
import DifferenceIcon from '@mui/icons-material/Difference'
import ChatBubbleOutlinedIcon from '@mui/icons-material/ChatBubbleOutlined'
import ChatBubbleIcon from '@mui/icons-material/ChatBubble'
import { useT } from '../../store/LanguageContext'
import { useCollection } from '../../store/CollectionContext'

const NavItem = ({ icon, activeIcon, label, active }) => {
  const theme = useTheme()
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 1, gap: 0.4, userSelect: 'none' }}>
      <Box sx={{ px: 2.5, py: 0.5, borderRadius: 3, bgcolor: active ? theme.palette.secondary.container : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {active
          ? <Box sx={{ color: theme.palette.secondary.onContainer, display: 'flex' }}>{activeIcon || icon}</Box>
          : <Box sx={{ color: 'text.secondary', display: 'flex' }}>{icon}</Box>
        }
      </Box>
      <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: active ? 700 : 400, color: active ? theme.palette.secondary.onContainer : 'text.secondary', lineHeight: 1 }}>
        {label}
      </Typography>
    </Box>
  )
}

// activePath: '/missing' | '/doubles' | '/catalog' | '/chat'
const FakeBottomNav = ({ activePath }) => {
  const t = useT()
  const { unreadChats } = useCollection()

  const tabs = [
    { label: t.nav.missing,  path: '/missing',  icon: <StarBorderIcon fontSize="small" />,         activeIcon: <StarIcon fontSize="small" /> },
    { label: t.nav.doubles,  path: '/doubles',  icon: <DifferenceOutlinedIcon fontSize="small" />, activeIcon: <DifferenceIcon fontSize="small" /> },
    { label: t.nav.catalog,  path: '/catalog',  icon: <MenuBookIcon fontSize="small" /> },
    { label: t.chat.title,   path: '/chat',
      icon:       <Badge badgeContent={unreadChats || null} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16 } }}><ChatBubbleOutlinedIcon fontSize="small" /></Badge>,
      activeIcon: <Badge badgeContent={unreadChats || null} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16 } }}><ChatBubbleIcon fontSize="small" /></Badge>,
    },
  ]

  return (
    <Portal>
      <Box sx={{ position: 'fixed', bottom: 'calc(12px + env(safe-area-inset-bottom))', left: 0, right: 0, px: { xs: 4, sm: 0 }, maxWidth: { xs: '100%', sm: 320 }, mx: 'auto', zIndex: 1100 }}>
        <Paper elevation={8} sx={{ borderRadius: 5, overflow: 'hidden', bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', height: 60, px: 1 }}>
            {tabs.map((tab) => (
              <NavItem
                key={tab.path}
                icon={tab.icon}
                activeIcon={tab.activeIcon}
                label={tab.label}
                active={activePath?.startsWith(tab.path) ?? false}
              />
            ))}
          </Box>
        </Paper>
      </Box>
    </Portal>
  )
}

export default FakeBottomNav
