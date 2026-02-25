// components/layouts/ExamResourceLayout.tsx
import * as React from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import Footer from '@/components/Footer';
import { Container } from '@/components/design-system/Container';
import { Button } from '@/components/design-system/Button';

type Props = {
  title?: string;
  children: React.ReactNode;
};

export default function ExamResourceLayout({ title, children }: Props) {
  return (
    <>
      <Header />
      <main className="min-h-[60vh] bg-background text-foreground">
        <section className="border-b bg-card/40">
          <Container className="flex flex-col gap-4 py-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="text-caption uppercase tracking-[0.12em] text-muted-foreground">
                IELTS exam resources
              </p>
              <h1 className="text-h3 font-semibold">{title ?? 'Exam resources'}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/exam/rehearsal">Rehearsal</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/exam-day">Exam day</Link>
              </Button>
              <Button asChild size="sm" variant="primary">
                <Link href="/mock">Start a mock</Link>
              </Button>
            </div>
          </Container>
        </section>
        <Container className="py-8">{children}</Container>
      </main>
      <Footer />
    </>
  );
}
