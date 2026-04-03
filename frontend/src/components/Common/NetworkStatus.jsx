// frontend/src/components/Common/NetworkStatus.jsx
import React, { useState, useEffect } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { WifiOff } from '@mui/icons-material';

export const NetworkStatus = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showOffline, setShowOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowOffline(true);
      setTimeout(() => setShowOffline(false), 3000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showOffline) return null;

  return (
    <Snackbar
      open={showOffline}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      autoHideDuration={isOffline ? null : 3000}
    >
      <Alert 
        severity={isOffline ? 'error' : 'success'}
        icon={<WifiOff />}
        sx={{ width: '100%' }}
      >
        {isOffline ? 'Connexion perdue' : 'Connexion rétablie'}
      </Alert>
    </Snackbar>
  );
};