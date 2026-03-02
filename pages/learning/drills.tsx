import { useEffect, useState } from 'react';
import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { generateDrill, type Drill } from '@/services/aiService';

export default function DrillsPage() {
  const [drill, setDrill] = useState<Drill | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setSelected(null);
    const d = await generateDrill();
    setDrill(d);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="py-8">
      <Container>
        <h1 className="text-h2 font-semibold mb-4">Daily Drill</h1>
        <Card className="card-surface p-6 rounded-ds-2xl">
          {drill ? (
            <>
              <p className="mb-4">{drill.question}</p>
              <ul className="space-y-2">
                {drill.options.map((o, i) => (
                  <li key={i}>
                    <button
                      onClick={() => setSelected(i)}
                      className="w-full text-left border rounded-ds px-3 py-2 hover:bg-accent"
                    >
                      {o}
                    </button>
                  </li>
                ))}
              </ul>
              {selected !== null && (
                <div className="mt-4">
                  {selected === drill.answer ? (
                    <p className="text-success">Correct!</p>
                  ) : (
                    <p className="text-danger">Incorrect.</p>
                  )}
                  <p className="mt-2 text-small">{drill.explanation}</p>
                  <Button onClick={load} variant="secondary" className="mt-4 rounded-ds">
                    New drill
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Button onClick={load} variant="primary" className="rounded-ds" disabled={loading}>
              {loading ? 'Generating…' : 'Generate drill'}
            </Button>
          )}
        </Card>
      </Container>
    </main>
  );
}
