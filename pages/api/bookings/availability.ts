import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabaseServer';
import { withPlan } from '@/lib/apiGuard';

const QuerySchema = z.object({
  coachId: z.string().uuid(),
  startUtc: z.string().datetime(), // ISO 8601
  endUtc: z.string().datetime(),   // ISO 8601
});

type Slot = { startUtc: string; endUtc: string };
type AvailabilityResponse =
  | { ok: true; coachId: string; slots: Slot[] }
  | { ok: false; error: string };

function overlaps(a: Slot, b: Slot) {
  return !(a.endUtc <= b.startUtc || b.endUtc <= a.startUtc);
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AvailabilityResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // ❗️ Fixed: only pass req so cookies are actually read
  const supabase = supabaseServer(req);

  // Optional: add auth check for protected route
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.message });
  }
  const { coachId, startUtc, endUtc } = parsed.data;

  // 1) Fetch coach raw availability windows
  const { data: avail, error: aErr } = await supabase
    .from('coach_availability')
    .select('start_utc, end_utc')
    .eq('coach_id', coachId)
    .gte('end_utc', startUtc)
    .lte('start_utc', endUtc);

  if (aErr) {
    return res.status(500).json({ ok: false, error: aErr.message });
  }

  // 2) Fetch existing bookings to subtract
  const { data: bookings, error: bErr } = await supabase
    .from('bookings')
    .select('start_utc, end_utc, status')
    .eq('coach_id', coachId)
    .neq('status', 'canceled')
    .gte('end_utc', startUtc)
    .lte('start_utc', endUtc);

  if (bErr) {
    return res.status(500).json({ ok: false, error: bErr.message });
  }

  const bookedSlots: Slot[] = (bookings ?? []).map((b) => ({
    startUtc: b.start_utc,
    endUtc: b.end_utc,
  }));

  // 3) Naive subtraction
  const slots: Slot[] = (avail ?? [])
    .map((r) => ({ startUtc: r.start_utc, endUtc: r.end_utc }))
    .filter((slot) => !bookedSlots.some((b) => overlaps(slot, b)));

  return res.status(200).json({ ok: true, coachId, slots });
}

export default withPlan('starter', handler);
