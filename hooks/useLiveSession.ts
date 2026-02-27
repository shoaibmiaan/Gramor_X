import { useCallback, useEffect, useRef, useState } from 'react';

type LiveSessionConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnecting';

type UseLiveSessionOptions = {
  sessionId: string;
  token: string | null;
  autoConnect?: boolean;
  onConnectionChange?: (state: LiveSessionConnectionState) => void;
};

type UseLiveSessionResult = {
  connectionState: LiveSessionConnectionState;
  connected: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  isRecording: boolean;
  recordingDurationSeconds: number;
};

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function useLiveSession({ sessionId, token, autoConnect = false, onConnectionChange }: UseLiveSessionOptions): UseLiveSessionResult {
  const [connectionState, setConnectionState] = useState<LiveSessionConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTick, setRecordingTick] = useState(0);
  const [recordingDurationSeconds, setRecordingDurationSeconds] = useState(0);
  const recordingStartedAt = useRef<number | null>(null);
  const tokenRef = useRef<string | null>(token);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    setConnectionState('idle');
    setIsRecording(false);
    recordingStartedAt.current = null;
    setRecordingTick(0);
    setRecordingDurationSeconds(0);
  }, [sessionId]);

  const notify = useCallback(
    (next: LiveSessionConnectionState) => {
      onConnectionChange?.(next);
    },
    [onConnectionChange],
  );

  const connect = useCallback(async () => {
    if (connectionState === 'connected' || connectionState === 'connecting') {
      return;
    }

    setError(null);

    if (!tokenRef.current) {
      setError('Missing session token');
      return;
    }

    setConnectionState('connecting');
    notify('connecting');

    try {
      await wait(50);
      setConnectionState('connected');
      notify('connected');
    } catch (err) {
      setError((err as Error).message ?? 'Failed to connect');
      setConnectionState('idle');
      notify('idle');
    }
  }, [connectionState, notify]);

  const disconnect = useCallback(async () => {
    if (connectionState === 'idle') return;

    setConnectionState('disconnecting');
    notify('disconnecting');

    try {
      await wait(25);
    } finally {
      setConnectionState('idle');
      notify('idle');
      setIsRecording(false);
      recordingStartedAt.current = null;
      setRecordingTick(0);
      setRecordingDurationSeconds(0);
    }
  }, [connectionState, notify]);

  const startRecording = useCallback(async () => {
    if (connectionState !== 'connected') {
      setError('Cannot start recording while disconnected');
      return;
    }

    if (isRecording) return;

    setIsRecording(true);
    recordingStartedAt.current = Date.now();
    setRecordingTick(0);
    setRecordingDurationSeconds(0);
  }, [connectionState, isRecording]);

  const stopRecording = useCallback(async () => {
    if (!isRecording) return;

    setIsRecording(false);
    recordingStartedAt.current = null;
    setRecordingTick(0);
    setRecordingDurationSeconds(0);
  }, [isRecording]);

  useEffect(() => {
    if (!autoConnect) return;
    if (!tokenRef.current) return;
    if (connectionState !== 'idle') return;

    void connect();
  }, [autoConnect, connect, connectionState]);

  useEffect(() => {
    if (!isRecording) return;

    const interval = window.setInterval(() => {
      setRecordingTick((value) => value + 1);
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording || !recordingStartedAt.current) return;
    const elapsed = (Date.now() - recordingStartedAt.current) / 1000;
    setRecordingDurationSeconds(Math.max(0, Math.floor(elapsed)));
  }, [recordingTick, isRecording]);

  return {
    connectionState,
    connected: connectionState === 'connected',
    error,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    isRecording,
    recordingDurationSeconds,
  };
}
