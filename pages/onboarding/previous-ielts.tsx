import { useState } from 'react';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { resolveNavigation, saveOnboardingStep } from '@/lib/onboarding/client';

export default function PreviousIeltsPage() {
  const router = useRouter();
  const nav = resolveNavigation('previous-ielts');
  const [taken, setTaken] = useState(false);
  const [overallBand, setBand] = useState('6.0');
  const [testDate, setDate] = useState('');

  return <main className="min-h-screen bg-background"><Container className="py-10"><h1 className="text-2xl font-semibold">Previous IELTS</h1><p className="text-muted-foreground">Step {nav.index + 1} of {nav.total}</p><label className="mt-4 block"><input type="checkbox" checked={taken} onChange={(e)=>setTaken(e.target.checked)} /> I have taken IELTS before</label>{taken && <div className="mt-4 space-y-3"><input className="rounded border p-2" value={overallBand} onChange={(e)=>setBand(e.target.value)} placeholder="Overall band" /><input type="date" className="rounded border p-2" value={testDate} onChange={(e)=>setDate(e.target.value)} /></div>}<div className="mt-6 flex gap-3"><Button variant="ghost" onClick={()=>nav.prev && router.push(nav.prev.path)}>Back</Button><Button onClick={async()=>{await saveOnboardingStep(4,{ taken, overallBand: taken ? Number(overallBand) : null, testDate: taken ? testDate || null : null }); if (nav.next) await router.push(nav.next.path);}}>Continue</Button></div></Container></main>;
}
