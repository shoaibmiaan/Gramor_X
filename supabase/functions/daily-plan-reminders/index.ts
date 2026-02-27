import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ProfileRow = {
  user_id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  notification_channels: string[] | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string | null;
};

type StudyTaskRow = {
  title: string;
  catch_up: boolean | null;
};

type LogEvent = {
  job_name: string;
  run_id: string;
  user_id?: string | null;
  channel?: string | null;
  status: string;
  message?: string | null;
  error?: string | null;
  metadata?: Record<string, unknown> | null;
};

const JOB_NAME = "daily-plan-reminders";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM = Deno.env.get("RESEND_FROM_EMAIL") ?? "no-reply@gramorx.com";
const TEST_PHONE = Deno.env.get("DAILY_REMINDER_TEST_PHONE");
const TEST_EMAIL = Deno.env.get("DAILY_REMINDER_TEST_EMAIL");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase configuration for daily plan reminders");
}

const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry<T>(operation: (attempt: number) => Promise<T>): Promise<T> {
  const maxAttempts = 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) break;
      await sleep(2 ** attempt * 200);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function logEvent(entry: LogEvent) {
  try {
    const payload = {
      job_name: entry.job_name,
      run_id: entry.run_id,
      user_id: entry.user_id ?? null,
      channel: entry.channel ?? null,
      status: entry.status,
      message: entry.message ?? null,
      error: entry.error ?? null,
      metadata: entry.metadata ?? {},
    };
    const { error } = await client.from("notification_logs").insert(payload);
    if (error) {
      console.error("Failed to write notification log", error.message);
    }
  } catch (err) {
    console.error("Unexpected error writing notification log", err);
  }
}

function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function coerceTimeZone(tz: string | null | undefined): string {
  return isValidTimeZone(tz) ? (tz as string) : "UTC";
}

function extractMinutes(time: string | null): number | null {
  if (!time) return null;
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function localMinutes(now: Date, timeZone: string): number {
  const parts = Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function isQuiet(now: Date, timeZone: string, start: string | null, end: string | null): boolean {
  const startMinutes = extractMinutes(start);
  const endMinutes = extractMinutes(end);
  if (startMinutes == null || endMinutes == null) return false;
  const current = localMinutes(now, timeZone);
  if (startMinutes === endMinutes) return false;
  if (startMinutes < endMinutes) {
    return current >= startMinutes && current < endMinutes;
  }
  return current >= startMinutes || current < endMinutes;
}

function formatLocalISODate(now: Date, timeZone: string): string {
  return Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function formatHumanDate(now: Date, timeZone: string): string {
  return Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
  }).format(now);
}

function firstName(fullName: string | null): string | null {
  if (!fullName) return null;
  const trimmed = fullName.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0];
}

async function fetchTodaysTasks(userId: string, scheduledDate: string) {
  const { data, error } = await client
    .from("study_tasks")
    .select("title,catch_up")
    .eq("user_id", userId)
    .eq("scheduled_date", scheduledDate);
  if (error) throw new Error(error.message);
  return (data ?? []) as StudyTaskRow[];
}

async function sendWhatsApp(to: string, body: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    throw new Error("Missing Twilio configuration for WhatsApp delivery");
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`;
  const params = new URLSearchParams({
    To: `whatsapp:${to}`,
    From: `whatsapp:${TWILIO_WHATSAPP_FROM}`,
    Body: body,
  });
  await withRetry(async () => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Twilio WhatsApp error ${response.status}: ${text}`);
    }
  });
}

async function sendEmail(to: string, subject: string, text: string) {
  if (!RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY for email delivery");
  }
  const payload = { from: RESEND_FROM, to, subject, text };
  await withRetry(async () => {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const textBody = await response.text();
      throw new Error(`Resend error ${response.status}: ${textBody}`);
    }
  });
}

