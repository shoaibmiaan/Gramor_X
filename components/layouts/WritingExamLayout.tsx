// components/writing/WritingExamLayout.tsx
import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';

type TopBarProps = {
  title: string;
  attemptId?: string;
  timer?: React.ReactNode;              // e.g., <Countdown seconds={...} />
  status?: 'saving' | 'saved' | 'error' | null;
  planBadge?: React.ReactNode;          // e.g., <Badge>Booster</Badge>
  onExit?: () => void;
};

type WritingExamLayoutProps = {
  topbar: TopBarProps;
  left: React.ReactNode;                // Task prompt / diagram / notes
  right: React.ReactNode;               // Editor / WritingExamRoom
  footer?: React.ReactNode;             // Optional: feedback dock after submit
};

export default function WritingExamLayout({
  topbar,
  left,
  right,
  footer,
}: WritingExamLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Sticky, quiet topbar */}
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-md px-2 py-1 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
            >
              ← Exit
            </Link>

            <h1 className="flex-1 truncate text-base font-semibold tracking-tight">
              {topbar.title}
              {topbar.attemptId ? (
                <span className="ml-2 align-middle text-xs font-normal text-neutral-500">
                  #{topbar.attemptId.slice(0, 8)}
                </span>
              ) : null}
            </h1>

            {topbar.planBadge ? (
              <div className="hidden sm:flex">{topbar.planBadge}</div>
            ) : null}

            {topbar.timer ? (
              <div className="rounded-md border border-neutral-200 bg-white px-3 py-1 text-sm font-medium text-neutral-800">
                {topbar.timer}
              </div>
            ) : null}

            {topbar.status ? (
              <span
                className={
                  topbar.status === 'saving'
                    ? 'text-xs text-amber-600'
                    : topbar.status === 'saved'
                    ? 'text-xs text-emerald-600'
                    : 'text-xs text-rose-600'
                }
              >
                {topbar.status === 'saving'
                  ? 'Saving…'
                  : topbar.status === 'saved'
                  ? 'Saved'
                  : 'Save failed'}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {/* Two-pane calm workspace */}
      <main className="mx-auto grid min-h-[calc(100vh-52px)] max-w-7xl grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[minmax(380px,520px)_1fr]">
        {/* LEFT: Task / prompt */}
        <section className="flex min-h-[40vh] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2">
            <div className="text-sm font-semibold tracking-tight text-neutral-800">
              Task & Materials
            </div>
            <div className="text-xs text-neutral-500">Scroll to view all</div>
          </div>
          <div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-300/70 flex-1 overflow-auto px-4 py-3">
            {left}
          </div>
        </section>

        {/* RIGHT: Editor */}
        <section className="flex min-h-[60vh] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2">
            <div className="text-sm font-semibold tracking-tight text-neutral-800">
              Answer Editor
            </div>
            {/* Space for live word count if the editor exposes it */}
            <div id="gx-wordcount-slot" className="text-xs text-neutral-500" />
          </div>
          <div className="flex-1 overflow-auto px-2 py-2">{right}</div>
        </section>

        {/* FEEDBACK (optional) */}
        {footer ? (
          <section className="lg:col-span-2">
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              {footer}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

/** Lightweight media block for diagrams/tables if you need it quickly */
export function TaskFigure(props: {
  src: string;
  alt: string;
  width: number;
  height: number;
}) {
  const { src, alt, width, height } = props;
  return (
    <figure className="my-3 overflow-hidden rounded-lg border border-neutral-200">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="h-auto w-full object-contain"
        priority
      />
      <figcaption className="border-t border-neutral-200 px-3 py-2 text-xs text-neutral-500">
        {alt}
      </figcaption>
    </figure>
  );
}
