// hooks/useDeviceDetect.js
import { useState, useEffect } from 'react';

export const useDeviceDetect = () => {
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isSmallMobile: false,
    isLargeMobile: false,
    orientation: 'portrait',
    pixelRatio: 1
  });

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const pixelRatio = window.devicePixelRatio || 1;
      
      setDeviceInfo({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isSmallMobile: width < 380,
        isLargeMobile: width >= 380 && width < 768,
        orientation: height > width ? 'portrait' : 'landscape',
        pixelRatio: pixelRatio
      });
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  return deviceInfo;
};