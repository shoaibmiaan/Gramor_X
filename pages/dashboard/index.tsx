import type { NextPage } from 'next';

const DashboardPage: NextPage = () => {
  return (
    <div className="flex min-h-screen bg-[#f9fafb] text-[#111827] antialiased dark:bg-[#111827] dark:text-[#f9fafb]">
      <aside className="sticky top-0 hidden h-screen w-64 border-r border-border bg-white/90 px-3 py-6 dark:bg-[#111827]/80 md:block">
        <div className="mb-8 px-2 text-sm font-semibold tracking-wide text-indigo-600">GramorX AI</div>
        <nav className="space-y-1">
          <a href="#" className="flex rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">Dashboard</a>
          <a href="#" className="flex rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Reading</a>
          <a href="#" className="flex rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Writing</a>
          <a href="#" className="flex rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Speaking</a>
          <a href="#" className="flex rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">AI Reports</a>
          <a href="#" className="flex rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Study Plan</a>
          <a href="#" className="flex rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Billing</a>
          <a href="#" className="flex rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Settings</a>
        </nav>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-white/75 px-4 py-3 backdrop-blur-md dark:bg-[#111827]/70">
          <div className="flex w-full max-w-sm items-center gap-3">
            <input
              className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:border-primary dark:border-slate-700 dark:bg-[#111827]"
              placeholder="Search tasks, reports, prompts..."
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-xl bg-secondary/10 px-3 py-1.5 text-sm font-medium text-secondary hover:bg-secondary/20">Ask AI</button>
            <button className="rounded-xl p-2 hover:bg-muted/20">🔔</button>
            <button className="flex items-center gap-1 rounded-xl p-2 hover:bg-muted/20">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary">AL</span>
              <span>▾</span>
            </button>
          </div>
        </header>

        <div className="space-y-8 p-6">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-3xl font-semibold text-primary ring-2 ring-primary/40">AL</div>
              <div>
                <div className="text-4xl font-semibold">Welcome back, Alex</div>
                <p className="text-gray-500 dark:text-gray-400">Your IELTS journey is on fire.</p>
              </div>
            </div>
            <div className="relative flex h-32 w-32 items-center justify-center">
              <svg className="-rotate-90 h-32 w-32" viewBox="0 0 120 120">
                <circle className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="14" fill="transparent" r="48" cx="60" cy="60" />
                <circle className="stroke-emerald-500 transition-all duration-700" strokeWidth="14" strokeDasharray="301" strokeDashoffset="150" strokeLinecap="round" fill="transparent" r="48" cx="60" cy="60" />
              </svg>
              <div className="absolute text-center">
                <div className="text-5xl font-bold text-emerald-500">78</div>
                <div className="text-xs font-medium uppercase tracking-[2px] text-slate-400">MOMENTUM</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20">✨ AI Coach</button>
              <button className="inline-flex items-center gap-1 rounded-xl bg-secondary/10 px-3 py-2 text-sm font-medium text-secondary hover:bg-secondary/20">👥 Study Buddy</button>
              <button className="inline-flex items-center gap-1 rounded-xl bg-success/10 px-3 py-2 text-sm font-medium text-success hover:bg-success/20">📓 Mistakes Book</button>
              <button className="inline-flex items-center gap-1 rounded-xl bg-info/10 px-3 py-2 text-sm font-medium text-info hover:bg-info/20">💬 WhatsApp Tasks</button>
            </div>
          </div>

          <div className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Current Band Prediction</p>
              <p className="text-2xl font-semibold">6.5</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Weekly Improvement</p>
              <p className="text-2xl font-semibold text-emerald-600">+0.2</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Next Recommended Action</p>
              <p className="text-sm text-muted-foreground">Complete 2 writing tasks</p>
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-xl font-semibold">Today’s smart plan</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ['📘 Learning', 'Linking words for coherence', 'Short micro-lesson focused on contrast & addition linkers.', '⏱️ 10 min'],
                ['✏️ Practice', 'Reading – True/False/Not Given', '10 targeted questions based on your latest mistakes.', '⏱️ 12 min'],
                ['🎤 Mock exam', 'Speaking Part 2 (Cue card)', 'Record 1 full response and get instant AI feedback.', '⏱️ 5 min'],
              ].map(([tag, title, copy, time]) => (
                <div key={title} className="rounded-2xl border border-border bg-background/60 p-6 transition hover:shadow-md">
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">{tag}</span>
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">{time}</span>
                    <span className="flex items-center gap-1 font-medium text-primary">Start →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h3 className="mb-2 text-base font-semibold">Skills overview</h3>
                <p className="mb-4 text-sm text-muted-foreground">Track your strongest and weakest modules.</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ['Reading', '62%', 'Weak on Matching Information & TFNG.', '62%'],
                    ['Listening', '58%', 'Part 3 conversations need work.', '58%'],
                    ['Writing', 'Band 5.5', 'Grammar & examples in Task 2 are main gaps.', '55%'],
                    ['Speaking', 'Band 5.0', 'Coherence and fluency need more practice.', '50%'],
                  ].map(([label, score, note, width]) => (
                    <a key={label} href="#" className="rounded-2xl border border-border/60 bg-background/60 p-4 transition hover:shadow-md">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{score}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{note}</p>
                      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border/40">
                        <div className="h-full rounded-full bg-primary" style={{ width }} />
                      </div>
                      <div className="mt-2 flex justify-between text-xs"><span>📈 Weekly trend</span><span className="underline">View</span></div>
                    </a>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h3 className="mb-2 text-base font-semibold">AI insights for you</h3>
                <p className="mb-4 text-sm text-muted-foreground">Top observations from your recent activity.</p>
                <div className="space-y-3">
                  <div className="flex gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/70">
                    <span className="mt-0.5 h-5 w-5 text-sky-500">🧠</span>
                    <div>
                      <h4 className="font-medium">Listening Part 3 accuracy dropped by 6% on Thursday.</h4>
                      <p className="mt-1 text-sm text-muted-foreground">Focus on “attitude” and “opinion change” cues.</p>
                      <a href="#" className="mt-2 inline-block text-xs font-medium text-sky-600 hover:underline">Work on this now →</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 lg:col-span-4">
              <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Weekly Challenge</h3>
                    <p className="text-sm text-muted-foreground">You're enrolled in <strong>weekly-challenge-2026</strong>. 9/14 tasks completed.</p>
                  </div>
                  <div className="mt-2 flex gap-1 md:mt-0">🏅🏅</div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="flex justify-between text-xs"><span>Progress toward finish line</span><span>64%</span></div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border/40"><div className="h-full rounded-full bg-primary" style={{ width: '64%' }} /></div>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-xl bg-primary px-4 py-2 text-sm text-white">Open challenge</button>
                  <button className="rounded-xl border border-border px-4 py-2 text-sm">View leaderboard</button>
                </div>
              </div>
            </div>
          </div>

          <div className="fixed bottom-6 right-6 z-30 w-[320px]">
            <div className="space-y-3 rounded-2xl border border-indigo-200 bg-card p-4 shadow-lg dark:border-indigo-700">
              <h3 className="text-base font-medium">Ask GramorX AI</h3>
              <p className="text-sm text-muted-foreground">Context-aware assistant with prompts based on your dashboard activity.</p>
              <button className="w-full rounded-xl bg-primary px-3 py-2 text-sm text-white">Open AI Command Center</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
