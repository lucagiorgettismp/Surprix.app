// Screen 07 — Chat conversazione (mariorossi ↔ giuliaverdi su VC259)
import { useRef, useEffect } from 'react'
import { Box, IconButton, Avatar, Typography, Paper } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import SendIcon from '@mui/icons-material/Send'
import { FakeAuthProvider, FakeCollectionProvider } from '../FakeProviders'
import { MARIO_AUTH_USER, GIULIA_USERNAME, FAKE_CHAT_MESSAGES } from '../fakeData'
import Topbar from '../../../components/layout/Topbar'
import ChatBubble from '../../../components/chat/ChatBubble'

const TOPBAR_H = { xs: 'calc(56px + env(safe-area-inset-top))', sm: 'calc(64px + env(safe-area-inset-top))' }
const CHAT_HEADER_H = '56px'
const INPUT_H = 'calc(80px + env(safe-area-inset-bottom))'
const MESSAGES_TOP = { xs: 'calc(112px + env(safe-area-inset-top))', sm: 'calc(120px + env(safe-area-inset-top))' }

const ChatContent = () => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const bottomRef = useRef(null)
  const msgs = FAKE_CHAT_MESSAGES

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [])

  return (
    <>
      {/* Chat header */}
      <Box sx={{
        position: 'fixed',
        top: TOPBAR_H, left: 0, right: 0,
        height: CHAT_HEADER_H,
        bgcolor: 'background.paper',
        display: 'flex', alignItems: 'center', gap: 2, px: 1, zIndex: 10,
      }}>
        <IconButton><ArrowBackIcon /></IconButton>
        <Avatar sx={{ width: 34, height: 34, bgcolor: theme.palette.secondary.container, color: theme.palette.secondary.onContainer, fontWeight: 700, fontSize: '0.95rem' }}>
          G
        </Avatar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flex: 1, minWidth: 0 }}>
          <Typography variant="h6" fontWeight={700} noWrap>{GIULIA_USERNAME}</Typography>
          <OpenInNewIcon sx={{ fontSize: 16, opacity: 0.7, flexShrink: 0 }} />
        </Box>
      </Box>

      {/* Messages area */}
      <Box sx={{ position: 'fixed', top: MESSAGES_TOP, bottom: INPUT_H, left: 0, right: 0, overflowY: 'auto', px: 2, pt: 1 }}>
        {msgs.map((msg, i) => (
          <ChatBubble
            key={msg.id}
            message={msg}
            isOwn={msg.from === 'mariorossi'}
            showAvatar={i === msgs.length - 1 || msgs[i + 1]?.from !== msg.from}
          />
        ))}
        <div ref={bottomRef} />
      </Box>

      {/* Input bar */}
      <Box sx={{
        position: 'fixed',
        bottom: 'calc(12px + env(safe-area-inset-bottom))',
        left: 0, right: 0, px: { xs: 2, sm: 4 }, zIndex: 1100,
      }}>
        <Paper
          elevation={8}
          sx={{
            borderRadius: '20px', display: 'flex', alignItems: 'center',
            gap: 0.5, px: 2, py: 1.25,
            bgcolor: isDark ? '#1e1e1e' : 'background.paper',
          }}
        >
          <Box sx={{ flex: 1, color: 'text.disabled', fontSize: '1rem', fontFamily: 'inherit', lineHeight: '24px' }}>
            Scrivi un messaggio…
          </Box>
          <IconButton color="primary" disabled sx={{ flexShrink: 0 }}>
            <SendIcon />
          </IconButton>
        </Paper>
      </Box>
    </>
  )
}

const Screen07 = () => (
  <Box data-screen-ready="true" sx={{ minHeight: '100dvh' }}>
    <FakeAuthProvider user={MARIO_AUTH_USER}>
      <FakeCollectionProvider
        username="mariorossi"
        missing={[]}
        doubles={[]}
        chats={[{ chatId: 'giuliaverdi-mariorossi', with: GIULIA_USERNAME, lastMessage: FAKE_CHAT_MESSAGES.at(-1)?.text, unread: false }]}
      >
        <Box sx={{ minHeight: '100dvh' }}>
          <Topbar />
          <ChatContent />
        </Box>
      </FakeCollectionProvider>
    </FakeAuthProvider>
  </Box>
)

export default Screen07
