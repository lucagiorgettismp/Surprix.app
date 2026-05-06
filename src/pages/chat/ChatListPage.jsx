import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, List, ListItem, ListItemAvatar, ListItemText, Avatar, Typography, CircularProgress, Badge, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { deleteChatForUser } from '../../services/database.service'
import { useCollection } from '../../store/CollectionContext'
import { useT } from '../../store/LanguageContext'
import EmptyState from '../../components/common/EmptyState'

const TOPBAR_H = { xs: 'calc(56px + env(safe-area-inset-top))', sm: 'calc(64px + env(safe-area-inset-top))' }
const PAGE_HEADER_H = '56px'

const ChatListPage = () => {
  const { username, chats, setChats, setUnreadChats } = useCollection()
  const navigate = useNavigate()
  const t = useT()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [selectedChat, setSelectedChat] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleContextMenu = (e, chat) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuAnchor(e.currentTarget)
    setSelectedChat(chat)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
    setSelectedChat(null)
  }

  const handleDeleteChat = async () => {
    const chat = selectedChat
    setConfirmOpen(false)
    setSelectedChat(null)
    await deleteChatForUser(username, chat.chatId, chat.with)
    setChats((prev) => {
      const updated = prev.filter((c) => c.chatId !== chat.chatId)
      setUnreadChats(updated.filter((c) => c.unread).length)
      return updated
    })
  }

  return (
    <>
      {/* Page header */}
      <Box sx={{
        position: 'fixed',
        top: TOPBAR_H,
        left: 0, right: 0,
        height: PAGE_HEADER_H,
        bgcolor: isDark ? '#111111' : 'primary.main',
        display: 'flex',
        alignItems: 'center',
        px: 2,
        zIndex: 10,
      }}>
        <Typography variant="h6" fontWeight={700} sx={{ color: 'white' }}>
          {t.chat.title}
        </Typography>
      </Box>

      {/* Spacer */}
      <Box sx={{ height: PAGE_HEADER_H, mb: 1 }} />

      {chats === null
        ? <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>
        : !chats.length
          ? <EmptyState message={t.chat.noChats} />
          : (
            <List disablePadding>
              {chats.map((chat) => (
                <ListItem
                  key={chat.chatId}
                  disablePadding
                  onClick={() => navigate(`/chat/${chat.chatId}`, { state: { with: chat.with } })}
                  onContextMenu={(e) => handleContextMenu(e, chat)}
                  sx={{ bgcolor: 'background.paper', mb: 1, borderRadius: 2, px: 2, py: 1, cursor: 'pointer' }}
                >
                  <ListItemAvatar>
                    <Badge color="error" variant="dot" invisible={!chat.unread}>
                      <Avatar sx={{ bgcolor: 'primary.main', color: 'white' }}>
                        {chat.with?.[0]?.toUpperCase()}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={chat.with}
                    secondary={chat.lastMessage}
                    slotProps={{ primary: { sx: { fontWeight: 700 } }, secondary: { noWrap: true } }}
                  />
                  {chat.lastAt && (
                    <Typography variant="caption" color="text.disabled" sx={{ ml: 1, flexShrink: 0 }}>
                      {new Date(chat.lastAt).toLocaleDateString()}
                    </Typography>
                  )}
                </ListItem>
              ))}
            </List>
          )
      }

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem onClick={() => { setMenuAnchor(null); setConfirmOpen(true) }} sx={{ color: 'error.main' }}>
          {t.chat.deleteChat}
        </MenuItem>
      </Menu>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t.chat.deleteChat}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t.chat.deleteChatConfirm}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>{t.common.cancel}</Button>
          <Button color="error" onClick={handleDeleteChat}>{t.common.confirm}</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default ChatListPage
