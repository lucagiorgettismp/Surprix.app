import { createTheme } from '@mui/material/styles'

const DARK_BG = '#1c1c1c'
const DARK_PAPER = '#272727'

export const createAppTheme = (mode) =>
  createTheme({
    palette: {
      mode,
      primary: { main: '#00838f' },
      secondary: { main: '#ffa726' },
      warning: { main: '#ffa726' },
      info: { main: '#00838f' },
      ...(mode === 'dark'
        ? { background: { default: DARK_BG, paper: DARK_PAPER } }
        : { background: { default: '#d4edef', paper: '#FFFFFF' } }),
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h2: { fontWeight: 800 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          'html, body': { overscrollBehavior: 'none' },
        },
      },
      MuiCard: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiAppBar: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiBottomNavigation: {
        styleOverrides: {
          root: { backgroundColor: mode === 'dark' ? DARK_BG : '#FFFFFF' },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
    },
  })
