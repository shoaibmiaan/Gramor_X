// components/speaking/Recorder.tsx
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
} from 'react';
import { useRecorder } from '@/hooks/useRecorder';

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
  onComplete?: (file: File, meta: { durationSec: number; mime: string }) => void;
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
    ref
  ) => {
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

    // expose imperative API
    useImperativeHandle(ref, () => ({
      start: () => start(),
      pause: () => pause(),
      resume: () => resume(),
      stop: () => stop(),
      reset: () => reset(),
    }));

    // auto-start for exam flow
    useEffect(() => {
      let kicked = false;
      if (autoStart && !kicked && !isRecording && durationSec === 0) {
        kicked = true;
        start().catch((e) => onError?.(String(e)));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoStart]);

    // hard max duration
    useEffect(() => {
      if (isRecording && durationSec >= maxDurationSec) {
        stop()
          .then(({ file }) => {
            if (file && onComplete)
              onComplete(file, { durationSec, mime: mimeType });
          })
          .catch((e) => onError?.(String(e)));
      }
    }, [
      durationSec,
      isRecording,
      maxDurationSec,
      stop,
      onComplete,
      mimeType,
      onError,
    ]);

    // bubble errors
    useEffect(() => {
      if (error) onError?.(error);
    }, [error, onError]);

    const minutes = Math.floor(durationSec / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (durationSec % 60).toString().padStart(2, '0');

    const canStart = !isRecording && !isPaused;
    const canPause = isRecording && !isPaused;
    const canResume = isRecording && isPaused;
    const canStop = isRecording;

    const status = useMemo(() => {
      if (isRecording && isPaused) return 'Paused';
      if (isRecording) return 'Recording';
      return 'Idle';
    }, [isRecording, isPaused]);

    return (
      <div
        className={`card-surface p-4 ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="text-small text-grayish">
            Status: <span className="font-medium">{status}</span>
          </div>
          <div className="font-mono text-h4 tabular-nums">
            {minutes}:{seconds}
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            className="px-3 py-2 rounded-xl bg-success text-white disabled:bg-grayish/30 disabled:text-grayish"
            disabled={!canStart}
            onClick={() => start().catch((e) => onError?.(String(e)))}
          >
            Start
          </button>
          <button
            className="px-3 py-2 rounded-xl bg-warning text-black disabled:bg-grayish/30 disabled:text-grayish"
            disabled={!canPause}
            onClick={() => pause()}
          >
            Pause
          </button>
          <button
            className="px-3 py-2 rounded-xl bg-electricBlue text-white disabled:bg-grayish/30 disabled:text-grayish"
            disabled={!canResume}
            onClick={() => resume()}
          >
            Resume
          </button>
          <button
            className="px-3 py-2 rounded-xl bg-danger text-white disabled:bg-grayish/30 disabled:text-grayish"
            disabled={!canStop}
            onClick={() =>
              stop()
                .then(({ file }) => {
                  if (file && onComplete)
                    onComplete(file, { durationSec, mime: mimeType });
                })
                .catch((e) => onError?.(String(e)))
            }
          >
            Stop & Save
          </button>
          <button
            className="ml-auto px-3 py-2 rounded-xl border border-lightBorder dark:border-white/10 text-lightText dark:text-white"
            onClick={() => reset()}
            disabled={isRecording}
          >
            Reset
          </button>
        </div>

        {audioUrl && (
          <div className="mt-4">
            <audio src={audioUrl} controls className="w-full" />
            <div className="text-caption text-grayish mt-1">Format: {mimeType}</div>
          </div>
        )}
      </div>
    );
  }
);

(Recorder as any).displayName = 'Recorder';
export default Recorder;
