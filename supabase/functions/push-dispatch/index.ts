import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const payloadSchema = z.object({
  topic: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  data: z.record(z.any()).optional(),
  icon: z.string().optional(),
  badge: z.string().optional(),
  url: z.string().optional(),
  priority: z.enum(["high", "normal"]).optional(),
});

type TokenRow = {
  id: string;
  user_id: string;
  token: string;
  platform: string;
  topics: string[];
  metadata: Record<string, unknown> | null;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });
  }

  const parsedBody = await safeJson(req);
  if (!parsedBody.ok) {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), { status: 400, headers });
  }

  const payload = payloadSchema.safeParse(parsedBody.value);
  if (!payload.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid notification payload', details: payload.error.flatten() }),
      { status: 400, headers },
    );
  }

  const { topic } = payload.data;

  const { data: tokens, error } = await client
    .from('push_tokens')
    .select('id,user_id,token,platform,topics,metadata')
    .contains('topics', [topic]);

  if (error) {
    console.error('push-dispatch: failed to load tokens', error);
    return new Response(JSON.stringify({ error: 'Failed to load audience' }), {
      status: 500,
      headers,
    });
  }

  const now = new Date().toISOString();
  const rows = (tokens ?? []) as TokenRow[];

  await Promise.all(
    rows.map((row) =>
      client
        .from('mobile_events')
        .insert({
          user_id: row.user_id,
          token_id: row.id,
          event_type: 'push_dispatch',
          topic,
          payload: {
            token: row.token,
            platform: row.platform,
            metadata: row.metadata ?? null,
            notification: payload.data,
            dispatched_at: now,
          },
        })
        .select('id')
        .maybeSingle()
        .catch((err) => {
          console.warn('push-dispatch: failed to audit event', err);
        }),
    ),
  );

  return new Response(
    JSON.stringify({
      success: true,
      topic,
      audience: rows.length,
      accepted_at: now,
    }),
    { status: 200, headers },
  );
});

async function safeJson(req: Request) {
  try {
    const data = await req.json();
    return { ok: true as const, value: data };
  } catch {
    return { ok: false as const };
  }
}
