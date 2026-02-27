import { useMemo } from 'react';
import { Button } from '@/components/design-system/Button';

export type UpgradeTrigger = 'usage-exhaustion' | 'plateau' | 'curiosity';

type UpgradeModalProps = {
  open: boolean;
  trigger: UpgradeTrigger;
  onClose: () => void;
  onUpgrade: () => void;
};

const triggerCopy: Record<UpgradeTrigger, { title: string; body: string }> = {
  'usage-exhaustion': {
    title: 'You reached this month’s limit',
    body: 'Upgrade to keep momentum with more AI reviews and expanded analytics.',
  },
  plateau: {
    title: 'Break your plateau faster',
    body: 'Unlock deeper coaching loops and precision insights to move your band up.',
  },
  curiosity: {
    title: 'See what premium learners unlock',
    body: 'Get advanced predictions, exports, and live coaching workflows.',
  },
};

const socialProof = ['10k+ learners improved by at least 0.5 band', '4.9/5 average AI coaching satisfaction'];

const UpgradeModal = ({ open, trigger, onClose, onUpgrade }: UpgradeModalProps) => {
  const copy = useMemo(() => triggerCopy[trigger], [trigger]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close upgrade modal" />
      <div className="relative w-full max-w-lg rounded-2xl border border-border/60 bg-background p-6 shadow-2xl">
        <p className="mb-2 inline-flex rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">Social proof</p>
        <h3 className="text-xl font-semibold">{copy.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{copy.body}</p>
        <ul className="mt-4 space-y-1 text-sm text-foreground">
          {socialProof.map((line) => (
            <li key={line}>• {line}</li>
          ))}
        </ul>
        <div className="mt-6 flex gap-2">
          <Button onClick={onUpgrade}>Upgrade now</Button>
          <Button variant="ghost" onClick={onClose}>Maybe later</Button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
