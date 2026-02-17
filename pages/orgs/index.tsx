// pages/orgs/index.tsx
import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Input } from '@/components/design-system/Input';
import { Button } from '@/components/design-system/Button';
import { Select } from '@/components/design-system/Select';
import { Badge } from '@/components/design-system/Badge';
import { useToast } from '@/components/design-system/Toaster';
import OrgSwitcher from '@/components/orgs/OrgSwitcher';
import { useOrgContext } from '@/lib/orgs/context';

const inviteRoleOptions = [
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin' },
];

export default function OrgDashboard() {
  const { memberships, activeOrgId, refresh, loading } = useOrgContext();
  const { success, error } = useToast();

  const [orgName, setOrgName] = useState('');
  const [creating, setCreating] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteOrg, setInviteOrg] = useState<string>('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!inviteOrg && memberships.length > 0) {
      const preferred = activeOrgId ?? memberships[0]?.id;
      if (preferred) setInviteOrg(preferred);
    }
  }, [inviteOrg, memberships, activeOrgId]);

  const availableOrgs = useMemo(
    () => memberships.map((org) => ({ value: org.id, label: org.name })),
    [memberships],
  );

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = orgName.trim();
    if (!trimmed) {
      error('Give your organization a name first.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/orgs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Failed to create organization');
      }
      setOrgName('');
      success('Organization created');
      await refresh();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Could not create organization');
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = inviteEmail.trim();
    if (!inviteOrg) {
      error('Select an organization first');
      return;
    }
    if (!trimmed) {
      error('Add an email to invite');
      return;
    }
    setInviting(true);
    try {
      const res = await fetch('/api/orgs/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: inviteOrg, email: trimmed, role: inviteRole }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? 'Failed to send invite');
      }
      setInviteEmail('');
      success('Invite sent');
    } catch (err) {
      error(err instanceof Error ? err.message : 'Could not send invite');
    } finally {
      setInviting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Organizations · Gramor</title>
      </Head>
      <Container className="py-10 space-y-8">
        <header className="space-y-3">
          <h1 className="text-h2 font-semibold text-foreground">Organizations</h1>
          <p className="text-body text-muted-foreground">
            Create a shared workspace, invite teammates, and switch between personal and organization views.
          </p>
        </header>

        <OrgSwitcher />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card padding="lg" className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-h4 font-semibold text-foreground">Create an organization</h2>
              <p className="text-small text-muted-foreground">
                Set up a shared workspace for your classroom or institute.
              </p>
            </div>
            <form className="space-y-4" onSubmit={handleCreate}>
              <Input
                label="Organization name"
                placeholder="e.g. Rising Band Academy"
                value={orgName}
                onChange={(event) => setOrgName(event.target.value)}
                required
              />
              <Button type="submit" disabled={creating} size="lg">
                {creating ? 'Creating…' : 'Create organization'}
              </Button>
            </form>
          </Card>

          <Card padding="lg" className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-h4 font-semibold text-foreground">Invite a member</h2>
              <p className="text-small text-muted-foreground">
                Send an email invitation to teachers or students you want to collaborate with.
              </p>
            </div>
            <form className="space-y-4" onSubmit={handleInvite}>
              <Select
                label="Organization"
                value={inviteOrg}
                onChange={(event) => setInviteOrg(event.target.value)}
                disabled={loading || memberships.length === 0}
                options={[{ value: '', label: 'Select organization' }, ...availableOrgs]}
              />
              <Input
                label="Email"
                type="email"
                placeholder="teacher@example.com"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                required
              />
              <Select
                label="Role"
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as 'admin' | 'member')}
                options={inviteRoleOptions}
              />
              <Button type="submit" disabled={inviting || memberships.length === 0} size="lg">
                {inviting ? 'Sending…' : 'Send invite'}
              </Button>
            </form>
          </Card>
        </div>

        <Card padding="lg" className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-h4 font-semibold text-foreground">Current memberships</h2>
              <p className="text-small text-muted-foreground">
                Switch roles or manage members from the workspace dashboard.
              </p>
            </div>
            <Badge variant="subtle">{memberships.length} org{memberships.length === 1 ? '' : 's'}</Badge>
          </div>
          <div className="divide-y divide-border rounded-2xl border border-border">
            {memberships.length === 0 && (
              <p className="p-6 text-center text-small text-muted-foreground">
                No organizations yet — create one above to get started.
              </p>
            )}
            {memberships.map((org) => (
              <div key={org.id} className="flex flex-col gap-2 p-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-body font-medium text-foreground">{org.name}</p>
                  <p className="text-small text-muted-foreground">{org.slug}</p>
                </div>
                <Badge variant={org.role === 'owner' ? 'primary' : org.role === 'admin' ? 'info' : 'neutral'}>
                  {org.role === 'owner' ? 'Owner' : org.role === 'admin' ? 'Admin' : 'Member'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </Container>
    </>
  );
}
