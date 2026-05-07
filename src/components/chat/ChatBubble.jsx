import { useState } from 'react'
import { Box, Typography, Avatar, IconButton, Menu, MenuItem, Dialog, DialogTitle, DialogActions, Button } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { alpha } from '@mui/material/styles'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { useT } from '../../store/LanguageContext'

const AVATAR_SIZE = 28

const ChatBubble = ({ message, isOwn, onDelete, showAvatar }) => {
  const t = useT()
  const theme = useTheme()
  const bubbleBg = theme.palette.secondary.container
  const bubbleFg = theme.palette.secondary.onContainer
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const time = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  const handleOpen = (e) => {
    e.preventDefault()
    setMenuAnchor(e.currentTarget)
  }
  const handleMenuClose = () => setMenuAnchor(null)

  const handleReport = () => {
    handleMenuClose()
    const subject = encodeURIComponent('Segnalazione messaggio Surprix')
    const body = encodeURIComponent(`Messaggio da segnalare:\n"${message.text}"\nDa: ${message.from}\nData: ${message.createdAt}`)
    window.location.href = `mailto:info.surprix@gmail.com?subject=${subject}&body=${body}`
  }

  const handleDeleteClick = () => {
    handleMenuClose()
    setConfirmOpen(true)
  }

  const handleDelete = () => {
    setConfirmOpen(false)
    onDelete?.(message.id)
  }

  const actionBtn = (
    <Box className="msg-actions" sx={{ opacity: 0, transition: 'opacity 0.15s', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
      <IconButton size="small" onClick={handleOpen} sx={{ color: 'text.disabled', p: 0.25 }}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
    </Box>
  )

  const avatarEl = showAvatar ? (
    <Avatar sx={{ width: AVATAR_SIZE, height: AVATAR_SIZE, bgcolor: isOwn ? bubbleBg : 'grey.500', color: isOwn ? bubbleFg : 'white', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
      {message.from[0]?.toUpperCase()}
    </Avatar>
  ) : (
    <Box sx={{ width: AVATAR_SIZE, flexShrink: 0 }} />
  )

  if (message.deleted) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: 0.5,
        mb: showAvatar ? 0.75 : 0.25,
      }}>
        {isOwn ? <Box sx={{ width: AVATAR_SIZE, flexShrink: 0 }} /> : avatarEl}
        <Box sx={{
          maxWidth: '70%',
          px: 2,
          py: 1,
          borderRadius: showAvatar
            ? (isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px')
            : '16px',
          bgcolor: 'action.hover',
          border: '1px dashed',
          borderColor: 'divider',
        }}>
          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.disabled' }}>
            {isOwn ? t.chat.deletedMessageOwn : t.chat.deletedMessage}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', textAlign: 'right', mt: 0.25 }}>
            {time}
          </Typography>
        </Box>
        {isOwn ? avatarEl : <Box sx={{ width: AVATAR_SIZE, flexShrink: 0 }} />}
      </Box>
    )
  }

  return (
    <>
      <Box sx={{
        display: 'flex',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: 0.5,
        mb: showAvatar ? 0.75 : 0.25,
        '& .msg-actions': { opacity: 0 },
        '&:hover .msg-actions': { opacity: 1 },
      }}>
        {isOwn ? actionBtn : avatarEl}
        <Box
          onContextMenu={handleOpen}
          sx={{
            maxWidth: '70%',
            px: 2,
            py: 1,
            borderRadius: showAvatar
              ? (isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px')
              : '16px',
            bgcolor: isOwn ? bubbleBg : theme.palette.background.paper,
            boxShadow: 1,
            userSelect: 'none',
          }}
        >
          <Typography variant="body2" sx={{ color: isOwn ? bubbleFg : 'text.primary', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
            {message.text}
          </Typography>
          <Typography variant="caption" sx={{ color: isOwn ? alpha(bubbleFg, 0.6) : 'text.disabled', display: 'block', textAlign: 'right', mt: 0.25 }}>
            {time}
          </Typography>
        </Box>
        {isOwn ? avatarEl : actionBtn}
      </Box>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        {isOwn
          ? <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>{t.chat.deleteMessage}</MenuItem>
          : <MenuItem onClick={handleReport}>{t.chat.report}</MenuItem>
        }
      </Menu>

      {isOwn && (
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>{t.chat.deleteMessage}</DialogTitle>
          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)}>{t.common.cancel}</Button>
            <Button color="error" onClick={handleDelete}>{t.common.confirm}</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  )
}

export default ChatBubble
