'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { ProgressBar } from '@/components/design-system/ProgressBar';

import { Waveform } from './Waveform';

type RecorderResult = {
  blob: Blob;
  durationMs: number;
  waveform: number[];
  url: string;
};

type RecorderProps = {
  disabled?: boolean;
  onComplete?: (result: RecorderResult) => void;
  onReset?: () => void;
  maxDurationMs?: number;
};

const MAX_DURATION_DEFAULT = 120_000;

export function Recorder({ disabled, onComplete, onReset, maxDurationMs = MAX_DURATION_DEFAULT }: RecorderProps) {
  const [supported, setSupported] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [waveform, setWaveform] = useState<number[]>([]);
  const chunks = useRef<Blob[]>([]);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && !!navigator.mediaDevices && 'MediaRecorder' in window);
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const resetState = useCallback(() => {
    setIsRecording(false);
    setDurationMs(0);
    chunks.current = [];
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorder.current = null;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setWaveform([]);
    setPermissionError(null);
    onReset?.();
  }, [onReset, previewUrl]);

  const extractWaveform = useCallback(async (blob: Blob) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await blob.arrayBuffer();
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    await audioContext.close();
    const channelData = decoded.getChannelData(0);
    const bucketSize = Math.max(256, Math.floor(channelData.length / 200));
    const buckets: number[] = [];

    for (let i = 0; i < channelData.length; i += bucketSize) {
      let sum = 0;
      for (let j = 0; j < bucketSize && i + j < channelData.length; j += 1) {
        sum += Math.abs(channelData[i + j]);
      }
      buckets.push(sum / bucketSize);
    }

    return buckets.map((value) => Math.min(1, value * 2));
  }, []);

  const finalizeRecording = useCallback(async () => {
    if (chunks.current.length === 0) return;
    const blob = new Blob(chunks.current, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(url);

    const computedWaveform = await extractWaveform(blob);
    setWaveform(computedWaveform);
    onComplete?.({ blob, durationMs, waveform: computedWaveform, url });
  }, [durationMs, extractWaveform, onComplete, previewUrl]);

  const stopRecording = useCallback(async () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!supported || disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      chunks.current = [];
      setPermissionError(null);

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data && event.data.size > 0) {
          chunks.current.push(event.data);
        }
      });
      recorder.addEventListener('stop', () => {
        finalizeRecording().finally(() => {
          chunks.current = [];
        });
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      });

      recorder.start(1000);
      setIsRecording(true);
      setDurationMs(0);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      timerRef.current = window.setInterval(() => {
        setDurationMs((prev) => {
          const next = prev + 200;
          if (next >= maxDurationMs) {
            stopRecording();
            return maxDurationMs;
          }
          return next;
        });
      }, 200);
    } catch (error: any) {
      setPermissionError(error?.message ?? 'Microphone permission denied');
      resetState();
    }
  }, [disabled, finalizeRecording, maxDurationMs, resetState, stopRecording, supported]);

  const formattedDuration = useMemo(() => {
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, [durationMs]);

  return (
    <Card className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Recording duration</p>
          <p className="text-2xl font-semibold text-foreground">{formattedDuration}</p>
        </div>
        <div className="flex gap-2">
          {isRecording ? (
            <Button tone="danger" variant="soft" onClick={stopRecording} iconOnly shape="rounded">
              Stop
            </Button>
          ) : (
            <Button onClick={startRecording} disabled={!supported || disabled} iconOnly shape="rounded">
              Record
            </Button>
          )}
          {!isRecording && (previewUrl || durationMs > 0) && (
            <Button variant="ghost" tone="secondary" onClick={resetState}>
              Reset
            </Button>
          )}
        </div>
      </div>
      <ProgressBar value={(durationMs / maxDurationMs) * 100} aria-label="Recording progress" />

      {permissionError && (
        <p className="rounded-ds-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          {permissionError}
        </p>
      )}

      {previewUrl && (
        <div className="flex flex-col gap-3">
          <Waveform samples={waveform} label="Recording waveform" />
          <audio src={previewUrl} controls className="w-full" />
        </div>
      )}

      {!supported && (
        <p className="text-sm text-muted-foreground">
          Your browser does not support in-app recording. Please update your browser or try a different device.
        </p>
      )}
    </Card>
  );
}

export default Recorder;
