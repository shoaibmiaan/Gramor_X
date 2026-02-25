// components/providers/AnimationProvider.tsx
'use client';

import { useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';

interface AnimationProviderProps {
  children: React.ReactNode;
}

export function AnimationProvider({ children }: AnimationProviderProps) {
  useEffect(() => {
    // Initialize AOS with custom settings
    AOS.init({
      duration: 600,
      easing: 'ease-out-cubic',
      once: true,
      offset: 50,
      delay: 100,
      mirror: false,
      anchorPlacement: 'top-bottom',
    });

    // Refresh AOS on route changes
    const handleRouteChange = () => {
      AOS.refresh();
    };

    // Listen for route changes
    window.addEventListener('load', handleRouteChange);
    window.addEventListener('resize', handleRouteChange);

    return () => {
      window.removeEventListener('load', handleRouteChange);
      window.removeEventListener('resize', handleRouteChange);
    };
  }, []);

  return <>{children}</>;
}