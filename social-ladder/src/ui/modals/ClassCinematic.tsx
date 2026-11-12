import { useEffect, useMemo, useRef, useState } from 'react';
import { STAGES } from '../../data/stages';
import { buildLayeredStage, type LayeredStage } from '../../render/stageLayers';
import { drawLayeredWorld } from '../../render/layerDraw';
import { applyEquipment, buildHeroSheet, HERO_H, HERO_W, HERO_WALK, STAGE_LOOKS } from '../../render/hero';
import { GROUND_Y, WORLD_H, WORLD_W } from '../../render/environments';
import { audio } from '../../audio/audio';
import { t } from '../../i18n';
import { useEngine } from '../hooks';

/** Total length and the moment the new neighbourhood appears, in seconds. */
const DUR = 7.6;
const SWITCH = 3.1;
const WIPE = 0.45;
const HERO_X = 84;

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

interface Confetti { x: number; y: number; vx: number; vy: number; c: string; s: number }

/**
 * Full-screen cutscene played when the hero reaches a new social class: the
 * hero walks out of the old neighbourhood, a wipe in the new class's colour,
 * then the new neighbourhood is revealed with a chapter title card.
 * Drawn on a 240×135 canvas from the same layered art as the street.
 */
export function ClassCinematic({ fromStage, toStage, onDone }: { fromStage: number; toStage: number; onDone: () => void }) {
  const engine = useEngine();
  const ref = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'leave' | 'arrive' | 'out'>('leave');
  const done = useRef(false);
  const from = STAGES[fromStage];
  const to = STAGES[toStage];

  const art = useMemo(() => {
    const sheet = (i: number) => buildHeroSheet(applyEquipment(STAGE_LOOKS[i], engine.state.equipped));
    return {
      old: buildLayeredStage(fromStage)!,
      neu: buildLayeredStage(toStage)!,
      heroOld: sheet(fromStage),
      heroNew: sheet(toStage),
    };
  }, [fromStage, toStage, engine]);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  useEffect(() => {
    const out = ref.current!;
    const octx = out.getContext('2d')!;
    octx.imageSmoothingEnabled = false;
    const buf = document.createElement('canvas');
    buf.width = WORLD_W;
    buf.height = WORLD_H;
    const ctx = buf.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const confetti: Confetti[] = [];
    const colors = [to.accent, '#ffe44d', '#ffffff', '#ff7aa8', '#3fcfbd'];
    const cues = { whoosh: false, arrive: false, fanfare: false, confetti: false, out: false };
    const t0 = performance.now();
    let raf = 0;

    const world = (st: LayeredStage, camX: number) => drawLayeredWorld(ctx, st, camX);

    const hero = (sheet: HTMLCanvasElement, x: number, frame: number, bob: number) => {
      ctx.drawImage(sheet, frame * HERO_W, 0, HERO_W, HERO_H + 4, Math.round(x - HERO_W / 2), GROUND_Y + 1 - (HERO_H + 4) - bob, HERO_W, HERO_H + 4);
    };

    const shadow = (x: number) => {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(Math.round(x - 7), GROUND_Y, 14, 2);
    };

    const frame = (now: number) => {
      const s = (now - t0) / 1000;
      let heroScreenX = HERO_X;
      let zoom = 1;
      if (s < SWITCH) {
        // Leaving: the camera drifts right while the hero walks out of frame.
        const p = clamp01(s / SWITCH);
        const camX = ease(p) * 60;
        const hx = HERO_X + Math.max(0, s - 0.5) * 34;
        world(art.old, camX);
        heroScreenX = hx - camX;
        const step = Math.floor(s / 0.11) % 4;
        shadow(heroScreenX);
        hero(art.heroOld, heroScreenX, s < 0.5 ? 0 : HERO_WALK + step, 0);
        zoom = 1.28 - p * 0.18;
      } else {
        // Arriving: the camera pans in from the left and pushes in on the hero.
        const a = s - SWITCH;
        const camX = -70 * (1 - ease(clamp01(a / 1.7)));
        world(art.neu, camX);
        heroScreenX = HERO_X - camX;
        const cheering = a > 1.1;
        shadow(heroScreenX);
        hero(art.heroNew, heroScreenX, cheering ? 4 + (Math.floor(a / 0.18) % 2) : 0, cheering && Math.floor(a / 0.18) % 2 ? 2 : 0);
        zoom = 1 + ease(clamp01((a - 0.4) / (DUR - SWITCH))) * 0.32;
        if (a > 1.1 && !cues.confetti) {
          cues.confetti = true;
          for (let i = 0; i < 90; i++) confetti.push({ x: heroScreenX + (Math.random() - 0.5) * 30, y: GROUND_Y - 30, vx: (Math.random() - 0.5) * 90, vy: -60 - Math.random() * 90, c: colors[i % colors.length], s: Math.random() < 0.3 ? 2 : 1 });
        }
      }
      // confetti in screen space of the world buffer
      for (const c of confetti) {
        c.vy += 120 / 60;
        c.x += c.vx / 60;
        c.y += c.vy / 60;
        c.vx *= 0.99;
        ctx.fillStyle = c.c;
        ctx.fillRect(Math.round(c.x), Math.round(c.y), c.s, c.s);
      }

      // Camera: crop around the hero and scale up (pixel-exact).
      const w = WORLD_W / zoom;
      const h = WORLD_H / zoom;
      const cx = Math.min(WORLD_W - w / 2, Math.max(w / 2, heroScreenX));
      const cy = Math.min(WORLD_H - h / 2, Math.max(h / 2, GROUND_Y - 30));
      octx.clearRect(0, 0, WORLD_W, WORLD_H);
      octx.drawImage(buf, cx - w / 2, cy - h / 2, w, h, 0, 0, WORLD_W, WORLD_H);

      // Diagonal wipe in the new class's colour.
      const wp = (s - (SWITCH - WIPE)) / (WIPE * 2);
      if (wp > 0 && wp < 1) {
        const covering = wp < 0.5;
        const edge = (covering ? wp * 2 : (wp - 0.5) * 2) * (WORLD_W + 60) - 30;
        octx.fillStyle = to.accent;
        octx.beginPath();
        if (covering) {
          octx.moveTo(-40, 0);
          octx.lineTo(edge + 30, 0);
          octx.lineTo(edge - 30, WORLD_H);
          octx.lineTo(-40, WORLD_H);
        } else {
          octx.moveTo(edge + 30, 0);
          octx.lineTo(WORLD_W + 40, 0);
          octx.lineTo(WORLD_W + 40, WORLD_H);
          octx.lineTo(edge - 30, WORLD_H);
        }
        octx.fill();
      }

      if (!cues.whoosh && s > SWITCH - WIPE) {
        cues.whoosh = true;
        audio.whoosh();
      }
      if (!cues.arrive && s > SWITCH) {
        cues.arrive = true;
        setPhase('arrive');
      }
      if (!cues.fanfare && s > SWITCH + 1.0) {
        cues.fanfare = true;
        audio.promotion(true);
      }
      if (!cues.out && s > DUR - 0.6) {
        cues.out = true;
        setPhase('out');
      }
      if (s >= DUR) return finish();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [art]);

  const name = to.name.toUpperCase();
  return (
    <div className={`cine cine-${phase}`} style={{ ['--accent' as string]: to.accent }} role="dialog" aria-label={`${t('newClass')}: ${to.name}`}>
      <canvas ref={ref} width={WORLD_W} height={WORLD_H} className="cine-canvas" />
      <div className="cine-grain" />
      <div className="cine-bar top" />
      <div className="cine-bar bottom" />
      {phase === 'leave' && <div className="cine-caption">{t('leavingBehind', { stage: from.name })}</div>}
      {phase !== 'leave' && (
        <div className="cine-title">
          <small>{t('chapter', { n: toStage + 1 })} · {t('newClass')}</small>
          <h1 aria-label={name}>
            {name.split(' ').map((word, w, words) => {
              const offset = words.slice(0, w).join(' ').length + (w ? 1 : 0);
              return (
                <span className="cine-word" key={w}>
                  {[...word].map((ch, i) => (
                    <span className="cine-letter" key={i} style={{ animationDelay: `${0.9 + (offset + i) * 0.045}s` }}>{ch}</span>
                  ))}
                </span>
              );
            })}
          </h1>
          <p>“{to.tagline}”</p>
        </div>
      )}
      <button className="cine-skip" onClick={finish}>{t('skipCinematic')} ▸▸</button>
    </div>
  );
}
