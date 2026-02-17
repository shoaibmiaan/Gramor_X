// components/listening/ListeningFilterBar.tsx
import * as React from 'react';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Card } from '@/components/design-system/Card';

export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Accent = 'uk' | 'us' | 'aus' | 'mix';

export type ListeningFilter = {
  level?: Level;
  topics: string[];
  accent?: Accent;
};

type Props = {
  value: ListeningFilter;
  onChange: (next: ListeningFilter) => void;
  allTopics: string[];
};

const LEVELS: (Level | undefined)[] = [undefined, 'beginner', 'intermediate', 'advanced'];
const ACCENTS: (Accent | undefined)[] = [undefined, 'mix', 'uk', 'us', 'aus'];

export function ListeningFilterBar({ value, onChange, allTopics }: Props) {
  const setLevel = (lvl?: Level) => onChange({ ...value, level: lvl });
  const setAccent = (acc?: Accent) => onChange({ ...value, accent: acc });
  const toggleTopic = (t: string) => {
    const has = value.topics.includes(t);
    const topics = has ? value.topics.filter((x) => x !== t) : [...value.topics, t];
    onChange({ ...value, topics });
  };
  const resetAll = () => onChange({ level: undefined, topics: [], accent: undefined });

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-4">
        {/* Level */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="opacity-70 text-sm">Level</span>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((lvl) => (
              <Button
                key={lvl ?? 'any'}
                size="sm"
                variant={value.level === lvl || (!value.level && !lvl) ? 'default' : 'ghost'}
                onClick={() => setLevel(lvl)}
                aria-pressed={value.level === lvl || (!value.level && !lvl)}
              >
                {lvl ? label(lvl) : 'Any'}
              </Button>
            ))}
          </div>
        </div>

        {/* Accent */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="opacity-70 text-sm">Accent</span>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((acc) => (
              <Button
                key={acc ?? 'any'}
                size="sm"
                variant={value.accent === acc || (!value.accent && !acc) ? 'default' : 'ghost'}
                onClick={() => setAccent(acc)}
                aria-pressed={value.accent === acc || (!value.accent && !acc)}
              >
                {acc ? acc.toUpperCase() : 'Any'}
              </Button>
            ))}
          </div>
        </div>

        {/* Topics */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="opacity-70 text-sm">Topics</span>
          <div className="flex flex-wrap gap-2">
            {allTopics.map((t) => {
              const active = value.topics.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTopic(t)}
                  className="outline-none"
                  aria-pressed={active}
                >
                  <Badge variant={active ? 'default' : 'secondary'}>
                    {label(t)}
                  </Badge>
                </button>
              );
            })}
            {value.topics.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => onChange({ ...value, topics: [] })}>
                Clear topics
              </Button>
            )}
          </div>
        </div>

        {/* Reset */}
        {(value.level || value.accent || value.topics.length > 0) && (
          <div className="flex">
            <Button size="sm" variant="secondary" onClick={resetAll}>Reset filters</Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function label(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
