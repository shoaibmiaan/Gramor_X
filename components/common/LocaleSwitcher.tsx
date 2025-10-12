// components/common/LocaleSwitcher.tsx
import React from 'react';
import { persistLocale, toSupportedLocale, useLocale, type Locale } from '@/lib/locale';
import { loadTranslations } from '@/lib/i18n';

type Props = {
  value?: Locale;
  onChanged?: (next: Locale) => void;
  options?: { value: Locale; label: string }[];
};

export default function LocaleSwitcher({ value, onChanged, options }: Props) {
  const [busy, setBusy] = React.useState(false);
  const { locale: activeLocale, setLocale: setLocaleContext, t } = useLocale();
  const [local, setLocal] = React.useState<Locale>(value ?? activeLocale);

  React.useEffect(() => {
    setLocal(value ?? activeLocale);
  }, [value, activeLocale]);

  const langs = options ?? [
    { value: 'en', label: t('common.languages.en', 'English') },
    { value: 'ur', label: t('common.languages.ur', 'اردو') },
  ];

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = toSupportedLocale(e.target.value);
    try {
      setBusy(true);
      await loadTranslations(next);
      persistLocale(next);
      setLocal(next);
      setLocaleContext(next);
      onChanged?.(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="inline-flex items-center gap-2 text-small">
      <span className="text-mutedText">{t('Language')}</span>
      <select
        className="rounded-ds border border-border bg-card px-3 py-2 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        value={local}
        onChange={handleChange}
        disabled={busy}
      >
        {langs.map((l) => (
          <option key={l.value} value={l.value}>{l.label}</option>
        ))}
      </select>
      {busy && <span className="text-mutedText text-caption">{t('common.status.updating')}</span>}
    </label>
  );
}

export { toSupportedLocale } from '@/lib/locale';
