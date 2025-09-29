// components/common/LocaleSwitcher.tsx
import React from 'react';
import { persistLocale as setLocale, getLocale, type Locale } from '@/lib/locale';
import { loadTranslations } from '@/lib/i18n';
import { i18nConfig, type SupportedLocale } from '@/lib/i18n/config';

const supportedLocales = new Set<SupportedLocale>(i18nConfig.locales);

export function toSupportedLocale(locale: Locale): SupportedLocale {
  if (supportedLocales.has(locale as SupportedLocale)) {
    return locale as SupportedLocale;
  }

  return i18nConfig.defaultLocale;
}

type Props = {
  value?: Locale;
  onChanged?: (next: Locale) => void;
  options?: { value: Locale; label: string }[];
};

export default function LocaleSwitcher({ value, onChanged, options }: Props) {
  const [busy, setBusy] = React.useState(false);
  const [local, setLocal] = React.useState<Locale>(value ?? getLocale('en'));

  const langs = options ?? [
    { value: 'en', label: 'English' },
    { value: 'ur', label: 'اردو' },
    { value: 'ar', label: 'العربية' },
    { value: 'fr', label: 'Français' },
  ];

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Locale;
    const supportedLocale = toSupportedLocale(next);
    try {
      setBusy(true);
      await loadTranslations(supportedLocale);
      setLocale(next);
      setLocal(next);
      onChanged?.(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="inline-flex items-center gap-2 text-small">
      <span className="text-mutedText">Language</span>
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
      {busy && <span className="text-mutedText text-caption">…updating</span>}
    </label>
  );
}