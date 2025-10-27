// pages/api/orgs/create.ts
import type { NextApiHandler } from 'next';
import { customAlphabet } from 'nanoid';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { supabaseService } from '@/lib/supabaseService';

const slugAlphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
const randomSlug = customAlphabet(slugAlphabet, 6);

const CreateOrgSchema = z.object({
  name: z.string().min(2, 'Name too short').max(120, 'Name too long'),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

const handler: NextApiHandler = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createSupabaseServerClient({ req, res });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parsed = CreateOrgSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const name = parsed.data.name.trim();
  const baseSlug = slugify(name).slice(0, 48) || 'org';

  let attempt = 0;
  let orgId: string | null = null;
  let slug = baseSlug;

  while (attempt < 6 && !orgId) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${randomSlug()}`;
    const { data, error } = await supabaseService
      .from('organizations')
      .insert({ name, owner_id: user.id, slug: candidate })
      .select('id, name, slug')
      .single();

    if (!error && data) {
      orgId = data.id as string;
      slug = data.slug as string;
      break;
    }

    if (!error && !data) {
      break;
    }

    if (error?.code === '23505' || (error?.message ?? '').includes('duplicate')) {
      attempt += 1;
      continue;
    }

    return res.status(500).json({ error: 'Failed to create organization', details: error });
  }

  if (!orgId) {
    return res.status(500).json({ error: 'Could not allocate unique slug' });
  }

  const { error: membershipError } = await supabaseService
    .from('organization_members')
    .upsert({ org_id: orgId, user_id: user.id, role: 'owner' }, { onConflict: 'org_id,user_id' });

  if (membershipError) {
    return res.status(500).json({ error: 'Failed to register owner membership' });
  }

  const { error: profileError } = await supabaseService
    .from('profiles')
    .update({ active_org_id: orgId })
    .eq('id', user.id);

  if (profileError) {
    return res.status(500).json({ error: 'Failed to persist organization selection' });
  }

  return res.status(200).json({ ok: true, organization: { id: orgId, name, slug } });
};

export default handler;
