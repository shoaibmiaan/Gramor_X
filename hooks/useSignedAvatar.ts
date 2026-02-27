'use client';

import { useCallback, useEffect, useState } from 'react';
import { createSignedAvatarUrl, isStoragePath } from '@/lib/avatar';

export function useSignedAvatar(rawValue: string | null | undefined) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!rawValue) {
      setSignedUrl(null);
      setStoragePath(null);
      setIsLoading(false);
      return;
    }

    if (!isStoragePath(rawValue)) {
      setSignedUrl(rawValue);
      setStoragePath(null);
      setIsLoading(false);
      return;
    }

    setStoragePath(rawValue);
    setIsLoading(true);

    try {
      const url = await createSignedAvatarUrl(rawValue);
      setSignedUrl(url);
    } catch (error) {
      console.warn('Failed to refresh signed avatar URL', error);
      setSignedUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, [rawValue]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!rawValue) {
        if (!cancelled) {
          setSignedUrl(null);
          setStoragePath(null);
          setIsLoading(false);
        }
        return;
      }

      if (!isStoragePath(rawValue)) {
        if (!cancelled) {
          setSignedUrl(rawValue);
          setStoragePath(null);
          setIsLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setStoragePath(rawValue);
        setIsLoading(true);
      }

      try {
        const url = await createSignedAvatarUrl(rawValue);
        if (!cancelled) {
          setSignedUrl(url);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('Failed to create signed avatar URL', error);
          setSignedUrl(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rawValue]);

  return { signedUrl, storagePath, refresh, isLoading } as const;
}
