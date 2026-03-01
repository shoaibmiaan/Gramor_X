import { GetServerSideProps } from 'next';

import { Card } from '@/components/design-system/Card';
import { Container } from '@/components/design-system/Container';
import { verifyProgressShareToken } from '@/lib/review/shareToken';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface Props {
  reading: {
    attempts: number;
    total_score: number;
    total_max: number;
    accuracy_pct: number | null;
    avg_duration_ms: number | null;
    last_attempt_at: string | null;
  } | null;
}

async function resolveUserFromToken(token: string): Promise<string | null> {
  try {
    const payload = verifyProgressShareToken(token);
    return payload.userId;
  } catch {
    const { data: link } = await supabaseAdmin
      .from('progress_share_links')
      .select('user_id')
      .eq('token', token)
      .maybeSingle();

    return link?.user_id ?? null;
  }
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  const token = params?.token;
  if (typeof token !== 'string') return { notFound: true };

  const userId = await resolveUserFromToken(token);

  if (!userId) {
    return { notFound: true };
  }

  const { data: reading } = await supabaseAdmin
    .from('reading_user_stats')
    .select('attempts,total_score,total_max,accuracy_pct,avg_duration_ms,last_attempt_at')
    .eq('user_id', userId)
    .maybeSingle();

  return {
    props: {
      reading: reading ?? null,
    },
  };
};

export default function PublicProgress({ reading }: Props) {
  return (
    <section className="py-10">
      <Container>
        <Card className="rounded-ds-2xl p-6">
          <h1 className="mb-4 font-slab text-h2">Reading progress</h1>
          {reading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <div className="text-small text-grayish dark:text-grayish">Attempts</div>
                <div className="text-h3 font-semibold">{reading.attempts}</div>
              </div>
              <div>
                <div className="text-small text-grayish dark:text-grayish">Points</div>
                <div className="text-h3 font-semibold">
                  {reading.total_score}/{reading.total_max}
                </div>
              </div>
              <div>
                <div className="text-small text-grayish dark:text-grayish">Accuracy</div>
                <div className="text-h3 font-semibold">{reading.accuracy_pct ?? '—'}%</div>
              </div>
              <div>
                <div className="text-small text-grayish dark:text-grayish">Last attempt</div>
                <div className="text-h3 font-semibold">
                  {reading.last_attempt_at
                    ? new Date(reading.last_attempt_at).toLocaleDateString()
                    : '—'}
                </div>
              </div>
            </div>
          ) : (
            <p>No progress found.</p>
          )}
        </Card>
      </Container>
    </section>
  );
}
