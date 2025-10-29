'use client';

import React from 'react';
import clsx from 'clsx';

import Loader from '@/components/common/Loader';
import { Alert } from '@/components/design-system/Alert';
import { Button } from '@/components/design-system/Button';
import { Card } from '@/components/design-system/Card';
import { Textarea } from '@/components/design-system/Textarea';
import { track } from '@/lib/analytics/track';
import type { CoachSessionSnapshot } from '@/lib/writing/coach';
import { consumeSSE } from '@/utils/sse';

type CoachMessage = { id: string; role: 'user' | 'assistant'; content: string };

type DockStatus = 'idle' | 'loading' | 'streaming' | 'error';

type CoachDockState = {
  status: DockStatus;
  session: CoachSessionSnapshot | null;
  messages: CoachMessage[];
  error: string | null;
  streamingId: string | null;
};

type Action =
  | { type: 'RESET' }
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; session: CoachSessionSnapshot; seedMessages: CoachMessage[] }
  | { type: 'FETCH_ERROR'; error: string }
  | { type: 'START_STREAM'; assistantId: string; userMessage: CoachMessage; assistantMessage: CoachMessage }
  | { type: 'APPEND_DELTA'; assistantId: string; delta: string }
  | { type: 'STREAM_DONE' }
  | { type: 'STREAM_ERROR'; assistantId?: string; error: string }
  | { type: 'CLEAR_ERROR' };

type CoachDockContextValue = {
  state: CoachDockState;
  draft: string;
  setDraft: React.Dispatch<React.SetStateAction<string>>;
  send: (input: string) => Promise<void>;
  retry: () => void;
};

const CoachDockContext = React.createContext<CoachDockContextValue | undefined>(undefined);

const initialState: CoachDockState = {
  status: 'idle',
  session: null,
  messages: [],
  error: null,
  streamingId: null,
};

function reducer(state: CoachDockState, action: Action): CoachDockState {
  switch (action.type) {
    case 'RESET':
      return initialState;
    case 'FETCH_START':
      return { ...initialState, status: 'loading' };
    case 'FETCH_SUCCESS':
      return {
        status: 'idle',
        session: action.session,
        messages: action.seedMessages,
        error: null,
        streamingId: null,
      };
    case 'FETCH_ERROR':
      return { ...initialState, status: 'error', error: action.error };
    case 'START_STREAM':
      return {
        ...state,
        status: 'streaming',
        streamingId: action.assistantId,
        error: null,
        messages: [...state.messages, action.userMessage, action.assistantMessage],
      };
    case 'APPEND_DELTA':
      return {
        ...state,
        messages: state.messages.map((message) =>
          message.id === action.assistantId
            ? { ...message, content: message.content + action.delta }
            : message,
        ),
      };
    case 'STREAM_DONE':
      return { ...state, status: state.error ? 'error' : 'idle', streamingId: null };
    case 'STREAM_ERROR': {
      const nextMessages = action.assistantId
        ? state.messages.map((message) => {
            if (message.id !== action.assistantId) return message;
            const note = message.content ? `${message.content}\n\n⚠️ ${action.error}` : `⚠️ ${action.error}`;
            return { ...message, content: note };
          })
        : state.messages;
      return {
        ...state,
        status: 'error',
        streamingId: null,
        error: action.error,
        messages: nextMessages,
      };
    }
    case 'CLEAR_ERROR':
      return { ...state, status: 'idle', error: null };
    default:
      return state;
  }
}

function useCoachDockInternal() {
  const ctx = React.useContext(CoachDockContext);
  if (!ctx) throw new Error('useCoachDock must be used within CoachDock');
  return ctx;
}

function buildIntroMessages(session: CoachSessionSnapshot): CoachMessage[] {
  const focus = session.highlight ?? session.tasks[0];
  if (!focus) return [];
  const improvements = focus.score.feedback.improvements?.filter(Boolean).slice(0, 3) ?? [];
  const lines = improvements.length
    ? improvements.map((item) => `• ${item}`).join('\n')
    : '• Ask about structure, lexical range, or ideas you want to improve.';
  const intro =
    `Hi! I reviewed your ${focus.task.toUpperCase()} (band ${focus.score.overallBand.toFixed(1)}). ` +
    `Your latest attempt averaged ${session.averageBand.toFixed(1)}.\n\n` +
    `Focus next on:\n${lines}\n\nLet me know which paragraph or sentence to workshop.`;
  return [{ id: `intro-${focus.task}`, role: 'assistant', content: intro }];
}

type Props = {
  attemptId: string;
  className?: string;
};

type SessionResponse =
  | { ok: true; session: CoachSessionSnapshot }
  | { ok: false; error: string; code: string };

