import React, { useState } from 'react';

import { requestSpeakingHints } from '@/lib/ai/assist';
import { Card } from '@/components/design-system/Card';
import { Input } from '@/components/design-system/Input';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { Badge } from '@/components/design-system/Badge';

type Props = Readonly<{ cue?: string }>;

export function SpeakingHints({ cue }: Props) {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentences, setSentences] = useState<string[]>([]);
  const [tip, setTip] = useState<string | undefined>(undefined);
  const [source, setSource] = useState<'ai' | 'heuristic' | null>(null);

  const disabled = keyword.trim().length < 2 || loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;

    setLoading(true);
    setError(null);

    try {
      const res = await requestSpeakingHints({ keyword: keyword.trim(), cue });
      if (!res.ok) {
        if (res.code === 'rate_limited') {
          setError('Too many hint requests. Give it a minute before trying again.');
        } else if (res.code === 'disabled') {
          setError('Speaking hints are currently disabled.');
        } else {
          setError(res.error || 'Could not load hints.');
        }
        setSentences([]);
        setTip(undefined);
        setSource(null);
        return;
      }

      setSentences(res.sentences);
      setTip(res.tip);
      setSource(res.source);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
      setSentences([]);
      setTip(undefined);
      setSource(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="card-surface rounded-ds-2xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-h4">AI Speaking Hints</h3>
          <p className="text-small text-grayish mt-1">
            Enter a word you want to emphasise. Get three fluent Part 2 sentences to weave into your story.
          </p>
        </div>
        {source ? (
          <Badge variant={source === 'ai' ? 'success' : 'neutral'} size="sm">
            {source === 'ai' ? 'AI model' : 'Heuristic'}
          </Badge>
        ) : null}
      </div>

      <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
        <Input
          label="Focus word or phrase"
          placeholder="e.g. resilience"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          maxLength={60}
          disabled={loading}
          required
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-caption text-grayish">
            {cue ? 'We’ll mirror the current cue card.' : 'Add a cue to keep hints aligned with your story.'}
          </p>
          <Button type="submit" disabled={disabled} loading={loading} variant="secondary">
            Generate speaking lines
          </Button>
        </div>
      </form>

      {error && (
        <Alert variant="warning" className="mt-4">
          {error}
        </Alert>
      )}

      {sentences.length > 0 && (
        <div className="mt-4 space-y-3">
          <ol className="list-decimal space-y-2 pl-5 text-small">
            {sentences.map((line, index) => (
              <li key={index} className="leading-6 text-foreground">
                {line}
              </li>
            ))}
          </ol>
          {tip && <p className="text-caption text-grayish">Tip: {tip}</p>}
        </div>
      )}

      <p className="mt-4 text-caption text-grayish">
        Safety rail: these hints support your delivery but do not influence automated scoring. Keep developing your own stories.
      </p>
    </Card>
  );
}

export default SpeakingHints;
