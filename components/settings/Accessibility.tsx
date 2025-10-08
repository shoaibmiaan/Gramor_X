'use client';

import React, { useEffect, useState } from 'react';

import { Card } from '@/components/design-system/Card';
import { Toggle } from '@/components/design-system/Toggle';
import { useHighContrast } from '@/context/HighContrastContext';

function useStatusTimer(state: 'idle' | 'saving' | 'saved' | 'error') {
  const [current, setCurrent] = useState(state);

  useEffect(() => {
    if (state === current) return;
    setCurrent(state);
    if (state === 'saved' || state === 'error') {
      const id = window.setTimeout(() => setCurrent('idle'), 2000);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [state, current]);

  return current;
}

export const AccessibilitySettingsCard: React.FC = () => {
  const { enabled, setEnabled } = useHighContrast();
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const displayStatus = useStatusTimer(status);

  const handleToggle = async (next: boolean) => {
    setStatus('saving');
    try {
      setEnabled(next);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  };

  const statusLabel =
    displayStatus === 'saving'
      ? 'Saving…'
      : displayStatus === 'saved'
      ? 'Saved for this device'
      : displayStatus === 'error'
      ? 'Unable to save'
      : null;

  return (
    <Card className="rounded-ds-2xl border border-border bg-card p-6 text-card-foreground">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h2 className="text-h4 font-semibold text-foreground">Accessibility themes</h2>
          <p className="text-small text-muted-foreground max-w-xl">
            Enable the high-contrast palette to boost text legibility and focus rings. We remember this
            preference in your browser.
          </p>
        </div>
        <Toggle
          checked={enabled}
          onChange={handleToggle}
          label="High-contrast mode"
          hint="Applies an AA+ palette with bold focus outlines."
        />
      </div>
      {statusLabel && (
        <p className="mt-4 text-caption text-muted-foreground" role="status" aria-live="polite">
          {statusLabel}
        </p>
      )}
    </Card>
  );
};

export default AccessibilitySettingsCard;
