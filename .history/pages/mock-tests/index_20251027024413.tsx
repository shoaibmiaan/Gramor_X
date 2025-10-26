// app/mock-tests/page.tsx (Next.js 13/14 App Router) OR pages/mock-tests/index.tsx (Pages Router)
// If you're still on Pages Router, keep the default export and remove the `metadata` block.

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { mockTests } from '@/data/mock-tests';

// --- Optional (App Router): page metadata ---
export const metadata = {
  title: 'IELTS Mock Tests | Full & Module-wise Practice with AI Scoring',
  description:
    'Attempt full-length IELTS mocks or practice Listening, Reading, Writing, and Speaking sections with AI scoring, analytics, and targeted review.',
  openGraph: {
    title: 'IELTS Mock Tests',
    description:
      'Full-length and module-wise mocks with AI scoring and analytics.',
    type: 'website',
  },
};

// Util: simple icons per skill (swap with your DS Icons)
const SkillIcon: React.FC<{ skill: string }> = ({ skill }) => {
  const map: Record<string, string> = {
    Full: '🧭',
    Listening: '🎧',
    Reading: '📖',
    Writing: '✍️',
    Speaking: '🎤',
  };
  return <span aria-hidden="true" className="mr-2">{map[skill] ?? '🧩'}</span>;
};

// Example plan gate (wire to your auth/plan context)
const useUserPlan = () => {
  // TODO: replace with real plan from context/store
  return { plan: 'free' as 'free' | 'starter' | 'booster' | 'master' };
};

type SortKey = 'recommended' | 'duration' | 'difficulty' | 'title';

