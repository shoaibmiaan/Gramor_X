// pages/api/ai/coach.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

/* -------------------------------------------------------------------------- */
/* ENV expected (set in .env.local)                                           */
/* -------------------------------------------------------------------------- */
/*
GROQ_API_KEY=gsk-...
GROQ_API_BASE=https://api.groq.com/openai/v1
GROQ_MODEL=llama-3.3-70b-versatile

GEMINI_API_KEY=AIza...
GEMINI_API_BASE=https://generativelanguage.googleapis.com/v1beta/openai
GEMINI_MODEL=gemini-1.5-flash-latest

OPENAI_API_KEY=sk-...
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

DEEPSEEK_API_KEY=sk-...
DEEPSEEK_API_BASE=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

GROK_API_KEY=xai-...
GROK_API_BASE=https://api.x.ai/v1
GROK_MODEL=grok-4-latest

SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
AI_MOCK=1            # optional for dev offline
*/

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* -------------------------------------------------------------------------- */
/* Provider chain                                                             */
/* -------------------------------------------------------------------------- */

type Prov = {
  name: "groq" | "gemini" | "openai" | "deepseek" | "grok";
  baseURL: string;
  apiKey?: string;
  model: string;
};

const PROVIDERS: Prov[] = [
  {
    name: "groq",
    baseURL: process.env.GROQ_API_BASE || "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  },
  {
    name: "gemini",
    baseURL:
      process.env.GEMINI_API_BASE ||
      "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash-latest",
  },
  {
    name: "openai",
    baseURL: process.env.OPENAI_API_BASE || "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  },
  {
    name: "deepseek",
    baseURL: process.env.DEEPSEEK_API_BASE || "https://api.deepseek.com",
    apiKey: process.env.DEEPSEEK_API_KEY,
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  },
  {
    name: "grok",
    baseURL: process.env.GROK_API_BASE || "https://api.x.ai/v1",
    apiKey: process.env.GROK_API_KEY,
    model: process.env.GROK_MODEL || "grok-4-latest",
  },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const SYSTEM_PROMPT =
  "You are an IELTS coaching assistant. Provide concise actionable suggestions (3–6), each with a short title, a 1–2 sentence detail, and estimated minutes to practice. Output pure JSON only.";

function extractJSON(str: string): any {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {}
  const fence = str.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) try { return JSON.parse(fence[1]); } catch {}
  const block = str.match(/\{[\s\S]*\}/);
  if (block) try { return JSON.parse(block[0]); } catch {}
  return { raw: str };
}

async function callProvider(p: Prov, payload: any) {
  if (!p.apiKey)
    return { ok: false, err: { status: 500, detail: `${p.name} key missing` }, provider: p.name };

  try {
    const r = await fetch(`${p.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${p.apiKey}`,
      },
      body: JSON.stringify({ ...payload, model: p.model }),
    });

    const txt = await r.text();
    if (!r.ok)
      return {
        ok: false,
        err: { status: r.status, detail: (() => { try { return JSON.parse(txt); } catch { return txt; } })() },
        provider: p.name,
      };

    const json = JSON.parse(txt);
    const content =
      json?.choices?.[0]?.message?.content ??
      json?.choices?.[0]?.text ??
      "";

    if (!content.trim())
      return { ok: false, err: { status: 502, detail: "Empty content" }, provider: p.name };

    return { ok: true, content, provider: p.name };
  } catch (e: any) {
    return { ok: false, err: { status: 500, detail: e.message || String(e) }, provider: p.name };
  }
}

/* -------------------------------------------------------------------------- */
/* Handler                                                                    */
/* -------------------------------------------------------------------------- */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { userId = null, context = "", goal = "" } = req.body ?? {};

  /* Mock mode --------------------------------------------------------------- */
  if (process.env.AI_MOCK === "1") {
    const mock = {
      id: "mock",
      summary: "Mock AI response — providers unavailable.",
      suggestions: [
        { id: "s1", title: "Plan paragraphs", detail: "Spend 5 min outlining key ideas.", estimatedMinutes: 10 },
        { id: "s2", title: "Add connectors", detail: "Use clear linkers to connect ideas.", estimatedMinutes: 8 },
        { id: "s3", title: "Rewrite one paragraph", detail: "Improve flow and coherence.", estimatedMinutes: 12 },
      ],
    };
    await supabaseAdmin.from("ai_logs").insert([
      { user_id: userId, request: JSON.stringify({ provider: "mock", context, goal }), response: JSON.stringify(mock), status: "ok" },
    ]);
    return res.status(200).json(mock);
  }

  const userPrompt = `User goal: ${goal}\nContext: ${context}\nReturn JSON: { id, summary, suggestions: [{id,title,detail,estimatedMinutes}], reasoning? }`;

  const payload = {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 700,
    temperature: 0.2,
  };

  const attempts: Array<{ provider: string; status?: number; detail?: any }> = [];

  for (const p of PROVIDERS) {
    const result = await callProvider(p, payload);

    if (result.ok) {
      const parsed = extractJSON(result.content);
      await supabaseAdmin.from("ai_logs").insert([
        {
          user_id: userId,
          request: JSON.stringify({ provider: result.provider, model: p.model, context, goal }),
          response: JSON.stringify(parsed),
          status: "ok",
        },
      ]);
      console.log(`[ai/coach] ✅ responded from ${result.provider}`);
      return res.status(200).json(parsed);
    }

    attempts.push({ provider: p.name, status: result.err?.status, detail: result.err?.detail });
    await supabaseAdmin.from("ai_logs").insert([
      {
        user_id: userId,
        request: JSON.stringify({ provider: p.name, model: p.model, context, goal }),
        response: JSON.stringify(result.err),
        status: "error",
      },
    ]);
    console.warn(`[ai/coach] ❌ ${p.name} failed`, result.err);
  }

  return res.status(502).json({ error: "All AI providers failed", attempts });
}
