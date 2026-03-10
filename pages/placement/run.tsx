// pages/placement/run.tsx
//public/placement/audio/section1_q1.mp3 and public/placement/audio/section1_q2.mp3
//Put a simple Task 1 chart image under:
//public/placement/images/task1_chart.png
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import Image from "next/image";
import { Alert } from '@/components/design-system/Alert';
import { GradientText } from '@/components/design-system/GradientText';
import { AudioPlayer } from '@/components/audio/Player';

// ---- helpers
type Answer = string | string[] | { text?: string; audioBlobUrl?: string };
type StepType = 'listening_mcq' | 'listening_gapfill' | 'reading_tfng' | 'reading_match'
              | 'writing_t1' | 'writing_t2' | 'speaking_p2' | 'speaking_p3';

type Step = {
  id: string;
  skill: 'Listening' | 'Reading' | 'Writing' | 'Speaking';
  type: StepType;
  title: string;
  body: React.ReactNode;
  validate?: (a: Answer) => string | null; // return error string or null
};

type PlacementStartItem = {
  id: string;
  bankId: string;
  skill: 'listening' | 'reading' | 'writing' | 'speaking';
  prompt: string;
  options?: string[];
};

type PlacementResultPayload = {
  attemptId: string;
  bandOverall: number;
  bands: Record<'listening' | 'reading' | 'writing' | 'speaking', number>;
  guidance: {
    overall: string;
    bySkill: Record<'listening' | 'reading' | 'writing' | 'speaking', string>;
  };
  scoredAt: string;
};

const audioUrl1 = '/placement/audio/section1_q1.mp3'; // add files under /public/placement/audio/...
const audioUrl2 = '/placement/audio/section1_q2.mp3';
const chartImg  = '/placement/images/task1_chart.png'; // add an illustrative chart under /public

function asLowerSkill(skill: Step['skill']) {
  return skill.toLowerCase() as 'listening' | 'reading' | 'writing' | 'speaking';
}

