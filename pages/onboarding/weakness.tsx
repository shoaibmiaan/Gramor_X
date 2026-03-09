import { useState } from 'react';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { resolveNavigation, saveOnboardingStep } from '@/lib/onboarding/client';

const options = ['listening', 'reading', 'writing', 'speaking', 'grammar', 'vocabulary'];

export default function WeaknessPage() {
  const router = useRouter();
  const nav = resolveNavigation('weakness');
  const [weaknesses, setWeaknesses] = useState<string[]>(['writing']);

  const toggle = (v: string) => setWeaknesses((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : prev.length < 3 ? [...prev, v] : prev);

  return <main className="min-h-screen bg-background"><Container className="py-10"><h1 className="text-2xl font-semibold">Weaknesses</h1><p className="text-muted-foreground">Step {nav.index + 1} of {nav.total}</p><div className="mt-4 grid grid-cols-2 gap-2">{options.map((o)=><button key={o} className={`rounded border p-2 ${weaknesses.includes(o)?'bg-primary text-primary-foreground':''}`} onClick={()=>toggle(o)}>{o}</button>)}</div><div className="mt-6 flex gap-3"><Button variant="ghost" onClick={()=>nav.prev && router.push(nav.prev.path)}>Back</Button><Button disabled={!weaknesses.length} onClick={async()=>{await saveOnboardingStep(9,{ weaknesses }); if (nav.next) await router.push(nav.next.path);}}>Continue</Button></div></Container></main>;
}
