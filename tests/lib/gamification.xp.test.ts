import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  awardVocabXp,
  baseXpForMeaning,
  baseXpForSentence,
  computeSynonymRound,
  multiplierForPlan,
  calculateWritingXp,
  DAILY_VOCAB_XP_CAP,
  VOCAB_XP_RULES,
} from '@/lib/gamification/xp';

function createSupabaseStub(initial: {
  plan?: string;
  events?: Array<{ user_id: string; amount: number; created_at?: string; meta?: Record<string, unknown> }>;
}) {
  const state = {
    plan: (initial.plan ?? 'free') as string,
    events: (initial.events ?? []).map((event) => ({
      user_id: event.user_id,
      amount: event.amount,
      created_at: event.created_at ?? new Date().toISOString(),
      meta: event.meta ?? null,
    })),
  };

  return {
    __state: state,
    from(table: string) {
      if (table === 'xp_events') {
        const filters: { user_id: string | null; start?: string; end?: string } = { user_id: null };
        const chain = {
          eq(column: string, value: string) {
            if (column === 'user_id') filters.user_id = value;
            return chain;
          },
          gte(_column: string, value: string) {
            filters.start = value;
            return chain;
          },
          lte(_column: string, value: string) {
            filters.end = value;
            const rows = state.events.filter((event) => {
              if (filters.user_id && event.user_id !== filters.user_id) return false;
              if (filters.start && event.created_at < filters.start) return false;
              if (filters.end && event.created_at > filters.end) return false;
              return true;
            });
            return Promise.resolve({ data: rows, error: null });
          },
        };

        return {
          select: () => chain,
          insert: async (payload: any) => {
            state.events.push({
              user_id: payload.user_id,
              amount: payload.amount,
              created_at: payload.created_at ?? new Date().toISOString(),
              meta: payload.meta ?? null,
            });
            return { error: null };
          },
        };
      }

      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: { plan: state.plan }, error: null }),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  } as any;
}

describe('gamification/xp rules', () => {
  it('applies base XP and multipliers', () => {
    assert.equal(baseXpForMeaning(true), 10);
    assert.equal(baseXpForMeaning(false), 0);
    assert.equal(baseXpForSentence(1), 15);
    assert.equal(baseXpForSentence(3), 20);
    assert.equal(multiplierForPlan('free'), 1);
    assert.equal(multiplierForPlan('starter'), 1.1);
    assert.equal(multiplierForPlan('booster'), 1.25);
    assert.equal(multiplierForPlan('master'), 1.5);
    assert.deepEqual(VOCAB_XP_RULES, {
      meaningCorrect: 10,
      sentenceBase: 15,
      sentencePerfectBonus: 5,
      synonymsMax: 10,
    });
  });

  it('derives synonym round results', () => {
    const result = computeSynonymRound({ totalTargets: 4, netCorrect: 3, timeMs: 25_000 });
    assert.ok(result.accuracy > 0.5);
    assert.ok(result.score >= 0 && result.score <= 100);
    assert.equal(result.baseXp, Math.min(VOCAB_XP_RULES.synonymsMax, Math.round(result.score / 10)));
  });

  it('caps synonym XP at the defined maximum even with fast perfect rounds', () => {
    const result = computeSynonymRound({ totalTargets: 8, netCorrect: 8, timeMs: 4_000 });
    assert.equal(result.baseXp, VOCAB_XP_RULES.synonymsMax);
  });

  it('awards XP using the learner plan multiplier', async () => {
    const stub = createSupabaseStub({ plan: 'booster' });
    const outcome = await awardVocabXp({
      client: stub,
      userId: 'user-1',
      baseAmount: 10,
      kind: 'meaning',
    });

    assert.equal(outcome.requested, Math.round(10 * 1.25));
    assert.equal(outcome.awarded, outcome.requested);
    assert.equal(stub.__state.events.length, 1);
    assert.equal(stub.__state.events[0].amount, outcome.awarded);
    assert.equal(stub.__state.events[0].meta?.kind, 'meaning');
    assert.equal(typeof outcome.dayIso, 'string');
  });

  it('enforces the daily XP cap', async () => {
    const existing = {
      user_id: 'user-1',
      amount: DAILY_VOCAB_XP_CAP - 5,
      created_at: new Date().toISOString(),
      meta: { kind: 'meaning' },
    };
    const stub = createSupabaseStub({ plan: 'master', events: [existing] });
    const outcome = await awardVocabXp({
      client: stub,
      userId: 'user-1',
      baseAmount: 10,
      kind: 'sentence',
    });

    assert.equal(outcome.awarded, 5);
    assert.equal(outcome.capped, true);
    assert.equal(outcome.totalToday, DAILY_VOCAB_XP_CAP);
  });

  it('logs zero-amount events when requested', async () => {
    const stub = createSupabaseStub({ plan: 'free' });
    const outcome = await awardVocabXp({
      client: stub,
      userId: 'user-1',
      baseAmount: 0,
      kind: 'meaning',
      logEvenIfZero: true,
    });

    assert.equal(outcome.awarded, 0);
    assert.equal(stub.__state.events.length, 1);
    assert.equal(stub.__state.events[0].amount, 0);
    assert.equal(stub.__state.events[0].meta?.kind, 'meaning');
    assert.equal(typeof stub.__state.events[0].meta?.dayIso, 'string');
  });

  it('derives writing achievements for improvements', () => {
    const result = calculateWritingXp({
      currentOverall: 7.4,
      previousOverall: 6.6,
      startedAt: '2024-03-01T00:00:00Z',
      submittedAt: '2024-03-01T00:52:00Z',
    });

    assert.ok(result.points > 20);
    const achievementIds = result.achievements.map((item) => item.id);
    assert.ok(achievementIds.includes('attempt_completed'));
    assert.ok(achievementIds.includes('personal_best') || achievementIds.includes('steady_gain'));
    assert.ok(achievementIds.includes('band_milestone'));
    assert.ok(achievementIds.includes('pace_bonus'));
    assert.ok(result.reason.includes('Completed writing mock exam'));
    assert.equal(result.improvement > 0, true);
  });

  it('rewards first attempts without prior history', () => {
    const result = calculateWritingXp({
      currentOverall: 6.2,
      previousOverall: null,
      durationSeconds: 4000,
    });

    const achievementIds = result.achievements.map((item) => item.id);
    assert.ok(achievementIds.includes('attempt_completed'));
    assert.ok(achievementIds.includes('first_attempt'));
    assert.ok(!achievementIds.includes('personal_best'));
    assert.ok(result.points >= 26);
    assert.equal(result.improvement, 0);
  });
});
