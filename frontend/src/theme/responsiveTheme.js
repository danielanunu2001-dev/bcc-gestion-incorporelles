// frontend/src/theme/responsiveTheme.js
import { createTheme } from '@mui/material/styles';

export const responsiveTheme = createTheme({
  breakpoints: {
    values: {
      xs: 0,      // smartphones (0-600px)
      sm: 600,    // grands smartphones (600-900px)
      md: 900,    // tablettes (900-1200px)
      lg: 1200,   // desktop (1200-1536px)
      xl: 1536,   // grands écrans (1536px+)
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: 'clamp(1.5rem, 8vw, 2.5rem)',
      fontWeight: 600,
    },
    h2: {
      fontSize: 'clamp(1.3rem, 6vw, 2rem)',
      fontWeight: 600,
    },
    h3: {
      fontSize: 'clamp(1.1rem, 5vw, 1.8rem)',
      fontWeight: 600,
    },
    h4: {
      fontSize: 'clamp(1rem, 4.5vw, 1.5rem)',
      fontWeight: 600,
    },
    h5: {
      fontSize: 'clamp(0.9rem, 4vw, 1.25rem)',
      fontWeight: 600,
    },
    h6: {
      fontSize: 'clamp(0.85rem, 3.5vw, 1.1rem)',
      fontWeight: 600,
    },
    body1: {
      fontSize: 'clamp(0.875rem, 3.5vw, 1rem)',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: 'clamp(0.75rem, 3vw, 0.875rem)',
      lineHeight: 1.43,
    },
    button: {
      fontSize: 'clamp(0.8rem, 3.5vw, 0.875rem)',
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 44,
          padding: '8px 16px',
          '@media (max-width: 600px)': {
            padding: '10px 16px',
          },
        },
        sizeSmall: {
          minHeight: 36,
          '@media (max-width: 600px)': {
            minHeight: 40,
          },
        },
        sizeLarge: {
          minHeight: 48,
          '@media (max-width: 600px)': {
            minHeight: 52,
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& input': {
            '@media (max-width: 600px)': {
              fontSize: '16px', // Évite le zoom sur iOS
            },
          },
          '& textarea': {
            '@media (max-width: 600px)': {
              fontSize: '16px',
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          '@media (max-width: 600px)': {
            fontSize: '16px',
            minHeight: 44,
            padding: '10px 14px',
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            fontSize: '0.875rem',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          '@media (max-width: 600px)': {
            margin: 16,
            width: 'calc(100% - 32px)',
            maxHeight: 'calc(100% - 32px)',
            borderRadius: 12,
          },
          '@media (min-width: 601px) and (max-width: 900px)': {
            margin: 24,
            width: 'calc(100% - 48px)',
            maxHeight: 'calc(100% - 48px)',
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          '@media (max-width: 600px)': {
            width: '85%',
            maxWidth: 320,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            borderRadius: 12,
          },
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          '@media (max-width: 900px)': {
            display: 'block',
            overflowX: 'auto',
          },
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            minHeight: 56,
            padding: '0 16px',
          },
        },
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            bottom: 16,
            left: 16,
            right: 16,
          },
        },
      },
    },
  },
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb',
      light: '#3b82f6',
      dark: '#1e3a8a',
    },
    secondary: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    error: {
      main: '#ef4444',
    },
    warning: {
      main: '#f59e0b',
    },
    info: {
      main: '#3b82f6',
    },
    success: {
      main: '#10b981',
    },
    background: {
      default: '#f1f5f9',
      paper: '#ffffff',
    },
  },
});

// Thème sombre optionnel
export const darkTheme = {
  ...responsiveTheme,
  palette: {
    ...responsiveTheme.palette,
    mode: 'dark',
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
  },
};  