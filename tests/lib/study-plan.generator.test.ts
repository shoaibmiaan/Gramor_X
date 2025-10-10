import { strict as assert } from 'node:assert';

import { type AvailabilitySlot, generateStudyPlan } from '../../lib/studyPlan';
import { StudyPlanSchema } from '../../types/plan';

const availability: AvailabilitySlot[] = [
  { day: 'monday', minutes: 60 },
  { day: 'wednesday', minutes: 45 },
  { day: 'friday', minutes: 70 },
  { day: 'saturday', minutes: 80 },
];

const options = {
  userId: 'user-123',
  startISO: '2025-01-06T00:00:00.000Z', // Monday
  examDateISO: '2025-02-02T00:00:00.000Z', // Sunday (4 weeks later)
  targetBand: 7.5,
  availability,
} as const;

(async () => {
  const plan = generateStudyPlan(options);
  const again = generateStudyPlan(options);

  StudyPlanSchema.parse(plan);
  assert.deepEqual(plan, again, 'Plan generation must be deterministic for identical input');

  const startDay = plan.days[0];
  const lastDay = plan.days.at(-1);
  assert(startDay, 'Plan should contain at least one day');
  assert(lastDay, 'Plan should include an end day');
  assert.equal(startDay?.dateISO.slice(0, 10), '2025-01-06');
  assert.equal(lastDay?.dateISO.slice(0, 10), '2025-02-02');

  const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const availabilityMap = new Map(availability.map((slot) => [slot.day, slot.minutes] as const));

  const practiceWeeks = new Set<number>();
  const mocksPerWeek = new Map<number, number>();

  for (const [index, day] of plan.days.entries()) {
    const weekday = weekdayNames[new Date(day.dateISO).getUTCDay()];
    const allowedMinutes = availabilityMap.get(weekday) ?? 0;
    const usedMinutes = day.tasks.reduce((sum, task) => sum + task.estMinutes, 0);
    assert(usedMinutes <= allowedMinutes, `Used minutes should respect availability on ${day.dateISO}`);

    const hasCore = day.tasks.some((task) =>
      ['listening', 'reading', 'writing', 'speaking'].includes(task.type),
    );
    if (day.tasks.length > 0) {
      assert(hasCore, `Active day ${day.dateISO} must include a core skill task`);
      practiceWeeks.add(Math.floor(index / 7));
    }

    if (day.tasks.some((task) => task.type === 'mock')) {
      const weekIndex = Math.floor(index / 7);
      mocksPerWeek.set(weekIndex, (mocksPerWeek.get(weekIndex) ?? 0) + 1);
    }
  }

  for (const week of practiceWeeks) {
    const count = mocksPerWeek.get(week) ?? 0;
    assert.equal(count, 1, `Week ${week + 1} should include exactly one mock milestone`);
  }

  console.log('study plan generator tested');
})();
