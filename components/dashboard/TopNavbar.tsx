import { Button } from '@/components/design-system/Button';

export function TopNavbar() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/75 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/70">
      <div className="flex items-center gap-3">
        <input
          className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary dark:border-slate-700 dark:bg-slate-900"
          placeholder="Search tasks, reports, prompts..."
        />
      </div>

      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm">Ask AI</Button>
        <Button variant="ghost" size="sm">🛎️</Button>
        <Button variant="ghost" size="sm">Profile ▾</Button>
      </div>
    </header>
  );
}