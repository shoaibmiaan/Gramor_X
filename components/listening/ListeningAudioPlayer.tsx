// components/listening/ListeningAudioPlayer.tsx
import * as React from 'react';
import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';

type ListeningAudioPlayerProps = {
  src: string | null;
};

export const ListeningAudioPlayer: React.FC<ListeningAudioPlayerProps> = ({
  src,
}) => {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [volume, setVolume] = React.useState(1);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      setDuration(audio.duration || 0);
    };
    const onTime = () => {
      setCurrentTime(audio.currentTime || 0);
    };
    const onEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  // If source changes, reset state
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  }, [src]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (e) {
      console.error('Audio play failed (probably browser blocked):', e);
    }
  };

  const handleSeek: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Number(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolume: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const vol = Number(e.target.value);
    audio.volume = vol;
    setVolume(vol);
  };

  const fmt = (sec: number) => {
    if (!Number.isFinite(sec)) return '00:00';
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Hidden native audio element – no fullscreen bullshit */}
      <audio ref={audioRef} src={src ?? undefined} preload="metadata" />

      {!src ? (
        <div className="w-full rounded-lg bg-background px-3 py-2 text-xs text-muted-foreground">
          Audio not configured for this section. Add <span className="font-mono text-[11px]">audio_url</span> in{' '}
          <span className="font-mono text-[11px]">listening_sections</span> or <span className="font-mono text-[11px]">listening_tests</span>.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <Button
              tone="primary"
              size="icon-sm"
              type="button"
              onClick={togglePlay}
            >
              <Icon
                name={isPlaying ? 'pause' : 'play'}
                className="h-4 w-4"
              />
            </Button>
            <div className="flex flex-1 flex-col gap-1">
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="w-full"
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{fmt(currentTime)}</span>
                <span>{fmt(duration)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Icon
                name="volume-2"
                className="h-4 w-4 text-muted-foreground"
              />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={handleVolume}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
