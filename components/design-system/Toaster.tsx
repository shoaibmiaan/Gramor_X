"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// ===================
// TYPES
// ===================
export type ToastIntent =
  | "default"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "destructive";

export type ToastOptions = {
  title?: string;
  description?: string;
  intent?: ToastIntent;
  duration?: number;
};

export type ToastInput = {
  title: string;
  description?: string;
  intent?: ToastIntent;
  duration?: number;
};

type ToastItem = ToastInput & { id: string };
type ToastDetail = string | { description?: string; duration?: number };

const DEFAULT_DURATION = 3500;

// ===================
// UTIL
// ===================
const randomId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const normalizeDetail = (title: string, detail?: ToastDetail): ToastInput => {
  if (!detail) return { title };
  if (typeof detail === "string") return { title, description: detail };
  return { title, description: detail.description, duration: detail.duration };
};

// ===================
// API TYPE
// ===================
type ToastApi = {
  // FULL ShadCN-style call
  (opts: ToastOptions): void;

  // DS legacy API
  push: (input: ToastInput) => void;
  success: (title: string, detail?: ToastDetail) => void;
  error: (title: string, detail?: ToastDetail) => void;
  warn: (title: string, detail?: ToastDetail) => void;
  info: (title: string, detail?: ToastDetail) => void;
};

const logMissing = (input: ToastInput | ToastOptions) =>
  console.warn("[toast] Missing <ToastProvider>", input);

// ===================
// API CREATOR
// ===================
const createApi = (dispatch: (input: ToastInput) => void): ToastApi => {
  const api = ((opts: ToastOptions) => {
    const mapped: ToastInput = {
      title: opts.title ?? "",
      description: opts.description ?? "",
      intent: opts.intent ?? "default",
      duration: opts.duration,
    };
    dispatch(mapped);
  }) as ToastApi;

  // DS functions
  api.push = (input) => dispatch(input);

  api.success = (title, detail) =>
    dispatch({ ...normalizeDetail(title, detail), intent: "success" });

  api.error = (title, detail) =>
    dispatch({ ...normalizeDetail(title, detail), intent: "error" });

  api.warn = (title, detail) =>
    dispatch({ ...normalizeDetail(title, detail), intent: "warning" });

  api.info = (title, detail) =>
    dispatch({ ...normalizeDetail(title, detail), intent: "info" });

  return api;
};

const fallbackApi = createApi(logMissing);
let activeApi: ToastApi = fallbackApi;

// ===================
// CONTEXT
// ===================
const ToastCtx = createContext<ToastApi>(fallbackApi);

// ===================
// PROVIDER
// ===================
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = randomId();
      const duration =
        typeof input.duration === "number"
          ? input.duration
          : DEFAULT_DURATION;

      setToasts((list) => [...list, { ...input, id }]);

      if (duration > 0) {
        setTimeout(() => remove(id), duration);
      }
    },
    [remove]
  );

  const api = useMemo(() => createApi(push), [push]);

  useEffect(() => {
    activeApi = api;
    return () => {
      activeApi = fallbackApi;
    };
  }, [api]);

  return (
    <ToastCtx.Provider value={api}>
      {children}

      {/* Toast Renderer */}
      <div className="fixed z-[2000] bottom-5 right-5 flex flex-col gap-2 w-[min(90vw,360px)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              rounded-xl px-4 py-3 shadow-lg border
              animate-in fade-in slide-in-from-bottom-4 duration-200
              ${
                t.intent === "success"
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                  : t.intent === "error" || t.intent === "destructive"
                  ? "bg-red-500/10 border-red-500 text-red-400"
                  : t.intent === "warning"
                  ? "bg-yellow-500/10 border-yellow-500 text-yellow-400"
                  : t.intent === "info"
                  ? "bg-sky-500/10 border-sky-500 text-sky-400"
                  : "bg-neutral-800/80 border-neutral-700 text-neutral-200"
              }
            `}
          >
            <div className="font-semibold">{t.title}</div>
            {t.description && (
              <div className="text-sm opacity-90 mt-0.5">{t.description}</div>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ===================
// EXPORTS
// ===================
export function Toaster({ children }: { children?: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

export function useToast() {
  return useContext(ToastCtx);
}
