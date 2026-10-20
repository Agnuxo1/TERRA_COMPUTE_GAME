import { useEffect, useState } from 'react';

const WINDOW_MS = 2000;

/**
 * Frames per second measured with requestAnimationFrame over a rolling 2 s window.
 * The value is published at most once a second and only when it changes, so the
 * measurement itself never causes per-frame re-renders. Returns null while there is
 * not enough data (for example while the tab is hidden and no frames are produced).
 */
export function useFps(): number | null {
  const [fps, setFps] = useState<number | null>(null);

  useEffect(() => {
    const stamps: number[] = [];
    let raf = 0;
    const frame = (now: number) => {
      stamps.push(now);
      while (stamps.length && stamps[0] < now - WINDOW_MS) stamps.shift();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const publish = () => {
      const cutoff = performance.now() - WINDOW_MS;
      while (stamps.length && stamps[0] < cutoff) stamps.shift();
      let next: number | null = null;
      if (stamps.length >= 3) {
        const span = (stamps[stamps.length - 1] - stamps[0]) / 1000;
        if (span > 0) next = Math.round((stamps.length - 1) / span);
      }
      setFps(prev => (prev === next ? prev : next));
    };
    const timer = window.setInterval(publish, 1000);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
    };
  }, []);

  return fps;
}
