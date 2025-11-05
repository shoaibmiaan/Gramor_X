// pages/api/study-buddy/sessions/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/lib/supabaseServer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sessionId = req.query.id as string;
  const userId = await getUserId(req, res);

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!sessionId) return res.status(400).json({ error: "Missing session id" });

  const { data, error } = await supabaseServer
    .from("study_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[study-buddy/session/:id] error:", error);
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ error: "Session not found" });
  }

  return res.status(200).json({ session: data });
}
