import React, { useEffect, useRef, useState } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { Textarea } from '@/components/design-system/Textarea';
import ChallengeScore from '@/components/review/ChallengeScore';
import { useToast } from '@/components/design-system/Toaster';

/** ─────────────────────────────
 * Minimal in-file Transcript with TTS (no external hooks)
 * Uses the browser Web Speech API; if unavailable, the Play button is disabled.
 * ────────────────────────────*/
type TranscriptProps = { text: string };
const Transcript: React.FC<TranscriptProps> = ({ text }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const stop = () => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const play = () => {
    if (!supported) return;
    // Stop anything currently queued
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 1;
    u.pitch = 1;

    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);

    utteranceRef.current = u;
    setIsSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div className="rounded-ds-xl border border-border/60 p-4 bg-white/60 dark:bg-dark/40">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="font-medium">AI Transcript</div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={isSpeaking ? stop : play}
            disabled={!supported}
            className="rounded-ds-xl"
            title={supported ? (isSpeaking ? 'Stop voice' : 'Play voice') : 'Text-to-speech not supported'}
          >
            {supported ? (isSpeaking ? 'Stop' : 'Play') : 'TTS Unavailable'}
          </Button>
        </div>
      </div>
      <p className="whitespace-pre-wrap leading-relaxed text-body text-ink/90">{text}</p>
    </div>
  );
};

/** ─────────────────────────────
 * Types
 * ────────────────────────────*/
type Breakdown = {
  fluency?: number;
  coherence?: number;
  lexical?: number;
  pronunciation?: number;
  grammar?: number;
};
type Attempt = {
  id: string;
  scenario: string | null;
  transcript: string | null;
  band_overall: number | null;
  band_breakdown: Breakdown | null;
  audio_urls: Record<string, string[]>;
  created_at: string;
  teacher_feedback: string | null;
  teacher_feedback_at: string | null;
  teacher_feedback_by: string | null;
  teacher_feedback_author: string | null;
};
type ViewerRole = AppRole | 'user' | null;
type Props = { attempt: Attempt | null; viewerRole: ViewerRole };

/** ─────────────────────────────
 * SSR: fetch attempt (requires Supabase envs)
 * ────────────────────────────*/
export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const { attemptId } = ctx.query as { attemptId: string };
  const supabase = createSupabaseServerClient({
    req: ctx.req as any,
    res: ctx.res as any,
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      redirect: { destination: `/auth/login?next=/speaking/review/${attemptId}`, permanent: false },
    };
  }

  const service = supabaseService();

  const { data, error } = await service
    .from('speaking_attempts')
    .select(
      'id,user_id,scenario,transcript,band_overall,band_breakdown,audio_urls,created_at,teacher_feedback,teacher_feedback_at,teacher_feedback_by'
    )
    .eq('id', attemptId)
    .single();

  const metaRole =
    (user.app_metadata?.role as AppRole | undefined) ??
    (user.user_metadata?.role as AppRole | undefined) ??
    null;

  let viewerRole: ViewerRole = metaRole ?? null;

  if (!viewerRole) {
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    viewerRole = (profile?.role as ViewerRole) ?? null;
  }

  if (error || !data) {
    return { props: { attempt: null, viewerRole } };
  }

  const normalizedRole = viewerRole === 'user' ? 'student' : viewerRole;
  const isStaff = normalizedRole === 'teacher' || normalizedRole === 'admin';
  const isOwner = data.user_id === user.id;

  if (!isOwner && !isStaff) {
    return {
      redirect: { destination: '/restricted', permanent: false },
    };
  }

  let teacherName: string | null = null;
  if (data.teacher_feedback_by) {
    const { data: teacherProfile } = await service
      .from('profiles')
      .select('full_name')
      .eq('id', data.teacher_feedback_by)
      .single();
    teacherName = (teacherProfile?.full_name as string | null | undefined) ?? null;
  }

  const rawAudio = (data as any).audio_urls;
  const attempt: Attempt = {
    id: data.id,
    scenario: (data as any).scenario ?? null,
    transcript: (data as any).transcript ?? null,
    band_overall: (data as any).band_overall ?? null,
    band_breakdown: (data as any).band_breakdown ?? null,
    audio_urls: rawAudio && typeof rawAudio === 'object' ? rawAudio : {},
    created_at: data.created_at,
    teacher_feedback: (data as any).teacher_feedback ?? null,
    teacher_feedback_at: (data as any).teacher_feedback_at ?? null,
    teacher_feedback_by: (data as any).teacher_feedback_by ?? null,
    teacher_feedback_author: teacherName,
  };

  return {
    props: { attempt, viewerRole: normalizedRole ?? 'student' },
  };
};

