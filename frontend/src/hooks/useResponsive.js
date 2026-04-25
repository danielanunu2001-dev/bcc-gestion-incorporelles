// frontend/src/hooks/useResponsive.js
import { useState, useEffect, useCallback } from 'react';

// Types d'appareils prédéfinis
const DEVICE_TYPES = {
  SMALL_MOBILE: 'small-mobile',
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
  LARGE_DESKTOP: 'large-desktop'
};

// Breakpoints Bootstrap 5 (standard)
const BREAKPOINTS = {
  XS: 0,      // < 576px
  SM: 576,    // ≥ 576px
  MD: 768,    // ≥ 768px
  LG: 992,    // ≥ 992px
  XL: 1200,   // ≥ 1200px
  XXL: 1400   // ≥ 1400px
};

// Fonction pour déterminer le type d'appareil
const getDeviceType = (width) => {
  if (width < BREAKPOINTS.SM) return DEVICE_TYPES.SMALL_MOBILE;
  if (width < BREAKPOINTS.MD) return DEVICE_TYPES.MOBILE;
  if (width < BREAKPOINTS.LG) return DEVICE_TYPES.TABLET;
  if (width < BREAKPOINTS.XXL) return DEVICE_TYPES.DESKTOP;
  return DEVICE_TYPES.LARGE_DESKTOP;
};

// Fonction pour obtenir la classe Bootstrap correspondante
const getBootstrapClass = (width) => {
  if (width < BREAKPOINTS.SM) return 'col-12';
  if (width < BREAKPOINTS.MD) return 'col-sm-6';
  if (width < BREAKPOINTS.LG) return 'col-md-4';
  if (width < BREAKPOINTS.XL) return 'col-lg-3';
  return 'col-xl-2';
};

export const useResponsive = () => {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
    isMobile: typeof window !== 'undefined' ? window.innerWidth < BREAKPOINTS.MD : false,
    isTablet: typeof window !== 'undefined' ? window.innerWidth >= BREAKPOINTS.MD && window.innerWidth < BREAKPOINTS.LG : false,
    isDesktop: typeof window !== 'undefined' ? window.innerWidth >= BREAKPOINTS.LG : false,
    isLargeDesktop: typeof window !== 'undefined' ? window.innerWidth >= BREAKPOINTS.XXL : false,
    isPortrait: typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false,
    isLandscape: typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false,
    orientation: typeof window !== 'undefined' ? (window.innerHeight > window.innerWidth ? 'portrait' : 'landscape') : 'landscape',
    deviceType: typeof window !== 'undefined' ? getDeviceType(window.innerWidth) : DEVICE_TYPES.DESKTOP,
    bootstrapClass: typeof window !== 'undefined' ? getBootstrapClass(window.innerWidth) : 'col-lg-3',
    breakpoint: getBreakpoint(typeof window !== 'undefined' ? window.innerWidth : 1200),
    isTouchDevice: typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0),
    pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  });

  // Fonction pour obtenir le breakpoint actuel
  const getBreakpoint = (width) => {
    if (width < BREAKPOINTS.SM) return 'xs';
    if (width < BREAKPOINTS.MD) return 'sm';
    if (width < BREAKPOINTS.LG) return 'md';
    if (width < BREAKPOINTS.XL) return 'lg';
    if (width < BREAKPOINTS.XXL) return 'xl';
    return 'xxl';
  };

  // Vérifier si c'est un appareil mobile (avec détection user-agent basique)
  const checkIsMobileDevice = useCallback(() => {
    if (typeof navigator === 'undefined') return false;
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /android|iPad|iPhone|iPod|BlackBerry|Windows Phone|webOS|Opera Mini|IEMobile|Mobile/i.test(userAgent);
  }, []);

  // Gestionnaire de redimensionnement optimisé
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId;
    let rafId;

    const handleResize = () => {
      // Annuler les animations en cours
      if (rafId) cancelAnimationFrame(rafId);
      
      rafId = requestAnimationFrame(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        setDimensions({
          width,
          height,
          isMobile: width < BREAKPOINTS.MD,
          isTablet: width >= BREAKPOINTS.MD && width < BREAKPOINTS.LG,
          isDesktop: width >= BREAKPOINTS.LG,
          isLargeDesktop: width >= BREAKPOINTS.XXL,
          isPortrait: height > width,
          isLandscape: width > height,
          orientation: height > width ? 'portrait' : 'landscape',
          deviceType: getDeviceType(width),
          bootstrapClass: getBootstrapClass(width),
          breakpoint: getBreakpoint(width),
          isTouchDevice: dimensions.isTouchDevice,
          pixelRatio: window.devicePixelRatio || 1
        });
      });
    };

    // Debounce pour éviter trop de renders
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Nettoyage
    return () => {
      clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [dimensions.isTouchDevice]);

  return {
    ...dimensions,
    // Alias pour plus de lisibilité
    isSmallMobile: dimensions.deviceType === DEVICE_TYPES.SMALL_MOBILE,
    isLargeDesktop: dimensions.deviceType === DEVICE_TYPES.LARGE_DESKTOP,
    isMobileDevice: checkIsMobileDevice(),
    // Breakpoints Bootstrap
    breakpoints: BREAKPOINTS,
    // Méthodes utilitaires
    isBreakpoint: (breakpoint) => dimensions.breakpoint === breakpoint,
    isGreaterThan: (breakpoint) => {
      const breakpointValues = { xs: 0, sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1400 };
      return dimensions.width >= (breakpointValues[breakpoint] || 0);
    },
    isLessThan: (breakpoint) => {
      const breakpointValues = { xs: 576, sm: 768, md: 992, lg: 1200, xl: 1400, xxl: Infinity };
      return dimensions.width < (breakpointValues[breakpoint] || Infinity);
    },
    // Récupérer la classe responsive pour les grilles Bootstrap
    getColClass: (cols = { xs: 12, sm: 6, md: 4, lg: 3, xl: 2 }) => {
      const classes = [];
      if (cols.xs) classes.push(`col-${cols.xs}`);
      if (cols.sm) classes.push(`col-sm-${cols.sm}`);
      if (cols.md) classes.push(`col-md-${cols.md}`);
      if (cols.lg) classes.push(`col-lg-${cols.lg}`);
      if (cols.xl) classes.push(`col-xl-${cols.xl}`);
      if (cols.xxl) classes.push(`col-xxl-${cols.xxl}`);
      return classes.join(' ');
    }
  };
};

// Hook simplifié pour les composants qui n'ont besoin que du type d'appareil
export const useDeviceType = () => {
  const { deviceType, isMobile, isTablet, isDesktop } = useResponsive();
  return { deviceType, isMobile, isTablet, isDesktop };
};

// Hook pour les grilles Bootstrap responsives
export const useResponsiveGrid = (config = {}) => {
  const responsive = useResponsive();
  const defaultConfig = {
    xs: 12,
    sm: 6,
    md: 4,
    lg: 3,
    xl: 2,
    xxl: 2
  };
  
  const cols = { ...defaultConfig, ...config };
  
  return {
    colClass: responsive.getColClass(cols),
    cols,
    responsive
  };
};