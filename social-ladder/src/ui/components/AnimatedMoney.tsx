import { useEffect, useLayoutEffect, useRef } from 'react';
import { Decimal, money } from '../../core/bignum';

/**
 * Money counter that rolls towards its new value instead of jumping. Writes
 * the text directly each animation frame so React does not re-render 60×/s.
 * Gains bump the counter (bigger at higher tiers), spending flashes it green.
 */
export function AnimatedMoney({ value, bump, reduced, className }: { value: Decimal; bump: number; reduced: boolean; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef<Decimal>(value);
  const from = useRef<Decimal>(value);
  const target = useRef<Decimal>(value);
  const startedAt = useRef(0);
  const raf = useRef(0);
  const anim = useRef<Animation | null>(null);

  // The text is owned by this component, not by React, so React never fights the animation.
  useLayoutEffect(() => {
    if (ref.current) ref.current.textContent = money(shown.current);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || value.eq(target.current)) return;
    const gained = value.gt(target.current);
    const big = gained && value.sub(target.current).gt(target.current.mul(0.02));
    from.current = shown.current;
    target.current = value;
    if (reduced) {
      shown.current = value;
      el.textContent = money(value);
      return;
    }
    if (big || !gained) {
      anim.current?.cancel();
      anim.current = el.animate(
        gained
          ? [{ transform: 'scale(1)' }, { transform: `scale(${bump})`, offset: 0.3 }, { transform: 'scale(1)' }]
          : [{ color: '#3dff7a', transform: 'scale(0.94)' }, { transform: 'scale(1)' }],
        { duration: gained ? 220 : 320, easing: 'ease-out' },
      );
    }
    startedAt.current = performance.now();
    const dur = 280;
    const step = (now: number) => {
      // rAF timestamps can be slightly older than performance.now(); clamp so the counter never overshoots backwards.
      const k = Math.min(1, Math.max(0, (now - startedAt.current) / dur));
      const e = 1 - (1 - k) * (1 - k);
      shown.current = k >= 1 ? target.current : from.current.add(target.current.sub(from.current).mul(e));
      el.textContent = money(shown.current);
      raf.current = k < 1 ? requestAnimationFrame(step) : 0;
    };
    if (!raf.current) raf.current = requestAnimationFrame(step);
  }, [value, bump, reduced]);

  return <span ref={ref} className={className} />;
}
