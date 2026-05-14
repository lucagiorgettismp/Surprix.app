// Screen 12 — Browser desktop: profilo pubblico di mariorossi (16:9, 1920×1080)
import { Box, Typography } from '@mui/material'

// App simulata a 1100px CSS wide, scalata a 0.8 → 880px rendered
// Il frame totale: 880 + 32 padding = 912px → entra in 1280px con margini
const APP_W = 1100
const APP_H = 680
const SCALE = 0.8
const FRAME_W = Math.round(APP_W * SCALE)  // 880px rendered
const FRAME_H = Math.round(APP_H * SCALE)  // 544px rendered

const Screen12 = () => (
  <Box
    data-screen-ready="true"
    sx={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: '#f5f5f7',
      backgroundImage: 'linear-gradient(135deg, #f5f5f7 0%, #e8eaf6 100%)',
    }}
  >
    <Box sx={{ position: 'relative' }}>
      {/* MacBook-style browser chrome */}
      <Box sx={{
        width: FRAME_W + 32,
        bgcolor: '#e0e0e0',
        borderRadius: '12px 12px 6px 6px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        {/* Browser toolbar */}
        <Box sx={{ bgcolor: '#d8d8d8', px: 2, py: 0.75, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Traffic lights */}
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c, i) => (
            <Box key={i} sx={{ width: 11, height: 11, bgcolor: c, borderRadius: '50%', flexShrink: 0 }} />
          ))}
          {/* URL bar */}
          <Box sx={{
            flex: 1, mx: 2, px: 1.5, py: 0.375, bgcolor: '#fff', borderRadius: '5px',
            display: 'flex', alignItems: 'center', gap: 0.75,
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)',
          }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main', flexShrink: 0 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.7rem' }}>
              surprix.app/u/mariorossi
            </Typography>
          </Box>
        </Box>

        {/* Browser content — overflow hidden, iframe scaled to fit exactly */}
        <Box sx={{ width: FRAME_W + 32, height: FRAME_H, bgcolor: '#fff', overflow: 'hidden', position: 'relative' }}>
          <iframe
            src="http://localhost:5173/fake-screens/01"
            style={{
              width: APP_W,
              height: APP_H,
              border: 'none',
              display: 'block',
              transform: `scale(${SCALE})`,
              transformOrigin: '0 0',
              pointerEvents: 'none',
            }}
            title="app"
          />
        </Box>
      </Box>

      <Typography variant="caption" sx={{
        display: 'block', textAlign: 'center', mt: 1.5,
        color: 'rgba(0,0,0,0.35)', letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.6rem',
      }}>
        Desktop Browser
      </Typography>
    </Box>
  </Box>
)

export default Screen12
