// frontend/src/components/Common/MobileOptimizer.jsx
import React, { useEffect } from 'react';
import { useResponsiveMUI } from '../../hooks/useResponsiveMUI';

export const MobileOptimizer = () => {
  const { isMobile, isTablet, orientation } = useResponsiveMUI();

  useEffect(() => {
    if (isMobile) {
      // Ajouter les métas pour les notchs
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes, viewport-fit=cover');
      }

      // Désactiver le zoom sur les inputs
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.addEventListener('focus', () => {
          input.style.fontSize = '16px';
        });
      });
    }

    // Ajuster les safe areas pour les notchs
    if (isMobile || isTablet) {
      document.documentElement.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)');
      document.documentElement.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
    }
  }, [isMobile, isTablet]);

  return null; // Ce composant n'affiche rien visuellement
};