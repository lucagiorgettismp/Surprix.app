// Screen 11 — Android (Pixel) device frame con lista doppi
import { Box, Typography } from '@mui/material'

const APP_W = 390
const APP_H = 844
const SCALE = 0.72
const FRAME_W = APP_W * SCALE
const FRAME_H = APP_H * SCALE

const Screen11 = () => (
  <Box
    data-screen-ready="true"
    sx={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: '#0d1117',
      backgroundImage: 'radial-gradient(ellipse at 70% 80%, #1a3a1a 0%, #0d2d0d 50%, #0d1117 100%)',
    }}
  >
    <Box sx={{ position: 'relative' }}>
      {/* Pixel-style device — flat edges */}
      <Box sx={{
        width: FRAME_W + 20,
        height: FRAME_H + 60,
        bgcolor: '#2a2a2a',
        borderRadius: '28px',
        boxShadow: '0 0 0 1.5px #3d3d3d, 0 40px 80px rgba(0,0,0,0.7), 0 0 60px rgba(0,200,100,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
        position: 'relative',
      }}>
        {/* Punch-hole camera */}
        <Box sx={{
          position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)',
          width: 14, height: 14, bgcolor: '#1a1a1a', borderRadius: '50%', zIndex: 10,
          boxShadow: 'inset 0 0 4px rgba(0,0,0,0.9)',
        }} />
        {/* Screen */}
        <Box sx={{
          width: FRAME_W, height: FRAME_H, borderRadius: '18px', overflow: 'hidden',
          position: 'relative', bgcolor: '#fff', mt: 1,
        }}>
          <iframe
            src="http://localhost:5173/fake-screens/04"
            style={{ width: APP_W, height: APP_H, border: 'none', display: 'block', transform: `scale(${SCALE})`, transformOrigin: '0 0' }}
            title="app"
          />
        </Box>
        {/* Bottom bar */}
        <Box sx={{ display: 'flex', gap: 4, mt: 1.5, opacity: 0.4 }}>
          {['◂', '●', '■'].map((icon, i) => (
            <Typography key={i} variant="caption" sx={{ color: '#fff', fontSize: 12 }}>{icon}</Typography>
          ))}
        </Box>
      </Box>

      <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 2, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.65rem' }}>
        Android (Pixel 8)
      </Typography>
    </Box>
  </Box>
)

export default Screen11
