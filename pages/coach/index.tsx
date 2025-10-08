import React, { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

import { Container } from '@/components/design-system/Container';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { env } from '@/lib/env';
import { flags } from '@/lib/flags';

const coachCanonical = env.NEXT_PUBLIC_SITE_URL
  ? `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/coach`
  : undefined;
const coachEnabled = flags.enabled('coach');

const quickPrompts = [
  'How can I structure my IELTS Task 2 introduction?',
  'Give me a 4-day plan to boost Listening section 3 scores.',
  'What should I review before my speaking mock tomorrow?',
];

const moduleShortcuts = [
  { href: '/study-plan', label: 'Study Plan' },
  { href: '/mock-tests', label: 'Mock Tests' },
  { href: '/predictor', label: 'Band Predictor' },
  { href: '/speaking', label: 'Speaking Lab' },
  { href: '/writing', label: 'Writing Coach' },
];

const INITIAL_ASSISTANT =
  'Hi! I\'m your IELTS AI Coach. Ask me about planning, feedback, or skill drills and I\'ll point you to the right modules such as [Study Plan](/study-plan), [Mock Tests](/mock-tests), or [Writing Coach](/writing).';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

function CoachComingSoon() {
  return (
    <>
      <Head>
        <title>Coaching coming soon</title>
        {coachCanonical ? <link rel="canonical" href={coachCanonical} /> : null}
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content="Personalised coaching sessions are rolling out soon. Explore live classes while we finish the experience."
        />
      </Head>
      <section className="py-24 bg-lightBg dark:bg-gradient-to-br dark:from-dark/80 dark:to-darker/90">
        <Container>
          <Card className="max-w-2xl mx-auto space-y-5 p-6 rounded-ds-2xl text-center">
            <h1 className="font-slab text-h2">Coaching is almost here</h1>
            <p className="text-body text-mutedText">
              We&apos;re putting the final polish on 1:1 coaching so that your essays get thoughtful, human feedback.
              You&apos;ll see it first in your account once it&apos;s ready.
            </p>
            <p className="text-body text-mutedText">
              In the meantime, keep building momentum with structured classes and practice plans.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg">
                <Link href="/classes">Explore live classes</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/study-plan">Open your study plan</Link>
              </Button>
            </div>
          </Card>
        </Container>
      </section>
    </>
  );
}

function CoachChatExperience() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'assistant-initial', role: 'assistant', content: INITIAL_ASSISTANT },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamingIdRef = useRef<string | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    viewportRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const submitPrompt = async (prompt?: string) => {
    const value = (prompt ?? input).trim();
    if (!value || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: value,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setQuotaError(null);

    const controller = new AbortController();
    abortRef.current = controller;
    setIsSending(true);

    const payload = nextMessages.map(({ role, content }) => ({ role, content }));
    let assistantId: string | null = null;

    try {
      const response = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 429) {
          setQuotaError(
            typeof data?.limit === 'number'
              ? `Free plan limit reached (max ${data.limit} chats today).`
              : 'Daily chat limit reached. Please try again tomorrow.'
          );
        } else {
          setError(data?.error || 'Unable to fetch coaching feedback.');
        }
        throw new Error('chat_failed');
      }

      assistantId = `assistant-${Date.now()}`;
      streamingIdRef.current = assistantId;
      setMessages((prev) => [...prev, { id: assistantId!, role: 'assistant', content: '' }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(chunk, { stream: true });
        if (!text) continue;
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId ? { ...message, content: message.content + text } : message,
          ),
        );
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // noop: handled by stop handler
      } else if (err?.message !== 'chat_failed') {
        setError('We hit a snag generating feedback. Please try again.');
      }
      if (assistantId) {
        const id = assistantId;
        setMessages((prev) => prev.filter((message) => message.id !== id || message.content.trim().length > 0));
      }
    } finally {
      streamingIdRef.current = null;
      abortRef.current = null;
      setIsSending(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitPrompt();
  };

  const stopGeneration = () => {
    const controller = abortRef.current;
    const streamingId = streamingIdRef.current;
    if (controller) {
      controller.abort();
      abortRef.current = null;
    }
    if (streamingId) {
      setMessages((prev) =>
        prev.filter((message) => message.id !== streamingId || message.content.trim().length > 0),
      );
      streamingIdRef.current = null;
    }
    setIsSending(false);
  };

  const lastAssistant = useMemo(() => messages.filter((m) => m.role === 'assistant').length, [messages]);

  return (
    <>
      <Head>
        <title>IELTS AI Coach</title>
        {coachCanonical ? <link rel="canonical" href={coachCanonical} /> : null}
        <meta
          name="description"
          content="Chat with the GramorX IELTS AI Coach for targeted prep tips, references to study modules, and daily accountability."
        />
      </Head>
      <main className="min-h-screen bg-background text-foreground">
        <section className="py-16">
          <Container>
            <div className="mx-auto flex max-w-4xl flex-col gap-6">
              <header className="space-y-2">
                <h1 className="text-h1 font-semibold">IELTS AI Coach</h1>
                <p className="text-body text-muted-foreground">
                  Get focused IELTS prep ideas, then jump straight into the right GramorX modules. Ask about study plans,
                  mock feedback, or how to tackle a tricky skill.
                </p>
              </header>

              <Card className="space-y-4 rounded-3xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur">
                <div className="flex flex-wrap gap-2">
                  {moduleShortcuts.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="rounded-xl border border-border px-3 py-1 text-caption text-muted-foreground hover:bg-muted"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                <div className="flex flex-col gap-3 rounded-2xl bg-muted/60 p-4">
                  <span className="text-caption font-medium text-muted-foreground">Try asking:</span>
                  <div className="flex flex-wrap gap-2">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => {
                          setInput(prompt);
                        }}
                        className="rounded-xl border border-border bg-background px-3 py-2 text-left text-small text-foreground transition hover:bg-muted"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="h-[420px] overflow-y-auto rounded-2xl border border-border bg-background/70 p-4">
                    <ul className="space-y-4">
                      {messages.map((message) => (
                        <li
                          key={message.id}
                          className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse text-right' : ''}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-3 text-small leading-relaxed ${
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            {message.role === 'assistant' ? (
                              <ReactMarkdown className="prose prose-sm dark:prose-invert">{message.content}</ReactMarkdown>
                            ) : (
                              <span>{message.content}</span>
                            )}
                          </div>
                        </li>
                      ))}
                      {isSending ? (
                        <li className="flex gap-3 text-muted-foreground">
                          <div className="h-3 w-3 animate-bounce rounded-full bg-muted-foreground" />
                          <div className="h-3 w-3 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.1s]" />
                          <div className="h-3 w-3 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.2s]" />
                        </li>
                      ) : null}
                    </ul>
                    <div ref={viewportRef} />
                  </div>

                  {error ? (
                    <p className="text-caption text-danger">{error}</p>
                  ) : null}
                  {quotaError ? (
                    <p className="text-caption text-warning">{quotaError}</p>
                  ) : null}

                  <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <textarea
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder="Ask for IELTS tips, accountability nudges, or module recommendations..."
                      className="h-28 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-small focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-caption text-muted-foreground">
                        {lastAssistant > 1 ? 'Let\'s keep the conversation flowing!' : 'Your first tip unlocks quick wins.'}
                      </div>
                      <div className="flex items-center gap-2">
                        {isSending ? (
                          <Button type="button" variant="secondary" onClick={stopGeneration} className="rounded-xl">
                            Stop
                          </Button>
                        ) : null}
                        <Button
                          type="submit"
                          disabled={!input.trim() || isSending}
                          className="rounded-xl"
                        >
                          {isSending ? 'Sending...' : 'Send'}
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>

                <p className="text-caption text-muted-foreground">
                  The AI Coach keeps chats private, references only the modules listed above, and won&apos;t override safety
                  rules.
                </p>
              </Card>
            </div>
          </Container>
        </section>
      </main>
    </>
  );
}

export default function CoachPage() {
  if (!coachEnabled) {
    return <CoachComingSoon />;
  }
  return <CoachChatExperience />;
}
