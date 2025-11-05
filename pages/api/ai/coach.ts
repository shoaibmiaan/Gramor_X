import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId = null, context = '', goal = '' } = req.body ?? {};

  if (!OPENAI_KEY) {
    return res.status(500).json({ error: 'OpenAI key not configured on server' });
  }

  try {
    // Build a helpful system + user prompt
    const system = `You are an IELTS coaching assistant. Provide concise actionable suggestions (3-6), each with a short title, a 1-2 sentence detail, and estimated minutes to practice. Keep output JSON only.`;
    const userPrompt = `User goal: ${goal}\nContext: ${context}\nReturn JSON: { id: string, summary: string, suggestions: [{id,title,detail,estimatedMinutes}], reasoning?: string }`;

    const payload = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0.2,
    };

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const txt = await r.text();
      await supabaseAdmin.from('ai_logs').insert([{ user_id: userId, request: JSON.stringify({ context, goal }), response: txt, status: 'error' }]);
      return res.status(500).json({ error: 'AI provider error', detail: txt });
    }

    const json = await r.json();
    const content = json.choices?.[0]?.message?.content ?? json.choices?.[0]?.text ?? '';

    // Try to parse JSON from the model; fall back to plain text
    let parsed: any = null;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // If model didn't return clean JSON, attempt to extract JSON substring
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch (_) { parsed = { raw: content }; }
      } else {
        parsed = { raw: content };
      }
    }

    // Persist to ai_logs for audit
    await supabaseAdmin.from('ai_logs').insert([{ user_id: userId, request: JSON.stringify({ context, goal }), response: JSON.stringify(parsed), status: 'ok' }]);

    return res.status(200).json(parsed);
  } catch (err: any) {
    console.error('ai coach error', err);
    await supabaseAdmin.from('ai_logs').insert([{ user_id: req.body?.userId ?? null, request: JSON.stringify(req.body), response: (err?.message ?? String(err)), status: 'error' }]);
    return res.status(500).json({ error: 'AI coach failed', detail: err?.message ?? String(err) });
  }
}
