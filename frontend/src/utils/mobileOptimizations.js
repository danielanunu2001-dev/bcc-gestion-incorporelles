// frontend/src/utils/mobileOptimizations.js
import { useEffect } from 'react';

export const useMobileOptimizations = () => {
  useEffect(() => {
    // Désactiver le zoom sur les inputs (iOS)
    const handleTouchStart = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
        e.target.style.fontSize = '16px';
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);
};