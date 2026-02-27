import * as React from 'react';
import { Volume2, VolumeX } from 'lucide-react';

import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import type { WordPronunciation } from '@/types/vocabulary';

export interface PronunciationBarProps {
  pronunciation?: WordPronunciation | null;
}

export const PronunciationBar: React.FC<PronunciationBarProps> = ({ pronunciation }) => {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState(false);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => setPlaying(false);
    const onPause = () => setPlaying(false);

    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  const handleToggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => {
        setPlaying(false);
      });
  };

  if (!pronunciation) {
    return null;
  }

  const { ipa, audioUrl, locale, label } = pronunciation;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-ds-2xl border border-border bg-card/80 p-4">
      {ipa && (
        <Badge variant="neutral" size="lg" className="font-mono text-h4">
          {ipa}
        </Badge>
      )}

      {(locale || label) && (
        <Badge variant="subtle" size="sm">
          {label ?? locale?.toUpperCase()}
        </Badge>
      )}

      <div className="ml-auto flex items-center gap-2">
        {audioUrl ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            iconOnly
            shape="circle"
            onClick={handleToggle}
            aria-label={playing ? 'Pause pronunciation' : 'Play pronunciation'}
          >
            {playing ? (
              <VolumeX className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Volume2 className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        ) : (
          <span className="text-small text-muted-foreground">No audio available</span>
        )}
      </div>

      {audioUrl && (
        <audio ref={audioRef} src={audioUrl ?? undefined} preload="metadata" className="hidden" />
      )}
    </div>
  );
};

export default PronunciationBar;
