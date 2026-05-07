import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Box, IconButton, CircularProgress, Avatar, Typography, Paper } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import SendIcon from '@mui/icons-material/Send'
import { useTheme } from '@mui/material/styles'
import { getMessages, sendMessage, markAsRead, deleteMessage } from '../../services/database.service'
import { useCollection } from '../../store/CollectionContext'
import { useT } from '../../store/LanguageContext'
import ChatBubble from '../../components/chat/ChatBubble'

const TOPBAR_H = { xs: 'calc(56px + env(safe-area-inset-top))', sm: 'calc(64px + env(safe-area-inset-top))' }
const CHAT_HEADER_H = '56px'
const INPUT_H = 'calc(80px + env(safe-area-inset-bottom))'
const MESSAGES_TOP = { xs: 'calc(112px + env(safe-area-inset-top))', sm: 'calc(120px + env(safe-area-inset-top))' }

const ChatPage = () => {
  const { chatId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { username, setActiveChatId, chats } = useCollection()
  const t = useT()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [messages, setMessages] = useState([])
  const [text, setText] = useState(state?.initialText || '')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const intervalRef = useRef(null)
  const textareaRef = useRef(null)

  const LINE_H = 24
  const MAX_ROWS = 5

  const resizeTextarea = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    const next = Math.min(ta.scrollHeight, LINE_H * MAX_ROWS)
    ta.style.height = `${next}px`
    ta.style.overflowY = ta.scrollHeight > LINE_H * MAX_ROWS ? 'auto' : 'hidden'
  }

  const handleTextChange = (e) => {
    setText(e.target.value)
    resizeTextarea()
  }

  const chatFromContext = chats?.find(c => c.chatId === chatId)
  const withUsername = state?.with || chatFromContext?.with

  const fetchMessages = useCallback(() =>
    getMessages(chatId).then(setMessages), [chatId])

  useEffect(() => {
    setActiveChatId(chatId)
    return () => setActiveChatId(null)
  }, [chatId])

  useEffect(() => {
    if (state?.initialText) resizeTextarea()
  }, [])

  useEffect(() => {
    if (!username) return
    markAsRead(username, chatId).catch(() => {})
  }, [username, chatId])

  useEffect(() => {
    fetchMessages().finally(() => setLoading(false))
    intervalRef.current = setInterval(fetchMessages, 15000)
    return () => clearInterval(intervalRef.current)
  }, [fetchMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!text.trim() || !withUsername || sending) return
    setSending(true)
    try {
      await sendMessage(chatId, username, withUsername, text.trim())
      setText('')
      if (textareaRef.current) {
        textareaRef.current.style.height = `${LINE_H}px`
        textareaRef.current.style.overflowY = 'hidden'
        textareaRef.current.scrollTop = 0
      }
      await fetchMessages()
    } finally {
      setSending(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleDeleteMessage = async (messageId) => {
    await deleteMessage(chatId, messageId)
    await fetchMessages()
  }

  return (
    <>
      {/* Chat header — below Topbar */}
      <Box sx={{
        position: 'fixed',
        top: TOPBAR_H,
        left: 0, right: 0,
        height: CHAT_HEADER_H,
        bgcolor: 'background.paper',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 1,
        zIndex: 10,
      }}>
        <IconButton onClick={() => navigate('/chat')}>
          <ArrowBackIcon />
        </IconButton>
        <Avatar sx={{ width: 34, height: 34, bgcolor: theme.palette.secondary.container, color: theme.palette.secondary.onContainer, fontWeight: 700, fontSize: '0.95rem' }}>
          {withUsername?.[0]?.toUpperCase()}
        </Avatar>
        <Box
          onClick={() => withUsername && navigate(`/u/${withUsername}`)}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flex: 1, minWidth: 0, cursor: withUsername ? 'pointer' : 'default', '&:hover .uname': { textDecoration: 'underline' } }}
        >
          <Typography variant="h6" fontWeight={700} noWrap className="uname" sx={{ color: 'inherit' }}>
            {withUsername || '…'}
          </Typography>
          {withUsername && <OpenInNewIcon sx={{ fontSize: 16, opacity: 0.7, flexShrink: 0 }} />}
        </Box>
      </Box>

      {/* Messages */}
      {loading ? (
        <Box sx={{ position: 'fixed', top: MESSAGES_TOP, bottom: INPUT_H, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ position: 'fixed', top: MESSAGES_TOP, bottom: INPUT_H, left: 0, right: 0, overflowY: 'auto', px: 2, pt: 1 }}>
          {(chats !== null && !chats.some(c => c.chatId === chatId) ? [] : messages).map((msg, i) => (
            <ChatBubble
              key={msg.id}
              message={msg}
              isOwn={msg.from === username}
              onDelete={handleDeleteMessage}
              showAvatar={i === messages.length - 1 || messages[i + 1].from !== msg.from}
            />
          ))}
          <div ref={bottomRef} />
        </Box>
      )}

      {/* Input bar */}
      <Box sx={{
        position: 'fixed',
        bottom: 'calc(12px + env(safe-area-inset-bottom))',
        left: 0, right: 0,
        px: { xs: 2, sm: 4 },
        zIndex: 1100,
      }}>
        <Paper
          elevation={8}
          onClick={() => textareaRef.current?.focus()}
          sx={{
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: 2,
            py: 1.25,
            bgcolor: isDark ? '#1e1e1e' : 'background.paper',
            color: isDark ? '#fff' : 'rgba(0,0,0,0.87)',
          }}
        >
          <textarea
            ref={textareaRef}
            placeholder={t.chat.placeholder}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKey}
            rows={1}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              resize: 'none',
              background: 'transparent',
              color: 'inherit',
              fontSize: '1rem',
              fontFamily: 'inherit',
              lineHeight: `${LINE_H}px`,
              padding: 0,
              overflowY: 'hidden',
              height: `${LINE_H}px`,
              maxHeight: `${LINE_H * MAX_ROWS}px`,
              width: '100%',
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!text.trim() || sending}
            sx={{ flexShrink: 0 }}
          >
            <SendIcon />
          </IconButton>
        </Paper>
      </Box>
    </>
  )
}

export default ChatPage
