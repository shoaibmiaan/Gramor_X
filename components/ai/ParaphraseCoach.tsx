import React, { useState } from 'react';

import { requestParaphraseCoach, type ParaphraseSuggestion } from '@/lib/ai/assist';
import { Card } from '@/components/design-system/Card';
import { Textarea } from '@/components/design-system/Textarea';
import { Button } from '@/components/design-system/Button';
import { Alert } from '@/components/design-system/Alert';
import { Badge } from '@/components/design-system/Badge';

const focusLabel: Record<ParaphraseSuggestion['focus'], string> = {
  lexical: 'Lexical variety',
  collocation: 'Collocation',
};

type Props = Readonly<{ context?: string }>;

export function ParaphraseCoach({ context }: Props) {
  const [sentence, setSentence] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ParaphraseSuggestion[]>([]);
  const [source, setSource] = useState<'ai' | 'heuristic' | null>(null);

  const disabled = sentence.trim().length < 8 || loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;

    setLoading(true);
    setError(null);

    try {
      const res = await requestParaphraseCoach({ sentence: sentence.trim(), context });
      if (!res.ok) {
        if (res.code === 'rate_limited') {
          setError('You’ve hit the hourly limit. Take a short break before trying again.');
        } else if (res.code === 'disabled') {
          setError('Paraphrase Coach is currently disabled.');
        } else {
          setError(res.error || 'Could not fetch suggestions.');
        }
        setSuggestions([]);
        setSource(null);
        return;
      }

      setSuggestions(res.suggestions);
      setSource(res.source);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
      setSuggestions([]);
      setSource(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="card-surface rounded-ds-2xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-h3">AI Paraphrase Coach</h3>
          <p className="text-small text-grayish mt-1">
            Paste a sentence and get lexical &amp; collocation upgrades. Suggestions are advisory and do not affect scoring.
          </p>
        </div>
        {source ? (
          <Badge variant={source === 'ai' ? 'success' : 'neutral'} size="sm">
            {source === 'ai' ? 'AI model' : 'Heuristic'}
          </Badge>
        ) : null}
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <Textarea
          label="Sentence to improve"
          placeholder="E.g. People have a lot of problems with pollution in big cities."
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          showCounter
          maxLength={400}
          disabled={loading}
          required
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-caption text-grayish">
            {context ? 'Context: using the current prompt for nuance.' : 'Tip: mention the topic so collocations stay relevant.'}
          </p>
          <Button type="submit" disabled={disabled} loading={loading} variant="secondary">
            Generate suggestions
          </Button>
        </div>
      </form>

      {error && (
        <Alert variant="warning" className="mt-4">
          {error}
        </Alert>
      )}

      {suggestions.length > 0 && (
        <div className="mt-5 space-y-3">
          {suggestions.map((item, idx) => (
            <div key={`${item.focus}-${idx}`} className="rounded-xl border border-lightBorder dark:border-white/10 p-4">
              <div className="flex items-center justify-between gap-2">
                <Badge variant={item.focus === 'collocation' ? 'info' : 'neutral'} size="xs">
                  {focusLabel[item.focus]}
                </Badge>
                {source === 'ai' && idx === 0 ? (
                  <span className="text-caption text-electricBlue">Model-crafted</span>
                ) : null}
              </div>
              <p className="mt-2 text-small font-medium text-foreground">{item.rewrite}</p>
              <p className="mt-1 text-caption text-grayish">Why: {item.why}</p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-5 text-caption text-grayish">
        Safety rail: the original rubric still drives band scores. Use these rewrites for inspiration, not as definitive answers.
      </p>
    </Card>
  );
}

export default ParaphraseCoach;
