import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPage } from '../services/analytics.service'

export const usePageTracking = () => {
  const { pathname } = useLocation()
  useEffect(() => { trackPage(pathname) }, [pathname])
}
