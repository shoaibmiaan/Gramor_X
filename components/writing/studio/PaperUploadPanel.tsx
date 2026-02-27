import { useRef, useState } from 'react';

import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { ProgressBar } from '@/components/design-system/ProgressBar';

interface PaperUploadPanelProps {
  attemptId: string | null;
  onInsert: (payload: { text: string; legibility: number }) => void;
}

export function PaperUploadPanel({ attemptId, onInsert }: PaperUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [legibility, setLegibility] = useState<number | null>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !attemptId) return;

    const formData = new FormData();
    formData.append('attemptId', attemptId);
    formData.append('file', file);
    setLoading(true);
    setMessage(null);
    setLegibility(null);

    try {
      const response = await fetch('/api/writing/originals/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error((payload as { error?: string }).error ?? 'Upload failed');
      }
      const payload = (await response.json()) as { text: string; legibility: number };
      if (payload.text) {
        onInsert({ text: payload.text, legibility: payload.legibility ?? 0 });
        setMessage('OCR complete — text inserted into your draft.');
      } else {
        setMessage('We saved your image. Try again if text recognition was empty.');
      }
      setLegibility(payload.legibility ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to process image');
    } finally {
      setLoading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <Card className="card-surface space-y-4 p-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Upload handwritten essay</h3>
        <p className="text-xs text-muted-foreground">Snap a clear photo of your paper response. We’ll OCR it and keep the original image for review.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} disabled={!attemptId || loading} className="hidden" />
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={!attemptId || loading}>
          {loading ? 'Processing…' : 'Upload photo'}
        </Button>
        {!attemptId && <p className="text-xs text-muted-foreground">Start the attempt to enable uploads.</p>}
      </div>
      {typeof legibility === 'number' && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Legibility score</p>
          <ProgressBar value={legibility * 100} ariaLabel="Legibility score" />
        </div>
      )}
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </Card>
  );
}
