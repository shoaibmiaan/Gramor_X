import { useState } from 'react';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { resolveNavigation, saveOnboardingStep } from '@/lib/onboarding/client';

const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export default function CurrentLevelPage() {
  const router = useRouter();
  const nav = resolveNavigation('current-level');
  const [currentLevel, setLevel] = useState<(typeof levels)[number]>('B1');

  return <main className="min-h-screen bg-background"><Container className="py-10"><h1 className="text-2xl font-semibold">Current level</h1><p className="text-muted-foreground">Step {nav.index + 1} of {nav.total}</p><select className="mt-4 rounded border p-2" value={currentLevel} onChange={(e)=>setLevel(e.target.value as any)}>{levels.map((l)=><option key={l}>{l}</option>)}</select><div className="mt-6 flex gap-3"><Button variant="ghost" onClick={()=>nav.prev && router.push(nav.prev.path)}>Back</Button><Button onClick={async()=>{await saveOnboardingStep(3,{ currentLevel }); if (nav.next) await router.push(nav.next.path);}}>Continue</Button></div></Container></main>;
}
