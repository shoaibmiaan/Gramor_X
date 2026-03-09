import { useState } from 'react';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { resolveNavigation, saveOnboardingStep } from '@/lib/onboarding/client';

const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export default function StudyCommitmentPage() {
  const router = useRouter();
  const nav = resolveNavigation('study-commitment');
  const [studyDays, setStudyDays] = useState<string[]>(['mon', 'wed', 'fri']);
  const [minutesPerDay, setMinutes] = useState(45);

  const toggle = (d: string) => setStudyDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);

  return <main className="min-h-screen bg-background"><Container className="py-10"><h1 className="text-2xl font-semibold">Study commitment</h1><p className="text-muted-foreground">Step {nav.index + 1} of {nav.total}</p><div className="mt-4 flex flex-wrap gap-2">{days.map((d)=><button key={d} onClick={()=>toggle(d)} className={`rounded border px-3 py-1 ${studyDays.includes(d)?'bg-primary text-primary-foreground':''}`}>{d}</button>)}</div><input type="number" min={10} max={360} value={minutesPerDay} onChange={(e)=>setMinutes(Number(e.target.value))} className="mt-4 rounded border p-2" /><div className="mt-6 flex gap-3"><Button variant="ghost" onClick={()=>nav.prev && router.push(nav.prev.path)}>Back</Button><Button onClick={async()=>{await saveOnboardingStep(7,{ studyDays, minutesPerDay }); if (nav.next) await router.push(nav.next.path);}}>Continue</Button></div></Container></main>;
}
