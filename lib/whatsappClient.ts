export async function listWhatsAppTasks(userId?: string | null) {
  const q = new URLSearchParams();
  if (userId) q.set('userId', userId);
  const res = await fetch('/api/whatsapp/tasks?' + q.toString());
  if (!res.ok) throw new Error('Failed to load tasks');
  return (await res.json()) as WhatsAppTask[];
}

export async function createWhatsAppTask(userId: string | null | undefined, text: string, scheduledAt?: string | null) {
  const payload = { userId, text, scheduled_at: scheduledAt ?? null };
  const res = await fetch('/api/whatsapp/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error('Failed to create task');
  return (await res.json()) as WhatsAppTask;
}

export async function sendWhatsAppNow(taskId: string) {
  const res = await fetch('/api/whatsapp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: taskId }) });
  if (!res.ok) throw new Error('Failed to send task');
  return true;
}
