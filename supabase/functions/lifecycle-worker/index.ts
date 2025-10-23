import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderLifecycleTemplate, type LifecycleEventType } from "../../lib/lifecycle/templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "GramorX <no-reply@gramorx.com>";
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM");
const TRACKOR_ENDPOINT = Deno.env.get("TRACKOR_ENDPOINT") ?? Deno.env.get("TRACKOR_URL");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase configuration for lifecycle worker");
}

const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function isLifecycleEventType(value: unknown): value is LifecycleEventType {
  return (
    value === "first_mock_done" || value === "band_up" || value === "streak_broken"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeContext(context: unknown): Record<string, unknown> {
  if (!isRecord(context)) return {};
  try {
    return JSON.parse(JSON.stringify(context)) as Record<string, unknown>;
  } catch {
    const safe: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(context)) {
      const type = typeof value;
      if (value === null || type === "string" || type === "number" || type === "boolean") {
        safe[key] = value as unknown;
      }
    }
    return safe;
  }
}

async function fetchEvents(ids: number[], limit: number): Promise<any[]> {
  if (ids.length > 0) {
    const { data } = await client
      .from("lifecycle_events")
      .select("id, user_id, event, status, context, channels, attempts")
      .in("id", ids);
    return data ?? [];
  }

  const { data } = await client
    .from("lifecycle_events")
    .select("id, user_id, event, status, context, channels, attempts")
    .in("status", ["pending", "failed"])
    .order("created_at", { ascending: true })
    .limit(limit);

  return data ?? [];
}

async function sendEmail(to: string, subject: string, text: string) {
  if (!RESEND_API_KEY) {
    throw new Error("resend_not_configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: RESEND_FROM_EMAIL, to, subject, text }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`resend_error:${response.status}:${body}`);
  }
}

async function sendWhatsApp(to: string, body: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    throw new Error("twilio_not_configured");
  }

  const params = new URLSearchParams({
    To: `whatsapp:${to}`,
    From: `whatsapp:${TWILIO_WHATSAPP_FROM}`,
    Body: body,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`twilio_error:${response.status}:${text}`);
  }
}

async function logTrackor(event: string, payload: Record<string, unknown>) {
  if (!TRACKOR_ENDPOINT) {
    if (Deno.env.get("NODE_ENV") !== "production") {
      console.log(`[lifecycle-worker] ${event}`, payload);
    }
    return;
  }

  try {
    await fetch(TRACKOR_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event, payload, timestamp: new Date().toISOString() }),
      keepalive: true,
    });
  } catch (error) {
    if (Deno.env.get("NODE_ENV") !== "production") {
      console.warn("[lifecycle-worker] trackor error", error);
    }
  }
}

async function processEvent(row: any) {
  const now = new Date().toISOString();
  const eventType = isLifecycleEventType(row.event) ? row.event : null;
  const context = sanitizeContext(row.context);

  if (!eventType) {
    await client
      .from("lifecycle_events")
      .update({
        status: "failed",
        error: "invalid_event",
        attempts: (row.attempts ?? 0) + 1,
        last_attempt_at: now,
      })
      .eq("id", row.id);
    return { id: row.id, status: "failed", channels: [], error: "invalid_event" };
  }

  const [{ data: profile }, { data: optIn }] = await Promise.all([
    client
      .from("profiles")
      .select(
        "full_name, email, phone, phone_verified, whatsapp_opt_in, locale, preferred_language",
      )
      .eq("user_id", row.user_id)
      .maybeSingle(),
    client
      .from("notifications_opt_in")
      .select("email_opt_in, wa_opt_in")
      .eq("user_id", row.user_id)
      .maybeSingle(),
  ]);

  let email = profile?.email ?? null;
  if (!email) {
    try {
      const { data } = await client.auth.admin.getUserById(row.user_id);
      email = data.user?.email ?? null;
    } catch {
      // ignore admin lookup errors
    }
  }

  const phone = typeof profile?.phone === "string" ? profile.phone : null;
  const rawPhoneVerified = profile?.phone_verified;
  const phoneVerified = rawPhoneVerified === null || rawPhoneVerified === undefined ? true : Boolean(rawPhoneVerified);

  const emailAllowed = (optIn?.email_opt_in ?? true) && !!email && !!RESEND_API_KEY;
  const whatsappAllowed =
    (optIn?.wa_opt_in ?? Boolean(profile?.whatsapp_opt_in)) &&
    !!phone &&
    phoneVerified &&
    !!TWILIO_ACCOUNT_SID &&
    !!TWILIO_AUTH_TOKEN &&
    !!TWILIO_WHATSAPP_FROM;

  const requestedChannels = Array.isArray(row.channels)
    ? (row.channels as string[]).filter((value): value is LifecycleChannel =>
        value === "email" || value === "whatsapp",
      )
    : (['email', 'whatsapp'] as LifecycleChannel[]);

  const sendEmailChannel = requestedChannels.includes("email") && emailAllowed;
  const sendWhatsAppChannel = requestedChannels.includes("whatsapp") && whatsappAllowed;

  const template = renderLifecycleTemplate(eventType, {
    name: profile?.full_name ?? undefined,
    locale: profile?.locale ?? profile?.preferred_language ?? undefined,
    context,
  });

  const sentChannels: LifecycleChannel[] = [];
  const errors: string[] = [];

  if (sendEmailChannel && email) {
    try {
      await sendEmail(email, template.email.subject, template.email.text);
      sentChannels.push("email");
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (sendWhatsAppChannel && phone) {
    try {
      await sendWhatsApp(phone, template.whatsapp.text);
      sentChannels.push("whatsapp");
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  const noChannelsAvailable = !sendEmailChannel && !sendWhatsAppChannel;
  if (noChannelsAvailable && errors.length === 0) {
    errors.push("no_channels_available");
  }

  const status =
    sentChannels.length > 0
      ? "sent"
      : noChannelsAvailable
      ? "skipped"
      : errors.length > 0
      ? "failed"
      : "skipped";

  const updates: Record<string, unknown> = {
    status,
    channels: sentChannels,
    attempts: (row.attempts ?? 0) + 1,
    last_attempt_at: now,
    error: errors.length > 0 ? errors.join(' | ') : null,
  };

  if (status === "sent" || status === "skipped") {
    updates.processed_at = now;
  }

  await client.from("lifecycle_events").update(updates).eq("id", row.id);

  if (status === "sent" && sentChannels.length > 0) {
    await logTrackor("lifecycle.sent", {
      user_id: row.user_id,
      event: eventType,
      channels: sentChannels,
      event_id: row.id,
    });
  }

  return { id: row.id, status, channels: sentChannels, error: errors.join(' | ') || null };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const ids = Array.isArray(payload?.eventIds)
    ? payload.eventIds.filter((id: unknown): id is number => typeof id === 'number')
    : [];
  const limit = typeof payload?.limit === 'number' ? Math.min(Math.max(payload.limit, 1), 50) : 25;

  const events = await fetchEvents(ids, limit);
  const processed = [];

  for (const row of events) {
    const result = await processEvent(row);
    processed.push(result);
  }

  return Response.json({ ok: true, processed });
});
