// frontend/src/components/Common/MobileOptimizer.jsx
import React, { useEffect, useCallback } from 'react';
import { useResponsive } from '../../hooks/useResponsive';

export const MobileOptimizer = () => {
  const { isMobile, isTablet, isDesktop, orientation, isTouchDevice } = useResponsive();

  // Fonction pour ajuster les inputs sur mobile
  const adjustInputsForMobile = useCallback(() => {
    if (!isMobile) return;

    const handleFocus = (e) => {
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        // Éviter le zoom automatique sur iOS
        target.style.fontSize = '16px';
        
        // Scroll fluide vers l'input
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };

    const handleBlur = (e) => {
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        // Remettre la taille normale
        target.style.fontSize = '';
      }
    };

    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);

    return () => {
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
    };
  }, [isMobile]);

  // Fonction pour gérer les safe areas (notchs)
  const setupSafeAreas = useCallback(() => {
    if (isMobile || isTablet) {
      document.documentElement.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)');
      document.documentElement.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
      document.documentElement.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left)');
      document.documentElement.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right)');
      
      // Ajouter une classe au body pour les safe areas
      document.body.classList.add('has-safe-areas');
    } else {
      document.body.classList.remove('has-safe-areas');
    }
  }, [isMobile, isTablet]);

  // Fonction pour optimiser la navigation tactile
  const setupTouchOptimizations = useCallback(() => {
    if (!isTouchDevice) return;

    // Ajouter la classe pour les appareils tactiles
    document.body.classList.add('touch-device');

    // Éviter le zoom double-tap sur certains éléments
    const preventZoom = (e) => {
      if (e.target.closest('.no-zoom')) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchstart', preventZoom, { passive: false });

    return () => {
      document.removeEventListener('touchstart', preventZoom);
    };
  }, [isTouchDevice]);

  // Fonction pour gérer l'orientation
  const setupOrientationHandling = useCallback(() => {
    const handleOrientationChange = () => {
      // Déclencher un événement personnalisé pour les composants
      const event = new CustomEvent('orientationChanged', { 
        detail: { orientation, isPortrait: orientation === 'portrait' } 
      });
      window.dispatchEvent(event);

      // Ajuster la hauteur du viewport sur mobile (pour les URL bars)
      if (isMobile) {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      }
    };

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Initialisation
    handleOrientationChange();

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [orientation, isMobile]);

  // Fonction pour optimiser les modals Bootstrap sur mobile
  const setupModalOptimizations = useCallback(() => {
    if (!isMobile) return;

    // Éviter le scroll du body quand un modal est ouvert
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const hasModalOpen = document.body.classList.contains('modal-open');
          if (hasModalOpen) {
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
          } else {
            document.body.style.position = '';
            document.body.style.width = '';
          }
        }
      });
    });

    observer.observe(document.body, { attributes: true });

    return () => observer.disconnect();
  }, [isMobile]);

  // Fonction pour gérer le clavier virtuel (iOS spécifique)
  const setupVirtualKeyboard = useCallback(() => {
    if (!isMobile) return;

    let originalHeight = window.innerHeight;

    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const isKeyboardOpen = currentHeight < originalHeight - 200; // Seuil de 200px

      if (isKeyboardOpen) {
        document.body.classList.add('keyboard-open');
        // Scroll vers l'élément actif
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          setTimeout(() => {
            activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
      } else {
        document.body.classList.remove('keyboard-open');
      }
      
      originalHeight = currentHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  // Configuration du viewport
  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      if (isMobile) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes, viewport-fit=cover');
      } else {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
      }
    }
  }, [isMobile]);

  // Appliquer toutes les optimisations
  useEffect(() => {
    const cleanupInputs = adjustInputsForMobile();
    const cleanupTouch = setupTouchOptimizations();
    const cleanupOrientation = setupOrientationHandling();
    const cleanupModals = setupModalOptimizations();
    const cleanupKeyboard = setupVirtualKeyboard();
    
    setupSafeAreas();

    return () => {
      if (cleanupInputs) cleanupInputs();
      if (cleanupTouch) cleanupTouch();
      if (cleanupOrientation) cleanupOrientation();
      if (cleanupModals) cleanupModals();
      if (cleanupKeyboard) cleanupKeyboard();
    };
  }, [isMobile, isTablet, isTouchDevice, adjustInputsForMobile, setupTouchOptimizations, setupOrientationHandling, setupModalOptimizations, setupVirtualKeyboard, setupSafeAreas]);

  return null; // Ce composant n'affiche rien visuellement
};