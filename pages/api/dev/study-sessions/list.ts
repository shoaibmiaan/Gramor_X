// pages/api/dev/study-sessions/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Forbidden in production" });
  }

  const { data, error } = await supabaseAdmin
    .from("study_buddy_sessions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[dev/study-sessions/list] error:", error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ sessions: data });
}
