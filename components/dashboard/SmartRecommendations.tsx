import { Card } from '@/components/ui/Card';

export function SmartRecommendations({ items }: { items: string[] }) {
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-medium">Smart AI Recommendations</h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            {item}
          </li>
        ))}
      </ul>
    </Card>
  );
}
