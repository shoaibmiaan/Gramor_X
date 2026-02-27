'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';

type HighContrastContextValue = {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  toggle: () => void;
};

const STORAGE_KEY = 'gramorx:preferences:high-contrast';

const HighContrastContext = createContext<HighContrastContextValue | undefined>(undefined);
HighContrastContext.displayName = 'HighContrastContext';

function applyDocumentTheme(enabled: boolean) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (enabled) {
    root.setAttribute('data-theme', 'hc');
  } else {
    root.removeAttribute('data-theme');
  }
}

export const HighContrastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const initial = stored === '1';
      if (initial) applyDocumentTheme(true);
      return initial;
    } catch {
      return false;
    }
  });

  const setEnabled = (value: boolean) => {
    setEnabledState((prev) => {
      if (prev === value) return prev;
      applyDocumentTheme(value);
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
        }
      } catch {
        // ignore storage errors
      }
      return value;
    });
  };

  const toggle = () => setEnabled(!enabled);

  const value = useMemo<HighContrastContextValue>(
    () => ({ enabled, setEnabled, toggle }),
    [enabled],
  );

  return <HighContrastContext.Provider value={value}>{children}</HighContrastContext.Provider>;
};

export function useHighContrast(): HighContrastContextValue {
  const ctx = useContext(HighContrastContext);
  if (!ctx) {
    throw new Error('useHighContrast must be used within a HighContrastProvider');
  }
  return ctx;
}
