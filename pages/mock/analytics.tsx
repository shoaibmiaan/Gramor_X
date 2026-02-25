import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

import { Container } from "@/components/design-system/Container";
import { Card } from "@/components/design-system/Card";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { Badge } from "@/components/design-system/Badge";

interface ResultRow {
  created_at: string;
  section: string;
  band: number;
  time_taken: number;
  correct: number;
  total: number;
}

interface SectionStat {
  section: string;
  totalTime: number;
  avgBand: number;
  attempts: number;
}

export default function MockTestAnalytics() {
  const router = useRouter();
  const [results, setResults] = useState<ResultRow[]>([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const { data } = await supabaseBrowser
        .from("mock_test_results")
        .select("created_at,section,band,time_taken,correct,total")
        .eq("user_id", session.user.id)
        .order("created_at");

      if (mounted) setResults((data as ResultRow[]) || []);
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  const trendData = groupByDate(results);
  const sectionStats = computeSectionStats(results);
  const weakSections = [...sectionStats]
    .sort((a, b) => a.avgBand - b.avgBand)
    .slice(0, 2);

  const avgBand =
    results.length > 0
      ? (results.reduce((a, r) => a + r.band, 0) / results.length).toFixed(1)
      : "—";

  const totalTime =
    sectionStats.reduce((a, s) => a + s.totalTime, 0) || 0;

  return (
    <section className="py-10">
      <Container>
        <Card className="p-8 space-y-10 rounded-ds-2xl">

          {/* ---------------- KPIs ROW ---------------- */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <KPI title="Avg Band" value={avgBand} />
            <KPI title="Total Time" value={`${totalTime}s`} />
            <KPI title="Attempts" value={results.length} />
            <KPI
              title="Weakest Section"
              value={weakSections[0]?.section || "—"}
            />
          </div>

          {/* ---------------- TREND CHART ---------------- */}
          <div>
            <h2 className="font-slab text-h3 mb-3">Band Trends</h2>
            <TrendChart data={trendData} />
          </div>

          {/* ---------------- TIME SPENT ---------------- */}
          <div>
            <h2 className="font-slab text-h3 mb-3">Time Spent</h2>
            <TimeChart data={sectionStats} />
          </div>

          {/* ---------------- WEAK SECTIONS ---------------- */}
          <div>
            <h2 className="font-slab text-h3 mb-3">Weak Sections</h2>

            {weakSections.length === 0 && (
              <p className="text-muted">No attempts yet.</p>
            )}

            <ul className="space-y-2">
              {weakSections.map((s) => {
                const slug = s.section.toLowerCase();
                return (
                  <li key={s.section} className="flex items-center gap-2">
                    <Badge variant="danger">{s.section}</Badge>
                    <span className="text-muted">
                      Avg Band {s.avgBand.toFixed(1)}
                    </span>

                    <Link
                      href={`/mock/${slug}`}
                      className="text-primary underline ml-2"
                    >
                      Practice
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>
      </Container>
    </section>
  );
}

function KPI({ title, value }) {
  return (
    <div className="p-4 border border-border/60 rounded-ds-xl bg-background/40">
      <p className="text-sm text-muted mb-1">{title}</p>
      <p className="text-2xl font-slab">{value}</p>
    </div>
  );
}

function groupByDate(rows: ResultRow[]) {
  const map = new Map<string, any>();
  rows.forEach((r) => {
    const date = r.created_at.slice(0, 10);
    const entry = map.get(date) || { date };
    entry[r.section] = r.band;
    map.set(date, entry);
  });
  return Array.from(map.values());
}

function computeSectionStats(rows: ResultRow[]): SectionStat[] {
  const stats: Record<string, { totalTime: number; totalBand: number; attempts: number }> = {};

  rows.forEach((r) => {
    const s = stats[r.section] || { totalTime: 0, totalBand: 0, attempts: 0 };
    s.totalTime += r.time_taken;
    s.totalBand += r.band;
    s.attempts += 1;
    stats[r.section] = s;
  });

  return Object.entries(stats).map(([section, s]) => ({
    section,
    totalTime: s.totalTime,
    avgBand: s.totalBand / s.attempts,
    attempts: s.attempts,
  }));
}

/* ---------------- TREND LINE CHART ---------------- */

function TrendChart({ data }: { data: any[] }) {
  if (!data.length) {
    return <div className="text-sm text-muted p-4">No data available.</div>;
  }

  const sections = ["listening", "reading", "writing", "speaking"];
  const h = 200;

  return (
    <svg
      className="w-full rounded-ds-xl border border-border/60 bg-background/40"
      viewBox={`0 0 1000 ${h}`}
      preserveAspectRatio="none"
    >
      {/* Grid */}
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <line
          key={i}
          x1={0}
          x2={1000}
          y1={(i / 9) * h}
          y2={(i / 9) * h}
          stroke="var(--ds-border)"
          strokeWidth="1"
          opacity="0.2"
        />
      ))}

      {sections.map((s) => {
        const pts = data
          .map((d, i) => {
            if (!d[s]) return null;
            const x = (i / (data.length - 1)) * 1000;
            const y = h - (Number(d[s]) / 9) * h;
            return `${x},${y}`;
          })
          .filter(Boolean)
          .join(" ");

        if (!pts) return null;

        return (
          <polyline
            key={s}
            fill="none"
            stroke={`var(--chart-${s})`}
            strokeWidth="3"
            points={pts}
          />
        );
      })}
    </svg>
  );
}

/* ---------------- BAR CHART ---------------- */

function TimeChart({ data }: { data: SectionStat[] }) {
  if (!data.length) {
    return <div className="text-sm text-muted p-4">No data available.</div>;
  }

  const max = Math.max(...data.map((d) => d.totalTime));

  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.section} className="flex items-center gap-4">
          <div className="w-28 text-sm font-medium">{d.section}</div>

          <div className="flex-1 h-3 bg-border/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{
                width: `${(d.totalTime / max) * 100}%`,
              }}
            />
          </div>

          <div className="text-xs text-muted">{Math.round(d.totalTime)}s</div>
        </div>
      ))}
    </div>
  );
}
