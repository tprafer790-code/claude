import { useEffect, useState } from 'react';

export type CelebrationKind = 'rank' | 'achievement' | 'rare' | 'combo' | 'evil' | 'vote';

interface CelebrationData {
  kind: CelebrationKind;
  kicker: string;
  title: string;
  sub?: string;
  /** Static band without motion (reduced motion). */
  still?: boolean;
}

// A bigger moment is never cut short by a smaller one that arrives right after it.
const PRIORITY: Record<CelebrationKind, number> = { achievement: 1, combo: 2, rare: 3, evil: 3, vote: 4, rank: 4 };
const listeners = new Set<(c: CelebrationData) => void>();

/** Shows a short, non-blocking full-screen celebration band. */
export function celebrate(c: CelebrationData) {
  listeners.forEach((l) => l(c));
}

export function Celebration() {
  const [current, setCurrent] = useState<(CelebrationData & { id: number; at: number }) | null>(null);

  useEffect(() => {
    let seq = 0;
    let timer = 0;
    let shown: { kind: CelebrationKind; at: number } | null = null;
    const l = (c: CelebrationData) => {
      const now = performance.now();
      if (shown && now - shown.at < 700 && PRIORITY[c.kind] < PRIORITY[shown.kind]) return;
      shown = { kind: c.kind, at: now };
      setCurrent({ ...c, id: ++seq, at: now });
      window.clearTimeout(timer);
      const ms = c.kind === 'achievement' || c.kind === 'combo' ? 850 : 1100;
      timer = window.setTimeout(() => {
        shown = null;
        setCurrent(null);
      }, ms);
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
      window.clearTimeout(timer);
    };
  }, []);

  if (!current) return null;
  const short = current.kind === 'achievement' || current.kind === 'combo';
  return (
    <div key={current.id} className={`celebration ${current.kind} ${short ? 'short' : ''} ${current.still ? 'static' : ''}`} aria-live="polite">
      <div className="celebration-tint" />
      <div className="celebration-band">
        <div className="celebration-kicker">{current.kicker}</div>
        <div className="celebration-title">{current.title}</div>
        {current.sub && <div className="celebration-sub">{current.sub}</div>}
      </div>
    </div>
  );
}
