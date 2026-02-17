import Link from 'next/link';

import { Badge } from '@/components/design-system/Badge';
import { Card } from '@/components/design-system/Card';

import exercises from '@/data/speaking/exercises.json';

type CoachTipsProps = {
  ipaTargets: string[];
};

type Tip = {
  summary: string;
  action: string;
  drillSlug?: string;
};

const TIP_LIBRARY: Record<string, Tip> = {
  '/θ/': {
    summary: 'Keep the tongue between your teeth and blow air gently without voicing.',
    action: 'Practice the “think/thanks” minimal pairs and sustain /θ/ for four seconds.',
    drillSlug: 'phoneme-th',
  },
  '/ð/': {
    summary: 'Voice the sound by buzzing while the tongue touches the upper teeth.',
    action: 'Alternate “this–dis–this” to reset voicing each repetition.',
    drillSlug: 'phoneme-dh',
  },
  '/r/': {
    summary: 'Avoid tapping the palate—keep the tongue slightly curled but off the roof.',
    action: 'Link words like “far away” without inserting a vowel gap.',
    drillSlug: 'phoneme-r',
  },
  '/l/': {
    summary: 'Touch the alveolar ridge lightly and release quickly for clear /l/.',
    action: 'Contrast light and dark /l/ with “light” and “people”.',
    drillSlug: 'phoneme-l',
  },
  '/v/': {
    summary: 'Bite the lower lip softly and keep a steady voiced airflow.',
    action: 'Alternate /f/ and /v/ to build control and reduce devoicing.',
    drillSlug: 'phoneme-v',
  },
  '/w/': {
    summary: 'Round the lips while keeping the tongue back to avoid inserting an extra vowel.',
    action: 'Glide quickly into following vowels with words like “world” and “would”.',
    drillSlug: 'phoneme-w',
  },
  '/æ/': {
    summary: 'Open the mouth wider and keep the tongue forward for the bright vowel.',
    action: 'Drill “man–men” contrasts while watching jaw opening in a mirror.',
    drillSlug: 'phoneme-ae',
  },
  '/ʌ/': {
    summary: 'Relax the jaw and keep the tongue central for a neutral sound.',
    action: 'Practice “cut–caught” contrasts to avoid sliding toward /ɑː/.',
    drillSlug: 'phoneme-uh',
  },
  '/ɪ/': {
    summary: 'Clip the vowel quickly and keep the lips slightly spread.',
    action: 'Alternate “ship–sheep” to solidify the short-long contrast.',
    drillSlug: 'phoneme-ih',
  },
  '/iː/': {
    summary: 'Keep the vowel long with steady airflow and a high tongue position.',
    action: 'Sustain “see” for four counts, then glide into connected phrases.',
    drillSlug: 'phoneme-ee',
  },
};

export function CoachTips({ ipaTargets }: CoachTipsProps) {
  const uniqueTargets = Array.from(new Set(ipaTargets));
  if (uniqueTargets.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Great job! No major weak phonemes detected in this attempt.</p>
      </Card>
    );
  }

  const suggestedExercises = exercises as Array<{
    slug: string;
    prompt: string;
    type: string;
    tags: string[];
  }>;

  return (
    <Card className="flex flex-col gap-4 p-6">
      <h3 className="text-lg font-semibold text-foreground">Targeted fixes</h3>
      <p className="text-sm text-muted-foreground">
        Focus on the sounds below in your next micro-drills. We matched each phoneme to a curated exercise.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {uniqueTargets.map((ipa) => {
          const tip = TIP_LIBRARY[ipa];
          const fallback = suggestedExercises.find((exercise) => exercise.tags.includes(ipa));
          return (
            <div key={ipa} className="rounded-ds-xl border border-border/60 bg-card/70 p-4">
              <div className="flex items-center justify-between">
                <Badge variant="danger" size="sm">
                  {ipa}
                </Badge>
                {(tip?.drillSlug || fallback?.slug) && (
                  <Badge variant="primary" size="sm">
                    Drill ready
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-sm font-semibold text-foreground">{tip?.summary ?? 'Sharpen this sound with slow, clear repetitions.'}</p>
              <p className="mt-2 text-sm text-muted-foreground">{tip?.action ?? 'Use the daily drills to reinforce accurate articulation.'}</p>
              {(tip?.drillSlug || fallback?.slug) && (
                <Link
                  href={`/speaking/coach/${tip?.drillSlug ?? fallback?.slug}`}
                  className="mt-3 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Open drill
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default CoachTips;
