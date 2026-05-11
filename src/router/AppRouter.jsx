import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { useCollection } from '../store/CollectionContext'
import AppLayout from '../components/layout/AppLayout'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { usePageTracking } from '../hooks/usePageTracking'

const LoginPage         = lazy(() => import('../pages/auth/LoginPage'))
const SignUpPage        = lazy(() => import('../pages/auth/SignUpPage'))
const OnboardingPage    = lazy(() => import('../pages/auth/OnboardingPage'))
const ProducersPage     = lazy(() => import('../pages/catalog/ProducersPage'))
const YearsPage         = lazy(() => import('../pages/catalog/YearsPage'))
const SetsPage          = lazy(() => import('../pages/catalog/SetsPage'))
const SurprisesPage     = lazy(() => import('../pages/catalog/SurprisesPage'))
const MissingPage       = lazy(() => import('../pages/collection/MissingPage'))
const DoublesPage       = lazy(() => import('../pages/collection/DoublesPage'))
const ProfilePage       = lazy(() => import('../pages/profile/ProfilePage'))
const MissingOwnersPage  = lazy(() => import('../pages/trade/MissingOwnersPage'))
const OtherForYouPage    = lazy(() => import('../pages/trade/OtherForYouPage'))
const SearchPage         = lazy(() => import('../pages/search/SearchPage'))
const NotFoundPage       = lazy(() => import('../pages/NotFoundPage'))
const PublicProfilePage  = lazy(() => import('../pages/public/PublicProfilePage'))
const PrivacyPage        = lazy(() => import('../pages/public/PrivacyPage'))
const ChatListPage       = lazy(() => import('../pages/chat/ChatListPage'))
const ChatPage           = lazy(() => import('../pages/chat/ChatPage'))

const PrivateRoute = ({ children }) => {
  const { user } = useAuth()
  const { username, loading } = useCollection()

  if (user === undefined || loading || username === undefined) return <LoadingSpinner fullScreen />
  if (!user) return <Navigate to="/login" replace />
  if (username === null) return <Navigate to="/onboarding" replace />
  return children
}

const PageTracker = () => { usePageTracking(); return null }

const AppRouter = () => (
  <BrowserRouter>
    <PageTracker />
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/u/:username" element={<PublicProfilePage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="*" element={<NotFoundPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/missing" replace />} />
          <Route path="catalog" element={<ProducersPage />} />
          <Route path="catalog/:producerId" element={<YearsPage />} />
          <Route path="catalog/:producerId/:yearId" element={<SetsPage />} />
          <Route path="catalog/:producerId/:yearId/:setId" element={<SurprisesPage />} />
          <Route path="missing" element={<MissingPage />} />
          <Route path="missing-owners/:surpriseId" element={<MissingOwnersPage />} />
          <Route path="other-for-you/:ownerUsername" element={<OtherForYouPage />} />
          <Route path="doubles" element={<DoublesPage />} />
          <Route path="settings" element={<ProfilePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="chat" element={<ChatListPage />} />
          <Route path="chat/:chatId" element={<ChatPage />} />
        </Route>
      </Routes>
    </Suspense>
  </BrowserRouter>
)

export default AppRouter
