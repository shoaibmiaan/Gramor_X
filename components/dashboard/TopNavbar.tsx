import { Button } from '@/components/ui/Button';

export function TopNavbar() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/75 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/70">
      <input
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        placeholder="Search tasks, reports, prompts"
      />
      <div className="flex items-center gap-2">
        <Button variant="secondary">Ask AI</Button>
        <Button variant="ghost">🔔</Button>
        <Button variant="ghost">Profile ▾</Button>
      </div>
    </header>
  );
}
