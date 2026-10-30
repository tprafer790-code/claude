import { useEffect, useRef, useState } from 'react';
import { QUIPS, type QuipDef, type QuipMood } from '../../data/quips';
import { STAGE_BY_ID } from '../../data/stages';
import { STATUS_DANGER } from '../../data/social';
import { heroAnchor, onSceneSignal } from '../../render/sceneBus';
import type { GameEngine } from '../../game/engine';
import { useEngineStatic } from '../hooks';

/** Seconds without clicks before the hero starts complaining. */
const IDLE_AFTER = 12_000;
const BY_MOOD = new Map<QuipMood, QuipDef[]>();
for (const q of QUIPS) BY_MOOD.set(q.mood, [...(BY_MOOD.get(q.mood) ?? []), q]);

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Situational moods that currently apply, most urgent first. */
function situation(engine: GameEngine): QuipMood[] {
  const s = engine.state;
  const out: QuipMood[] = [];
  if (s.health < 60) out.push('hurt');
  if (s.status <= STATUS_DANGER) out.push('shady');
  if (STAGE_BY_ID[engine.rank.stage].index >= 4) out.push('rich');
  else if (s.money.lt(engine.incomeUnit().mul(20))) out.push('broke');
  return out;
}

/** Speech bubble over the hero: sarcastic remarks aimed at the player. */
export function HeroQuips() {
  const engine = useEngineStatic();
  const [quip, setQuip] = useState<{ text: string; n: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const recent = useRef<string[]>([]);
  const nextAt = useRef(Date.now() + 6000);
  const hideTimer = useRef(0);

  useEffect(() => {
    const say = (mood: QuipMood) => {
      const pool = (BY_MOOD.get(mood) ?? []).filter((q) => !recent.current.includes(q.id));
      const list = pool.length ? pool : BY_MOOD.get(mood) ?? [];
      if (!list.length) return;
      const q = list[Math.floor(Math.random() * list.length)];
      recent.current = [...recent.current, q.id].slice(-12);
      setQuip((prev) => ({ text: q.text, n: (prev?.n ?? 0) + 1 }));
      window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setQuip(null), 2600 + q.text.length * 45);
      nextAt.current = Date.now() + (mood === 'idle' ? rand(9000, 14000) : rand(20000, 35000));
    };

    const iv = window.setInterval(() => {
      if (Date.now() < nextAt.current || document.hidden) return;
      if (engine.idleMs() > IDLE_AFTER) return say('idle');
      const sit = situation(engine);
      say(sit.length && Math.random() < 0.45 ? sit[0] : 'any');
    }, 1000);

    let lastSpam = 0;
    const offEngine = engine.onEvent((e) => {
      if (e.type === 'click' && e.combo >= 40 && e.combo % 20 === 0 && Date.now() - lastSpam > 15000) {
        lastSpam = Date.now();
        say('spam');
      }
    });
    const offScene = onSceneSignal((sig) => {
      if (sig === 'poke') say('poke');
      else if (Math.random() < 0.4) say(sig === 'walkOut' ? 'wander' : 'back');
    });

    // Follow the hero as it walks around.
    let raf = 0;
    const follow = () => {
      const el = ref.current;
      if (el) {
        el.style.left = `${heroAnchor.x * 100}%`;
        el.style.top = `${heroAnchor.y * 100}%`;
      }
      raf = requestAnimationFrame(follow);
    };
    raf = requestAnimationFrame(follow);

    return () => {
      window.clearInterval(iv);
      window.clearTimeout(hideTimer.current);
      cancelAnimationFrame(raf);
      offEngine();
      offScene();
    };
  }, [engine]);

  return (
    <div ref={ref} className="hero-quip-anchor" aria-live="polite">
      {quip && heroAnchor.ready && (
        <div key={quip.n} className={`hero-quip ${heroAnchor.x > 0.6 ? 'flip' : ''}`}>{quip.text}</div>
      )}
    </div>
  );
}