export function CoachDock({ attemptId, className }: Props) {
  const [state, dispatch] = React.useReducer(reducer, initialState);
  const [draft, setDraft] = React.useState('');
  const loadControllerRef = React.useRef<AbortController | null>(null);
  const streamControllerRef = React.useRef<AbortController | null>(null);
  const viewTracked = React.useRef(false);

  const fetchSession = React.useCallback(async () => {
    loadControllerRef.current?.abort();
    const controller = new AbortController();
    loadControllerRef.current = controller;

    dispatch({ type: 'FETCH_START' });

    try {
      const res = await fetch(`/api/coach/writing/session?attemptId=${encodeURIComponent(attemptId)}`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to load coach session.');
      }
      const json = (await res.json()) as SessionResponse;
      if (!json.ok) {
        throw new Error(json.error || 'Writing coach unavailable right now.');
      }
      dispatch({ type: 'FETCH_SUCCESS', session: json.session, seedMessages: buildIntroMessages(json.session) });
    } catch (error: any) {
      if (controller.signal.aborted) return;
      dispatch({
        type: 'FETCH_ERROR',
        error: error?.message || 'Could not load the writing coach for this attempt.',
      });
    }
  }, [attemptId]);

  React.useEffect(() => {
    viewTracked.current = false;
    dispatch({ type: 'RESET' });
    fetchSession();
    return () => {
      loadControllerRef.current?.abort();
      streamControllerRef.current?.abort();
    };
  }, [fetchSession]);

  React.useEffect(() => {
    if (state.session && !viewTracked.current) {
      track('writing.coach.view', {
        attemptId: state.session.attemptId,
        tasks: state.session.tasks.length,
        averageBand: state.session.averageBand,
      });
      viewTracked.current = true;
    }
  }, [state.session]);

  const send = React.useCallback(
    async (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return;
      if (!state.session) {
        throw new Error('Session not ready yet.');
      }
      if (state.status === 'loading' || state.status === 'streaming') {
        throw new Error('Coach is busy. Please wait for the current response.');
      }

      const userMessage: CoachMessage = { id: crypto.randomUUID(), role: 'user', content: trimmed };
      const assistantId = crypto.randomUUID();
      const assistantMessage: CoachMessage = { id: assistantId, role: 'assistant', content: '' };

      const payloadHistory = [...state.messages, userMessage]
        .slice(-12)
        .map((message) => ({ role: message.role, content: message.content }));

      dispatch({ type: 'START_STREAM', assistantId, userMessage, assistantMessage });
      track('writing.coach.ask', { attemptId: state.session.attemptId });

      const controller = new AbortController();
      streamControllerRef.current = controller;

      try {
        const response = await fetch('/api/coach/writing/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attemptId, messages: payloadHistory }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `Request failed (${response.status})`);
        }

        let streamError: string | null = null;

        await consumeSSE(response, (event) => {
          if (streamError) return;
          if (event.data === '[DONE]') {
            return;
          }

          try {
            const payload = JSON.parse(event.data) as { delta?: string; error?: string };
            if (payload.error) {
              streamError = payload.error;
              return;
            }
            if (payload.delta) {
              dispatch({ type: 'APPEND_DELTA', assistantId, delta: payload.delta });
            }
          } catch (err: any) {
            streamError = err?.message || 'Stream parse error';
          }
        });

        if (streamError) {
          throw new Error(streamError);
        }

        dispatch({ type: 'STREAM_DONE' });
        track('writing.coach.reply', { attemptId: state.session.attemptId });
      } catch (error: any) {
        if (controller.signal.aborted) return;
        const message = error?.message || 'Unable to fetch a coach reply right now.';
        dispatch({ type: 'STREAM_ERROR', assistantId, error: message });
        track('writing.coach.error', { attemptId: state.session.attemptId, reason: message });
      } finally {
        streamControllerRef.current = null;
      }
    },
    [attemptId, state.session, state.messages, state.status],
  );

  const retry = React.useCallback(() => {
    if (!state.session) {
      fetchSession();
    } else {
      dispatch({ type: 'CLEAR_ERROR' });
    }
  }, [fetchSession, state.session]);

  const contextValue = React.useMemo<CoachDockContextValue>(
    () => ({ state, draft, setDraft, send, retry }),
    [state, draft, send, retry],
  );

  return (
    <CoachDockContext.Provider value={contextValue}>
      <Card className={clsx('flex h-full flex-col gap-5 p-5', className)}>
        <CoachHeader />
        <CoachSummary />
        <CoachConversation />
        <CoachComposer />
      </Card>
    </CoachDockContext.Provider>
  );
}

