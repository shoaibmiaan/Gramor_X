// pages/mock/reading/history/index.tsx
import * as React from "react";
import type { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
import Link from "next/link";

import { Container } from "@/components/design-system/Container";
import { Card } from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";
import { Icon } from "@/components/design-system/Icon";

import {
  ReadingHistoryTable,
  type ReadingHistoryRow,
} from "@/components/reading/history/ReadingHistoryTable";

import { getServerClient } from "@/lib/supabaseServer";

type PageProps = {
  rows: ReadingHistoryRow[];
  filterSlug?: string | null;
  filterTitle?: string | null;
};

const ReadingHistoryPage: NextPage<PageProps> = ({
  rows,
  filterSlug,
  filterTitle,
}) => {
  const hasFilter = !!filterSlug;

  // Filter on client if a specific test is selected
  const displayRows = React.useMemo(
    () =>
      hasFilter && filterSlug
        ? rows.filter((r) => r.testSlug === filterSlug)
        : rows,
    [rows, hasFilter, filterSlug],
  );

  // Tiny stats strip (matches portal vibe)
  const stats = React.useMemo(() => {
    if (!displayRows.length) {
      return {
        total: 0,
        distinctTests: 0,
        bestBand: null as number | null,
        latest: null as string | null,
      };
    }

    const total = displayRows.length;
    const byTest = new Set(displayRows.map((r) => r.testSlug));
    const bands = displayRows
      .map((r) => r.bandScore)
      .filter((b): b is number => typeof b === "number");
    const bestBand = bands.length ? Math.max(...bands) : null;
    const latest = displayRows[0]?.createdAt ?? null;

    return {
      total,
      distinctTests: byTest.size,
      bestBand,
      latest,
    };
  }, [displayRows]);

  const headerTitleSuffix =
    hasFilter && filterTitle
      ? ` — ${filterTitle}`
      : hasFilter && filterSlug
      ? ` — ${filterSlug}`
      : "";

  return (
    <>
      <Head>
        <title>Reading History · GramorX</title>
      </Head>

      <main className="bg-background">
        <section className="py-10">
          <Container className="max-w-5xl space-y-8">
            {/* HEADER */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-ds-full bg-card/70 px-3 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-border/60">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon name="FileText" size={14} />
                  </span>
                  <span>Reading module • Strict mocks history</span>
                </div>

                <div className="space-y-1">
                  <h1 className="font-slab text-h2 tracking-tight">
                    Reading history{headerTitleSuffix}
                  </h1>
                  <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
                    {hasFilter
                      ? "Showing attempts only for this Reading mock (latest on top)."
                      : "All your IELTS-style Reading mocks in one place — useful for tracking progress and revisiting reviews."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {hasFilter && (
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="rounded-ds-xl"
                  >
                    <Link href="/mock/reading/history">
                      <Icon name="X" className="mr-1 h-4 w-4" />
                      Clear filter
                    </Link>
                  </Button>
                )}
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="rounded-ds-xl"
                >
                  <Link href="/mock/reading">
                    <Icon name="ArrowLeft" className="mr-1 h-4 w-4" />
                    Back to Reading mocks
                  </Link>
                </Button>
              </div>
            </div>

            {/* STATS STRIP */}
            <Card className="rounded-ds-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
              <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-[0.16em]">
                    Total attempts
                  </span>
                  <span className="text-base font-semibold text-foreground">
                    {stats.total}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-[0.16em]">
                    Different tests
                  </span>
                  <span className="text-base font-semibold text-foreground">
                    {stats.distinctTests}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-[0.16em]">
                    Best band
                  </span>
                  <span className="text-base font-semibold text-foreground">
                    {stats.bestBand != null ? stats.bestBand.toFixed(1) : "—"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-[0.16em]">
                    Last attempt
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {stats.latest
                      ? new Date(stats.latest).toLocaleString()
                      : "No attempts yet"}
                  </span>
                </div>
              </div>
            </Card>

            {/* TABLE / EMPTY STATE */}
            {displayRows.length === 0 ? (
              <Card className="flex flex-col items-center justify-center space-y-4 rounded-ds-2xl border border-border/70 bg-card/90 p-8 text-center shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Icon
                    name="History"
                    className="h-6 w-6 text-muted-foreground"
                  />
                </div>
                <h2 className="text-lg font-semibold">No Reading attempts yet</h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  {hasFilter
                    ? "You haven’t attempted this specific Reading mock yet. Start a full attempt to see it here."
                    : "Once you complete a strict Reading mock, it will appear here with band score, accuracy, and quick links to result and review."}
                </p>
                <Button asChild className="rounded-ds-xl">
                  <Link href="/mock/reading">
                    <Icon name="PlayCircle" className="mr-1 h-4 w-4" />
                    Go to Reading mocks
                  </Link>
                </Button>
              </Card>
            ) : (
              <ReadingHistoryTable rows={displayRows} />
            )}
          </Container>
        </section>
      </main>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const supabase = getServerClient(ctx.req, ctx.res);

  // THIS IS THE ONLY FIX YOU NEED:
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) {
    return {
      redirect: { destination: "/login?role=student", permanent: false },
    };
  }

  const testSlug =
    typeof ctx.query.test === "string" ? ctx.query.test.trim() : null;

  const { data, error } = await supabase
    .from("reading_attempts")
    .select(
      `
      id,
      status,
      created_at,
      raw_score,
      band_score,
      meta,
      reading_tests (
        slug,
        title
      )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    // keep it noisy in logs but don’t break UI
    // eslint-disable-next-line no-console
    console.error("Reading history error:", error);
    return {
      props: {
        rows: [],
        filterSlug: testSlug ?? null,
        filterTitle: null,
      },
    };
  }

  const rows: ReadingHistoryRow[] = (data ?? []).map((attempt: any) => {
    const answers = attempt.meta?.answers || {};
    const totalQuestions = Object.keys(answers).length || 40;

    return {
      attemptId: attempt.id,
      testSlug: attempt.reading_tests?.slug || "unknown",
      testTitle: attempt.reading_tests?.title || "Untitled Test",
      bandScore:
        attempt.band_score !== null && attempt.band_score !== undefined
          ? Number(attempt.band_score)
          : null,
      rawScore:
        attempt.raw_score !== null && attempt.raw_score !== undefined
          ? Number(attempt.raw_score)
          : null,
      totalQuestions,
      createdAt: attempt.created_at,
      status: attempt.status,
    };
  });

  const filterTitle =
    testSlug && rows.length > 0 ? rows.find((r) => r.testSlug === testSlug)?.testTitle ?? null : null;

  return {
    props: {
      rows,
      filterSlug: testSlug ?? null,
      filterTitle,
    },
  };
};

export default ReadingHistoryPage;
