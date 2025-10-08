// components/common/LocaleSwitcher.tsx
import React from 'react';
import {
  persistLocale,
  readStoredLocale,
  type Locale,
} from '@/lib/locale';
import { loadTranslations } from '@/lib/i18n';
import type { SupportedLocale } from '@/lib/i18n/config';

type Props = {
  value?: Locale;
  onChanged?: (next: Locale) => void;
  options?: { value: Locale; label: string }[];
  label?: string;
  id?: string;
  className?: string;
};

const DEFAULT_OPTIONS: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ur', label: 'اردو' },
];

const toSupported = (locale: Locale): SupportedLocale => (locale === 'ur' ? 'ur' : 'en');

export default function LocaleSwitcher({ value, onChanged, options, label = 'Language', id, className }: Props) {
  const selectId = React.useId();
  const domId = id ?? selectId;
  const [busy, setBusy] = React.useState(false);
  const [local, setLocal] = React.useState<Locale>(() => value ?? readStoredLocale());

  const langs = options ?? DEFAULT_OPTIONS;

  React.useEffect(() => {
    if (value && value !== local) {
      setLocal(value);
    }
  }, [value, local]);

  const handleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as Locale;
    try {
      setBusy(true);
      await loadTranslations(toSupported(next));
      persistLocale(next);
      setLocal(next);
      onChanged?.(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={['inline-flex items-center gap-2 text-small', className ?? ''].join(' ')}>
      <label htmlFor={domId} className="text-mutedText">
        {label}
      </label>
      <select
        id={domId}
        className="rounded-ds border border-border bg-card px-3 py-2 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        value={local}
        onChange={handleChange}
        disabled={busy}
        aria-busy={busy}
      >
        {langs.map((l) => (
          <option key={l.value} value={l.value} dir={l.value === 'ur' ? 'rtl' : 'ltr'}>
            {l.label}
          </option>
        ))}
      </select>
      {busy && (
        <span className="text-caption text-mutedText" aria-hidden="true">
          …
        </span>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {busy ? 'Updating language' : `Current language ${local}`}
      </span>
    </div>
  );
}
