-- 20251026000003_create_orgs_safe.sql
-- Safe, idempotent Organizations + membership tables with role-based RLS helpers

SET check_function_bodies = off;

-- Ensure UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure set_updated_at function exists
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create organizations table if not exists
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger for organizations (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'organizations_set_updated' AND tgrelid = 'public.organizations'::regclass
  ) THEN
    CREATE TRIGGER organizations_set_updated
      BEFORE UPDATE ON public.organizations
      FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END;
$$;

-- Create organization_members table if not exists
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','admin','member')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

-- Indexes for organization_members
CREATE INDEX IF NOT EXISTS organization_members_user_idx ON public.organization_members (user_id);
CREATE INDEX IF NOT EXISTS organization_members_org_idx ON public.organization_members (org_id);

-- Trigger for organization_members (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'organization_members_set_updated' AND tgrelid = 'public.organization_members'::regclass
  ) THEN
    CREATE TRIGGER organization_members_set_updated
      BEFORE UPDATE ON public.organization_members
      FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
  END IF;
END;
$$;

-- Create organization_invites table if not exists
CREATE TABLE IF NOT EXISTS public.organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','member')),
  token text NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE (org_id, email)
);

-- Indexes for organization_invites
CREATE INDEX IF NOT EXISTS organization_invites_email_idx ON public.organization_invites (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS organization_invites_unique_email ON public.organization_invites (org_id, LOWER(email));

-- Enable RLS
ALTER TABLE IF EXISTS public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organization_invites ENABLE ROW LEVEL SECURITY;

-- Create or replace functions
CREATE OR REPLACE FUNCTION public.is_org_member(org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.org_id = org
      AND m.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_org_admin(org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.org_id = org
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_org_owner(org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = org
      AND o.owner_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_org_owner(uuid) TO authenticated;

-- Policies (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'members can read orgs'
  ) THEN
    CREATE POLICY "members can read orgs"
      ON public.organizations
      FOR SELECT
      USING (public.is_org_member(id));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'owners manage orgs'
  ) THEN
    CREATE POLICY "owners manage orgs"
      ON public.organizations
      FOR ALL
      TO authenticated
      USING (public.is_org_owner(id))
      WITH CHECK (public.is_org_owner(id));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'owners create orgs'
  ) THEN
    CREATE POLICY "owners create orgs"
      ON public.organizations
      FOR INSERT
      TO authenticated
      WITH CHECK (owner_id = auth.uid());
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'organization_members' AND policyname = 'members read memberships'
  ) THEN
    CREATE POLICY "members read memberships"
      ON public.organization_members
      FOR SELECT
      USING (public.is_org_member(org_id));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'organization_members' AND policyname = 'owners manage memberships'
  ) THEN
    CREATE POLICY "owners manage memberships"
      ON public.organization_members
      FOR ALL
      TO authenticated
      USING (public.is_org_admin(org_id))
      WITH CHECK (
        public.is_org_admin(org_id)
        OR (
          role = 'owner'
          AND user_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = org_id AND o.owner_id = auth.uid()
          )
        )
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'organization_invites' AND policyname = 'owners invite members'
  ) THEN
    CREATE POLICY "owners invite members"
      ON public.organization_invites
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_org_admin(org_id));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'organization_invites' AND policyname = 'owners read invites'
  ) THEN
    CREATE POLICY "owners read invites"
      ON public.organization_invites
      FOR SELECT
      USING (public.is_org_admin(org_id));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'organization_invites' AND policyname = 'owners delete invites'
  ) THEN
    CREATE POLICY "owners delete invites"
      ON public.organization_invites
      FOR DELETE
      USING (public.is_org_admin(org_id));
  END IF;
END;
$$;

-- Add column to profiles if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS active_org_id uuid REFERENCES public.organizations(id);
  END IF;
END;
$$;

-- Index for profiles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'active_org_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS profiles_active_org_idx ON public.profiles (active_org_id);
  END IF;
END;
$$;

-- Comment on column (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'active_org_id'
  ) THEN
    EXECUTE 'COMMENT ON COLUMN public.profiles.active_org_id IS ''Current organization context for multi-tenant teacher mode.''';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END;
$$;