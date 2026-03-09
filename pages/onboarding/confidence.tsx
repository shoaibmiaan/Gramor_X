import { useState } from 'react';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { resolveNavigation, saveOnboardingStep } from '@/lib/onboarding/client';

export default function ConfidencePage() {
  const router = useRouter();
  const nav = resolveNavigation('confidence');
  const [writing, setWriting] = useState(3);
  const [speaking, setSpeaking] = useState(3);

  return <main className="min-h-screen bg-background"><Container className="py-10"><h1 className="text-2xl font-semibold">Confidence</h1><p className="text-muted-foreground">Step {nav.index + 1} of {nav.total}</p><label className="block mt-4">Writing confidence (1-5)<input className="ml-2 rounded border p-1" type="number" min={1} max={5} value={writing} onChange={(e)=>setWriting(Number(e.target.value))} /></label><label className="block mt-3">Speaking confidence (1-5)<input className="ml-2 rounded border p-1" type="number" min={1} max={5} value={speaking} onChange={(e)=>setSpeaking(Number(e.target.value))} /></label><div className="mt-6 flex gap-3"><Button variant="ghost" onClick={()=>nav.prev && router.push(nav.prev.path)}>Back</Button><Button onClick={async()=>{await saveOnboardingStep(10,{ writing, speaking }); if (nav.next) await router.push(nav.next.path);}}>Continue</Button></div></Container></main>;
}
