import * as React from 'react';
import { useLocale } from '@/lib/locale';

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <label className="inline-flex items-center gap-2 rounded border border-border bg-card px-2 py-1 text-xs">
      <span className="text-muted-foreground">Lang</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
        className="bg-transparent text-xs outline-none"
        aria-label="Language selector"
      >
        <option value="en">English</option>
        <option value="ur">اردو</option>
        <option value="es">Español</option>
      </select>
    </label>
  );
}
