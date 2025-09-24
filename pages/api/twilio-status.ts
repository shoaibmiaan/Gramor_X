// pages/api/twilio-status.ts
import { NextApiRequest, NextApiResponse } from "next";
import Twilio from "twilio";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const { TWILIO_AUTH_TOKEN } = env;
const supa = createSupabaseServerClient({ serviceRole: true });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const signature = req.headers["x-twilio-signature"] as string | undefined;
  const url = `${env.NEXT_PUBLIC_SITE_URL || "https://yourdomain.com"}/api/twilio-status`;
  const valid = Twilio.validateRequest(TWILIO_AUTH_TOKEN, signature || "", url, req.body);

  if (!valid) return res.status(403).end("Invalid Twilio signature");

  const { MessageSid, MessageStatus, To, From, ErrorCode, ErrorMessage } = req.body;
  await supa.from("message_statuses").upsert({
    message_sid: MessageSid,
    status: MessageStatus,
    to_number: To,
    from_number: From || null,
    error_code: ErrorCode || null,
    error_message: ErrorMessage || null,
    received_at: new Date().toISOString(),
  }, { onConflict: "message_sid" });

  res.status(200).end("OK");
}
