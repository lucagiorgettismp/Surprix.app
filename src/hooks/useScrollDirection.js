import { useEffect, useRef, useState } from 'react'

export const useScrollDirection = () => {
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY <= 0) {
        setIsVisible(true)
        lastScrollY.current = 0
        return
      }

      if (currentScrollY < lastScrollY.current - 4) {
        setIsVisible(true)
        lastScrollY.current = currentScrollY
      } else if (currentScrollY > lastScrollY.current + 8) {
        setIsVisible(false)
        lastScrollY.current = currentScrollY
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return isVisible
}
