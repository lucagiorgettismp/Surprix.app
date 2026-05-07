import { createTheme } from '@mui/material/styles'

const light = {
  primary:            '#006972',
  onPrimary:          '#FFFFFF',
  primaryContainer:   '#9DF0FB',
  onPrimaryContainer: '#004F56',
  secondary:          '#4A6366',
  secondaryContainer:   '#CDE7EB',
  onSecondaryContainer: '#324B4E',
  background:         '#F5FAFB',
  paper:              '#FFFFFF',
  onSurface:          '#171D1E',
  onSurfaceVariant:   '#3F484A',
  outlineVariant:     '#BEC8CA',
  error:              '#BA1A1A',
}

const dark = {
  primary:            '#81D3DF',
  onPrimary:          '#00363C',
  primaryContainer:   '#004F56',
  onPrimaryContainer: '#9DF0FB',
  secondary:          '#B1CBCF',
  secondaryContainer:   '#324B4E',
  onSecondaryContainer: '#CDE7EB',
  background:         '#0E1415',
  paper:              '#171D1E',
  onSurface:          '#DEE4E4',
  onSurfaceVariant:   '#BEC8CA',
  outlineVariant:     '#3F484A',
  error:              '#FFB4AB',
}

export const createAppTheme = (mode) => {
  const s = mode === 'light' ? light : dark
  return createTheme({
    palette: {
      mode,
      primary: {
        main: s.primary,
        contrastText: s.onPrimary,
        container: s.primaryContainer,
        onContainer: s.onPrimaryContainer,
      },
      secondary: {
        main: s.secondary,
        container: s.secondaryContainer,
        onContainer: s.onSecondaryContainer,
      },
      warning: { main: '#ffa726' },
      info: { main: s.primary },
      error: { main: s.error },
      background: { default: s.background, paper: s.paper },
      text: { primary: s.onSurface, secondary: s.onSurfaceVariant },
      divider: s.outlineVariant,
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
      MuiAppBar: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiBottomNavigation: {
        styleOverrides: {
          root: { backgroundColor: s.paper },
        },
      },
    },
  })
}
