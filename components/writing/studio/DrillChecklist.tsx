import { Checkbox } from '@/components/design-system/Checkbox';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';

export type DrillChecklistItem = {
  id: string;
  label: string;
  hint?: string;
  completed: boolean;
  href?: string;
};

export type DrillChecklistProps = {
  title?: string;
  items: DrillChecklistItem[];
};

export const DrillChecklist = ({ title = 'Targeted drills', items }: DrillChecklistProps) => {
  return (
    <Card className="space-y-3" padding="lg">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">Complete these focused reps to unlock your next redraft.</p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No drills assigned yet—review feedback to discover priorities.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card/70 p-3">
              <label className="flex items-start gap-3">
                <Checkbox checked={item.completed} readOnly tone={item.completed ? 'success' : 'default'} />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  {item.hint && <p className="text-xs text-muted-foreground">{item.hint}</p>}
                </div>
              </label>
              {item.href && (
                <div className="flex">
                  <Button size="xs" variant="outline" href={item.href}>
                    Open drill
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
