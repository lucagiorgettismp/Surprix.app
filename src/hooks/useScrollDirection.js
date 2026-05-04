import { useEffect, useRef, useState } from 'react'

export const useScrollDirection = () => {
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // Se scrolls up → mostra
      if (currentScrollY < lastScrollY.current) {
        setIsVisible(true)
      }
      // Se scrolls down di più di 50px dall'ultimo → nascondi
      else if (currentScrollY > lastScrollY.current + 50) {
        setIsVisible(false)
      }

      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return isVisible
}
