// components/orgs/OrgSwitcher.tsx
// Dropdown for switching between personal and organization workspaces.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';

import { Select } from '@/components/design-system/Select';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';
import { useOrgContext, type OrgMembership } from '@/lib/orgs/context';

const roleLabel: Record<OrgMembership['role'], string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

export type OrgSwitcherProps = {
  className?: string;
  showManageButton?: boolean;
};

export function OrgSwitcher({ className, showManageButton = true }: OrgSwitcherProps) {
  const { memberships, activeOrgId, switchTo, loading, refresh } = useOrgContext();
  const [busy, setBusy] = useState(false);

  const options = useMemo(() => {
    const base = [{ value: '', label: 'Personal workspace' }];
    return [
      ...base,
      ...memberships.map((org) => ({ value: org.id, label: `${org.name}` })),
    ];
  }, [memberships]);

  const handleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;
    setBusy(true);
    try {
      await switchTo(next || null);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={clsx('flex flex-col gap-3 sm:flex-row sm:items-center', className)}>
      <div className="flex-1">
        <Select
          label="Workspace"
          value={activeOrgId ?? ''}
          onChange={handleChange}
          disabled={loading || busy}
          options={options}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {activeOrgId && (
          <Badge variant="neutral" size="sm">
            {roleLabel[memberships.find((m) => m.id === activeOrgId)?.role ?? 'member']}
          </Badge>
        )}
        {showManageButton && (
          <Button
            variant="outline"
            size="sm"
            asChild
            className="whitespace-nowrap"
          >
            <Link href="/orgs">Manage orgs</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export default OrgSwitcher;
