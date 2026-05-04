import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Alert, Button, Snackbar } from '@mui/material'
import { useT } from './LanguageContext'
import { trackUndo } from '../services/analytics.service'

const SnackbarContext = createContext(null)

export const SnackbarProvider = ({ children }) => {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [severity, setSeverity] = useState(null) // null = default, 'warning' | 'info' ecc.
  const undoRef = useRef(null)

  const show = (msg, undoFn = null, sev = null) => {
    undoRef.current = undoFn
    setMessage(msg)
    setSeverity(sev)
    setOpen(false)
    setTimeout(() => setOpen(true), 50)
  }

  const showUndo = useCallback((msg, undoFn) => show(msg, undoFn, null), [])
  const showWarning = useCallback((msg) => show(msg, null, 'warning'), [])

  const handleUndo = () => { trackUndo(); undoRef.current?.(); setOpen(false) }
  const handleClose = (_, reason) => { if (reason === 'clickaway') return; setOpen(false) }

  return (
    <SnackbarContext.Provider value={{ showUndo, showWarning }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: { xs: 11, sm: 2 } }}
      >
        {severity ? (
          <Alert severity={severity} onClose={handleClose} sx={{ width: '100%' }}>
            {message}
          </Alert>
        ) : (
          <Alert
            severity="info"
            icon={false}
            onClose={handleClose}
            sx={{ width: '100%', bgcolor: 'grey.800', color: 'white', '& .MuiAlert-action': { alignItems: 'center' } }}
            action={
              undoRef.current ? (
                <Button size="small" color="primary" onClick={handleUndo}>
                  {t.common.undo}
                </Button>
              ) : null
            }
          >
            {message}
          </Alert>
        )}
      </Snackbar>
    </SnackbarContext.Provider>
  )
}

export const useSnackbar = () => useContext(SnackbarContext)
