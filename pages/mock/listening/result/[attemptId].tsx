// pages/mock/listening/result/[attemptId].tsx
import * as React from "react";
import Head from "next/head";
import Link from "next/link";
import type { GetServerSideProps, NextPage } from "next";

import { Container } from "@/components/design-system/Container";
import { Card } from "@/components/design-system/Card";
import { Badge } from "@/components/design-system/Badge";
import { Button } from "@/components/design-system/Button";
import { Icon } from "@/components/design-system/Icon";

import { getServerClient } from "@/lib/supabaseServer";
import type { Database } from "@/lib/database.types";

type AttemptSummary = {
  id: string;
  rawScore: number | null;
  bandScore: number | null;
  questionCount: number | null;
  durationSeconds: number | null;
  createdAt: string;
};

type TestSummary = {
  id: string;
  title: string;
  slug: string;
  totalQuestions: number | null;
  durationMinutes: number | null;
};

type SectionStat = {
  section: number;
  correct: number;
  total: number;
};

type PageProps = {
  attempt: AttemptSummary;
  test: TestSummary;
  sectionStats: SectionStat[];
};

const ListeningResultPage: NextPage<PageProps> = ({ attempt, test, sectionStats }) => {
  return (
    <>
      <Head>
        <title>Listening Result · GramorX</title>
      </Head>

      <main className="bg-lightBg dark:bg-dark/90 pb-20">

        {/* -------------------------------------------------------------- */}
        {/* HERO SECTION */}
        {/* -------------------------------------------------------------- */}
        <section className="py-10 md:py-14 border-b border-border/40 bg-card/70 backdrop-blur">
          <Container className="space-y-4">

            <div className="inline-flex items-center gap-2 rounded-ds-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Icon name="Headphones" size={14} />
              <span>Listening Result</span>
            </div>

            <h1 className="font-slab text-h2">
              Your Listening Score
            </h1>

            <p className="text-sm text-muted-foreground max-w-xl">
              Full breakdown of your Listening mock: band score, raw score,
              section accuracy, and improvement suggestions.
            </p>

            <div className="flex gap-3 pt-3">
              <Button
                asChild
                size="md"
                variant="primary"
                className="rounded-ds-xl"
              >
                <Link href="/mock/listening">Start another mock</Link>
              </Button>

              <Button
                asChild
                size="md"
                variant="secondary"
                className="rounded-ds-xl"
              >
                <Link href="/mock/listening/history">Back to history</Link>
              </Button>
            </div>
          </Container>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* SCORE SUMMARY */}
        {/* -------------------------------------------------------------- */}
        <section className="py-12">
          <Container>
            <div className="grid gap-6 md:grid-cols-2">

              {/* MAIN SCORE CARD */}
              <Card className="rounded-ds-2xl p-6 border border-border/60 bg-card/80">
                <h2 className="font-slab text-h4 mb-4">Overall Performance</h2>

                <div className="grid grid-cols-3 gap-4 text-center">

                  <div>
                    <p className="text-xs text-muted-foreground">Band score</p>
                    <p className="text-3xl font-bold text-foreground">
                      {attempt.bandScore ?? "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Correct answers</p>
                    <p className="text-3xl font-bold text-foreground">
                      {attempt.rawScore ?? "—"}/{attempt.questionCount ?? test.totalQuestions ?? 40}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-3xl font-bold text-foreground">
                      {attempt.durationSeconds
                        ? `${Math.round(attempt.durationSeconds / 60)}m`
                        : "—"}
                    </p>
                  </div>

                </div>

                <p className="text-xs text-muted-foreground mt-3">
                  Attempted on {new Date(attempt.createdAt).toLocaleDateString()}
                </p>
              </Card>

              {/* TEST DETAILS */}
              <Card className="rounded-ds-2xl p-6 border border-border/60 bg-card/80">
                <h2 className="font-slab text-h4 mb-4">Test Details</h2>

                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Test</span>
                    <span className="font-medium text-foreground">{test.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total questions</span>
                    <span className="font-medium text-foreground">
                      {test.totalQuestions ?? 40}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration</span>
                    <span className="font-medium text-foreground">
                      {test.durationMinutes ?? 30} minutes
                    </span>
                  </div>
                </div>
              </Card>

            </div>
          </Container>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* SECTION WISE BREAKDOWN */}
        {/* -------------------------------------------------------------- */}
        <section className="pb-12">
          <Container>
            <h2 className="font-slab text-h4 mb-4">Section Breakdown</h2>

            <div className="grid gap-4 md:grid-cols-4">
              {sectionStats.map((s) => (
                <Card
                  key={s.section}
                  className="rounded-ds-2xl p-5 border border-border/60 bg-card/80 text-center"
                >
                  <p className="text-xs text-muted-foreground">Section {s.section}</p>
                  <p className="mt-2 text-lg font-semibold">
                    {s.correct}/{s.total}
                  </p>

                  <Badge
                    size="xs"
                    variant={
                      s.correct / s.total >= 0.75
                        ? "success"
                        : s.correct / s.total >= 0.5
                        ? "info"
                        : "danger"
                    }
                    className="mt-3"
                  >
                    {Math.round((s.correct / s.total) * 100)}% accuracy
                  </Badge>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* AI COACH CTA */}
        {/* -------------------------------------------------------------- */}
        <section className="bg-muted/40 pb-16 pt-10">
          <Container>
            <Card className="max-w-4xl mx-auto rounded-ds-2xl p-6 bg-card/90 border border-border/60">

              <div className="grid md:grid-cols-2 gap-6">

                <div className="space-y-2">
                  <p className="text-xs tracking-wide uppercase text-primary font-semibold">
                    Next smart move
                  </p>

                  <h3 className="font-slab text-h3">
                    Send this attempt to AI Lab for deeper insights.
                  </h3>

                  <p className="text-sm text-muted-foreground">
                    Find your weakest sections, accent issues, question types, and
                    get personalised practice drills based on this attempt.
                  </p>
                </div>

                <div className="bg-muted rounded-ds-2xl p-4 space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <Icon name="Sparkles" size={14} />
                    <span>Recommended flow</span>
                  </div>

                  <ol className="text-xs text-muted-foreground space-y-2">
                    <li>1. Review your accuracy above.</li>
                    <li>2. Send this attempt to AI Lab.</li>
                    <li>3. Get section-wise weakness mapping.</li>
                    <li>4. Reattempt Listening with targeted drills.</li>
                  </ol>

                  <div className="flex gap-2">
                    <Button
                      asChild
                      size="sm"
                      variant="secondary"
                      className="rounded-ds-xl w-full"
                    >
                      <Link href={`/ai?listeningAttempt=${attempt.id}`}>
                        Open AI Lab
                      </Link>
                    </Button>

                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="rounded-ds-xl w-full"
                    >
                      <Link href="/mock/listening/history">
                        Back to history
                      </Link>
                    </Button>
                  </div>
                </div>

              </div>

            </Card>
          </Container>
        </section>
      </main>
    </>
  );
};

export default ListeningResultPage;

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const supabase = getServerClient(ctx.req, ctx.res);
  const attemptId = ctx.params?.attemptId as string;

  const { data: attemptRow } = await supabase
    .from("listening_attempts")
    .select("*, listening_tests (id, title, slug, questions, duration_minutes)")
    .eq("id", attemptId)
    .single();

  let sectionStats: SectionStat[] = [];

  if (attemptRow?.section_stats) {
    const rawStats = attemptRow.section_stats as any;
    sectionStats = Object.keys(rawStats).map((sec) => ({
      section: Number(sec),
      correct: rawStats[sec].correct,
      total: rawStats[sec].total,
    }));
  }

  return {
    props: {
      attempt: {
        id: attemptRow.id,
        rawScore: attemptRow.raw_score,
        bandScore: attemptRow.band_score,
        questionCount: attemptRow.questions,
        durationSeconds: attemptRow.duration_seconds,
        createdAt: attemptRow.created_at,
      },
      test: {
        id: attemptRow.listening_tests.id,
        title: attemptRow.listening_tests.title,
        slug: attemptRow.listening_tests.slug,
        totalQuestions: attemptRow.listening_tests.questions,
        durationMinutes: attemptRow.listening_tests.duration_minutes,
      },
      sectionStats,
    },
  };
};