function CoachHeader() {
  const {
    state: { session, status },
  } = useCoachDockInternal();

  const submitted = React.useMemo(() => {
    if (!session?.submittedAt) return null;
    try {
      return new Date(session.submittedAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return session.submittedAt;
    }
  }, [session?.submittedAt]);

  return (
    <header className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Writing Coach</h2>
        {session ? (
          <span className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            Avg band {session.averageBand.toFixed(1)}
          </span>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">
        {session
          ? `Latest mock submitted ${submitted ? `on ${submitted}` : 'recently'}.`
          : status === 'loading'
          ? 'Loading your attempt insights…'
          : 'Connect to the AI coach for tailored writing drills.'}
      </p>
    </header>
  );
}

function CoachSummary() {
  const {
    state: { session },
  } = useCoachDockInternal();

  if (!session) return null;
  const focus = session.highlight ?? session.tasks[0];
  if (!focus) return null;

  const improvements = focus.score.feedback.improvements?.filter(Boolean).slice(0, 3) ?? [];
  const strengths = focus.score.feedback.strengths?.filter(Boolean).slice(0, 2) ?? [];

  return (
    <section className="rounded-ds-xl border border-border/60 bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Latest AI notes</h3>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Focus: Task {focus.task === 'task1' ? '1' : '2'}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Band {focus.score.overallBand.toFixed(1)} · Average {session.averageBand.toFixed(1)}
      </p>
      {strengths.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {strengths.map((item) => (
            <span
              key={`strength-${item}`}
              className="rounded-full bg-success/15 px-2 py-1 text-xs font-medium text-success"
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground">
        {improvements.length ? (
          improvements.map((item) => <li key={`improve-${item}`}>{item}</li>)
        ) : (
          <li>Ask for help polishing paragraph flow or boosting lexical range.</li>
        )}
      </ul>
    </section>
  );
}

function CoachConversation() {
  const {
    state: { session, status, messages, streamingId, error },
    retry,
  } = useCoachDockInternal();

  if (!session) {
    if (status === 'loading') {
      return (
        <div className="flex flex-1 items-center justify-center rounded-ds-xl border border-dashed border-border/60 p-6">
          <Loader label="Loading coach session…" />
        </div>
      );
    }
    if (status === 'error') {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-ds-xl border border-dashed border-border/60 p-6 text-center">
          <Alert variant="error" appearance="soft" className="w-full text-left">
            We couldn’t load the writing coach for this attempt. Try refreshing the dock.
          </Alert>
          <Button onClick={retry} variant="secondary">
            Retry loading
          </Button>
        </div>
      );
    }
  }

  return (
    <section className="flex min-h-[220px] flex-1 flex-col gap-3">
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="rounded-ds-xl border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
            Ask a question about planning, paragraph structure, or vocabulary to get tailored drills.
          </p>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isStreaming={status === 'streaming' && streamingId === message.id}
            />
          ))
        )}
      </div>
      {status === 'error' && session && error ? (
        <Alert variant="warning" appearance="soft">
          {error}
        </Alert>
      ) : null}
    </section>
  );
}

function MessageBubble({
  message,
  isStreaming,
}: {
  message: CoachMessage;
  isStreaming: boolean;
}) {
  const isAssistant = message.role === 'assistant';
  return (
    <div className={clsx('flex', isAssistant ? 'justify-start' : 'justify-end')}>
      <div
        className={clsx(
          'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
          isAssistant
            ? 'bg-card text-foreground ring-1 ring-border/50'
            : 'bg-primary text-primary-foreground',
        )}
      >
        {message.content ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-border border-t-transparent" />
            Drafting…
          </span>
        )}
        {isStreaming && message.content && (
          <span className="ml-2 inline-block align-middle text-xs text-muted-foreground">⏳</span>
        )}
      </div>
    </div>
  );
}

function CoachComposer() {
  const {
    state,
    draft,
    setDraft,
    send,
    retry,
  } = useCoachDockInternal();
  const [submitting, setSubmitting] = React.useState(false);

  const disabled =
    !state.session || state.status === 'loading' || state.status === 'streaming' || submitting;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) return;
    const text = draft.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      setDraft('');
      await send(text);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        placeholder={
          state.session
            ? 'Ask for a rewrite, paragraph plan, or vocabulary drills.'
            : 'Loading attempt context…'
        }
        value={draft}
        onChange={(event) => {
          if (state.status === 'error') {
            retry();
          }
          setDraft(event.target.value);
        }}
        disabled={!state.session || state.status === 'loading'}
        rows={3}
        variant="subtle"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {state.status === 'streaming'
            ? 'Coach is drafting a reply…'
            : 'Powered by GramorX guardrailed AI. Keep chats on IELTS prep.'}
        </span>
        <Button type="submit" disabled={disabled} loading={state.status === 'streaming' || submitting}>
          Send to coach
        </Button>
      </div>
    </form>
  );
}

export function useCoachDock() {
  return useCoachDockInternal();
}

export default CoachDock;

