import { useRouter } from 'next/router';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { SkillModule } from '@/types/dashboard';

export function SkillModuleCard({ module }: { module: SkillModule }) {
  const router = useRouter();

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium">{module.name}</h3>
        <span className="text-xs text-slate-400">Band {module.band}</span>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Last attempt: {module.lastAttempt}
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400">Progress: {module.progress}%</p>
      <Button className="w-full" onClick={() => router.push(module.href)}>
        Quick start
      </Button>
    </Card>
  );
}
