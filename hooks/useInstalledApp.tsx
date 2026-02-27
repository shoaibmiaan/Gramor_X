import { createContext, type PropsWithChildren, useContext, useEffect, useState } from 'react';

import { isBrowser } from '@/lib/env';

export type AppDisplayMode = 'browser' | 'standalone' | 'twa' | 'minimal-ui';

type InstalledAppState = {
  displayMode: AppDisplayMode;
  isInstalled: boolean;
  isStandalone: boolean;
};

const DEFAULT_STATE: InstalledAppState = {
  displayMode: 'browser',
  isInstalled: false,
  isStandalone: false,
};

const InstalledAppContext = createContext<InstalledAppState>(DEFAULT_STATE);

function computeDisplayMode(): InstalledAppState {
  if (!isBrowser) return DEFAULT_STATE;

  const nav = window.navigator as Navigator & { standalone?: boolean };
  const isStandalone = nav.standalone === true || window.matchMedia?.('(display-mode: standalone)')?.matches;
  const isTwa = window.matchMedia?.('(display-mode: fullscreen)')?.matches && document.referrer.startsWith('android-app://');
  const minimalUi = window.matchMedia?.('(display-mode: minimal-ui)')?.matches ?? false;

  if (isStandalone) {
    return { displayMode: 'standalone', isInstalled: true, isStandalone: true };
  }
  if (isTwa) {
    return { displayMode: 'twa', isInstalled: true, isStandalone: true };
  }
  if (minimalUi) {
    return { displayMode: 'minimal-ui', isInstalled: false, isStandalone: false };
  }
  return DEFAULT_STATE;
}

function useInstalledAppInternal(): InstalledAppState {
  const [state, setState] = useState<InstalledAppState>(() => computeDisplayMode());

  useEffect(() => {
    if (!isBrowser) return;

    const update = () => {
      setState(computeDisplayMode());
    };

    const matchStandalone = window.matchMedia?.('(display-mode: standalone)');
    matchStandalone?.addEventListener('change', update);
    window.addEventListener('appinstalled', update);

    update();

    return () => {
      matchStandalone?.removeEventListener('change', update);
      window.removeEventListener('appinstalled', update);
    };
  }, []);

  useEffect(() => {
    if (!isBrowser) return;
    const root = document.documentElement;
    root.dataset.appDisplayMode = state.displayMode;
    if (state.isInstalled) {
      root.classList.add('gx-app-installed');
    } else {
      root.classList.remove('gx-app-installed');
    }
  }, [state.displayMode, state.isInstalled]);

  return state;
}

export function InstalledAppProvider({ children }: PropsWithChildren) {
  const value = useInstalledAppInternal();
  return <InstalledAppContext.Provider value={value}>{children}</InstalledAppContext.Provider>;
}

export function useInstalledApp() {
  return useContext(InstalledAppContext);
}

export function useIsInstalledApp() {
  const { isInstalled } = useInstalledApp();
  return isInstalled;
}

export function useDisplayMode() {
  const { displayMode } = useInstalledApp();
  return displayMode;
}
