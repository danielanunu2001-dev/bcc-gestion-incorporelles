// frontend/src/hooks/useNetwork.js
import { useState, useEffect } from 'react';

export const useNetwork = () => {
  const [networkInfo, setNetworkInfo] = useState({
    isSlow: false,
    isOffline: false,
    type: 'unknown',
  });

  useEffect(() => {
    // Détecter la connexion lente
    if ('connection' in navigator) {
      const connection = navigator.connection;
      const updateNetworkInfo = () => {
        setNetworkInfo({
          isSlow: connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g',
          isOffline: !navigator.onLine,
          type: connection.effectiveType,
        });
      };
      
      updateNetworkInfo();
      connection.addEventListener('change', updateNetworkInfo);
      
      return () => connection.removeEventListener('change', updateNetworkInfo);
    }
  }, []);

  return networkInfo;
};