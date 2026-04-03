// frontend/src/components/LazyLoad.jsx
import React, { Suspense, lazy } from 'react';
import { CircularProgress, Box } from '@mui/material';
import { useResponsiveMUI } from '../hooks/useResponsiveMUI';

// Chargement différé pour optimiser le mobile
export const LazyLoad = ({ componentPath, fallback }) => {
  const Component = lazy(() => import(`${componentPath}`));
  const { isMobile } = useResponsiveMUI();

  return (
    <Suspense fallback={
      fallback || (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress size={isMobile ? 40 : 60} />
        </Box>
      )
    }>
      <Component />
    </Suspense>
  );
};