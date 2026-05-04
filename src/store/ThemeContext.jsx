import { createContext, useContext, useMemo, useState } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { createAppTheme } from '../theme/theme'

const THEME_COLORS = { light: '#00838f', dark: '#111111' }

const applyThemeColor = (mode) => {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = THEME_COLORS[mode]
}

const ThemeContext = createContext({ mode: 'dark', toggleTheme: () => {} })

export const useThemeMode = () => useContext(ThemeContext)

export const AppThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('themeMode') || 'dark'
    applyThemeColor(saved)
    return saved
  })

  const toggleTheme = () =>
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('themeMode', next)
      applyThemeColor(next)
      return next
    })

  const theme = useMemo(() => createAppTheme(mode), [mode])

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  )
}
