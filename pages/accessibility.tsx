// pages/accessibility.tsx
import * as React from "react";
import Head from "next/head";
import Link from "next/link";
import { Container } from "@/components/design-system/Container";
import { Card } from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";
import { Input } from "@/components/design-system/Input";

export default function AccessibilityPage() {
  const [announceMsg, setAnnounceMsg] = React.useState<string>("");
  const liveRef = React.useRef<HTMLDivElement | null>(null);

  const announce = React.useCallback((msg: string) => {
    setAnnounceMsg("");
    setTimeout(() => setAnnounceMsg(msg), 20);
  }, []);

  return (
    <>
      <Head>
        <title>Accessibility · GramorX</title>
        <meta
          name="description"
          content="WCAG quick checks, keyboard playground, screen reader landmarks, and live-region demo."
        />
      </Head>

      {/* Skip link (appears when focused) */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-ds-lg focus:border focus:border-border focus:bg-card focus:px-3 focus:py-2 focus:text-small focus:text-foreground"
      >
        Skip to main content
      </a>

      <div className="py-8">
        <Container className="space-y-6">
          <header className="space-y-2">
            <p className="text-caption uppercase tracking-[0.14em] text-muted-foreground">Inclusive by default</p>
            <h1 className="text-h2 font-bold text-foreground">Accessibility</h1>
            <p className="text-small text-muted-foreground">
              Quick WCAG checks and interactive playground to catch issues before launch.
            </p>
          </header>

          <main id="main" role="main" className="space-y-6">
            {/* Quick Checks */}
            <Card as="section" aria-labelledby="quick-checks" padding="lg" insetBorder>
              <div className="space-y-3">
                <h2 id="quick-checks" className="text-h4 font-semibold text-foreground">
                  Quick checks
                </h2>
                <ul className="list-disc space-y-1 pl-5 text-small text-foreground">
                  <li>All interactive controls are reachable by <kbd>Tab</kbd> and visible on focus.</li>
                  <li>Images use <code className="rounded bg-background px-1">alt</code> text or are marked decorative.</li>
                  <li>Color is not the only way information is conveyed.</li>
                  <li>
                    Text has sufficient contrast; respect <code className="rounded bg-background px-1">prefers-reduced-motion</code>.
                  </li>
                  <li>Page uses landmarks: header, nav, main, footer.</li>
                  <li>Form fields have associated labels; errors are announced.</li>
                </ul>
                <p className="text-caption text-muted-foreground">
                  Tip: run automated checks with axe (Browser DevTools) and Lighthouse; then do a manual keyboard pass.
                </p>
              </div>
            </Card>

            {/* Keyboard Playground */}
            <Card as="section" aria-labelledby="keyboard-play" padding="lg" insetBorder>
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 id="keyboard-play" className="text-h4 font-semibold text-foreground">
                    Keyboard playground
                  </h2>
                  <p className="text-small text-muted-foreground">
                    Use <kbd>Tab</kbd>/<kbd>Shift+Tab</kbd> and <kbd>Space</kbd>/<kbd>Enter</kbd> to operate controls below.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <fieldset className="space-y-3 rounded-ds-xl border border-border/60 bg-background p-4">
                    <legend className="px-1 text-caption text-muted-foreground">Form sample</legend>
                    <Input id="name" name="name" label="Name" placeholder="Your full name" />
                    <Button type="button" onClick={() => announce("Form validated. No errors found.")}>
                      Validate
                    </Button>
                  </fieldset>

                  <div className="space-y-3 rounded-ds-xl border border-border/60 bg-background p-4">
                    <div className="text-caption text-muted-foreground">Buttons &amp; links</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" onClick={() => announce("Primary action triggered")}>Action</Button>
                      <Button type="button" variant="outline" disabled>
                        Disabled
                      </Button>
                      <Button asChild variant="soft">
                        <Link href="/pricing">Go to pricing</Link>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* ARIA live region */}
                <div ref={liveRef} aria-live="polite" aria-atomic="true" className="sr-only">
                  {announceMsg}
                </div>
              </div>
            </Card>

            {/* Landmarks / Motion */}
            <Card as="section" aria-labelledby="landmarks" padding="lg" insetBorder>
              <div className="space-y-3">
                <h2 id="landmarks" className="text-h4 font-semibold text-foreground">
                  Landmarks &amp; motion
                </h2>
                <ul className="list-disc space-y-1 pl-5 text-small text-foreground">
                  <li>
                    This page includes <code className="rounded bg-background px-1">main</code> landmark and a top-level “Skip to
                    main content” link.
                  </li>
                  <li>
                    Honor reduced motion: avoid non-essential animations when{' '}
                    <code className="rounded bg-background px-1">prefers-reduced-motion: reduce</code> is set.
                  </li>
                </ul>
                <details className="rounded-ds-xl border border-border/60 bg-background p-3 text-small">
                  <summary className="cursor-pointer text-foreground">Why it matters</summary>
                  <p className="mt-2 text-muted-foreground">
                    Clear focus styles and proper landmarks help keyboard and screen-reader users navigate quickly. Live regions
                    announce changes that aren’t triggered by focus.
                  </p>
                </details>
              </div>
            </Card>

            {/* Resources */}
            <Card as="section" aria-labelledby="resources" padding="lg" insetBorder>
              <div className="space-y-3">
                <h2 id="resources" className="text-h4 font-semibold text-foreground">
                  Resources
                </h2>
                <ul className="space-y-2 text-small">
                  <li>
                    <a
                      className="text-primary underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      href="https://www.w3.org/WAI/standards-guidelines/wcag/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      WCAG Overview — W3C WAI
                    </a>
                  </li>
                  <li>
                    <a
                      className="text-primary underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      href="https://developer.chrome.com/docs/lighthouse/accessibility"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Lighthouse Accessibility
                    </a>
                  </li>
                  <li>
                    <a
                      className="text-primary underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      href="https://www.deque.com/axe/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      axe DevTools
                    </a>
                  </li>
                </ul>
              </div>
            </Card>
          </main>
        </Container>
      </div>
    </>
  );
}
