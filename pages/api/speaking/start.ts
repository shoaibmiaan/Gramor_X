import { randomUUID } from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

const RequestSchema = z.object({
  promptId: z.string().uuid(),
  contentType: z.string().min(1).max(120).optional(),
  fileExtension: z.string().min(1).max(16).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = RequestSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', issues: parsed.error.flatten() });
  }

  const supabase = createSupabaseServerClient({ req });
  const { data: userResp } = await supabase.auth.getUser();
  const user = userResp?.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { promptId, contentType, fileExtension } = parsed.data;

  const { data: prompt, error: promptErr } = await supabaseAdmin
    .from('speaking_prompts')
    .select('id, part, prompt_text, metadata, is_active')
    .eq('id', promptId)
    .eq('is_active', true)
    .single();

  if (promptErr || !prompt) {
    return res.status(404).json({ error: 'Prompt not found' });
  }

  const attemptId = randomUUID();
  const extensionCandidate = (fileExtension ?? 'webm').trim().replace(/^\.+/, '');
  const safeExtension = /^[a-z0-9]+$/i.test(extensionCandidate)
    ? extensionCandidate.toLowerCase()
    : 'webm';
  const storageObjectPath = `${user.id}/${attemptId}/recording.${safeExtension}`;
  const audioUrls: Record<string, string[]> = { main: [storageObjectPath] };

  const { error: insertErr } = await supabaseAdmin
    .from('speaking_attempts')
    .insert({
      id: attemptId,
      user_id: user.id,
      prompt_id: prompt.id,
      part: prompt.part,
      status: 'pending',
      audio_object_path: storageObjectPath,
      audio_urls: audioUrls,
    });

  if (insertErr) {
    return res.status(400).json({ error: insertErr.message });
  }

  const expiresIn = 900; // 15 minutes
  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from('speaking-audio')
    .createSignedUploadUrl(storageObjectPath, expiresIn);

  if (signErr || !signed?.signedUrl) {
    await supabaseAdmin.from('speaking_attempts').delete().eq('id', attemptId);
    return res.status(500).json({ error: signErr?.message || 'Unable to create upload URL' });
  }

  res.setHeader('Cache-Control', 'no-store');

  return res.status(200).json({
    attemptId,
    prompt: {
      id: prompt.id,
      text: prompt.prompt_text,
      part: prompt.part,
      metadata: prompt.metadata ?? {},
    },
    upload: {
      url: signed.signedUrl,
      path: signed.path ?? storageObjectPath,
      token: signed.token ?? null,
      expiresIn,
      method: 'PUT',
      headers: {
        'Content-Type': contentType ?? `audio/${safeExtension === 'webm' ? 'webm' : safeExtension}`,
      },
    },
  });
}
