import { useState } from 'react';
import { useRouter } from 'next/router';
import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';
import { resolveNavigation, saveOnboardingStep } from '@/lib/onboarding/client';

type DiagnosticResult = {
  grammar: string;
  coherence: string;
  vocabulary: string;
  estimated_band: number;
};

export default function DiagnosticPage() {
  const router = useRouter();
  const nav = resolveNavigation('diagnostic');
  const [response, setResponse] = useState('');
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostic = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Diagnostic failed');
      setResult(body as DiagnosticResult);
      await saveOnboardingStep(11, { response, result: body });
    } catch (e: any) {
      setError(e?.message || 'Could not run diagnostic');
    } finally {
      setLoading(false);
    }
  };

  return <main className="min-h-screen bg-background"><Container className="py-10"><h1 className="text-2xl font-semibold">Diagnostic</h1><p className="text-muted-foreground">Step {nav.index + 1} of {nav.total}</p><textarea className="mt-4 w-full rounded border p-3" rows={7} value={response} onChange={(e)=>setResponse(e.target.value)} placeholder="Write a short response about your IELTS goals..." />{error && <p className="mt-2 text-sm text-destructive">{error}</p>}{result && <div className="mt-4 rounded border p-3"><p><strong>Estimated band:</strong> {result.estimated_band.toFixed(1)}</p><p><strong>Grammar:</strong> {result.grammar}</p><p><strong>Coherence:</strong> {result.coherence}</p><p><strong>Vocabulary:</strong> {result.vocabulary}</p></div>}<div className="mt-6 flex gap-3"><Button variant="ghost" onClick={()=>nav.prev && router.push(nav.prev.path)}>Back</Button><Button disabled={loading || response.length < 20} onClick={()=>void runDiagnostic()}>{loading ? 'Analyzing…' : result ? 'Re-run diagnostic' : 'Run diagnostic'}</Button>{result && <Button onClick={()=>nav.next && router.push(nav.next.path)}>Continue</Button>}</div></Container></main>;
}
