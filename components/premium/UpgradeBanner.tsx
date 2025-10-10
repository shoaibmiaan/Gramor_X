import Link from 'next/link';

import { Button } from '@/components/design-system/Button';
import { cx } from '@/components/design-system/_core/types';
import { emitUpgradePrompt } from '@/components/premium/UpgradeModal';

type UpgradeBannerProps = {
  title: string;
  description: string;
  /** Primary CTA destination. Defaults to pricing with a tracking ref. */
  href?: string;
  /** Label for the primary CTA button. */
  ctaLabel?: string;
  /** Optional label shown inside the pill. Defaults to “Free plan limit”. */
  pillLabel?: string;
  /** When provided, triggers the upgrade modal with this feature label. */
  feature?: string;
  className?: string;
};

const DEFAULT_PRICING_HREF = '/pricing?ref=upgrade-banner';

export function UpgradeBanner({
  title,
  description,
  href = DEFAULT_PRICING_HREF,
  ctaLabel = 'View premium plans',
  pillLabel = 'Free plan limit',
  feature,
  className,
}: UpgradeBannerProps) {
  return (
    <div
      className={cx(
        'flex flex-col gap-4 rounded-ds-2xl border border-primary/25 bg-primary/5 p-5 text-foreground shadow-sm',
        'sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="space-y-2 sm:max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white/70 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-primary">
          {pillLabel}
        </span>
        <h3 className="font-slab text-h4">{title}</h3>
        <p className="text-small text-mutedText">{description}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <Button asChild className="rounded-ds-xl" elevateOnHover>
          <Link href={href}>{ctaLabel}</Link>
        </Button>
        {feature ? (
          <Button
            type="button"
            variant="ghost"
            className="rounded-ds-xl"
            onClick={() => emitUpgradePrompt({ feature })}
          >
            Preview premium
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default UpgradeBanner;
