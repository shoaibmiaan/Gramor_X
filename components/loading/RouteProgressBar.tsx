import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

const ROUTE_LOADER_DELAY_MS = 300;
const COMPLETE_HIDE_DELAY_MS = 220;

export default function RouteProgressBar() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const activeRef = useRef(false);
  const startAtRef = useRef<number | null>(null);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const clearTimers = () => {
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
      if (completeTimerRef.current) {
        clearTimeout(completeTimerRef.current);
        completeTimerRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const tick = () => {
      setProgress((current) => {
        if (!activeRef.current) return current;
        if (current >= 90) return current;
        const next = current + (90 - current) * 0.08;
        return Math.min(90, next);
      });
      rafRef.current = window.requestAnimationFrame(tick);
    };

    const start = () => {
      clearTimers();
      activeRef.current = true;
      startAtRef.current = Date.now();

      delayTimerRef.current = setTimeout(() => {
        if (!activeRef.current) return;
        setProgress(6);
        setVisible(true);
        rafRef.current = window.requestAnimationFrame(tick);
      }, ROUTE_LOADER_DELAY_MS);
    };

    const done = () => {
      activeRef.current = false;
      const elapsed = startAtRef.current ? Date.now() - startAtRef.current : 0;

      if (elapsed < ROUTE_LOADER_DELAY_MS) {
        clearTimers();
        setVisible(false);
        setProgress(0);
        return;
      }

      clearTimers();
      setVisible(true);
      setProgress(100);

      completeTimerRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, COMPLETE_HIDE_DELAY_MS);
    };

    router.events.on('routeChangeStart', start);
    router.events.on('routeChangeComplete', done);
    router.events.on('routeChangeError', done);

    return () => {
      clearTimers();
      router.events.off('routeChangeStart', start);
      router.events.off('routeChangeComplete', done);
      router.events.off('routeChangeError', done);
    };
  }, [router.events]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[2px] overflow-hidden"
    >
      <div
        className="h-full origin-left bg-gradient-to-r from-violet-400/95 via-cyan-300/95 to-emerald-300/95 shadow-[0_0_12px_rgba(120,185,255,0.45)] transition-[transform,opacity] duration-300 ease-out will-change-transform"
        style={{
          opacity: visible ? 1 : 0,
          transform: `scaleX(${Math.max(0, Math.min(progress / 100, 1))})`,
        }}
      />
    </div>
  );
}
