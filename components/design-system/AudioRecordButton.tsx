'use client';
import React, { useEffect, useRef, useState } from "react";
import clsx from 'clsx';

export type AudioRecordButtonProps = {
  onStop?: (blob: Blob) => void;
  className?: string;
  disabled?: boolean;
};

export const AudioRecordButton: React.FC<AudioRecordButtonProps> = ({
  onStop,
  className = "",
  disabled,
}) => {
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        !!navigator.mediaDevices &&
        !!window.MediaRecorder,
    );
  }, []);

  const start = async () => {
    if (!supported || disabled) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    chunks.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      onStop?.(blob);
      stream.getTracks().forEach((t) => t.stop());
    };
    rec.start();
    mediaRef.current = rec;
    setRecording(true);
  };

  const stop = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        className={clsx('rounded-ds-xl border border-border bg-panel px-md py-xs text-small text-muted', className)}
      >
        Recording not supported
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={recording ? stop : start}
      disabled={disabled}
      className={clsx(
        'inline-flex items-center gap-sm rounded-ds-xl border border-border px-md py-xs text-small transition-colors',
        'hover:bg-panel/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        recording ? 'bg-warn/20 text-warn' : 'bg-card text-text',
        className
      )}
      aria-pressed={recording}
      aria-label={recording ? "Stop recording" : "Start recording"}
    >
      <span className={clsx('inline-block h-2.5 w-2.5 rounded-sm', recording ? 'bg-warn' : 'bg-ok')} />
      {recording ? "Stop" : "Record"}
    </button>
  );
};
