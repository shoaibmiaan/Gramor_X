import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useToast } from '@/components/design-system/Toaster';
import { useRecorder } from '@/hooks/useRecorder';

type Phase = 'idle' | 'recording' | 'preview' | 'uploading';

type PreviewState = {
  file: File;
  meta: { durationSec: number; mime: string };
};

export type RecorderHandle = {
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<{ file?: File }>;
  reset: () => void;
};
export type RecorderProps = {
  autoStart?: boolean;
  maxDurationSec?: number; // hard stop
  onComplete?: (file: File, meta: { durationSec: number; mime: string }) => void | Promise<void>;
  onError?: (msg: string) => void;
  className?: string;
};

export const Recorder = forwardRef<RecorderHandle, RecorderProps>(
  (
    {
      autoStart = false,
      maxDurationSec = 120,
      onComplete,
      onError,
      className = '',
    },
    ref,
  ) => {
    const { success: toastSuccess, error: toastError } = useToast();
    const {
      isRecording,
      isPaused,
      durationSec,
      mimeType,
      audioUrl,
      start,
      pause,
      resume,
      stop,
      error,
      reset,
    } = useRecorder({ preferredMimeType: 'audio/webm' });

    const [phase, setPhase] = useState<Phase>('idle');
    const [preview, setPreview] = useState<PreviewState | null>(null);
    const startedRef = useRef(false);
    const durationRef = useRef(0);

    useEffect(() => {
      durationRef.current = durationSec;
    }, [durationSec]);

    useEffect(() => {
      if (error) {
        const message = error;
        toastError('Recorder error', message);
        onError?.(message);
      }
    }, [error, onError, toastError]);

    useEffect(() => {
      if (!audioUrl) return;
      return () => {
        try {
          URL.revokeObjectURL(audioUrl);
        } catch {}
      };
    }, [audioUrl]);

    const finalizeRecording = useCallback(async () => {
      try {
        const result = await stop();
        const file = result.file;
        if (file) {
          const meta = { durationSec: Math.max(1, durationRef.current), mime: mimeType };
          setPreview({ file, meta });
          setPhase('preview');
        } else {
          setPhase('idle');
        }
        return result;
      } catch (e) {
        const message = (e as { message?: string })?.message ?? 'Failed to stop recording';
        toastError('Recorder error', message);
        onError?.(message);
        setPhase('idle');
        return {};
      }
    }, [mimeType, onError, stop, toastError]);

    const handleStart = useCallback(async () => {
      try {
        await start();
        setPhase('recording');
      } catch (e) {
        const message = (e as { message?: string })?.message ?? 'Microphone access denied';
        toastError('Could not start recording', message);
        onError?.(message);
        setPhase('idle');
      }
    }, [onError, start, toastError]);

    const handlePause = useCallback(() => {
      pause();
    }, [pause]);

    const handleResume = useCallback(() => {
      resume();
    }, [resume]);

    const handleReset = useCallback(() => {
      setPreview(null);
      setPhase('idle');
      reset();
    }, [reset]);

    const handleSubmit = useCallback(async () => {
      if (!preview) return;
      try {
        setPhase('uploading');
        await Promise.resolve(onComplete?.(preview.file, preview.meta));
        toastSuccess('Recording submitted');
        handleReset();
      } catch (e) {
        const message = (e as { message?: string })?.message ?? 'Upload failed';
        toastError('Upload failed', message);
        onError?.(message);
        setPhase('preview');
      }
    }, [handleReset, onComplete, onError, preview, toastError, toastSuccess]);

    const handleAutoStart = useCallback(() => {
      if (!autoStart || startedRef.current || isRecording || durationSec > 0) return;
      startedRef.current = true;
      void handleStart();
    }, [autoStart, durationSec, handleStart, isRecording]);

    useEffect(() => {
      handleAutoStart();
    }, [handleAutoStart]);

    useEffect(() => {
      if (isRecording) {
        setPhase((prev) => (prev === 'uploading' ? prev : 'recording'));
      }
    }, [isRecording]);

    useEffect(() => {
      if (isRecording && durationSec >= maxDurationSec) {
        void finalizeRecording();
      }
    }, [durationSec, finalizeRecording, isRecording, maxDurationSec]);

    useImperativeHandle(ref, () => ({
      start: handleStart,
      pause: handlePause,
      resume: handleResume,
      stop: finalizeRecording,
      reset: handleReset,
    }));

    const minutes = Math.floor(durationSec / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (durationSec % 60).toString().padStart(2, '0');

    const status = useMemo(() => {
      if (phase === 'uploading') return 'Uploading';
      if (phase === 'preview') return 'Preview';
      if (phase === 'recording') return isPaused ? 'Paused' : 'Recording';
      return 'Idle';
    }, [phase, isPaused]);

    const canStart = phase === 'idle';
    const canPause = phase === 'recording' && !isPaused;
    const canResume = phase === 'recording' && isPaused;
    const canStop = phase === 'recording';
    const canSubmit = phase === 'preview';

    const loading = phase === 'uploading';

    return (
      <div className={`card-surface p-4 ${className}`} aria-busy={loading}>
        <div className="flex items-center justify-between">
          <div className="text-small text-grayish">
            Status: <span className="font-medium">{status}</span>
          </div>
          <div className="font-mono text-h4 tabular-nums">
            {minutes}:{seconds}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="px-3 py-2 rounded-xl bg-success text-white disabled:bg-grayish/30 disabled:text-grayish"
            disabled={!canStart || loading}
            onClick={handleStart}
          >
            Start
          </button>
          <button
            className="px-3 py-2 rounded-xl bg-warning text-black disabled:bg-grayish/30 disabled:text-grayish"
            disabled={!canPause || loading}
            onClick={handlePause}
          >
            Pause
          </button>
          <button
            className="px-3 py-2 rounded-xl bg-electricBlue text-white disabled:bg-grayish/30 disabled:text-grayish"
            disabled={!canResume || loading}
            onClick={handleResume}
          >
            Resume
          </button>
          <button
            className="px-3 py-2 rounded-xl bg-danger text-white disabled:bg-grayish/30 disabled:text-grayish"
            disabled={!canStop || loading}
            onClick={() => void finalizeRecording()}
          >
            Stop
          </button>
          <button
            className="ml-auto px-3 py-2 rounded-xl border border-lightBorder text-lightText disabled:opacity-60 dark:border-white/10 dark:text-white"
            onClick={handleReset}
            disabled={phase === 'recording' || loading}
          >
            Reset
          </button>
        </div>

        {preview && phase !== 'uploading' && (
          <div className="mt-4 space-y-3">
            <audio src={audioUrl ?? undefined} controls className="w-full" />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded-xl border border-lightBorder text-lightText dark:border-white/10 dark:text-white"
                onClick={handleReset}
                disabled={loading}
              >
                Re-record
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-xl bg-primary text-white disabled:bg-grayish/30"
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                Submit recording
              </button>
            </div>
            <div className="text-caption text-grayish">
              Duration: ~{preview.meta.durationSec}s • Format: {preview.meta.mime}
            </div>
          </div>
        )}

        {phase === 'uploading' && (
          <div className="mt-4 text-small text-grayish">Uploading your recording…</div>
        )}
      </div>
    );
  },
);

(Recorder as any).displayName = 'Recorder';
export default Recorder;
