import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify } from "https://deno.land/x/jose@v4.15.5/jwt/verify.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM");
const SUPABASE_JWT_SECRET = Deno.env.get("SUPABASE_JWT_SECRET");
const WHATSAPP_TASKS_SIGNING_SECRET = Deno.env.get("WHATSAPP_TASKS_SIGNING_SECRET");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase service configuration");
}

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
  throw new Error("Missing Twilio WhatsApp credentials");
}

if (!SUPABASE_JWT_SECRET) {
  throw new Error("Missing Supabase JWT secret");
}

if (!WHATSAPP_TASKS_SIGNING_SECRET) {
  throw new Error("Missing WhatsApp task signing secret");
}

const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const textEncoder = new TextEncoder();
const signingKeyPromise = crypto.subtle.importKey(
  "raw",
  textEncoder.encode(WHATSAPP_TASKS_SIGNING_SECRET),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign"],
);

function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function verifySignature(body: string, signature: string | null) {
  if (!signature) return false;

  const normalized = signature.trim().toLowerCase();
  const key = await signingKeyPromise;
  const digest = await crypto.subtle.sign("HMAC", key, textEncoder.encode(body));
  const expected = toHex(new Uint8Array(digest)).toLowerCase();

  return timingSafeEqual(expected, normalized);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function resolveUserIdFromToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(SUPABASE_JWT_SECRET!),
    );

    const sub = payload.sub;
    if (typeof sub !== "string" || sub.length === 0) {
      return null;
    }

    return sub;
  } catch (error) {
    console.error("Failed to verify access token", error);
    return null;
  }
}

async function sendWhatsApp(to: string, body: string) {
  const params = new URLSearchParams({
    To: `whatsapp:${to}`,
    From: `whatsapp:${TWILIO_WHATSAPP_FROM}`,
    Body: body,
  });

  const res = await fetch(
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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio error: ${res.status} ${text}`);
  }
}

type Payload = {
  userId?: string;
  type?: "test" | "task";
  message?: string;
  metadata?: Record<string, unknown>;
};

type ErrorResponse = { error: string };
type SuccessResponse = { ok: true };

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const signatureHeader = req.headers.get("x-gramorx-signature");

  const signatureOk = await verifySignature(rawBody, signatureHeader);
  if (!signatureOk) {
    return Response.json<ErrorResponse>({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Payload;
  try {
    const parsed = rawBody ? JSON.parse(rawBody) : {};
    if (!isRecord(parsed)) {
      return Response.json<ErrorResponse>({ error: "Invalid JSON body" }, { status: 400 });
    }
    payload = parsed as Payload;
  } catch {
    return Response.json<ErrorResponse>({ error: "Invalid JSON body" }, { status: 400 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json<ErrorResponse>({ error: "Authorization header missing" }, { status: 401 });
  }

  const accessToken = authHeader.replace("Bearer ", "");
  const authenticatedUserId = await resolveUserIdFromToken(accessToken);

  if (!authenticatedUserId) {
    return Response.json<ErrorResponse>({ error: "Invalid access token" }, { status: 401 });
  }

  const requestedUserId = typeof payload.userId === "string" ? payload.userId : undefined;

  if (requestedUserId && requestedUserId !== authenticatedUserId) {
    return Response.json<ErrorResponse>({ error: "userId does not match authenticated user" }, { status: 403 });
  }

  const userId = authenticatedUserId;

  const type = payload.type ?? "test";

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("user_id, phone, phone_verified, full_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    return Response.json<ErrorResponse>({ error: profileError.message }, { status: 500 });
  }

  if (!profile || !profile.phone) {
    return Response.json<ErrorResponse>({ error: "Phone number not found" }, { status: 400 });
  }

  if (!profile.phone_verified) {
    return Response.json<ErrorResponse>({ error: "Phone number not verified" }, { status: 400 });
  }

  const { data: preferences, error: prefsError } = await client
    .from("notifications_opt_in")
    .select("wa_opt_in")
    .eq("user_id", userId)
    .maybeSingle();

  if (prefsError) {
    return Response.json<ErrorResponse>({ error: prefsError.message }, { status: 500 });
  }

  if (!preferences?.wa_opt_in) {
    return Response.json<ErrorResponse>({ error: "WhatsApp is not enabled for this account" }, { status: 400 });
  }

  const defaultMessage =
    type === "task"
      ? "Here’s your GramorX study task via WhatsApp. Reply DONE when you finish!"
      : "Test message from GramorX: you’ll start receiving WhatsApp tasks here.";

  const message =
    typeof payload.message === "string" && payload.message.trim().length > 0
      ? payload.message
      : defaultMessage;

  try {
    await sendWhatsApp(profile.phone, message);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return Response.json<ErrorResponse>({ error: errorMessage }, { status: 500 });
  }

  const metadata = isRecord(payload.metadata) ? payload.metadata : undefined;
  const eventMetadata: Record<string, unknown> = { type };
  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      eventMetadata[key] = value;
    }
  }

  const { error: insertError } = await client.from("notification_consent_events").insert({
    user_id: userId,
    actor_id: authenticatedUserId,
    channel: "whatsapp",
    action: type === "task" ? "task" : "test_message",
    metadata: eventMetadata,
  });

  if (insertError) {
    return Response.json<ErrorResponse>({ error: insertError.message }, { status: 500 });
  }

  return Response.json<SuccessResponse>({ ok: true });
});
