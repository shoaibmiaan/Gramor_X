import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type QueueRow = {
  user_id: string;
  purge_after: string;
  attempts: number;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase credentials");
}

const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function logAudit(userId: string, action: string, metadata: Record<string, unknown>) {
  try {
    await client.from("account_audit_log").insert({ user_id: userId, action, metadata });
  } catch (error) {
    console.error("audit log failed", error);
  }
}

async function purgeUser(row: QueueRow) {
  const { user_id: userId, attempts } = row;
  const nowIso = new Date().toISOString();

  await client
    .from("account_deletion_queue")
    .update({ status: "purging", attempts: attempts + 1, last_error: null })
    .eq("user_id", userId);

  await logAudit(userId, "account_purge_started", { purge_after: row.purge_after });

  const tables: { table: string; column: string }[] = [
    { table: "profiles", column: "user_id" },
    { table: "user_bookmarks", column: "user_id" },
    { table: "study_plans", column: "user_id" },
    { table: "usage_counters", column: "user_id" },
    { table: "attempts", column: "user_id" },
    { table: "invoices", column: "user_id" },
    { table: "account_exports", column: "user_id" },
  ];

  for (const entry of tables) {
    const { error } = await client.from(entry.table).delete().eq(entry.column, userId);
    if (error && error.code !== "42P01") {
      throw error;
    }
  }

  await logAudit(userId, "account_purge_completed", { tables: tables.map((t) => t.table) });

  await client
    .from("account_deletion_queue")
    .update({ status: "purged", confirmed_at: nowIso })
    .eq("user_id", userId);

  try {
    await client.auth.admin.deleteUser(userId);
  } catch (error) {
    console.error("deleteUser failed", error);
  }
}

async function processQueue() {
  const nowIso = new Date().toISOString();
  const { data: rows, error } = await client
    .from("account_deletion_queue")
    .select("user_id, purge_after, attempts")
    .lte("purge_after", nowIso)
    .in("status", ["pending", "error"]);

  if (error) {
    console.error("queue fetch failed", error);
    return;
  }

  for (const row of rows ?? []) {
    try {
      await purgeUser(row as QueueRow);
    } catch (error) {
      console.error("purge failed", error);
      await client
        .from("account_deletion_queue")
        .update({ status: "error", last_error: (error as Error).message ?? String(error) })
        .eq("user_id", (row as QueueRow).user_id);
    }
  }

  const { error: cleanupError } = await client
    .from("account_exports")
    .delete()
    .lt("expires_at", nowIso);

  if (cleanupError && cleanupError.code !== "42P01") {
    console.error("export cleanup failed", cleanupError);
  }
}

Deno.serve(async () => {
  await processQueue();
  return new Response("ok");
});
