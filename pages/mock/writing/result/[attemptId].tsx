// pages/mock/writing/result/[attemptId].tsx
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

type WritingTaskResult = {
  taskType: "task1" | "task2";
  prompt: string | null;
  bandScore: number | null;
  wordCount: number | null;
};

type AttemptSummary = {
  id: string;
  createdAt: string;
  durationSeconds: number | null;
};

type PageProps = {
  attempt: AttemptSummary;
  task1: WritingTaskResult | null;
  task2: WritingTaskResult | null;
};

const WritingResultPage: NextPage<PageProps> = ({ attempt, task1, task2 }) => {
  const hasBoth = task1 && task2;

  return (
    <>
      <Head>
        <title>Writing Result · GramorX</title>
      </Head>

      <main className="bg-lightBg dark:bg-dark/90 pb-20">

        {/* HEADER */}
        <section className="py-10 md:py-14 border-b border-border/40 bg-card/70 backdrop-blur">
          <Container className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-ds-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Icon name="PenSquare" size={14} />
              <span>Writing Result</span>
            </div>

            <h1 className="font-slab text-h2">Your Writing Score Breakdown</h1>

            <p className="text-sm text-muted-foreground max-w-xl">
              Task 1 + Task 2 bands, word counts, and next-step recommendations.
            </p>

            <div className="flex gap-3 pt-3">
              <Button asChild variant="primary" size="md" className="rounded-ds-xl">
                <Link href="/mock/writing">Start new Writing mock</Link>
              </Button>

              <Button asChild variant="secondary" size="md" className="rounded-ds-xl">
                <Link href="/mock/writing/history">View history</Link>
              </Button>

              <Button asChild variant="ghost" size="md" className="rounded-ds-xl">
                <Link href={`/mock/writing/review/${attempt.id}`}>Review answers</Link>
              </Button>
            </div>
          </Container>
        </section>

        {/* SUMMARY ROW */}
        <section className="py-12">
          <Container>
            <Card className="rounded-ds-2xl p-6 border border-border/60 bg-card/80">
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="text-lg font-semibold mt-1">
                    {new Date(attempt.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Tasks included</p>
                  <p className="text-lg font-semibold mt-1">
                    {hasBoth ? "Task 1 & Task 2" : task2 ? "Task 2" : "Task 1"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-lg font-semibold mt-1">
                    {attempt.durationSeconds
                      ? `${Math.round(attempt.durationSeconds / 60)} mins`
                      : "—"}
                  </p>
                </div>
              </div>
            </Card>
          </Container>
        </section>

        {/* BAND SCORE CARDS */}
        <section className="pb-12">
          <Container className="grid gap-6 md:grid-cols-2">
            {/* TASK 1 */}
            {task1 && (
              <Card className="rounded-ds-2xl p-6 border border-border/60 bg-card/80">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-slab text-h4">Task 1 Score</h2>
                  <Badge size="sm" variant="info">
                    Task 1
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Band</p>
                    <p className="text-3xl font-bold">{task1.bandScore ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Word count</p>
                    <p className="text-3xl font-bold">{task1.wordCount ?? "—"}</p>
                  </div>
                </div>

                <div className="mt-4 text-xs text-muted-foreground">
                  <p>{task1.prompt}</p>
                </div>
              </Card>
            )}

            {/* TASK 2 */}
            {task2 && (
              <Card className="rounded-ds-2xl p-6 border border-border/60 bg-card/80">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-slab text-h4">Task 2 Score</h2>
                  <Badge size="sm" variant="danger">
                    Task 2
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Band</p>
                    <p className="text-3xl font-bold">{task2.bandScore ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Word count</p>
                    <p className="text-3xl font-bold">{task2.wordCount ?? "—"}</p>
                  </div>
                </div>

                <div className="mt-4 text-xs text-muted-foreground">
                  <p>{task2.prompt}</p>
                </div>
              </Card>
            )}
          </Container>
        </section>

        {/* AI LAB CTA */}
        <section className="bg-muted/40 py-14">
          <Container>
            <Card className="rounded-ds-2xl p-6 bg-card/90 border border-border/60 max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-6">

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-primary font-semibold">
                    Next smart move
                  </p>

                  <h3 className="font-slab text-h3">
                    Send this Writing attempt to AI Lab.
                  </h3>

                  <p className="text-sm text-muted-foreground">
                    AI will rewrite your essay, find grammar issues, expand ideas,
                    fix cohesion, polish vocabulary, and show side-by-side improvements.
                  </p>
                </div>

                <div className="bg-muted rounded-ds-2xl p-4 text-sm space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <Icon name="Sparkles" size={14} />
                    <span>Recommended flow</span>
                  </div>

                  <ol className="text-xs text-muted-foreground space-y-2">
                    <li>1. Check your band + word count above.</li>
                    <li>2. Send attempt to AI Lab for rewriting + scoring.</li>
                    <li>3. Compare versions and improve structure.</li>
                    <li>4. Retake a fresh Writing mock.</li>
                  </ol>

                  <div className="flex gap-2">
                    <Button
                      asChild
                      variant="secondary"
                      size="sm"
                      className="rounded-ds-xl w-full"
                    >
                      <Link href={`/ai?writingAttempt=${attempt.id}`}>
                        Open AI Lab
                      </Link>
                    </Button>

                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="rounded-ds-xl w-full"
                    >
                      <Link href="/mock/writing/history">Back to history</Link>
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

export default WritingResultPage;

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const supabase = getServerClient(ctx.req, ctx.res);
  const attemptId = ctx.params?.attemptId as string;

  const { data: attemptRow } = await supabase
    .from("writing_attempts")
    .select("*")
    .eq("id", attemptId)
    .single();

  const { data: answers } = await supabase
    .from("writing_attempt_answers")
    .select("*")
    .eq("attempt_id", attemptId);

  const convert = (row: any): WritingTaskResult => ({
    taskType: row.task_type,
    prompt: row.prompt,
    bandScore: row.band_score,
    wordCount: row.word_count,
  });

  const t1 = answers?.find((a: any) => a.task_type === "task1") ?? null;
  const t2 = answers?.find((a: any) => a.task_type === "task2") ?? null;

  return {
    props: {
      attempt: {
        id: attemptRow.id,
        createdAt: attemptRow.created_at,
        durationSeconds: attemptRow.duration_seconds,
      },
      task1: t1 ? convert(t1) : null,
      task2: t2 ? convert(t2) : null,
    },
  };
};
