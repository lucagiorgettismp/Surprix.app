import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    })
  } else {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister())
    })
  }
}
import { AuthProvider } from './store/AuthContext'
import { CollectionProvider } from './store/CollectionContext'
import { AppThemeProvider } from './store/ThemeContext'
import { LanguageProvider } from './store/LanguageContext'
import { SnackbarProvider } from './store/SnackbarContext'
import OfflineOverlay from './components/common/OfflineOverlay'
import CookieBanner from './components/common/CookieBanner'
import AppRouter from './router/AppRouter'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <CollectionProvider>
            <SnackbarProvider>
              <OfflineOverlay />
              <AppRouter />
              <CookieBanner />
            </SnackbarProvider>
          </CollectionProvider>
        </AuthProvider>
      </LanguageProvider>
    </AppThemeProvider>
  </StrictMode>
)
