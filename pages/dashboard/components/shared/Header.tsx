import type { SubscriptionTier } from '@/lib/navigation/types';

const tierLabel: Record<SubscriptionTier, string> = {
  free: 'Free',
  seedling: 'Seedling',
  rocket: 'Rocket',
  owl: 'Owl',
};

type HeaderProps = {
  tier: SubscriptionTier;
};

const Header = ({ tier }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Enterprise Dashboard
          </p>
          <h1 className="text-lg font-semibold text-foreground">Gramor_X</h1>
        </div>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          {tierLabel[tier]} Tier
        </span>
      </div>
    </header>
  );
};

export default Header;
