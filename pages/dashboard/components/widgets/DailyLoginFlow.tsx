import { useEffect, useMemo, useState } from 'react';

import type { AIInsight } from '@/hooks/useAIInsights';

type DailyLoginFlowProps = {
  streak: number;
  insights: AIInsight[];
  tasks: string[];
};

const DailyLoginFlow = ({ streak, insights, tasks }: DailyLoginFlowProps) => {
  const [show, setShow] = useState(false);

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = `dashboard-daily-login-${todayKey}`;
    const seen = window.localStorage.getItem(key);
    if (!seen) {
      setShow(true);
      window.localStorage.setItem(key, '1');
    }
  }, [todayKey]);

  if (!show) return null;

  return (
    <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">Welcome back 👋</h3>
          <p className="mt-1 text-sm text-muted-foreground">You are on a {streak}-day streak.</p>
          {insights[0] ? <p className="mt-2 text-sm">AI insight: {insights[0].text}</p> : null}
          <ul className="mt-3 list-disc pl-5 text-sm">
            {tasks.slice(0, 3).map((task) => (
              <li key={task}>{task}</li>
            ))}
          </ul>
        </div>
        <button type="button" onClick={() => setShow(false)} className="text-sm text-muted-foreground underline">
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default DailyLoginFlow;
