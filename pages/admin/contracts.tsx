import * as React from 'react';
import Head from 'next/head';

type Contract = {
  id: string;
  user_id: string;
  file_url?: string | null;
  start_date: string;
  end_date: string;
  terms?: string | null;
};

export default function AdminContractsPage() {
  const [contracts, setContracts] = React.useState<Contract[]>([]);
  const [form, setForm] = React.useState({ user_id: '', file_url: '', start_date: '', end_date: '', terms: '' });

  const load = React.useCallback(async () => {
    const res = await fetch('/api/admin/contracts');
    const json = await res.json();
    if (json?.ok) setContracts(json.contracts ?? []);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ user_id: '', file_url: '', start_date: '', end_date: '', terms: '' });
    await load();
  };

  return (
    <>
      <Head><title>Admin Contracts</title></Head>
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="text-2xl font-semibold">Admin • Contracts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Upload/manage enterprise contracts and access windows.</p>

          <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl border border-border p-4 md:grid-cols-2">
            <input className="rounded border border-border bg-card px-3 py-2 text-sm" placeholder="user_id" value={form.user_id} onChange={(e)=>setForm({...form,user_id:e.target.value})} required />
            <input className="rounded border border-border bg-card px-3 py-2 text-sm" placeholder="file_url" value={form.file_url} onChange={(e)=>setForm({...form,file_url:e.target.value})} />
            <input className="rounded border border-border bg-card px-3 py-2 text-sm" type="date" value={form.start_date} onChange={(e)=>setForm({...form,start_date:e.target.value})} required />
            <input className="rounded border border-border bg-card px-3 py-2 text-sm" type="date" value={form.end_date} onChange={(e)=>setForm({...form,end_date:e.target.value})} required />
            <textarea className="md:col-span-2 rounded border border-border bg-card px-3 py-2 text-sm" placeholder="terms" value={form.terms} onChange={(e)=>setForm({...form,terms:e.target.value})} />
            <div className="md:col-span-2"><button className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground">Save Contract</button></div>
          </form>

          <div className="mt-6 space-y-3">
            {contracts.map((contract) => (
              <article key={contract.id} className="rounded-xl border border-border p-4">
                <p className="text-sm font-medium">{contract.user_id}</p>
                <p className="mt-1 text-xs text-muted-foreground">{contract.start_date} → {contract.end_date}</p>
                {contract.file_url ? <a className="mt-1 block text-xs underline" href={contract.file_url} target="_blank" rel="noreferrer">Contract file</a> : null}
              </article>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
