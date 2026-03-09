import { useState } from 'react';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { resolveNavigation, saveOnboardingStep } from '@/lib/onboarding/client';

const styles = ['visual', 'auditory', 'reading_writing', 'kinesthetic', 'mixed'] as const;

export default function LearningStylePage() {
  const router = useRouter();
  const nav = resolveNavigation('learning-style');
  const [learningStyle, setLearningStyle] = useState<(typeof styles)[number]>('mixed');

  return <main className="min-h-screen bg-background"><Container className="py-10"><h1 className="text-2xl font-semibold">Learning style</h1><p className="text-muted-foreground">Step {nav.index + 1} of {nav.total}</p><select className="mt-4 rounded border p-2" value={learningStyle} onChange={(e)=>setLearningStyle(e.target.value as any)}>{styles.map((s)=><option key={s} value={s}>{s}</option>)}</select><div className="mt-6 flex gap-3"><Button variant="ghost" onClick={()=>nav.prev && router.push(nav.prev.path)}>Back</Button><Button onClick={async()=>{await saveOnboardingStep(8,{ learningStyle }); if (nav.next) await router.push(nav.next.path);}}>Continue</Button></div></Container></main>;
}
