// lib/orgs/context.ts
// React context that exposes the viewer's available organizations and helpers to
// switch between personal and organization workspaces. Persists selection by
// updating profiles.active_org_id and falls back to local state when anonymous.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { supabaseBrowser } from '@/lib/supabaseBrowser';

export type OrgRole = 'owner' | 'admin' | 'member';

export type OrgMembership = Readonly<{
  id: string;
  name: string;
  slug: string;
  role: OrgRole;
}>;

export type OrgContextValue = Readonly<{
  memberships: OrgMembership[];
  activeOrgId: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  switchTo: (orgId: string | null) => Promise<void>;
}>;

const OrgContext = createContext<OrgContextValue | undefined>(undefined);

async function fetchMemberships(): Promise<{
  memberships: OrgMembership[];
  activeOrgId: string | null;
}> {
  const auth = await supabaseBrowser.auth.getUser();
  const user = auth.data.user;
  if (!user) {
    return { memberships: [], activeOrgId: null };
  }

  const [profileResp, membershipResp] = await Promise.all([
    supabaseBrowser
      .from('profiles')
      .select('active_org_id')
      .eq('id', user.id)
      .maybeSingle(),
    supabaseBrowser
      .from('organization_members')
      .select('id, role, organizations(id, name, slug)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
  ]);

  const activeOrgId = (profileResp.data?.active_org_id as string | null) ?? null;
  const rows = membershipResp.data ?? [];

  const memberships = rows
    .map((row) => {
      const org = (row as any).organizations;
      if (!org?.id) return null;
      return {
        id: org.id as string,
        name: (org.name as string) ?? 'Untitled org',
        slug: (org.slug as string) ?? org.id,
        role: (row.role as OrgRole) ?? 'member',
      } satisfies OrgMembership;
    })
    .filter((row): row is OrgMembership => Boolean(row));

  return { memberships, activeOrgId };
}

async function persistActiveOrg(orgId: string | null) {
  const { data: auth } = await supabaseBrowser.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return;
  await supabaseBrowser.from('profiles').update({ active_org_id: orgId }).eq('id', userId);
}

export function OrgProvider({ children }: { children: ReactNode }) {
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshPromise = useRef<Promise<void> | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { memberships: list, activeOrgId: current } = await fetchMemberships();
      setMemberships(list);
      setActiveOrgId(current);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organizations');
      setMemberships([]);
      setActiveOrgId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPromise.current = load();
  }, [load]);

  const refresh = useCallback(async () => {
    if (refreshPromise.current) {
      await refreshPromise.current;
    }
    refreshPromise.current = load();
    await refreshPromise.current;
  }, [load]);

  const switchTo = useCallback(
    async (nextOrgId: string | null) => {
      const normalised = nextOrgId ?? null;
      try {
        await persistActiveOrg(normalised);
        setActiveOrgId(normalised);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not switch organization');
        throw err;
      }
    },
    [],
  );

  const value = useMemo<OrgContextValue>(
    () => ({ memberships, activeOrgId, loading, error, refresh, switchTo }),
    [memberships, activeOrgId, loading, error, refresh, switchTo],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrgContext(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error('useOrgContext must be used within an OrgProvider');
  }
  return ctx;
}

export function useOrgOptions(): Array<{ value: string | null; label: string; role?: OrgRole }> {
  const { memberships } = useOrgContext();
  const options = memberships.map((org) => ({
    value: org.id,
    label: org.name,
    role: org.role,
  }));
  return [{ value: null, label: 'Personal workspace' }, ...options];
}

export const PERSONAL_ORG_ID = null;

export default OrgContext;
