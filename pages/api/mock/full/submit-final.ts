// pages/api/mock/full/submit-final.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerClient } from '@/lib/supabaseServer';
// import { computeListeningBand, computeReadingBand, computeOverallBand } from '@/lib/scoring/mock'; // example

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getServerClient({ req, res });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { fullAttemptId } = req.body || {};
  if (!fullAttemptId) {
    return res.status(400).json({ error: 'Missing fullAttemptId' });
  }

  try {
    // 1) Fetch attempt
    const { data: attempt, error: fetchError } = await supabase
      .from('mock_full_attempts')
      .select('*')
      .eq('id', fullAttemptId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ error: 'Attempt already finalized' });
    }

    // 2) TODO: fetch each module's attempts + stats and compute bands
    // Example shape (replace with your real implementation):

    let listeningBand: number | null = null;
    let readingBand: number | null = null;
    let writingBand: number | null = null;
    let speakingBand: number | null = null;

    // Example: compute listening band
    if (attempt.listening_attempt_id) {
      // const listeningStats = await getListeningStats(supabase, attempt.listening_attempt_id);
      // listeningBand = computeListeningBand(listeningStats.correctCount);
    }

    if (attempt.reading_attempt_id) {
      // const readingStats = await getReadingStats(supabase, attempt.reading_attempt_id);
      // readingBand = computeReadingBand(readingStats.correctCount);
    }

    // Writing/Speaking via AI:
    if (attempt.writing_attempt_id) {
      // writingBand = await getWritingBandFromAI(attempt.writing_attempt_id);
    }

    if (attempt.speaking_attempt_id) {
      // speakingBand = await getSpeakingBandFromAI(attempt.speaking_attempt_id);
    }

    // 3) Compute overall band (round to nearest 0.5 like IELTS rules)
    const bands = [listeningBand, readingBand, writingBand, speakingBand].filter(
      (b): b is number => typeof b === 'number'
    );

    let overallBand: number | null = null;
    if (bands.length > 0) {
      const avg =
        bands.reduce((sum, v) => sum + v, 0) / (bands.length === 0 ? 1 : bands.length);
      // basic IELTS rounding: nearest 0.5
      overallBand = Math.round(avg * 2) / 2;
    }

    // 4) Update attempt as submitted
    const { error: updateError } = await supabase
      .from('mock_full_attempts')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        listening_band: listeningBand,
        reading_band: readingBand,
        writing_band: writingBand,
        speaking_band: speakingBand,
        overall_band: overallBand,
      })
      .eq('id', fullAttemptId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error(updateError);
      return res.status(500).json({ error: 'Failed to finalize attempt' });
    }

    return res.status(200).json({
      ok: true,
      listeningBand,
      readingBand,
      writingBand,
      speakingBand,
      overallBand,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Unexpected error' });
  }
}
