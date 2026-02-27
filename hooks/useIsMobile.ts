// hooks/useIsMobile.ts
import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 1024; // px – treat anything below as mobile

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile;
}