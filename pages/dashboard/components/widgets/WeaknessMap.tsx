import Link from 'next/link';

import type { SubscriptionTier } from '@/lib/navigation/types';

type SkillScore = {
  skill: string;
  score: number;
  href: string;
};

type WeaknessMapProps = {
  tier: SubscriptionTier;
  skillScores: SkillScore[];
};

const scoreClass = (score: number) => {
  if (score <= 3) return 'bg-red-500/80';
  if (score <= 5) return 'bg-orange-500/80';
  if (score <= 7) return 'bg-yellow-500/80';
  return 'bg-emerald-500/80';
};

const WeaknessMap = ({ tier, skillScores }: WeaknessMapProps) => {
  if (tier !== 'rocket' && tier !== 'owl') {
    return null;
  }

  return (
    <section id="practice" className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">Weakness Heatmap</h3>
        <p className="text-xs text-muted-foreground">
          Click a block to jump to targeted practice.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {skillScores.map((item) => (
          <Link
            key={item.skill}
            href={item.href}
            className="group rounded-xl border border-border/60 bg-background/60 p-3 transition hover:-translate-y-1 hover:shadow-lg"
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.skill}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-block h-4 w-4 rounded ${scoreClass(item.score)}`} />
              <span className="text-sm font-semibold text-foreground">{item.score.toFixed(1)}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default WeaknessMap;
