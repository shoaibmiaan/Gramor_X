import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { buildWhatsAppTaskMessage, dispatchWhatsAppTask } from '@/lib/tasks/whatsapp';

const BodySchema = z.object({
  consent: z.boolean(),
  sendTest: z.boolean().optional(),
  message: z.string().max(600).optional(),
});

type ResponseBody = { ok: boolean; error?: string };

function parseFunctionsError(error: unknown) {
  if (!error) return 'Failed to invoke WhatsApp task dispatcher';
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && 'message' in (error as any) && typeof (error as any).message === 'string') {
    return (error as any).message as string;
  }
  return 'Failed to invoke WhatsApp task dispatcher';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const parseResult = BodySchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ ok: false, error: 'Invalid request body' });
  }

  const { consent, sendTest = false, message } = parseResult.data;

  const supabase = createSupabaseServerClient({ req, res });
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const { error: optInError } = await supabase
      .from('notifications_opt_in')
      .upsert({ user_id: user.id, wa_opt_in: consent }, { onConflict: 'user_id' });

    if (optInError) {
      return res.status(500).json({ ok: false, error: optInError.message });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('notification_channels, full_name')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError) {
      return res.status(500).json({ ok: false, error: profileError.message });
    }

    const channels = new Set<string>((profile?.notification_channels ?? []) as string[]);
    if (consent) channels.add('whatsapp');
    else channels.delete('whatsapp');

    const { error: profileUpdateError } = await supabase.from('profiles').upsert({
      user_id: user.id,
      whatsapp_opt_in: consent,
      notification_channels: Array.from(channels),
    });

    if (profileUpdateError) {
      return res.status(500).json({ ok: false, error: profileUpdateError.message });
    }

    const { error: eventError } = await supabase.from('notification_consent_events').insert({
      user_id: user.id,
      actor_id: user.id,
      channel: 'whatsapp',
      action: consent ? 'opt_in' : 'opt_out',
      metadata: {
        source: 'api/notifications/whatsapp-opt-in',
        sendTest,
      },
    });

    if (eventError) {
      return res.status(500).json({ ok: false, error: eventError.message });
    }

    if (consent && sendTest) {
      const confirmationMessage =
        message?.trim() ||
        buildWhatsAppTaskMessage('optInConfirmation', {
          userName: profile?.full_name ?? undefined,
        });

      const response = await dispatchWhatsAppTask(supabase, {
        userId: user.id,
        type: 'test',
        message: confirmationMessage,
        metadata: {
          source: 'api/notifications/whatsapp-opt-in',
          trigger: 'sendTest',
        },
      });

      if (response.error) {
        return res.status(502).json({ ok: false, error: parseFunctionsError(response.error) });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error in WhatsApp opt-in API:', error);
    const message = error instanceof Error ? error.message : 'Operation failed';
    return res.status(500).json({ ok: false, error: message });
  }
}