export default function PlacementRun() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [error, setError] = useState<string | null>(null);
  const [fixtureErrors, setFixtureErrors] = useState<Record<string, boolean>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attemptItems, setAttemptItems] = useState<PlacementStartItem[]>([]);
  const [startingError, setStartingError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const flagFixtureError = useCallback((key: string) => {
    setFixtureErrors((prev) => ({ ...prev, [key]: true }));
  }, []);

  const steps: Step[] = useMemo(() => ([
    {
      id: 'L1',
      skill: 'Listening',
      type: 'listening_mcq',
      title: 'Listening Q1 — Multiple choice (One answer)',
      body: (
        <div className="space-y-4">
          <AudioPlayer src={audioUrl1} preload="metadata" className="w-full" preferMetadataOnly onError={() => flagFixtureError('L1')} />
          {fixtureErrors.L1 && <Alert variant="warning" title="Audio fixture missing">Run <code>./scripts/generate-listening-fixtures.sh</code> to recreate <code>{audioUrl1}</code>.</Alert>}
          <p className="text-body text-grayish">Choose the correct answer, A, B, C or D.</p>
          <ul className="grid gap-3">
            {['A', 'B', 'C', 'D'].map(opt => (
              <li key={opt} className="p-3.5 rounded-ds border border-lightBorder dark:border-white/10">
                <label className="flex items-center gap-3">
                  <input type="radio" name="L1" value={opt} onChange={(e) => setAnswers(a => ({ ...a, L1: e.target.value }))} />
                  <span>Option {opt}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ),
      validate: (a) => (typeof a !== 'string' || !a) ? 'Please select one option.' : null,
    },
    {
      id: 'L2',
      skill: 'Listening',
      type: 'listening_gapfill',
      title: 'Listening Q2 — Form completion (ONE WORD ONLY)',
      body: (
        <div className="space-y-4">
          <AudioPlayer src={audioUrl2} preload="metadata" className="w-full" preferMetadataOnly onError={() => flagFixtureError('L2')} />
          {fixtureErrors.L2 && <Alert variant="warning" title="Audio fixture missing">Run <code>./scripts/generate-listening-fixtures.sh</code> to recreate <code>{audioUrl2}</code>.</Alert>}
          <p className="text-body text-grayish">Write ONE WORD ONLY for each answer.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[1, 2, 3].map(n => (
              <label key={n} className="block">
                <span className="text-small text-grayish dark:text-grayish">Answer {n}</span>
                <input className="w-full rounded-ds border bg-white text-lightText dark:bg-dark/50 dark:text-white dark:border-purpleVibe/30 px-3.5 py-2.5" onChange={(e) => {
                  setAnswers(a => {
                    const prev = Array.isArray(a.L2) ? a.L2.slice() : [];
                    prev[n - 1] = e.target.value.trim();
                    return { ...a, L2: prev };
                  });
                }} />
              </label>
            ))}
          </div>
        </div>
      ),
      validate: (a) => (!Array.isArray(a) || a.filter(Boolean).length < 3) ? 'Please complete all three gaps.' : null,
    },
    {
      id: 'R1',
      skill: 'Reading',
      type: 'reading_tfng',
      title: 'Reading Q1 — True / False / Not Given',
      body: (
        <div className="space-y-4">
          <Card className="p-4">
            <p className="text-body">Paragraph (excerpt):<br /><em>“Urban green spaces have been shown to lower local temperatures and improve residents’ mental health. However, some studies argue that benefits vary widely with design and accessibility.”</em></p>
          </Card>
          <div className="space-y-2">
            {['A) Green spaces always reduce temperatures by the same amount.', 'B) Some researchers disagree about the size of the benefits.'].map((stmt, i) => (
              <div key={i} className="p-3.5 rounded-ds border border-lightBorder dark:border-white/10">
                <div className="mb-2">{stmt}</div>
                {['True', 'False', 'Not Given'].map(v => (
                  <label key={v} className="mr-4">
                    <input type="radio" name={`R1-${i}`} value={v} onChange={(e) => {
                      setAnswers(a => {
                        const prev = Array.isArray(a.R1) ? a.R1.slice() : [];
                        prev[i] = e.target.value;
                        return { ...a, R1: prev };
                      });
                    }} /> <span className="ml-1">{v}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
      ),
      validate: (a) => (!Array.isArray(a) || a.length < 2 || a.some(x => !x)) ? 'Answer T/F/NG for both statements.' : null,
    },
    {
      id: 'R2',
      skill: 'Reading',
      type: 'reading_match',
      title: 'Reading Q2 — Matching headings',
      body: (
        <div className="space-y-4">
          <Card className="p-4"><p className="text-body">Short sections:<br /><b>Section A:</b> history of public parks<br /><b>Section B:</b> design principles for inclusive parks</p></Card>
          <div className="grid sm:grid-cols-2 gap-3">
            <Card className="p-3"><div className="font-semibold mb-2">Headings</div><ol className="list-decimal pl-5 space-y-1"><li>Origins and development</li><li>Making spaces accessible</li><li>Funding models</li></ol></Card>
            <Card className="p-3">
              {['A', 'B'].map((sec, i) => (
                <div key={sec} className="mb-3">
                  <div className="text-small mb-1">Section {sec} → Choose 1–3</div>
                  <select className="w-full rounded-ds border bg-white text-lightText dark:bg-dark/50 dark:text-white dark:border-purpleVibe/30 px-3.5 py-2.5" defaultValue="" onChange={(e) => {
                    setAnswers(a => {
                      const prev = Array.isArray(a.R2) ? a.R2.slice() : [];
                      prev[i] = e.target.value;
                      return { ...a, R2: prev };
                    });
                  }}>
                    <option value="" disabled>Choose heading…</option>
                    <option value="1">1 — Origins and development</option>
                    <option value="2">2 — Making spaces accessible</option>
                    <option value="3">3 — Funding models</option>
                  </select>
                </div>
              ))}
            </Card>
          </div>
        </div>
      ),
      validate: (a) => (!Array.isArray(a) || a.length < 2 || a.some(x => !x)) ? 'Match a heading to A and B.' : null,
    },
    {
      id: 'W1',
      skill: 'Writing',
      type: 'writing_t1',
      title: 'Writing Task 1 — Academic (150+ words)',
      body: (
        <div className="space-y-4">
          <Card className="p-4">
            <p className="text-body">The chart below shows the percentage of households with internet access in three countries from 2010 to 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</p>
            <Image src={chartImg} alt="Task 1 chart" width={800} height={450} className="mt-3 rounded-ds border border-lightBorder dark:border-white/10" />
          </Card>
          <textarea rows={10} className="w-full rounded-ds border bg-white text-lightText dark:bg-dark/50 dark:text-white dark:border-purpleVibe/30 px-3.5 py-2.5" placeholder="Write at least 150 words." onChange={(e) => setAnswers(a => ({ ...a, W1: { text: e.target.value } }))} />
        </div>
      ),
      validate: (a) => (!a || typeof a !== 'object' || !a.text || a.text.trim().split(/\s+/).length < 150) ? 'Please write at least 150 words.' : null,
    },
    {
      id: 'W2',
      skill: 'Writing',
      type: 'writing_t2',
      title: 'Writing Task 2 — Essay (250+ words)',
      body: (
        <div className="space-y-4">
          <Card className="p-4"><p className="text-body">Some people believe that public money should be spent on improving parks and recreational areas, while others think it should be used for public transport. Discuss both views and give your own opinion.</p></Card>
          <textarea rows={12} className="w-full rounded-ds border bg-white text-lightText dark:bg-dark/50 dark:text-white dark:border-purpleVibe/30 px-3.5 py-2.5" placeholder="Write at least 250 words." onChange={(e) => setAnswers(a => ({ ...a, W2: { text: e.target.value } }))} />
        </div>
      ),
      validate: (a) => (!a || typeof a !== 'object' || !a.text || a.text.trim().split(/\s+/).length < 250) ? 'Please write at least 250 words.' : null,
    },
    {
      id: 'S1',
      skill: 'Speaking',
      type: 'speaking_p2',
      title: 'Speaking Part 2 — Cue card (1 min prep, 1–2 min speaking)',
      body: <SpeakingRecorder cue={<>Describe a park or garden you like to visit. You should say:<br />• where it is • what you can do there • who you go with<br />and explain why you like it.</>} onSave={(url) => setAnswers(a => ({ ...a, S1: { audioBlobUrl: url } }))} />,
      validate: (a) => (!a || typeof a !== 'object' || !('audioBlobUrl' in a)) ? 'Please record your answer.' : null,
    },
    {
      id: 'S2',
      skill: 'Speaking',
      type: 'speaking_p3',
      title: 'Speaking Part 3 — Discussion (recording)',
      body: <SpeakingRecorder cue={<>Follow‑up questions:<br />1) How important are green areas in cities?<br />2) Should access to parks be free for everyone? Why/why not?</>} onSave={(url) => setAnswers(a => ({ ...a, S2: { audioBlobUrl: url } }))} />,
      validate: (a) => (!a || typeof a !== 'object' || !('audioBlobUrl' in a)) ? 'Please record your answer.' : null,
    },
  ]), [fixtureErrors.L1, fixtureErrors.L2, flagFixtureError]);

  const step = steps[stepIndex];

  useEffect(() => {
    const startAttempt = async () => {
      try {
        setStartingError(null);
        const res = await fetch('/api/placement/start', { method: 'POST' });
        const data = await res.json();
        if (!res.ok || !data?.attemptId) {
          throw new Error(data?.error || 'Unable to initialize placement attempt.');
        }
        setAttemptId(data.attemptId);
        setAttemptItems(Array.isArray(data.items) ? data.items : []);
      } catch (e: any) {
        setStartingError(e?.message || 'Unable to initialize placement attempt. You can continue, but scoring may fail.');
      }
    };
    startAttempt();
  }, []);

  function next() {
    setError(null);
    const a = answers[step.id];
    const err = step.validate?.(a) ?? null;
    if (err) { setError(err); return; }
    setStepIndex(i => Math.min(i + 1, steps.length - 1));
  }

  function prev() { setError(null); setStepIndex(i => Math.max(i - 1, 0)); }

  function answerToString(id: string, answer: Answer | undefined) {
    if (typeof answer === 'string') return answer;
    if (Array.isArray(answer)) return answer.filter(Boolean).join(' | ');
    if (!answer) return '';
    if (id === 'S1' || id === 'S2') return answer.audioBlobUrl ? '[audio response recorded]' : '';
    return answer.text?.trim() || '';
  }

  async function finishAttempt() {
    setError(null);
    const current = answers[step.id];
    const err = step.validate?.(current) ?? null;
    if (err) { setError(err); return; }

    if (!attemptId) {
      setError('Attempt is not initialized yet. Please wait a moment and try again.');
      return;
    }

    setSubmitting(true);
    try {
      const runtimeByBank = attemptItems.reduce<Record<string, string>>((acc, item) => {
        acc[item.bankId] = item.id;
        return acc;
      }, {});

      const submitAnswers = Object.fromEntries(
        steps.map((s) => [runtimeByBank[s.id] || `${s.id}-local`, answerToString(s.id, answers[s.id])])
      );

      const submitRes = await fetch('/api/placement/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, answers: submitAnswers }),
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitData?.error || 'Failed to score placement attempt.');

      const fallbackGuidance: PlacementResultPayload['guidance'] = {
        overall: 'Diagnostic estimate completed. Use these skill bands to prioritize your next study sprint.',
        bySkill: {
          listening: 'Build prediction and note-taking habits before listening once only.',
          reading: 'Practice skimming for gist, then scanning for evidence under time pressure.',
          writing: 'Improve task response structure, cohesion, and lexical range.',
          speaking: 'Extend responses with reasons/examples and keep fluency steady.',
        },
      };

      let guidance = fallbackGuidance;
      try {
        const scorePayload = {
          answers: steps.map((s) => {
            const item = attemptItems.find((it) => it.bankId === s.id);
            return {
              id: item?.id || `${s.id}-local`,
              skill: item?.skill || asLowerSkill(s.skill),
              prompt: item?.prompt || s.title,
              options: item?.options || [],
              answer: '',
              chosen: answerToString(s.id, answers[s.id]),
            };
          }),
        };
        const guidanceRes = await fetch('/api/placement/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scorePayload),
        });
        const guidanceData = await guidanceRes.json();
        if (guidanceRes.ok && guidanceData?.guidance?.overall && guidanceData?.guidance?.bySkill) {
          guidance = guidanceData.guidance;
        }
      } catch {
        // keep fallback guidance
      }

      const resultPayload: PlacementResultPayload = {
        attemptId,
        bandOverall: submitData.bandOverall,
        bands: submitData.bands,
        guidance,
        scoredAt: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(`placement:result:${attemptId}`, JSON.stringify(resultPayload));
        localStorage.setItem('placement:lastResult', JSON.stringify(resultPayload));
      }

      await router.push(`/placement/result?attemptId=${encodeURIComponent(attemptId)}`);
    } catch (e: any) {
      setError(e?.message || 'Could not finish placement. Please retry.');
    } finally {
      setSubmitting(false);
    }
  }

  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);

  return (
    <>
      <Head><title>Placement — Run | GramorX</title></Head>
      <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-slab text-h1"><GradientText>IELTS Placement</GradientText></h1>
            <Badge variant="info">{step.skill}</Badge>
          </div>

          {startingError && <Alert variant="warning" title={startingError} className="mb-4" />}

          <div className="h-2 w-full bg-white/10 rounded-ds mb-6"><div className="h-2 bg-electricBlue rounded-ds" style={{ width: `${progress}%` }} /></div>

          <Card className="p-6 rounded-ds-2xl">
            <h2 className="text-h2 mb-2">{step.title}</h2>
            {error && <Alert variant="warning" title={error} className="mb-4" />}
            <div>{step.body}</div>

            <div className="mt-6 flex gap-3 justify-between">
              <div>{stepIndex > 0 && <Button onClick={prev} variant="secondary" className="rounded-ds">Back</Button>}</div>
              <div className="flex gap-3">
                {stepIndex < steps.length - 1 ? (
                  <Button onClick={next} variant="primary" className="rounded-ds">Next</Button>
                ) : (
                  <Button onClick={finishAttempt} disabled={submitting} variant="primary" className="rounded-ds">
                    {submitting ? 'Submitting…' : 'Finish & View Estimate'}
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <p className="text-small text-grayish mt-3">Pattern: MCQ • Gap‑fill • TF/NG • Matching • Writing T1 • Writing T2 • Speaking P2 • Speaking P3</p>
        </Container>
      </section>
    </>
  );
}

const SpeakingRecorder: React.FC<{ cue: React.ReactNode; onSave: (url: string) => void; }> = ({ cue, onSave }) => {
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && !!navigator.mediaDevices);
  }, []);

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      onSave(url);
    };
    rec.start();
    mediaRef.current = rec;
    setRecording(true);
  }

  function stop() {
    mediaRef.current?.stop();
    mediaRef.current?.stream.getTracks().forEach(t => t.stop());
    setRecording(false);
  }

  return (
    <div className="space-y-4">
      <Alert variant="info" title="Cue card / discussion">{cue}</Alert>
      <div className="flex gap-3">
        {!recording ? (
          <Button onClick={start} variant="accent" className="rounded-ds">Start recording</Button>
        ) : (
          <Button onClick={stop} variant="warning" className="rounded-ds">Stop</Button>
        )}
        {!supported && <span className="text-small text-sunsetOrange">Microphone not available in this browser.</span>}
      </div>
      {audioUrl && <div className="p-3.5 rounded-ds border border-lightBorder dark:border-white/10"><audio src={audioUrl} controls className="w-full" /></div>}
    </div>
  );
};
