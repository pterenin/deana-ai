
import { useState, useEffect } from 'react';

interface MobileInfo {
  isMobile: boolean;
  isNative: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  safeAreaTop: number;
  safeAreaBottom: number;
}

export const useMobile = (): MobileInfo => {
  const [mobileInfo, setMobileInfo] = useState<MobileInfo>({
    isMobile: false,
    isNative: false,
    isIOS: false,
    isAndroid: false,
    safeAreaTop: 0,
    safeAreaBottom: 0,
  });

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent;
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isNative = !!(window as any).Capacitor;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent);
      const isAndroid = /Android/.test(userAgent);

      // Get safe area insets if available
      const computedStyle = getComputedStyle(document.documentElement);
      const safeAreaTop = parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0');
      const safeAreaBottom = parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0');

      setMobileInfo({
        isMobile,
        isNative,
        isIOS,
        isAndroid,
        safeAreaTop,
        safeAreaBottom,
      });
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return mobileInfo;
};
