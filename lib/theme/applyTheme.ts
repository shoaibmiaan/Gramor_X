export type ThemeMode = 'light' | 'dark';
export type ThemeAccent = 'default' | 'brave';

export function applyTheme({ mode, accent }: { mode: ThemeMode; accent: ThemeAccent }) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const nextAccent = accent === 'brave' ? 'brave' : 'default';

  root.setAttribute('data-theme', nextAccent);
  root.classList.toggle('dark', mode === 'dark');
}
