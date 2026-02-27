import type { DashboardData } from '@/hooks/useDashboardData';
import type { SubscriptionTier } from '@/lib/navigation/types';
import { Button } from '@/components/design-system/Button';

type ExportReportsProps = {
  tier: SubscriptionTier;
  data: DashboardData;
};

const downloadFile = (filename: string, content: BlobPart, type: string) => {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const ExportReports = ({ tier, data }: ExportReportsProps) => {
  const exportPdf = () => {
    const lines = [
      'Dashboard Report',
      `Overall band: ${data.performance.overallBand ?? 'N/A'}`,
      `Practice hours: ${data.performance.practiceHours}`,
      `Study streak: ${data.performance.studyStreak}`,
      `Mock tests: ${data.performance.mockTests}`,
    ];
    downloadFile('dashboard-report.pdf', lines.join('\n'), 'application/pdf');
  };

  const exportCsv = () => {
    const header = 'weekLabel,band\n';
    const rows = data.bandHistory.map((point) => `${point.weekLabel},${point.band}`).join('\n');
    downloadFile('dashboard-band-history.csv', `${header}${rows}`, 'text/csv;charset=utf-8;');
  };

  const callApi = async () => {
    await fetch('/api/dashboard/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bandHistory: data.bandHistory }),
    }).catch(() => {});
  };

  if (tier === 'free' || tier === 'seedling') return null;

  return (
    <section className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
      <h3 className="text-base font-semibold">Export reports</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={exportPdf}>Export PDF</Button>
        {tier === 'owl' ? (
          <>
            <Button size="sm" variant="secondary" onClick={exportCsv}>Export CSV</Button>
            <Button size="sm" variant="ghost" onClick={callApi}>Send to API</Button>
          </>
        ) : null}
      </div>
    </section>
  );
};

export default ExportReports;
