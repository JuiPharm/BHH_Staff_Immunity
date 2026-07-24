import { createTheme } from '@mui/material/styles';

// BDMS Corporate Identity Color Palette
export const bdmsColors = {
  navy: '#0A2540',
  navyLight: '#1E3A8A',
  red: '#E53935',
  redDark: '#C62828',
  white: '#FFFFFF',
  surfaceLight: '#F8FAFC',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  border: '#E2E8F0',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#0EA5E9',
};

export const bdmsTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: bdmsColors.navy,
      light: bdmsColors.navyLight,
      dark: '#061729',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: bdmsColors.red,
      light: '#FF6B6B',
      dark: bdmsColors.redDark,
      contrastText: '#FFFFFF',
    },
    background: {
      default: bdmsColors.surfaceLight,
      paper: bdmsColors.white,
    },
    text: {
      primary: bdmsColors.textPrimary,
      secondary: bdmsColors.textSecondary,
    },
    success: {
      main: bdmsColors.success,
    },
    warning: {
      main: bdmsColors.warning,
    },
    error: {
      main: bdmsColors.red,
    },
    info: {
      main: bdmsColors.info,
    },
    divider: bdmsColors.border,
  },
  typography: {
    fontFamily: '"Kanit", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: { fontWeight: 700, fontSize: '2rem' },
    h2: { fontWeight: 700, fontSize: '1.75rem' },
    h3: { fontWeight: 600, fontSize: '1.5rem' },
    h4: { fontWeight: 600, fontSize: '1.25rem' },
    h5: { fontWeight: 600, fontSize: '1.1rem' },
    h6: { fontWeight: 600, fontSize: '1rem' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: bdmsColors.navy,
          color: bdmsColors.white,
          boxShadow: '0px 2px 10px rgba(10, 37, 64, 0.15)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 18px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(10, 37, 64, 0.15)',
          },
        },
        containedPrimary: {
          backgroundColor: bdmsColors.navy,
          '&:hover': {
            backgroundColor: bdmsColors.navyLight,
          },
        },
        containedSecondary: {
          backgroundColor: bdmsColors.red,
          '&:hover': {
            backgroundColor: bdmsColors.redDark,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${bdmsColors.border}`,
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0px 6px 16px rgba(0, 0, 0, 0.08)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 6,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          backgroundColor: '#F1F5F9',
          color: bdmsColors.navy,
        },
      },
    },
  },
});
