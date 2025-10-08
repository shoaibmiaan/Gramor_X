// components/auth/AuthAssistant.tsx
import React, { useState, useRef, useEffect } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/design-system/Button';
import { Input } from '@/components/design-system/Input';

interface Message {
  role: 'user' | 'assistant';
  content: React.ReactNode;
}

export default function AuthAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const path = router.pathname;
    const isLogin = path.startsWith('/login');
    const isSignup = path.startsWith('/signup');
    setMessages([
      {
        role: 'assistant',
        content: (
          <>
            {isLogin ? (
              <>
                Need help signing in? You can{' '}
                <Link href="/forgot-password" className="underline">
                  reset your password
                </Link>{' '}
                or{' '}
                <Link href="/signup" className="underline">
                  create an account
                </Link>
                .
              </>
            ) : isSignup ? (
              <>
                Need help creating an account? Check our{' '}
                <Link href="/faq" className="underline">
                  FAQ
                </Link>{' '}
                or{' '}
                <Link href="/login" className="underline">
                  sign in
                </Link>{' '}
                if you already have one.
              </>
            ) : (
              <>
                Need help with something on this page? You can{' '}
                <Link href="/faq" className="underline">
                  browse our FAQ
                </Link>{' '}
                or ask a question below.
              </>
            )}
          </>
        ),
      },
    ]);
  }, [router.pathname]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai/test-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();
      const answer = data?.answer || data?.error || 'Sorry, I could not find an answer.';
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!position) return;
    if (typeof window === 'undefined') return;

    function handleResize() {
      if (!panelRef.current) return;
      setPosition((prev) => {
        if (!prev) return prev;
        const panel = panelRef.current;
        const width = panel.offsetWidth;
        const height = panel.offsetHeight;
        const maxX = Math.max(0, window.innerWidth - width);
        const maxY = Math.max(0, window.innerHeight - height);
        return {
          x: Math.min(Math.max(0, prev.x), maxX),
          y: Math.min(Math.max(0, prev.y), maxY),
        };
      });
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [position]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!panelRef.current) return;
    event.preventDefault();
    const panel = panelRef.current;
    const rect = panel.getBoundingClientRect();
    offsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    pointerIdRef.current = event.pointerId;
    panel.setPointerCapture(event.pointerId);
    setIsDragging(true);
    if (!position) {
      setPosition({ x: rect.left, y: rect.top });
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging || !panelRef.current) return;
    if (typeof window === 'undefined') return;
    event.preventDefault();
    const panel = panelRef.current;
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const nextX = event.clientX - offsetRef.current.x;
    const nextY = event.clientY - offsetRef.current.y;

    const maxX = Math.max(0, viewportWidth - width);
    const maxY = Math.max(0, viewportHeight - height);

    const clampedX = Math.min(Math.max(0, nextX), maxX);
    const clampedY = Math.min(Math.max(0, nextY), maxY);

    setPosition({ x: clampedX, y: clampedY });
  }

  function endDrag() {
    if (pointerIdRef.current !== null && panelRef.current?.hasPointerCapture(pointerIdRef.current)) {
      panelRef.current.releasePointerCapture(pointerIdRef.current);
    }
    pointerIdRef.current = null;
    setIsDragging(false);
  }

  if (!open) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button aria-label="Open help assistant" onClick={() => setOpen(true)}>
          Need help?
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="fixed bottom-4 right-4 z-50 w-80 rounded-md border border-border bg-background shadow-lg flex flex-col"
      role="region"
      aria-label="Authentication assistant"
      style={
        position
          ? {
              top: position.y,
              left: position.x,
              bottom: 'auto',
              right: 'auto',
            }
          : undefined
      }
    >
      <div
        className={`flex items-center justify-between p-2 border-b border-border select-none touch-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        aria-label="Assistant drag handle"
        role="presentation"
      >
        <h2 className="text-small font-semibold">Assistant</h2>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close assistant"
          className="text-small px-2"
        >
          ✕
        </button>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-2" aria-live="polite">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-md px-2 py-1 text-small ${
              m.role === 'assistant'
                ? 'bg-card text-card-foreground'
                : 'bg-accent text-accent-foreground'
            }`}
          >
            {typeof m.content === 'string' ? (
              <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">
                {m.content}
              </ReactMarkdown>
            ) : (
              m.content
            )}
          </div>
        ))}
        {loading && <div className="text-caption text-muted-foreground">Thinking…</div>}
      </div>
      <form onSubmit={send} className="flex gap-2 p-2 border-t border-border">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question"
          aria-label="Ask a question"
          className="flex-1"
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
