import { useState, useRef } from 'react'
import { Box, CircularProgress } from '@mui/material'

const THRESHOLD = 72
const MAX_PULL = 110

const PullToRefresh = ({ onRefresh, children }) => {
  const [pullY, setPullY] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(null)

  const onTouchStart = (e) => {
    if (window.scrollY === 0 && !refreshing)
      startY.current = e.touches[0].clientY
  }

  const onTouchMove = (e) => {
    if (startY.current === null) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0) setPullY(Math.min(dy, MAX_PULL))
  }

  const onTouchEnd = async () => {
    if (pullY >= THRESHOLD) {
      setRefreshing(true)
      setPullY(THRESHOLD)
      try { await onRefresh() } finally {
        setRefreshing(false)
        setPullY(0)
      }
    } else {
      setPullY(0)
    }
    startY.current = null
  }

  const progress = Math.min(pullY / THRESHOLD, 1)
  const show = pullY > 8 || refreshing

  return (
    <Box onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
      {show && (
        <Box sx={{
          position: 'fixed',
          top: { xs: 'calc(60px + env(safe-area-inset-top))', sm: 'calc(68px + env(safe-area-inset-top))' },
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1050,
          bgcolor: 'background.paper',
          borderRadius: '50%',
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 3,
        }}>
          <CircularProgress
            size={24}
            variant={refreshing ? 'indeterminate' : 'determinate'}
            value={progress * 100}
          />
        </Box>
      )}
      <Box sx={{
        marginTop: `${refreshing ? THRESHOLD * 0.4 : pullY * 0.4}px`,
        transition: pullY === 0 ? 'margin-top 0.3s ease' : 'none',
      }}>
        {children}
      </Box>
    </Box>
  )
}

export default PullToRefresh
