// pages/mock/listening/history/index.tsx
import * as React from "react";
import Head from "next/head";
import Link from "next/link";

import { Container } from "@/components/design-system/Container";
import { Card } from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";
import { Badge } from "@/components/design-system/Badge";
import { Icon } from "@/components/design-system/Icon";

import { getServerClient } from "@/lib/supabaseServer";
import type { Database } from "@/lib/database.types";

type ListeningAttempt = {
  id: string;
  testTitle: string;
  testSlug: string;
  rawScore: number | null;
  bandScore: number | null;
  createdAt: string;
  durationSeconds: number | null;
};

type PageProps = {
  attempts: ListeningAttempt[];
};

const ListeningHistoryPage: React.FC<PageProps> = ({ attempts }) => {
  const hasAttempts = attempts.length > 0;

  return (
    <>
      <Head>
        <title>Listening History · GramorX</title>
      </Head>

      <main className="bg-lightBg dark:bg-dark/90 pb-20">

        {/* -------------------------------------------------------------- */}
        {/* HERO / COMMAND HEADER */}
        {/* -------------------------------------------------------------- */}
        <section className="py-10 md:py-14 border-b border-border/40 bg-card/70 backdrop-blur">
          <Container>
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-ds-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Icon name="Headphones" size={14} />
                <span>Listening Attempt History</span>
              </div>

              <h1 className="font-slab text-h2 leading-tight">
                Your Listening mocks. Every score, every mistake.
              </h1>

              <p className="text-sm text-muted-foreground max-w-xl">
                Track your bands, section accuracy, average raw scores, timing,
                and improvement trend across all Listening mocks.
              </p>

              <div className="flex gap-3 pt-3">
                <Button
                  asChild
                  size="md"
                  variant="primary"
                  className="rounded-ds-xl"
                >
                  <Link href="/mock/listening">Start new Listening mock</Link>
                </Button>

                {hasAttempts && (
                  <Button
                    asChild
                    size="md"
                    variant="secondary"
                    className="rounded-ds-xl"
                  >
                    <Link href="#attempts-list">Jump to attempts</Link>
                  </Button>
                )}
              </div>
            </div>
          </Container>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* EMPTY STATE */}
        {/* -------------------------------------------------------------- */}
        {!hasAttempts && (
          <section className="py-24">
            <Container className="max-w-xl text-center space-y-5">
              <Icon
                name="CircleDashed"
                size={44}
                className="mx-auto text-muted-foreground"
              />

              <h2 className="font-slab text-h3">No Listening mocks yet</h2>
              <p className="text-sm text-muted-foreground">
                Once you attempt a Listening mock, all your results, band
                history, and section analytics will appear here.
              </p>

              <Button
                asChild
                size="lg"
                variant="primary"
                className="rounded-ds-xl px-6"
              >
                <Link href="/mock/listening">Start first Listening mock</Link>
              </Button>
            </Container>
          </section>
        )}

        {/* -------------------------------------------------------------- */}
        {/* ATTEMPT LIST */}
        {/* -------------------------------------------------------------- */}
        {hasAttempts && (
          <section id="attempts-list" className="py-12">
            <Container>
              <div className="mb-6">
                <h2 classname="font-slab text-h3">Your Listening attempts</h2>
                <p className="text-sm text-muted-foreground">
                  Click any attempt to view detailed breakdown and section-wise scores.
                </p>
              </div>

              <div className="space-y-4">
                {attempts.map((a) => (
                  <Card
                    key={a.id}
                    className="rounded-ds-2xl p-5 border border-border/60 bg-card/80 flex items-center justify-between hover:-translate-y-1 transition shadow-sm"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{a.testTitle}</h3>
                        <Badge variant="neutral" size="xs">
                          {new Date(a.createdAt).toLocaleDateString()}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {a.rawScore !== null
                          ? `${a.rawScore} correct · Band ${a.bandScore ?? "—"}`
                          : "Not submitted"}
                      </p>
                    </div>

                    <Button
                      asChild
                      size="sm"
                      variant="primary"
                      className="rounded-ds-xl"
                    >
                      <Link href={`/mock/listening/result/${a.id}`}>Open result</Link>
                    </Button>
                  </Card>
                ))}
              </div>
            </Container>
          </section>
        )}

        {/* -------------------------------------------------------------- */}
        {/* AI RECOMMENDATION CTA */}
        {/* -------------------------------------------------------------- */}
        {hasAttempts && (
          <section className="py-16 bg-muted/40">
            <Container>
              <Card className="max-w-4xl mx-auto rounded-ds-2xl p-6 bg-card/90 border border-border/60">
                <div className="grid md:grid-cols-2 gap-6">

                  <div className="space-y-2">
                    <p className="text-xs tracking-wide uppercase text-primary font-semibold">
                      Next smart move
                    </p>
                    <h3 className="font-slab text-h3">
                      Fix your Listening weaknesses with AI.
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      AI Lab will show your weak sections, accent difficulty,
                      question types you keep missing, and targeted drills for
                      improvement.
                    </p>
                  </div>

                  <div className="bg-muted rounded-ds-2xl p-4 space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <Icon name="Sparkles" size={14} />
                      <span>Recommended flow</span>
                    </div>

                    <ol className="text-xs text-muted-foreground space-y-2">
                      <li>1. Pick any past attempt from above.</li>
                      <li>2. Send its score to AI Lab.</li>
                      <li>3. Get deep section-wise analysis.</li>
                      <li>4. Retry targeted drills & reattempt a mock.</li>
                    </ol>

                    <div className="flex gap-2">
                      <Button
                        asChild
                        size="sm"
                        variant="secondary"
                        className="rounded-ds-xl w-full"
                      >
                        <Link href="/ai">Open AI Lab</Link>
                      </Button>

                      <Button
                        asChild
                        size="sm"
                        variant="ghost"
                        className="rounded-ds-xl w-full"
                      >
                        <Link href="/mock/listening">Back to Listening mocks</Link>
                      </Button>
                    </div>
                  </div>

                </div>
              </Card>
            </Container>
          </section>
        )}

      </main>
    </>
  );
};

export default ListeningHistoryPage;

export const getServerSideProps = async () => {
  const supabase = getServerClient();

  const { data } = await supabase
    .from("listening_attempts")
    .select("id, raw_score, band_score, created_at, duration_seconds, test_id, listening_tests (title, slug)")
    .order("created_at", { ascending: false });

  const attempts: ListeningAttempt[] =
    data?.map((row: any) => ({
      id: row.id,
      testTitle: row.listening_tests?.title ?? "Untitled Test",
      testSlug: row.listening_tests?.slug ?? "",
      rawScore: row.raw_score,
      bandScore: row.band_score,
      createdAt: row.created_at,
      durationSeconds: row.duration_seconds,
    })) ?? [];

  return { props: { attempts } };
};
