import type { NextPage } from 'next';

const DevelopersPage: NextPage = () => {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">GramorX Developer Portal</h1>
        <p className="text-sm text-muted-foreground">Versioned API docs for partners, schools, and integrators.</p>
      </header>

      <section className="rounded-2xl border p-4">
        <h2 className="text-lg font-semibold">Authentication</h2>
        <p className="mt-2 text-sm">Use <code>Authorization: Bearer gx_...</code> or <code>x-api-key</code> header for <code>/api/v1/*</code> routes.</p>
      </section>

      <section className="rounded-2xl border p-4 space-y-2">
        <h2 className="text-lg font-semibold">Quickstart</h2>
        <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">{`curl -H "Authorization: Bearer gx_xxx" \\
  https://your-domain.com/api/v1/users/me`}</pre>
      </section>

      <section className="rounded-2xl border p-4 space-y-2">
        <h2 className="text-lg font-semibold">Endpoints (v1)</h2>
        <ul className="list-disc pl-5 text-sm">
          <li>GET /api/v1/users/me</li>
          <li>GET /api/v1/users/me/progress</li>
          <li>GET /api/v1/users/me/tests</li>
          <li>POST /api/v1/writing/submit</li>
          <li>GET /api/v1/speaking/feedback/{'{id}'}</li>
        </ul>
      </section>
    </main>
  );
};

export default DevelopersPage;
