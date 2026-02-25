import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

type Source = { src: string; type?: string };

export type AudioPlayerProps = {
  /** Primary audio source URL. */
  src: string;
  /** Optional additional `<source>` elements. */
  sources?: Source[];
  /** Override preload strategy. Defaults to `auto`, but falls back to `metadata` on slow connections. */
  preload?: 'none' | 'metadata' | 'auto';
  /** Allow callers to force metadata-only preloading. */
  preferMetadataOnly?: boolean;
  /** Cross-origin policy for the underlying audio element. Defaults to `anonymous`. */
  crossOrigin?: '' | 'anonymous' | 'use-credentials';
  /** Optional class name applied to the `<audio>` element. */
  className?: string;
  /** When true, renders a minimal player without visible controls. */
  hidden?: boolean;
  /** Optional aria label passed to the `<audio>` element. */
  'aria-label'?: string;
  /** Callback fired when the player decides on a preload strategy. */
  onPreloadStrategyChange?: (strategy: 'none' | 'metadata' | 'auto') => void;
  /** MIME type hint for the primary source. Defaults to audio/mpeg. */
  primaryType?: string;
} & React.AudioHTMLAttributes<HTMLAudioElement>;

type ImperativeApi = HTMLAudioElement | null;

function detectLowBandwidth(): boolean {
  if (typeof navigator === 'undefined') return false;
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (!connection) return false;
  const saveData = Boolean(connection.saveData);
  const type = String(connection.effectiveType || '').toLowerCase();
  // Consider 2g / slow-2g or explicit Save-Data preference as low-bandwidth.
  return saveData || type.includes('2g') || type.includes('slow');
}

/**
 * Lightweight audio player that auto-adjusts preload strategy for low-bandwidth networks
 * and exposes an imperative ref compatible with native `<audio>` methods.
 */
export const AudioPlayer = forwardRef<ImperativeApi, AudioPlayerProps>(function AudioPlayer(
  {
    src,
    sources,
    preload = 'auto',
    preferMetadataOnly = false,
    crossOrigin = 'anonymous',
    className,
    hidden,
    onPreloadStrategyChange,
    primaryType,
    ...rest
  },
  forwardedRef
) {
  const localRef = useRef<HTMLAudioElement | null>(null);
  const [strategy, setStrategy] = useState<'none' | 'metadata' | 'auto'>(() =>
    preferMetadataOnly || detectLowBandwidth() ? 'metadata' : preload
  );

  useImperativeHandle(forwardedRef, () => localRef.current, []);

  // Re-evaluate network conditions only once on mount.
  useEffect(() => {
    if (preferMetadataOnly) {
      setStrategy('metadata');
      return;
    }
    if (detectLowBandwidth()) {
      setStrategy('metadata');
    }
  }, [preferMetadataOnly]);

  // Notify listeners when strategy changes.
  useEffect(() => {
    onPreloadStrategyChange?.(strategy);
  }, [strategy, onPreloadStrategyChange]);

  // Apply attributes whenever relevant props change.
  useEffect(() => {
    const audio = localRef.current;
    if (!audio) return;
    audio.preload = strategy;
    audio.crossOrigin = crossOrigin;
    // Encourage byte-range requests by enabling controls (even if hidden) and metadata-only preload.
    if (strategy === 'metadata') {
      audio.setAttribute('preload', 'metadata');
    }
    if (hidden) {
      audio.style.display = 'none';
    }
  }, [crossOrigin, hidden, strategy]);

  const sourceNodes = useMemo(() => {
    if (!sources || !sources.length) return null;
    return sources.map((item) => (
      <source key={`${item.src}|${item.type || 'audio/mpeg'}`} src={item.src} type={item.type} />
    ));
  }, [sources]);

  const resolvedClassName = useMemo(() => {
    return [hidden ? 'sr-only' : '', className || ''].filter(Boolean).join(' ');
  }, [className, hidden]);

  return (
    <audio
      ref={localRef}
      className={resolvedClassName}
      preload={strategy}
      crossOrigin={crossOrigin}
      controls={!hidden}
      {...rest}
    >
      {/* Prefer explicit MIME types to help Safari pick the optimal codec. */}
      <source src={src} type={primaryType || 'audio/mpeg'} />
      {sourceNodes}
      {/* Fallback */}
      Your browser does not support the audio element.
    </audio>
  );
});

AudioPlayer.displayName = 'AudioPlayer';

export default AudioPlayer;
