import React from 'react';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';

export type ModuleMockShellStat = {
  label: React.ReactNode;
  value: React.ReactNode;
  helper?: React.ReactNode;
};

export type ModuleMockShellProps = {
  title: string;
  description: React.ReactNode;
  actions?: React.ReactNode;
  badges?: React.ReactNode;
  stats?: ModuleMockShellStat[];
  heroVariant?: 'stack' | 'split';
  children?: React.ReactNode;
};

const StatsGrid: React.FC<{ stats: ModuleMockShellStat[] }> = ({ stats }) => {
  if (!stats.length) return null;

  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {stats.map((item, index) => (
        <Card key={index} className="card-surface rounded-ds-2xl p-4 h-full">
          <p className="text-sm text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-h4 font-semibold text-foreground">{item.value}</p>
          {item.helper ? (
            <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
          ) : null}
        </Card>
      ))}
    </div>
  );
};

export const ModuleMockShellSection: React.FC<
  React.PropsWithChildren<{ className?: string; as?: React.ElementType }>
> = ({ as: Component = 'div', className, children, ...rest }) => (
  <Component className={className} {...rest}>
    {children}
  </Component>
);

export const ModuleMockShell: React.FC<ModuleMockShellProps> & {
  Section: typeof ModuleMockShellSection;
} = ({
  title,
  description,
  actions,
  badges,
  stats = [],
  heroVariant = 'stack',
  children,
}) => {
  const copy = (
    <div className="space-y-3">
      <h1 className="font-slab text-display text-gradient-primary">{title}</h1>
      <p className="text-grayish">{description}</p>
      {badges ? (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">{badges}</div>
      ) : null}
    </div>
  );

  return (
    <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
      <Container>
        {heroVariant === 'split' ? (
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3 md:max-w-2xl">{copy}</div>
            {actions ? (
              <div className="flex flex-wrap items-center gap-3 md:justify-end">{actions}</div>
            ) : null}
          </div>
        ) : (
          <div className="max-w-3xl space-y-6">
            {copy}
            {actions ? (
              <div className="flex flex-wrap items-center gap-3">{actions}</div>
            ) : null}
          </div>
        )}

        <StatsGrid stats={stats} />

        <div className="mt-16 flex flex-col gap-16">
          {children}
        </div>
      </Container>
    </section>
  );
};

ModuleMockShell.Section = ModuleMockShellSection;

export default ModuleMockShell;
