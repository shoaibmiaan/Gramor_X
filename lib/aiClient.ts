export async function fetchAICoach(userId: string | null, context: string, goal?: string) {
  const payload = { userId, context, goal };
  const res = await fetch('/api/ai/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || 'Failed to fetch AI coach');
  }

  const json = (await res.json()) as AICoachResponse;
  return json;
}

export async function sendAICoachAction(suggestionId: string, userId?: string | null) {
  const res = await fetch('/api/ai/coach/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suggestionId, userId }),
  });
  if (!res.ok) throw new Error('Failed to send coach action');
  return res.ok;
}
