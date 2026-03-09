import * as React from 'react';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { ArrowRight } from 'lucide-react';

type ActionItem = {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: string;
  ariaLabel?: string;
  disabled?: boolean;
};

type SupportCta = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'accent';
  ariaLabel?: string;
};

interface ActionSupportPanelProps {
  title?: string;
  subtitle?: string;
  actions?: ActionItem[];
  supportTitle?: string;
  supportDescription?: string;
  supportPrimaryCta?: SupportCta;
  supportSecondaryCta?: SupportCta;
  className?: string;
  actionsColumns?: 1 | 2 | 3;
}

function gridCols(actionsColumns: 1 | 2 | 3 = 2) {
  if (actionsColumns === 1) return 'grid-cols-1';
  if (actionsColumns === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  return 'grid-cols-1 sm:grid-cols-2';
}

function ActionLinkOrButton({ action }: { action: ActionItem }) {
  const commonClass =
    'group flex min-h-[52px] items-start gap-3 rounded-xl border border-border/70 bg-card px-3 py-3 text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

  const content = (
    <>
      {action.icon ? <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center text-primary">{action.icon}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{action.label}</span>
        {action.description ? <span className="mt-0.5 block text-xs text-muted-foreground">{action.description}</span> : null}
      </span>
      {action.badge ? (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {action.badge}
        </span>
      ) : (
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" aria-hidden="true" />
      )}
    </>
  );

  if (action.href) {
    return (
      <a href={action.href} aria-label={action.ariaLabel} className={commonClass} aria-disabled={action.disabled ? 'true' : undefined}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={action.onClick} disabled={action.disabled} aria-label={action.ariaLabel} className={commonClass}>
      {content}
    </button>
  );
}

export default function ActionSupportPanel({
  title = 'Quick actions',
  subtitle,
  actions = [],
  supportTitle = 'Need help?',
  supportDescription,
  supportPrimaryCta,
  supportSecondaryCta,
  className,
  actionsColumns = 2,
}: ActionSupportPanelProps) {
  return (
    <Card className={`rounded-ds-2xl p-5 sm:p-6 ${className ?? ''}`}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title ? <h3 className="font-slab text-h3">{title}</h3> : null}
          {subtitle ? <p className="mt-1 text-small text-muted-foreground">{subtitle}</p> : null}
        </div>
      )}

      {actions.length > 0 ? (
        <div className={`grid gap-3 ${gridCols(actionsColumns)}`}>
          {actions.map((action) => (
            <ActionLinkOrButton key={action.id} action={action} />
          ))}
        </div>
      ) : null}

      {(supportPrimaryCta || supportSecondaryCta || supportDescription) && (
        <div className={`mt-5 rounded-xl border border-border/70 bg-muted/30 p-4 ${actions.length > 0 ? 'border-t' : ''}`}>
          <h4 className="text-sm font-semibold">{supportTitle}</h4>
          {supportDescription ? <p className="mt-1 text-xs text-muted-foreground">{supportDescription}</p> : null}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            {supportPrimaryCta ? (
              <Button
                variant={supportPrimaryCta.variant ?? 'secondary'}
                href={supportPrimaryCta.href}
                onClick={supportPrimaryCta.onClick}
                className="w-full sm:w-auto"
                aria-label={supportPrimaryCta.ariaLabel}
              >
                {supportPrimaryCta.label}
              </Button>
            ) : null}
            {supportSecondaryCta ? (
              <Button
                variant={supportSecondaryCta.variant ?? 'ghost'}
                href={supportSecondaryCta.href}
                onClick={supportSecondaryCta.onClick}
                className="w-full sm:w-auto"
                aria-label={supportSecondaryCta.ariaLabel}
              >
                {supportSecondaryCta.label}
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </Card>
  );
}
