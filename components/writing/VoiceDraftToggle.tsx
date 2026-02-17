'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';

const isBrowser = typeof window !== 'undefined';

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

const getSpeechRecognition = (): SpeechRecognitionConstructor | null => {
  if (!isBrowser) return null;
  const AnyWindow = window as typeof window & {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  };
  return AnyWindow.SpeechRecognition || AnyWindow.webkitSpeechRecognition || null;
};

type Props = {
  onToggle?: (enabled: boolean) => void;
  onTranscript?: (delta: string) => void;
};

const VoiceDraftToggle: React.FC<Props> = ({ onToggle, onTranscript }) => {
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const enabledRef = useRef(false);
  const transcriptRef = useRef(onTranscript);
  const toggleRef = useRef(onToggle);
  const supportedRef = useRef(false);

  useEffect(() => {
    transcriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    toggleRef.current = onToggle;
  }, [onToggle]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    supportedRef.current = supported;
  }, [supported]);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()));
  }, []);

  const statusLabel = useMemo(() => {
    if (!supported) return 'Unavailable';
    return enabled ? 'Listening' : 'Off';
  }, [enabled, supported]);

  const teardownRecognition = useCallback(() => {
    const instance = recognitionRef.current;
    if (!instance) return;
    instance.onresult = null;
    instance.onerror = null;
    instance.onend = null;
    try {
      instance.stop();
    } catch {
      // ignore stop errors
    }
    if (typeof instance.abort === 'function') {
      try {
        instance.abort();
      } catch {
        // ignore abort errors
      }
    }
    recognitionRef.current = null;
  }, []);

  const ensureRecognition = useCallback((): SpeechRecognitionInstance | null => {
    if (recognitionRef.current) return recognitionRef.current;
    const RecognitionCtor = getSpeechRecognition();
    if (!RecognitionCtor) return null;
    const recognition = new RecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      if (!enabledRef.current) return;
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result?.isFinal) continue;
        const transcript = result[0]?.transcript ?? '';
        if (transcript) {
          finalText += transcript;
        }
      }
      const trimmed = finalText.trim();
      if (trimmed) {
        transcriptRef.current?.(trimmed);
      }
    };
    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      const error = event?.error;
      if (error === 'not-allowed' || error === 'service-not-allowed') {
        enabledRef.current = false;
        setEnabled(false);
        setSupported(false);
        toggleRef.current?.(false);
        teardownRecognition();
        return;
      }
      if (error === 'audio-capture') {
        enabledRef.current = false;
        setEnabled(false);
        setSupported(false);
        toggleRef.current?.(false);
        teardownRecognition();
        return;
      }
      if (!enabledRef.current) return;
      if (error === 'aborted') return;
      try {
        recognition.stop();
      } catch {
        // ignore stop errors
      }
    };
    recognition.onend = () => {
      if (!enabledRef.current || !supportedRef.current) return;
      try {
        recognition.start();
      } catch (error: any) {
        if (
          error?.name === 'NotAllowedError' ||
          error?.name === 'NotReadableError' ||
          error?.name === 'SecurityError'
        ) {
          enabledRef.current = false;
          setEnabled(false);
          setSupported(false);
          toggleRef.current?.(false);
          teardownRecognition();
        }
      }
    };
    recognitionRef.current = recognition;
    return recognition;
  }, [teardownRecognition]);

  const disableVoice = useCallback(() => {
    enabledRef.current = false;
    setEnabled(false);
    toggleRef.current?.(false);
    const instance = recognitionRef.current;
    if (!instance) return;
    try {
      instance.stop();
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    if (!supported) return;
    if (enabledRef.current) {
      disableVoice();
      return;
    }
    const recognition = ensureRecognition();
    if (!recognition) {
      setSupported(false);
      setEnabled(false);
      toggleRef.current?.(false);
      return;
    }
    enabledRef.current = true;
    setEnabled(true);
    toggleRef.current?.(true);
    try {
      recognition.start();
    } catch (error: any) {
      if (error?.name !== 'InvalidStateError') {
        disableVoice();
        if (
          error?.name === 'NotAllowedError' ||
          error?.name === 'NotReadableError' ||
          error?.name === 'SecurityError'
        ) {
          setSupported(false);
        }
      }
    }
  }, [disableVoice, ensureRecognition, supported]);

  useEffect(
    () => () => {
      disableVoice();
      teardownRecognition();
    },
    [disableVoice, teardownRecognition],
  );

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
