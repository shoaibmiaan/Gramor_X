import { Icon } from '@/components/design-system/Icon';
// components/listening/AudioSectionsPlayer.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ProgressBar } from '@/components/design-system/ProgressBar';
import AudioPlayer from '@/components/audio/Player';

type MCQ = {
  id: string;
  qNo: number;
  type: 'mcq';
  prompt: string;
  options: string[];
  answer: string;
};

type GAP = {
  id: string;
  qNo: number;
  type: 'gap';
  prompt: string;
  answer: string;
};

type MATCH = {
  id: string;
  qNo: number;
  type: 'match';
  left: string[];
  right: string[];
  pairs: Record<number, number>; // key: left index, value: right index
};

export type Question = MCQ | GAP | MATCH;

export type ListeningSection = {
  orderNo: number;
  startMs: number;
  endMs: number;
  transcript?: string;
  questions: Question[];
};

export type AudioSectionsPlayerProps = {
  masterAudioUrl: string;
  sections: ListeningSection[];
  initialSectionIndex?: number;
  autoAdvance?: boolean;       // default: true
  allowSeek?: boolean;         // default: false (exam-like)
  onReady?: () => void;
  onPlay?: (sectionIndex: number) => void;
  onPause?: (sectionIndex: number) => void;
  onSectionChange?: (sectionIndex: number) => void;
  onTimeUpdate?: (payload: { sectionIndex: number; sectionMs: number; absoluteMs: number }) => void;
  seekToMs?: number | null;
  onExternalSeekResolved?: () => void;
  className?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export const AudioSectionsPlayer: React.FC<AudioSectionsPlayerProps> = ({
  masterAudioUrl,
  sections,
  initialSectionIndex = 0,
  autoAdvance = true,
  allowSeek = false,
  onReady,
  onPlay,
  onPause,
  onSectionChange,
  onTimeUpdate,
  seekToMs = null,
  onExternalSeekResolved,
  className = '',
}) => {
  // ---- SSR-safe mount gate (no conditional hooks) ----
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ---- refs & state ----
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastSeekRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [sectionIndex, setSectionIndex] = useState<number>(clamp(initialSectionIndex, 0, Math.max(0, sections.length - 1)));
  const [localTimeMs, setLocalTimeMs] = useState<number>(0); // progress within section

  const hasAudio = Boolean(masterAudioUrl);
  const current = sections[sectionIndex];

  // Precomputed section bounds in seconds (HTMLAudio is seconds-based)
  const bounds = useMemo(() => {
    if (!current) return { startS: 0, endS: 0, lengthMs: 0 };
    const startS = current.startMs / 1000;
    const endS = current.endMs / 1000;
    const lengthMs = current.endMs - current.startMs;
    return { startS, endS, lengthMs };
  }, [current]);

  // ---- helpers (unconditional hooks) ----
  const loadToSection = useCallback((sIndex: number) => {
    const audio = audioRef.current;
    const target = sections[sIndex];
    if (!audio || !target) return;

    // Jump to section start
    audio.currentTime = target.startMs / 1000;
    setLocalTimeMs(0);
  }, [sections]);

  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;

    const nowS = audio.currentTime;
    const nowMs = nowS * 1000;
    const startMs = current.startMs;
    const endMs = current.endMs;

    // update progress within section
    const within = clamp(nowMs - startMs, 0, Math.max(0, endMs - startMs));
    setLocalTimeMs(within);
    onTimeUpdate?.({ sectionIndex, sectionMs: within, absoluteMs: nowMs });

    // stop/advance at section end
    if (nowMs >= endMs - 10) {
      // small guard
      if (autoAdvance && sectionIndex < sections.length - 1) {
        // advance to next section
        const next = sectionIndex + 1;
        setSectionIndex(next);
        onSectionChange?.(next);
        // queue jump on next frame to avoid stutter
        requestAnimationFrame(() => {
          loadToSection(next);
          audio.play().catch(() => setPlaying(false));
          onPlay?.(next);
        });
      } else {
        // pause at the end
        audio.pause();
        setPlaying(false);
        onPause?.(sectionIndex);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [
    autoAdvance,
    current,
    loadToSection,
    onPause,
    onPlay,
    onSectionChange,
    onTimeUpdate,
    sectionIndex,
    sections.length,
  ]);

  const startRaf = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stopRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const handleCanPlay = useCallback(() => {
    setReady(true);
    onReady?.();
    loadToSection(sectionIndex);
  }, [loadToSection, onReady, sectionIndex]);

  const handlePlay = useCallback(() => {
    setPlaying(true);
    onPlay?.(sectionIndex);
    startRaf();
  }, [onPlay, sectionIndex, startRaf]);

  const handlePause = useCallback(() => {
    setPlaying(false);
    onPause?.(sectionIndex);
    stopRaf();
  }, [onPause, sectionIndex, stopRaf]);

  const handleEnded = useCallback(() => {
    setPlaying(false);
    stopRaf();
  }, [stopRaf]);

  // jump audio when section changes (user nav)
  useEffect(() => {
    if (!ready) return;
    loadToSection(sectionIndex);
  }, [ready, sectionIndex, loadToSection]);

  useEffect(() => () => stopRaf(), [stopRaf]);

  useEffect(() => {
    if (!mounted) return;
    if (seekToMs == null) return;
    if (seekToMs === lastSeekRef.current) return;
    lastSeekRef.current = seekToMs;

    const audio = audioRef.current;
    if (!audio) return;

    const targetIndex = sections.findIndex((s) => seekToMs >= s.startMs && seekToMs <= s.endMs);
    if (targetIndex !== -1) {
      if (targetIndex !== sectionIndex) {
        setSectionIndex(targetIndex);
        onSectionChange?.(targetIndex);
      }
      const target = sections[targetIndex];
      const within = clamp(seekToMs - target.startMs, 0, Math.max(0, target.endMs - target.startMs));
      setLocalTimeMs(within);
    }

    audio.currentTime = seekToMs / 1000;
    onExternalSeekResolved?.();
  }, [mounted, onExternalSeekResolved, onSectionChange, sectionIndex, sections, seekToMs]);

  // ---- controls ----
  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // clamp to section window if user scrubbed
    const nowS = audio.currentTime;
    if (nowS < bounds.startS || nowS > bounds.endS) {
      audio.currentTime = bounds.startS;
    }
    audio.play().catch(() => setPlaying(false));
  }, [bounds.startS, bounds.endS]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const prevSection = useCallback(() => {
    const prev = clamp(sectionIndex - 1, 0, sections.length - 1);
    if (prev === sectionIndex) return;
    setSectionIndex(prev);
    onSectionChange?.(prev);
  }, [onSectionChange, sectionIndex, sections.length]);

  const nextSection = useCallback(() => {
    const next = clamp(sectionIndex + 1, 0, sections.length - 1);
    if (next === sectionIndex) return;
    setSectionIndex(next);
    onSectionChange?.(next);
  }, [onSectionChange, sectionIndex, sections.length]);

  const onSeek = useCallback((pct: number) => {
    if (!allowSeek) return; // locked in exam mode
    const audio = audioRef.current;
    if (!audio || !current) return;
    const lengthMs = current.endMs - current.startMs;
    const newWithinMs = clamp(Math.round(lengthMs * pct), 0, lengthMs);
    audio.currentTime = (current.startMs + newWithinMs) / 1000;
    setLocalTimeMs(newWithinMs);
  }, [allowSeek, current]);

  // ---- derived for UI ----
  const pct = useMemo(() => {
    const len = Math.max(1, bounds.endS * 1000 - bounds.startS * 1000);
    return clamp(localTimeMs / len, 0, 1);
  }, [bounds.endS, bounds.startS, localTimeMs]);

  const mmss = useMemo(() => {
    const secs = Math.floor(localTimeMs / 1000);
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [localTimeMs]);

  const handleSliderKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!allowSeek) return;

      let nextPct: number | null = null;
      const step = 0.05; // 5%
      const bigStep = 0.1; // 10%

      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          nextPct = clamp(pct - step, 0, 1);
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          nextPct = clamp(pct + step, 0, 1);
          break;
        case 'PageDown':
          nextPct = clamp(pct - bigStep, 0, 1);
          break;
        case 'PageUp':
          nextPct = clamp(pct + bigStep, 0, 1);
          break;
        case 'Home':
          nextPct = 0;
          break;
        case 'End':
          nextPct = 1;
          break;
        default:
          break;
      }

      if (nextPct == null) return;

      event.preventDefault();
      onSeek(nextPct);
    },
    [allowSeek, onSeek, pct]
  );

  const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

  const togglePlayPause = useCallback(() => {
    if (playing) {
      pause();
    } else {
      play();
    }
  }, [pause, play, playing]);

  const playPauseLabel = playing ? 'Pause' : 'Play';
  const playPauseIcon = playing ? 'pause' : 'play';

  // ---- render ----
  if (!mounted) {
    return (
      <div className={`card-surface p-4 rounded-ds ${className}`}>
        <div className="text-small opacity-80">Loading audio…</div>
      </div>
    );
  }

  if (!hasAudio || !current) {
    return (
      <div className={`card-surface p-4 rounded-ds ${className}`}>
        <div className="text-small opacity-80">No audio or sections available.</div>
      </div>
    );
  }

  return (
    <div className={`card-surface p-4 rounded-ds ${className}`}>
      {/* Header / Section info */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-small opacity-70">Section</div>
          <div className="font-semibold">#{current.orderNo}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevSection}
            className={`px-3 py-2 rounded-ds border border-lightBorder dark:border-white/10 hover:bg-white/5 ${focusRing}`}
            aria-label="Previous section"
          >
            <Icon name="step-backward" />
          </button>
          <button
            type="button"
            onClick={togglePlayPause}
            disabled={!ready && !playing}
            className={`px-4 py-2 rounded-ds-xl bg-primary text-white disabled:opacity-50 hover:opacity-90 ${focusRing}`}
            aria-label={playPauseLabel}
            aria-pressed={playing}
          >
            <Icon name={playPauseIcon} /> <span className="ml-2">{playPauseLabel}</span>
          </button>
          <button
            type="button"
            onClick={nextSection}
            className={`px-3 py-2 rounded-ds border border-lightBorder dark:border-white/10 hover:bg-white/5 ${focusRing}`}
            aria-label="Next section"
          >
            <Icon name="step-forward" />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-small opacity-70 mb-1">
          <span>{mmss}</span>
          <span>{Math.round(pct * 100)}%</span>
        </div>
        <div
          onClick={(e) => {
            if (!allowSeek) return;
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const p = clamp((e.clientX - rect.left) / rect.width, 0, 1);
            onSeek(p);
          }}
          onKeyDown={handleSliderKeyDown}
          role={allowSeek ? 'slider' : undefined}
          aria-label={allowSeek ? 'Section progress' : undefined}
          aria-valuemin={allowSeek ? 0 : undefined}
          aria-valuemax={allowSeek ? 100 : undefined}
          aria-valuenow={allowSeek ? Math.round(pct * 100) : undefined}
          aria-valuetext={allowSeek ? `${mmss} elapsed` : undefined}
          tabIndex={allowSeek ? 0 : undefined}
          aria-disabled={allowSeek ? undefined : true}
          className={allowSeek ? `rounded-ds ${focusRing}` : undefined}
        >
          <ProgressBar
            value={pct * 100}
            className={allowSeek ? 'cursor-pointer' : 'cursor-not-allowed'}
          />
        </div>
      </div>

      {/* Hidden audio element holder (managed via ref) */}
      <AudioPlayer
        ref={audioRef}
        src={masterAudioUrl}
        hidden
        preload="metadata"
        preferMetadataOnly
        onCanPlay={handleCanPlay}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
      />
    </div>
  );
};

export default AudioSectionsPlayer;
