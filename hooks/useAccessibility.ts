// hooks/useAccessibility.ts
import { useState, useEffect, useCallback } from 'react';

type FontSize = 'small' | 'medium' | 'large';

interface AccessibilitySettings {
  highContrast: boolean;
  reduceMotion: boolean;
  fontSize: FontSize;
}

interface UseAccessibilityReturn extends AccessibilitySettings {
  loading: boolean;
  error: string | null;
  setHighContrast: (value: boolean) => void;
  setReduceMotion: (value: boolean) => void;
  setFontSize: (value: FontSize) => void;
  saveSettings: (settings?: Partial<AccessibilitySettings>) => Promise<void>;
}

const STORAGE_KEY = 'gramorx_accessibility';

// Default to system preferences
const getSystemPreferences = (): Partial<AccessibilitySettings> => {
  const prefersHighContrast = window.matchMedia?.('(prefers-contrast: more)').matches;
  const prefersReduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return {
    highContrast: prefersHighContrast,
    reduceMotion: prefersReduceMotion,
  };
};

export function useAccessibility(): UseAccessibilityReturn {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    highContrast: false,
    reduceMotion: false,
    fontSize: 'medium',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load saved settings or system defaults
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AccessibilitySettings;
        setSettings(parsed);
      } else {
        const system = getSystemPreferences();
        setSettings(prev => ({ ...prev, ...system }));
      }
    } catch (err) {
      setError('Failed to load accessibility settings');
    } finally {
      setLoading(false);
    }
  }, []);

  // Apply settings to DOM
  useEffect(() => {
    if (loading) return;

    const root = document.documentElement;

    // High contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Reduce motion
    if (settings.reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Font size
    root.setAttribute('data-font-size', settings.fontSize);
  }, [settings, loading]);

  const setHighContrast = useCallback((value: boolean) => {
    setSettings(prev => ({ ...prev, highContrast: value }));
  }, []);

  const setReduceMotion = useCallback((value: boolean) => {
    setSettings(prev => ({ ...prev, reduceMotion: value }));
  }, []);

  const setFontSize = useCallback((value: FontSize) => {
    setSettings(prev => ({ ...prev, fontSize: value }));
  }, []);

  const saveSettings = useCallback(
    async (newSettings?: Partial<AccessibilitySettings>) => {
      try {
        const toSave = newSettings ? { ...settings, ...newSettings } : settings;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        if (newSettings) {
          setSettings(toSave);
        }
      } catch (err) {
        setError('Failed to save settings');
        throw err;
      }
    },
    [settings]
  );

  return {
    ...settings,
    loading,
    error,
    setHighContrast,
    setReduceMotion,
    setFontSize,
    saveSettings,
  };
}