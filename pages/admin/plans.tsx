import * as React from 'react';
import Head from 'next/head';

type Plan = {
  id: string;
  name: string;
  description?: string | null;
  price_monthly?: number | null;
  price_yearly?: number | null;
  lifetime_price?: number | null;
  features?: string[];
  sort_order?: number;
  is_active?: boolean;
};

const EMPTY: Plan = { id: '', name: '', description: '', price_monthly: 0, price_yearly: 0, lifetime_price: 0, features: [], sort_order: 0, is_active: true };

export default function AdminPlansPage() {
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [form, setForm] = React.useState<Plan>(EMPTY);

  const load = React.useCallback(async () => {
    const res = await fetch('/api/admin/plans');
    const json = await res.json();
    if (json?.ok) setPlans(json.plans ?? []);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, features: form.features ?? [] }),
    });
    setForm(EMPTY);
    await load();
  };

  return (
    <>
      <Head><title>Admin Plans</title></Head>
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="text-2xl font-semibold">Admin • Plans</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage subscription plans and pricing cards shown on /pricing.</p>

          <form onSubmit={save} className="mt-4 grid gap-3 rounded-xl border border-border p-4 md:grid-cols-2">
            <input className="rounded border border-border bg-card px-3 py-2 text-sm" placeholder="id (starter/booster/master/enterprise)" value={form.id} onChange={(e)=>setForm({...form,id:e.target.value})} required />
            <input className="rounded border border-border bg-card px-3 py-2 text-sm" placeholder="name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} required />
            <input className="rounded border border-border bg-card px-3 py-2 text-sm" placeholder="monthly price" type="number" step="0.01" value={form.price_monthly ?? 0} onChange={(e)=>setForm({...form,price_monthly:Number(e.target.value)})} />
            <input className="rounded border border-border bg-card px-3 py-2 text-sm" placeholder="yearly price" type="number" step="0.01" value={form.price_yearly ?? 0} onChange={(e)=>setForm({...form,price_yearly:Number(e.target.value)})} />
            <input className="rounded border border-border bg-card px-3 py-2 text-sm" placeholder="lifetime price" type="number" step="0.01" value={form.lifetime_price ?? 0} onChange={(e)=>setForm({...form,lifetime_price:Number(e.target.value)})} />
            <input className="rounded border border-border bg-card px-3 py-2 text-sm" placeholder="features (comma-separated)" value={(form.features ?? []).join(', ')} onChange={(e)=>setForm({...form,features:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})} />
            <textarea className="md:col-span-2 rounded border border-border bg-card px-3 py-2 text-sm" placeholder="description" value={form.description ?? ''} onChange={(e)=>setForm({...form,description:e.target.value})} />
            <div className="md:col-span-2"><button className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Save Plan</button></div>
          </form>

          <div className="mt-6 space-y-3">
            {plans.map((plan) => (
              <article key={plan.id} className="rounded-xl border border-border p-4">
                <p className="text-sm font-medium">{plan.name} <span className="text-xs text-muted-foreground">({plan.id})</span></p>
                <p className="mt-1 text-xs text-muted-foreground">${plan.price_monthly ?? 0}/mo • ${plan.price_yearly ?? 0}/yr • lifetime ${plan.lifetime_price ?? 0}</p>
                <p className="mt-1 text-xs">{plan.description}</p>
              </article>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
