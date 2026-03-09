import { useState } from 'react';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { resolveNavigation, saveOnboardingStep } from '@/lib/onboarding/client';

export default function ExamTimelinePage() {
  const router = useRouter();
  const nav = resolveNavigation('exam-timeline');
  const [timeframe, setTimeframe] = useState('within_3_months');
  const [examDate, setExamDate] = useState('');
  return <main className="min-h-screen bg-background"><Container className="py-10"><h1 className="text-2xl font-semibold">Exam timeline</h1><p className="text-muted-foreground">Step {nav.index + 1} of {nav.total}</p><select className="mt-4 rounded border p-2" value={timeframe} onChange={(e)=>setTimeframe(e.target.value)}><option value="within_1_month">Within 1 month</option><option value="within_3_months">Within 3 months</option><option value="within_6_months">Within 6 months</option><option value="not_scheduled">Not scheduled</option></select><input type="date" className="mt-3 rounded border p-2" value={examDate} onChange={(e)=>setExamDate(e.target.value)} /><div className="mt-6 flex gap-3"><Button variant="ghost" onClick={()=>nav.prev && router.push(nav.prev.path)}>Back</Button><Button onClick={async()=>{await saveOnboardingStep(6,{ timeframe, examDate: examDate || null }); if (nav.next) await router.push(nav.next.path);}}>Continue</Button></div></Container></main>;
}
