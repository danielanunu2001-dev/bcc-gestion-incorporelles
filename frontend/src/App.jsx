// frontend/src/App.jsx
import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'sonner';
import { store } from './store';
import { router } from './router';
import { NetworkStatus } from './components/Common/NetworkStatus';
import { MobileOptimizer } from './components/Common/MobileOptimizer';
import { useResponsive } from './hooks/useResponsive';

// Composant interne pour les optimisations mobiles
const AppContent = () => {
  const { isMobile, isTablet } = useResponsive();

  useEffect(() => {
    // Ajuster la vue pour mobile
    if (isMobile) {
      document.documentElement.style.setProperty('--mobile-viewport', 'true');
      
      // Éviter le zoom sur les inputs iOS
      const handleTouchStart = (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
          e.target.style.fontSize = '16px';
        }
      };
      
      document.addEventListener('touchstart', handleTouchStart);
      
      // Ajouter la classe body pour mobile
      document.body.classList.add('mobile-view');
      
      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.body.classList.remove('mobile-view');
      };
    } else if (isTablet) {
      document.body.classList.add('tablet-view');
      return () => document.body.classList.remove('tablet-view');
    } else {
      document.body.classList.add('desktop-view');
      return () => document.body.classList.remove('desktop-view');
    }
  }, [isMobile, isTablet]);

  // Gestion du thème sombre avec Bootstrap
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
    }
    
    // Écouter les changements de thème
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const isDark = document.body.classList.contains('dark-mode');
          localStorage.setItem('theme', isDark ? 'dark' : 'light');
        }
      });
    });
    
    observer.observe(document.body, { attributes: true });
    
    return () => observer.disconnect();
  }, []);

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
        offset={isMobile ? '60px' : '80px'}
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
      <AppContent />
    </Provider>
  );
}

export default App;