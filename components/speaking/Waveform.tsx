'use client';

import { useEffect, useRef } from 'react';

type WaveformProps = {
  samples: number[];
  height?: number;
  className?: string;
  label?: string;
};

export function Waveform({ samples, height = 96, className, label }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth * dpr;
    const canvasHeight = height * dpr;
    canvas.width = width;
    canvas.height = canvasHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, canvasHeight);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--colors-primary') || '#2563eb';

    const barWidth = Math.max(2, Math.floor(width / Math.max(samples.length, 1)));
    samples.forEach((value, index) => {
      const normalized = Math.max(0.05, Math.min(1, value));
      const barHeight = normalized * (canvasHeight / 2);
      const x = index * barWidth;
      const y = canvasHeight / 2 - barHeight;
      const width = barWidth * 0.8;
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).beginPath();
        (ctx as any).roundRect(x, y, width, barHeight * 2, 4 * dpr);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, width, barHeight * 2);
      }
    });
  }, [samples, height]);

  return (
    <div className={['w-full overflow-hidden rounded-ds-xl bg-muted/20', className].filter(Boolean).join(' ')}>
      <canvas ref={canvasRef} className="h-24 w-full" aria-hidden="true" />
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}

export default Waveform;
