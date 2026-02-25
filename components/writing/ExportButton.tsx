import { useState } from 'react';

import { Button } from '@/components/design-system/Button';
import { useToast } from '@/components/design-system/Toaster';
import { track } from '@/lib/analytics/track';

export type ExportButtonProps = {
  attemptId: string;
  disabled?: boolean;
  className?: string;
};

export function ExportButton({ attemptId, disabled = false, className }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const { error, success } = useToast();

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/writing/export/pdf?attemptId=${attemptId}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `writing-${attemptId}.pdf`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      track('export.pdf', { attemptId });
      success('Export ready — check your downloads.');
    } catch (err) {
      error(err instanceof Error ? err.message : 'Could not generate export');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button className={className} onClick={handleClick} disabled={disabled || loading} variant="secondary">
      {loading ? 'Preparing…' : 'Export PDF'}
    </Button>
  );
}

export default ExportButton;

