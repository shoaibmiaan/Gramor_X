'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';

const isBrowser = typeof window !== 'undefined';

const getSpeechRecognition = () => {
  if (!isBrowser) return null;
  const AnyWindow = window as typeof window & { webkitSpeechRecognition?: any };
  return AnyWindow.SpeechRecognition || AnyWindow.webkitSpeechRecognition || null;
};

type Props = {
  onToggle?: (enabled: boolean) => void;
};

const VoiceDraftToggle: React.FC<Props> = ({ onToggle }) => {
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()));
  }, []);

  const statusLabel = useMemo(() => {
    if (!supported) return 'Unavailable';
    return enabled ? 'Listening' : 'Off';
  }, [enabled, supported]);

  const toggle = () => {
    if (!supported) return;
    setEnabled((prev) => {
      const next = !prev;
      onToggle?.(next);
      return next;
    });
  };

  return (
    <div className="flex items-center justify-between rounded-ds-xl border border-border/70 bg-card/70 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">Voice draft</p>
        <p className="text-xs text-muted-foreground">
          Dictate ideas hands-free. The autosave system will keep transcripts synced every few seconds.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge size="sm" variant={enabled ? 'success' : 'secondary'}>
          {statusLabel}
        </Badge>
        <Button
          size="sm"
          variant={enabled ? 'primary' : 'ghost'}
          onClick={toggle}
          disabled={!supported}
          title={supported ? 'Toggle voice capture' : 'Browser speech recognition not supported'}
        >
          {enabled ? 'Stop' : 'Enable'}
        </Button>
      </div>
    </div>
  );
};

export default VoiceDraftToggle;