/** ─────────────────────────────
 * Page
 * ────────────────────────────*/
export default function SpeakingReview({ attempt: initial, viewerRole }: Props) {
  const router = useRouter(); // kept to avoid changing surrounding logic
  const [attempt, setAttempt] = useState<Attempt | null>(initial);
  const [pending, setPending] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const { success, error: toastError } = useToast();

  function isError(x: unknown): x is Error {
    return typeof x === 'object' && x !== null && 'message' in x;
  }

  async function generateScore() {
    if (!attempt?.id) return;
    setErrMsg(null);
    setPending(true);
    try {
      const r = await fetch('/api/speaking/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId: attempt.id }),
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || 'Scoring failed');
      }
      const data = await r.json() as {
        transcript?: string;
        bandOverall?: number;
        criteria?: Breakdown;
        notes?: string;
      };
      setAttempt(prev => prev ? ({
        ...prev,
        transcript: data.transcript ?? prev.transcript,
        band_overall: typeof data.bandOverall === 'number' ? data.bandOverall : prev.band_overall,
        band_breakdown: data.criteria ?? prev.band_breakdown,
      }) : prev);
    } catch (e: unknown) {
      setErrMsg(isError(e) ? String((e as Error).message) : 'Something went wrong');
    } finally {
      setPending(false);
    }
  }

  async function handleShare() {
    if (!attempt?.id) return;
    if (typeof window === 'undefined') return;
    const base = window.location.origin;
    const studentLink = `${base}/speaking/review/${attempt.id}`;
    const teacherLink = `${base}/admin/speaking/attempts?attempt=${attempt.id}`;
    const payload = `Speaking attempt ID: ${attempt.id}\nStudent view: ${studentLink}\nTeacher view: ${teacherLink}`;

    try {
      setCopying(true);
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
        success('Share link copied to clipboard');
      } else {
        throw new Error('Clipboard not available');
      }
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : 'Unable to copy link');
    } finally {
      setCopying(false);
    }
  }

  if (!attempt) {
    return (
      <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <Card className="p-6">
            <h1 className="font-slab text-display">Review</h1>
            <p className="text-grayish mt-2">Attempt not found or you don’t have access.</p>
            <div className="mt-6">
              <Button as="a" href="/speaking" variant="secondary">Back to Speaking</Button>
            </div>
          </Card>
        </Container>
      </section>
    );
  }

  const b = attempt.band_breakdown || {};
  const groups: Array<{ label: string; key: keyof Breakdown; fallback?: keyof Breakdown }> = [
    { label: 'Fluency', key: 'fluency' },
    { label: 'Coherence', key: 'coherence', fallback: 'grammar' },
    { label: 'Lexical Resource', key: 'lexical' },
    { label: 'Pronunciation', key: 'pronunciation' },
  ];

  return (
    <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Left: Summary + Transcript */}
          <Card className="p-6 md:col-span-2 rounded-ds-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="font-slab text-display">Speaking Review</h1>
                {attempt.scenario && (
                  <div className="mt-1 text-small text-grayish">Scenario: {attempt.scenario}</div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {typeof attempt.band_overall === 'number' ? (
                  <Badge variant="success" className="rounded-ds-xl">
                    Overall Band: <b className="ml-1">{attempt.band_overall.toFixed(1)}</b>
                  </Badge>
                ) : (
                  <Badge variant="warning" className="rounded-ds-xl">Not scored</Badge>
                )}
                <Button
                  variant="primary"
                  onClick={generateScore}
                  disabled={pending}
                  className="rounded-ds-xl"
                  title="Run AI scoring"
                >
                  {pending ? 'Scoring…' : 'Generate Score'}
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-small text-grayish">
              <Button
                variant="outline"
                className="rounded-ds-xl"
                onClick={handleShare}
                loading={copying}
                loadingText="Copying…"
              >
                Share with teacher/partner
              </Button>
              <span>
                Attempt ID: <code className="text-xs">{attempt.id}</code>
              </span>
              <span className="opacity-70">
                Teachers can open Admin → Speaking with this link to review your audio.
              </span>
            </div>

            {/* Error inline */}
            {errMsg && (
              <div className="mt-3 p-3.5 rounded-ds border border-sunsetOrange/30 bg-sunsetOrange/10 text-sunsetOrange text-small">
                {errMsg}
              </div>
            )}

            <ChallengeScore attemptId={attempt.id} type="speaking" />

            {/* Criteria badges grid */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {groups.map(({ label, key, fallback }) => {
                const val = b[key] ?? (fallback ? b[fallback] : undefined);
                if (val == null) {
                  return (
                    <Badge key={key} variant="neutral" className="rounded-ds-xl justify-center">
                      {label}: —
                    </Badge>
                  );
                }
                return (
                  <Badge key={key} variant="info" className="rounded-ds-xl justify-center">
                    {label}: <b className="ml-1">{val.toFixed(1)}</b>
                  </Badge>
                );
              })}
            </div>

            {/* Transcript w/ TTS */}
            {attempt.transcript && (
              <div className="mt-6">
                <h2 className="text-h3 font-semibold mb-2">Transcript</h2>
                <Transcript text={attempt.transcript} />
              </div>
            )}

            {/* Teacher feedback */}
            <div className="mt-8">
              <h2 className="text-h3 font-semibold">Teacher Feedback</h2>
              {viewerIsStaff ? (
                <>
                  <p className="text-small text-grayish mt-1">
                    Share guidance for the student. Updates are visible immediately on their review page.
                  </p>
                  <Textarea
                    value={feedbackDraft}
                    onChange={(event) => {
                      setFeedbackDraft(event.target.value);
                      setFeedbackSuccess(null);
                      setFeedbackError(null);
                    }}
                    rows={6}
                    className="mt-3"
                    placeholder="E.g. Focus on slowing down in Part 2 and add more linking words."
                  />
                  {feedbackError && (
                    <div className="mt-3 rounded-ds bg-sunsetOrange/10 text-sunsetOrange px-3 py-2 text-small">
                      {feedbackError}
                    </div>
                  )}
                  {feedbackSuccess && (
                    <div className="mt-3 rounded-ds bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-3 py-2 text-small">
                      {feedbackSuccess}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-small text-grayish">
                    <Button
                      onClick={saveTeacherFeedback}
                      disabled={feedbackSaving}
                      className="rounded-ds-xl"
                    >
                      {feedbackSaving ? 'Saving…' : 'Save feedback'}
                    </Button>
                    {attempt.teacher_feedback_at && (
                      <span>
                        Last updated {new Date(attempt.teacher_feedback_at).toLocaleString()}
                        {attempt.teacher_feedback_author
                          ? ` · ${attempt.teacher_feedback_author}`
                          : ''}
                      </span>
                    )}
                  </div>
                </>
              ) : attempt.teacher_feedback ? (
                <div className="mt-3 rounded-ds-xl border border-border/60 bg-white/60 dark:bg-dark/40 p-4">
                  <p className="whitespace-pre-wrap leading-relaxed text-body text-ink/90">
                    {attempt.teacher_feedback}
                  </p>
                  <div className="mt-3 text-small text-grayish">
                    {attempt.teacher_feedback_author ? (
                      <span>{attempt.teacher_feedback_author}</span>
                    ) : (
                      <span>Your teacher</span>
                    )}
                    {attempt.teacher_feedback_at && (
                      <span> · {new Date(attempt.teacher_feedback_at).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-grayish mt-2">
                  Teacher feedback will appear here after a review is completed.
                </p>
              )}
            </div>

            <div className="mt-8 flex gap-3">
              <Button as="a" href="/speaking" variant="secondary" className="rounded-ds-xl">
                Back to Speaking
              </Button>
              <Button as="a" href="/speaking/simulator" variant="primary" className="rounded-ds-xl">
                Open Simulator
              </Button>
            </div>
          </Card>

          {/* Right: Recordings */}
          <Card className="p-6 rounded-ds-2xl">
            <h2 className="text-h3 font-semibold">Your Recordings</h2>
            <p className="text-small text-grayish mt-1">
              Audio streams via short-lived signed URLs.
            </p>

            <div className="mt-4 space-y-4">
              {(['p1', 'p2', 'p3', 'chat'] as const).map((k) => {
                const list = (attempt.audio_urls || {})[k] || [];
                if (!list.length) return null;
                return (
                  <div key={k}>
                    <div className="font-medium mb-1 uppercase">{k}</div>
                    <div className="space-y-2">
                      {list.map((path, idx) => (
                        <audio key={path + idx} controls preload="none" className="w-full">
                          {/* Served via /api/speaking/file?path=... which signs the URL server-side */}
                          <source src={`/api/speaking/file?path=${encodeURIComponent(path)}`} />
                        </audio>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </Container>
    </section>
  );
}