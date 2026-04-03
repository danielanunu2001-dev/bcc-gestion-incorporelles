// frontend/src/App.jsx
import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';
import { fr } from 'date-fns/locale/fr';
import { Toaster } from 'sonner';
import { store } from './store';
import { router } from './router';
import { responsiveTheme } from './theme/responsiveTheme';
import { useResponsiveMUI } from './hooks/useResponsiveMUI';
import { NetworkStatus } from './components/Common/NetworkStatus';
import { MobileOptimizer } from './components/Common/MobileOptimizer';

// Composant interne pour les optimisations mobiles
const AppContent = () => {
  const { isMobile, isTablet } = useResponsiveMUI();

  useEffect(() => {
    // Ajuster la vue pour mobile
    if (isMobile) {
      document.documentElement.style.setProperty('--mobile-viewport', 'true');
      // Éviter le zoom sur les inputs iOS
      document.addEventListener('touchstart', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
          e.target.style.fontSize = '16px';
        }
      });
    }
  }, [isMobile]);

  return (
    <>
      <NetworkStatus />
      <MobileOptimizer />
      <RouterProvider router={router} />
      <Toaster 
        position={isMobile ? 'bottom-center' : 'top-right'}
        richColors
        duration={isMobile ? 3000 : 4000}
        closeButton={!isMobile}
        mobileOffset={{ bottom: isTablet ? 80 : 56 }}
        style={{
          fontSize: isMobile ? '0.875rem' : '1rem',
        }}
      />
    </>
  );
};

// Composant principal de l'application
function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={responsiveTheme}>
        <CssBaseline /> {/* Reset CSS + support dark mode */}
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
          <AppContent />
        </LocalizationProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default App;