function buildMessage(profile: ProfileRow, tasks: StudyTaskRow[], dateText: string) {
  const name = firstName(profile.full_name);
  const intro = name ? `Hi ${name},` : "Hi there,";
  const lines = tasks.map((task, idx) => {
    const label = `${idx + 1}. ${task.title}`;
    return task.catch_up ? `${label} (catch-up)` : label;
  });
  const bodyLines = [
    `${intro}\nHere’s your GramorX study plan for ${dateText}:`,
    ...lines,
    lines.length ? "You’ve got this!" : "Nothing scheduled today – take a breather.",
  ];
  const text = bodyLines.join("\n");
  const subject = `Your GramorX tasks for ${dateText}`;
  return { text, subject };
}

Deno.serve(async (request: Request) => {
  const runId = crypto.randomUUID();
  const url = new URL(request.url);
  const isTestRun = url.searchParams.get("test") === "true" || url.searchParams.get("mode") === "test";
  const now = new Date();
  const summary = {
    processed: 0,
    skipped: 0,
    sentEmail: 0,
    sentWhatsApp: 0,
    failures: 0,
    testRun: isTestRun,
  };

  await logEvent({
    job_name: JOB_NAME,
    run_id: runId,
    status: "started",
    message: "Daily plan reminder job started",
    metadata: { isTestRun },
  });

  try {
    const { data: profiles, error } = await client
      .from("profiles")
      .select(
        "user_id,email,phone,full_name,notification_channels,quiet_hours_start,quiet_hours_end,timezone",
      )
      .neq("user_id", null);

    if (error) throw new Error(error.message);

    for (const profile of (profiles ?? []) as ProfileRow[]) {
      summary.processed += 1;
      const timezone = coerceTimeZone(profile.timezone);
      const localDateISO = formatLocalISODate(now, timezone);
      const humanDate = formatHumanDate(now, timezone);
      const channels = new Set(profile.notification_channels ?? []);
      const wantsEmail = channels.has("email") && !!profile.email;
      const wantsWhatsApp = channels.has("whatsapp") && !!profile.phone;

      if (!wantsEmail && !wantsWhatsApp) {
        summary.skipped += 1;
        await logEvent({
          job_name: JOB_NAME,
          run_id: runId,
          user_id: profile.user_id,
          status: "skipped",
          message: "No opted-in channels for user",
          metadata: { channels: profile.notification_channels ?? [] },
        });
        continue;
      }

      if (isQuiet(now, timezone, profile.quiet_hours_start, profile.quiet_hours_end)) {
        summary.skipped += 1;
        await logEvent({
          job_name: JOB_NAME,
          run_id: runId,
          user_id: profile.user_id,
          status: "skipped",
          message: "Quiet hours active",
          metadata: {
            timezone,
            quiet_hours_start: profile.quiet_hours_start,
            quiet_hours_end: profile.quiet_hours_end,
          },
        });
        continue;
      }

      let tasks: StudyTaskRow[] = [];
      try {
        tasks = await fetchTodaysTasks(profile.user_id, localDateISO);
      } catch (err) {
        summary.failures += 1;
        await logEvent({
          job_name: JOB_NAME,
          run_id: runId,
          user_id: profile.user_id,
          status: "failed",
          message: "Unable to fetch tasks",
          error: err instanceof Error ? err.message : String(err),
          metadata: { scheduledDate: localDateISO },
        });
        continue;
      }

      if (!tasks.length) {
        summary.skipped += 1;
        await logEvent({
          job_name: JOB_NAME,
          run_id: runId,
          user_id: profile.user_id,
          status: "skipped",
          message: "No study tasks scheduled for user",
          metadata: { scheduledDate: localDateISO },
        });
        continue;
      }

      const message = buildMessage(profile, tasks, humanDate);
      const metadata = {
        scheduledDate: localDateISO,
        timezone,
        taskCount: tasks.length,
        channels: Array.from(channels),
      };

      if (!isTestRun && wantsWhatsApp) {
        try {
          await sendWhatsApp(profile.phone as string, message.text);
          summary.sentWhatsApp += 1;
          await logEvent({
            job_name: JOB_NAME,
            run_id: runId,
            user_id: profile.user_id,
            channel: "whatsapp",
            status: "sent",
            message: message.text,
            metadata,
          });
        } catch (err) {
          summary.failures += 1;
          await logEvent({
            job_name: JOB_NAME,
            run_id: runId,
            user_id: profile.user_id,
            channel: "whatsapp",
            status: "failed",
            message: "Failed to send WhatsApp reminder",
            error: err instanceof Error ? err.message : String(err),
            metadata,
          });
        }
      } else if (wantsWhatsApp) {
        summary.skipped += 1;
        await logEvent({
          job_name: JOB_NAME,
          run_id: runId,
          user_id: profile.user_id,
          channel: "whatsapp",
          status: "skipped",
          message: "Test run - WhatsApp delivery skipped",
          metadata,
        });
      }

      if (!isTestRun && wantsEmail) {
        try {
          await sendEmail(profile.email as string, message.subject, message.text);
          summary.sentEmail += 1;
          await logEvent({
            job_name: JOB_NAME,
            run_id: runId,
            user_id: profile.user_id,
            channel: "email",
            status: "sent",
            message: message.text,
            metadata,
          });
        } catch (err) {
          summary.failures += 1;
          await logEvent({
            job_name: JOB_NAME,
            run_id: runId,
            user_id: profile.user_id,
            channel: "email",
            status: "failed",
            message: "Failed to send email reminder",
            error: err instanceof Error ? err.message : String(err),
            metadata,
          });
        }
      } else if (wantsEmail) {
        summary.skipped += 1;
        await logEvent({
          job_name: JOB_NAME,
          run_id: runId,
          user_id: profile.user_id,
          channel: "email",
          status: "skipped",
          message: "Test run - Email delivery skipped",
          metadata,
        });
      }
    }

    const summaryMessage = `Daily reminders run ${runId} finished. Processed ${summary.processed} profiles, sent ${summary.sentWhatsApp} WhatsApp and ${summary.sentEmail} email messages, skipped ${summary.skipped}, failures ${summary.failures}.`;

    if (TEST_PHONE) {
      try {
        await sendWhatsApp(TEST_PHONE, summaryMessage);
        await logEvent({
          job_name: JOB_NAME,
          run_id: runId,
          channel: "whatsapp-test",
          status: "sent",
          message: summaryMessage,
          metadata: { recipient: TEST_PHONE },
        });
      } catch (err) {
        summary.failures += 1;
        await logEvent({
          job_name: JOB_NAME,
          run_id: runId,
          channel: "whatsapp-test",
          status: "failed",
          message: "Failed to send WhatsApp test summary",
          error: err instanceof Error ? err.message : String(err),
          metadata: { recipient: TEST_PHONE },
        });
      }
    } else {
      await logEvent({
        job_name: JOB_NAME,
        run_id: runId,
        channel: "whatsapp-test",
        status: "skipped",
        message: "Test WhatsApp recipient not configured",
      });
    }

    if (TEST_EMAIL) {
      try {
        await sendEmail(TEST_EMAIL, "Daily plan reminder summary", summaryMessage);
        await logEvent({
          job_name: JOB_NAME,
          run_id: runId,
          channel: "email-test",
          status: "sent",
          message: summaryMessage,
          metadata: { recipient: TEST_EMAIL },
        });
      } catch (err) {
        summary.failures += 1;
        await logEvent({
          job_name: JOB_NAME,
          run_id: runId,
          channel: "email-test",
          status: "failed",
          message: "Failed to send email test summary",
          error: err instanceof Error ? err.message : String(err),
          metadata: { recipient: TEST_EMAIL },
        });
      }
    } else {
      await logEvent({
        job_name: JOB_NAME,
        run_id: runId,
        channel: "email-test",
        status: "skipped",
        message: "Test email recipient not configured",
      });
    }

    await logEvent({
      job_name: JOB_NAME,
      run_id: runId,
      status: "completed",
      message: "Daily plan reminder job completed",
      metadata: summary,
    });

    return new Response(JSON.stringify({ ok: true, runId, summary }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    summary.failures += 1;
    const errorMessage = err instanceof Error ? err.message : String(err);
    await logEvent({
      job_name: JOB_NAME,
      run_id: runId,
      status: "failed",
      message: "Daily plan reminder job failed",
      error: errorMessage,
    });

    return new Response(JSON.stringify({ ok: false, runId, summary, error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
