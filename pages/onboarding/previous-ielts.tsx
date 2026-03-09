import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/design-system/Button';
import { StepLayout } from '@/components/onboarding/StepLayout';
import { resolveNavigation, saveOnboardingStep } from '@/lib/onboarding/client';
import { loadDraft, saveDraft } from '@/lib/onboarding/draft';

export default function PreviousIeltsPage() {
  const router = useRouter();
  const nav = resolveNavigation('previous-ielts');
  const [taken, setTaken] = useState(false);
  const [overallBand, setBand] = useState('6.0');
  const [testDate, setDate] = useState('');

  useEffect(() => {
    const d = loadDraft('previous-ielts', { taken: false, overallBand: '6.0', testDate: '' });
    setTaken(d.taken); setBand(d.overallBand); setDate(d.testDate);
  }, []);
  useEffect(() => saveDraft('previous-ielts', { taken, overallBand, testDate }), [taken, overallBand, testDate]);

  return (
    <StepLayout title="Have you taken IELTS before?" subtitle="Past attempts help us estimate your starting point." step={nav.index + 1} total={nav.total} onBack={() => nav.prev && router.push(nav.prev.path)} footer={<Button onClick={async()=>{await saveOnboardingStep(4,{ taken, overallBand: taken ? Number(overallBand) : null, testDate: taken ? testDate || null : null }); if (nav.next) await router.push(nav.next.path);}}>Continue</Button>}>
      <label className="flex items-center gap-2 rounded-xl border border-border p-4"><input type="checkbox" checked={taken} onChange={(e)=>setTaken(e.target.checked)} /> Yes, I've taken IELTS</label>
      {taken && <div className="mt-4 grid gap-3 sm:grid-cols-2"><input className="rounded-xl border p-3" value={overallBand} onChange={(e)=>setBand(e.target.value)} placeholder="Overall band (e.g. 6.0)" /><input type="date" className="rounded-xl border p-3" value={testDate} onChange={(e)=>setDate(e.target.value)} /></div>}
      <p className="mt-3 text-xs text-muted-foreground">Draft saved automatically on this device.</p>
    </StepLayout>
  );
}
