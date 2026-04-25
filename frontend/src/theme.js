import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4299e1',
      light: '#90cdf4',
      dark: '#2b6cb0',
    },
    secondary: {
      main: '#48bb78',
      light: '#9ae6b4',
      dark: '#2f855a',
    },
    error: {
      main: '#f56565',
      light: '#feb2b2',
      dark: '#c53030',
    },
    warning: {
      main: '#ecc94b',
      light: '#fefcbf',
      dark: '#b7791f',
    },
    info: {
      main: '#4299e1',
      light: '#ebf8ff',
      dark: '#2a4365',
    },
    background: {
      default: '#f0f4f8',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a202c',
      secondary: '#718096',
    },
    grey: {
      50: '#f7fafc',
      100: '#edf2f7',
      200: '#e2e8f0',
      300: '#cbd5e0',
      400: '#a0aec0',
      500: '#718096',
      600: '#4a5568',
      700: '#2d3748',
      800: '#1a202c',
    },
    success: {
      main: '#48bb78',
      light: '#c6f6d5',
      dark: '#276749',
    },
  },
  typography: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
});

export default theme;
