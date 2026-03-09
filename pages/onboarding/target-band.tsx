import { useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/design-system/Button';
import { Container } from '@/components/design-system/Container';
import { resolveNavigation, saveOnboardingStep } from '@/lib/onboarding/client';

export default function TargetBandPage() {
  const router = useRouter();
  const nav = resolveNavigation('target-band');
  const [goalBand, setGoalBand] = useState(7);

  return <main className="min-h-screen bg-background"><Container className="py-10"><h1 className="text-2xl font-semibold">Target band</h1><p className="text-muted-foreground">Step {nav.index + 1} of {nav.total}</p><input type="number" min={4} max={9} step={0.5} className="mt-4 rounded border p-2" value={goalBand} onChange={(e)=>setGoalBand(Number(e.target.value))} /><div className="mt-8 flex gap-3"><Button variant="ghost" onClick={()=>nav.prev && router.push(nav.prev.path)}>Back</Button><Button onClick={async()=>{await saveOnboardingStep(5,{ goalBand }); if (nav.next) await router.push(nav.next.path);}}>Continue</Button></div></Container></main>;
}
