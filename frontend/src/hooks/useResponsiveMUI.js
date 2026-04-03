// frontend/src/hooks/useResponsiveMUI.js
import { useTheme, useMediaQuery } from '@mui/material';

export const useResponsiveMUI = () => {
  const theme = useTheme();
  
  return {
    // Breakpoints MUI
    isMobile: useMediaQuery(theme.breakpoints.down('sm')),
    isTablet: useMediaQuery(theme.breakpoints.between('sm', 'md')),
    isDesktop: useMediaQuery(theme.breakpoints.up('md')),
    isLargeDesktop: useMediaQuery(theme.breakpoints.up('lg')),
    
    // Tailles spécifiques
    isSmallMobile: useMediaQuery('(max-width: 380px)'),
    isLargeMobile: useMediaQuery(theme.breakpoints.between('sm', 'md')),
    
    // Orientation
    isPortrait: useMediaQuery('(orientation: portrait)'),
    isLandscape: useMediaQuery('(orientation: landscape)'),
    
    // Méthodes utilitaires
    currentBreakpoint: () => {
      if (useMediaQuery(theme.breakpoints.down('sm'))) return 'xs';
      if (useMediaQuery(theme.breakpoints.between('sm', 'md'))) return 'sm';
      if (useMediaQuery(theme.breakpoints.between('md', 'lg'))) return 'md';
      if (useMediaQuery(theme.breakpoints.up('lg'))) return 'lg';
      return 'xl';
    },
    
    // Padding/margin responsifs
    responsiveSpacing: (xs, sm, md, lg = md, xl = lg) => {
      const width = window.innerWidth;
      if (width < 600) return xs;
      if (width < 900) return sm;
      if (width < 1200) return md;
      if (width < 1536) return lg;
      return xl;
    },
    
    // Taille de police responsive
    responsiveFontSize: (mobile, tablet, desktop) => {
      const width = window.innerWidth;
      if (width < 768) return mobile;
      if (width < 1024) return tablet;
      return desktop;
    },
  };
};