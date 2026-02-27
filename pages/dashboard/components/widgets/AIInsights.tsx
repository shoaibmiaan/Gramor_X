import { Button } from '@/components/design-system/Button';
import type { SubscriptionTier } from '@/lib/navigation/types';
import type { AIInsight } from '@/hooks/useAIInsights';

type AIInsightsProps = {
  insights: AIInsight[];
  tier: SubscriptionTier;
  onAction: (href: string) => void;
  onUpgrade: () => void;
};

const AIInsights = ({ insights, tier, onAction, onUpgrade }: AIInsightsProps) => {
  return (
    <section className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
      <h3 className="text-base font-semibold">AI Daily Insights</h3>
      <div className="mt-3 space-y-3">
        {insights.map((insight) => {
          const locked = insight.locked && tier === 'free';
          return (
            <article key={insight.id} className="rounded-xl border border-border/60 p-3">
              <p className="text-sm text-foreground">{insight.text}</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => onAction(insight.href)} disabled={locked}>
                  {insight.actionLabel}
                </Button>
                {locked ? (
                  <Button size="sm" variant="ghost" onClick={onUpgrade}>
                    Upgrade
                  </Button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default AIInsights;
