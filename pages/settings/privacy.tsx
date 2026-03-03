import * as React from 'react';
import Head from 'next/head';

export default function PrivacySettingsPage() {
  const [status, setStatus] = React.useState<string | null>(null);

  const exportData = async () => {
    setStatus('Preparing export…');
    const res = await fetch('/api/user/export-data');
    const json = await res.json();
    if (res.ok) setStatus(json.downloadUrl ? `Export ready: ${json.downloadUrl}` : 'Export prepared.');
    else setStatus(json.error || 'Export failed');
  };

  const requestDelete = async () => {
    setStatus('Submitting deletion request…');
    const res = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'DELETE', acknowledge: true }),
    });
    const json = await res.json();
    setStatus(res.ok ? `Deletion queued. Purge after: ${json.purgeAfter}` : (json.error || 'Deletion request failed'));
  };

  return (
    <>
      <Head><title>Privacy Settings</title></Head>
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <h1 className="text-2xl font-semibold">Privacy & Data Controls</h1>
          <p className="mt-2 text-sm text-muted-foreground">Use these controls to export your personal data or request account deletion.</p>

          <div className="mt-6 grid gap-3">
            <button onClick={() => void exportData()} className="rounded border border-border px-4 py-2 text-sm">Export my data</button>
            <button onClick={() => void requestDelete()} className="rounded border border-red-300 px-4 py-2 text-sm text-red-700">Request account deletion</button>
          </div>

          {status ? <p className="mt-4 text-sm">{status}</p> : null}
        </div>
      </main>
    </>
  );
}
