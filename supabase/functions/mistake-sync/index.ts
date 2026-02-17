import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type FeedbackRecord = {
  attempt_id: string;
  errors?: Array<{
    type?: string;
    excerpt?: string;
    suggestion?: string;
    message?: string;
    severity?: string;
  }> | null;
  blocks?: Array<{
    tag?: string;
    weight?: number;
  }> | null;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function hashExcerpt(value: string): Promise<string> {
  const buffer = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

type MistakeInsert = {
  user_id: string;
  attempt_id: string | null;
  type: string;
  excerpt: string;
  excerpt_hash: string;
  ai_tip?: string | null;
};

type FocusUpsert = {
  user_id: string;
  tag: string;
  weight: number;
};

async function handleRecord(record: FeedbackRecord) {
  const attemptId = record.attempt_id;
  if (!attemptId) {
    return { ok: false, error: "Missing attempt id" };
  }

  const { data: responseRow, error: responseError } = await supabase
    .from("writing_responses")
    .select("id,user_id,exam_attempt_id")
    .eq("id", attemptId)
    .maybeSingle();

  if (responseError || !responseRow) {
    return { ok: false, error: "Attempt not found" };
  }

  const userId = responseRow.user_id as string | null;
  if (!userId) {
    return { ok: false, error: "Response missing user" };
  }

  const mistakes: MistakeInsert[] = [];
  for (const entry of record.errors ?? []) {
    const excerpt = (entry?.excerpt ?? "").trim();
    if (!excerpt) continue;
    const excerptHash = await hashExcerpt(`${attemptId}:${entry?.type ?? "general"}:${excerpt}`);
    mistakes.push({
      user_id: userId,
      attempt_id: responseRow.exam_attempt_id ?? null,
      type: entry?.type ?? "general",
      excerpt,
      excerpt_hash: excerptHash,
      ai_tip: entry?.suggestion || entry?.message || null,
    });
  }

  if (mistakes.length > 0) {
    const { error: insertError } = await supabase.from("mistakes").upsert(
      mistakes.map((row) => ({
        ...row,
        source: "writing",
      })),
      { onConflict: "attempt_id,type,excerpt_hash" },
    );
    if (insertError) {
      console.error("[mistake-sync] failed to upsert mistakes", insertError);
    }
  }

  const focusBlocks: FocusUpsert[] = [];
  for (const block of record.blocks ?? []) {
    const tag = (block?.tag ?? "").trim();
    if (!tag) continue;
    const weight = typeof block?.weight === "number" ? block.weight : 0;
    focusBlocks.push({ user_id: userId, tag, weight });
  }

  for (const block of focusBlocks) {
    const { error: upsertError } = await supabase
      .from("study_plan_focus")
      .upsert(
        {
          user_id: block.user_id,
          tag: block.tag,
          weight: block.weight,
          area: "writing",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,area,tag" },
      );
    if (upsertError) {
      console.error("[mistake-sync] focus upsert failed", upsertError);
    }
  }

  return { ok: true, inserted: mistakes.length, updatedFocus: focusBlocks.length };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload = (await req.json()) as { record?: FeedbackRecord; new?: FeedbackRecord };
    const record = payload.record ?? payload.new;
    if (!record) {
      return new Response(JSON.stringify({ ok: false, error: "Missing record" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await handleRecord(record);
    const status = result.ok ? 200 : 400;
    return new Response(JSON.stringify(result), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[mistake-sync] unexpected error", err);
    return new Response(JSON.stringify({ ok: false, error: "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