export default function MockTestsIndex() {
  const { plan } = useUserPlan();
  const [query, setQuery] = useState('');
  const [skill, setSkill] = useState<'All' | 'Full' | 'Listening' | 'Reading' | 'Writing' | 'Speaking'>('All');
  const [sortBy, setSortBy] = useState<SortKey>('recommended');

  const filtered = useMemo(() => {
    let list = mockTests.slice();

    if (skill !== 'All') {
      list = list.filter((m) => m.skill === skill);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'duration':
          return (a.durationMinutes ?? 0) - (b.durationMinutes ?? 0);
        case 'difficulty':
          // assume difficulty in { 'Easy' | 'Medium' | 'Hard' } — map to weight
          const w = (d?: string) =>
            d === 'Hard' ? 3 : d === 'Medium' ? 2 : 1;
          return w(a.difficulty) - w(b.difficulty);
        case 'title':
          return a.title.localeCompare(b.title);
        case 'recommended':
        default:
          // push recommended and full mocks to top
          const ra = (a.recommended ? -1 : 0) + (a.skill === 'Full' ? -0.5 : 0);
          const rb = (b.recommended ? -1 : 0) + (b.skill === 'Full' ? -0.5 : 0);
          return ra - rb;
      }
    });

    return list;
  }, [query, skill, sortBy]);

  // JSON-LD ItemList for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: filtered.map((m: any, i: number) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: m.href,
      name: m.title,
    })),
  };

  return (
    <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <header className="max-w-3xl">
          <h1 className="font-slab text-display mb-3 text-gradient-primary">Mock Tests</h1>
          <p className="text-grayish">
            Full-length exams and module-wise practice with AI scoring, analytics, and targeted review.
          </p>
        </header>

        {/* Controls */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="col-span-1">
            <label className="sr-only" htmlFor="mock-search">Search</label>
            <input
              id="mock-search"
              type="search"
              placeholder="Search mocks (e.g., Listening Part 2)…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-ds-xl px-4 py-3 bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="col-span-1">
            <label className="sr-only" htmlFor="skill">Skill</label>
            <select
              id="skill"
              value={skill}
              onChange={(e) => setSkill(e.target.value as any)}
              className="w-full rounded-ds-xl px-4 py-3 bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 focus:ring-2 focus:ring-primary"
            >
              {['All', 'Full', 'Listening', 'Reading', 'Writing', 'Speaking'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="col-span-1">
            <label className="sr-only" htmlFor="sortBy">Sort by</label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="w-full rounded-ds-xl px-4 py-3 bg-white/70 dark:bg-white/5 border border-black/5 dark:border-white/10 focus:ring-2 focus:ring-primary"
            >
              <option value="recommended">Recommended</option>
              <option value="duration">Duration</option>
              <option value="difficulty">Difficulty</option>
              <option value="title">Title (A–Z)</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        <div
          className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          role="list"
          aria-label="Available mock tests"
        >
          {filtered.map((m, idx) => {
            const gated = m.tierRequired && !canAccess(plan, m.tierRequired);
            return (
              <motion.div
                key={m.slug}
                role="listitem"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: idx * 0.02 }}
              >
                <Card
                  className={[
                    'card-surface p-6 rounded-ds-2xl h-full relative',
                    gated ? 'opacity-75' : '',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-h3 font-semibold flex items-center">
                      <SkillIcon skill={m.skill} />
                      {m.title}
                    </h3>
                    <div className="flex gap-2">
                      <Badge variant="info" size="sm" aria-label={`Skill: ${m.skill}`}>{m.skill}</Badge>
                      {m.recommended && (
                        <Badge variant="success" size="sm" aria-label="Recommended">Recommended</Badge>
                      )}
                    </div>
                  </div>

                  <p className="mt-2 text-body opacity-90">{m.description}</p>

                  {/* Meta row */}
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    {m.durationMinutes && (
                      <span className="rounded-ds bg-black/5 dark:bg-white/10 px-2 py-1">
                        ⏱ {m.durationMinutes} min
                      </span>
                    )}
                    {m.difficulty && (
                      <span className="rounded-ds bg-black/5 dark:bg-white/10 px-2 py-1">
                        🎯 {m.difficulty}
                      </span>
                    )}
                    {typeof m.attempts === 'number' && m.attempts > 0 && (
                      <span className="rounded-ds bg-black/5 dark:bg-white/10 px-2 py-1">
                        📊 {m.attempts} attempt{m.attempts === 1 ? '' : 's'}
                      </span>
                    )}
                    {typeof m.lastScore === 'number' && (
                      <span className="rounded-ds bg-black/5 dark:bg-white/10 px-2 py-1">
                        ⭐ Last score: {m.lastScore}%
                      </span>
                    )}
                    {gated && (
                      <span className="rounded-ds bg-amber-500/10 text-amber-600 dark:text-amber-300 px-2 py-1">
                        🔒 {m.tierRequired} plan
                      </span>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="mt-6">
                    {gated ? (
                      <Button
                        as="button"
                        variant="secondary"
                        className="rounded-ds"
                        aria-label={`Upgrade required to access ${m.title}`}
                        onClick={() => openUpgrade(plan, m.tierRequired!)}
                      >
                        Upgrade to unlock
                      </Button>
                    ) : (
                      <Button asChild variant="primary" className="rounded-ds">
                        <Link href={m.href} prefetch aria-label={`Open ${m.title}`}>
                          {m.skill === 'Full' ? 'Start full mock' : 'Open practice'}
                        </Link>
                      </Button>
                    )}
                  </div>

                  {/* Subtle lock overlay */}
                  {gated && (
                    <div
                      className="pointer-events-none absolute inset-0 rounded-ds-2xl ring-1 ring-amber-500/20"
                      aria-hidden="true"
                    />
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="mt-12 text-center text-grayish">
            No mocks match your filters. Try clearing search or changing skill.
          </div>
        )}

        {/* JSON-LD for SEO */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Container>
    </section>
  );
}

// --- helpers ---
function canAccess(userPlan: 'free' | 'starter' | 'booster' | 'master', required?: string) {
  if (!required) return true;
  const order = ['free', 'starter', 'booster', 'master'];
  return order.indexOf(userPlan) >= order.indexOf(required);
}

function openUpgrade(current: string, needed: string) {
  // route to your /account/billing with plan preselected
  window.location.href = `/account/billing?from=mock-tests&needed=${encodeURIComponent(needed)}`;
}
