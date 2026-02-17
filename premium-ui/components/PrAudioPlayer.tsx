import * as React from 'react';
import { AudioPlayer } from '@/components/audio/Player';

type PrAudioPlayerProps = {
  src: string;
  lockSeeking?: boolean;
  missingFixtureHint?: React.ReactNode;
};

export function PrAudioPlayer({ src, lockSeeking = true, missingFixtureHint }: PrAudioPlayerProps) {
  const ref = React.useRef<HTMLAudioElement>(null);
  const [played, setPlayed] = React.useState(0);
  const [errored, setErrored] = React.useState(false);

  const handleTimeUpdate = React.useCallback((event: React.SyntheticEvent<HTMLAudioElement>) => {
    setPlayed(event.currentTarget.currentTime);
  }, []);

  const handleLoadedMetadata = React.useCallback(() => {
    setPlayed(0);
    setErrored(false);
  }, []);

  const handleSeeking = React.useCallback(
    (event: React.SyntheticEvent<HTMLAudioElement>) => {
      if (!lockSeeking) return;
      const el = event.currentTarget;
      // Prevent seeking forward beyond played position (allowing a small cushion for drift).
      if (el.currentTime > played + 0.5) {
        el.currentTime = played;
      }
    },
    [lockSeeking, played]
  );

  const handleError = React.useCallback(() => {
    setErrored(true);
  }, []);

  return (
    <div className="pr-flex pr-gap-2 pr-items-center">
      <AudioPlayer
        ref={ref}
        src={src}
        className="pr-w-full"
        preferMetadataOnly
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onSeeking={handleSeeking}
        onError={handleError}
        controls
      />
      {errored && missingFixtureHint ? (
        <div className="pr-text-xs pr-text-red-500 pr-ml-2 pr-max-w-xs">{missingFixtureHint}</div>
      ) : null}
    </div>
  );
}
