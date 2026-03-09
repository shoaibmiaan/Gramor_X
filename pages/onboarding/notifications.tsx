import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/design-system/Button';
import { Container } from '@/components/design-system/Container';
import { resolveNavigation, saveOnboardingStep } from '@/lib/onboarding/client';

const options = ['in_app', 'whatsapp', 'email'] as const;

export default function NotificationsPage() {
  const router = useRouter();
  const nav = resolveNavigation('notifications');
  const [channels, setChannels] = useState<string[]>(['in_app']);
  const [preferredTime, setPreferredTime] = useState('');
  const [phone, setPhone] = useState('');
  const nextPath = useMemo(() => (typeof router.query.next === 'string' ? router.query.next : '/dashboard'), [router.query.next]);

  const toggle = (c: string) => setChannels((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);

  return <main className="min-h-screen bg-background"><Container className="py-10"><h1 className="text-2xl font-semibold">Notifications</h1><p className="text-muted-foreground">Step {nav.index + 1} of {nav.total}</p><div className="mt-4 flex gap-2">{options.map((c)=><button key={c} className={`rounded border px-3 py-1 ${channels.includes(c)?'bg-primary text-primary-foreground':''}`} onClick={()=>toggle(c)}>{c}</button>)}</div><input className="mt-3 rounded border p-2" placeholder="Preferred time e.g. evening" value={preferredTime} onChange={(e)=>setPreferredTime(e.target.value)} />{channels.includes('whatsapp') && <input className="mt-3 rounded border p-2" placeholder="WhatsApp phone" value={phone} onChange={(e)=>setPhone(e.target.value)} />}<div className="mt-8 flex gap-3"><Button variant="ghost" onClick={()=>nav.prev && router.push(nav.prev.path)}>Back</Button><Button disabled={!channels.length} onClick={async()=>{await saveOnboardingStep(12,{ channels, preferredTime: preferredTime || null, whatsappOptIn: channels.includes('whatsapp'), phone: phone || null }); await router.replace(nextPath);}}>Finish onboarding</Button></div></Container></main>;
}
