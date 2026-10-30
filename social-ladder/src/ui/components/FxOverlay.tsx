import { useEffect, useRef } from 'react';
import { ITEM_BY_ID } from '../../data/items';
import { STAGE_BY_ID } from '../../data/stages';
import { fx } from '../../fx/FxLayer';
import { FX, reducedMotion, TIER_FX, tierForStage } from '../../fx/intensity';
import { t } from '../../i18n';
import { useEngineStatic } from '../hooks';

const RAINBOW = [FX.red, FX.orange, FX.gold, FX.green, FX.cyan, FX.electric, FX.violet, FX.pink];

function centerOf(selector: string): [number, number] {
  const r = document.querySelector(selector)?.getBoundingClientRect();
  return r ? [r.left + r.width / 2, r.top + r.height / 2] : [window.innerWidth / 2, window.innerHeight / 3];
}

/**
 * Full-screen effects canvas plus the "director" that turns non-click game
 * events (purchases, promotions, discoveries, prestige) into visual feedback
 * whose size grows with the player's social class.
 */
export function FxOverlay() {
  const engine = useEngineStatic();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    fx.attach(ref.current);
    return () => fx.detach();
  }, []);

  useEffect(() => {
    let lastPointer = { x: 0, y: 0, at: 0 };
    const onPointer = (e: PointerEvent) => (lastPointer = { x: e.clientX, y: e.clientY, at: performance.now() });
    window.addEventListener('pointerdown', onPointer, { capture: true, passive: true });
    const timers = new Set<number>();
    const later = (ms: number, fn: () => void) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };

    const off = engine.onEvent((e) => {
      const stage = STAGE_BY_ID[engine.rank.stage];
      const tier = tierForStage(stage.index);
      const T = TIER_FX[tier];
      fx.reduced = reducedMotion(engine.state.settings);
      const recent = performance.now() - lastPointer.at < 600;
      switch (e.type) {
        case 'purchase': {
          const [x, y] = recent ? [lastPointer.x, lastPointer.y] : centerOf('.panels');
          const item = e.kind === 'item' ? ITEM_BY_ID[e.id] : null;
          const special = item && (item.rarity === 'legendary' || item.rarity === 'secret');
          const colors = special ? [FX.gold, FX.goldLight, FX.white] : e.kind === 'perk' ? [FX.violet, FX.cyan, FX.white] : [FX.green, '#a6ffc4', FX.gold];
          fx.burst(x, y, { count: 10 + tier * 6 + (special ? 20 : 0), colors, speed: [60, 180 + tier * 40], size: T.particleSize, glow: T.glow, stars: T.sparkle ? 0.3 : 0, life: 0.6, gravity: 300 });
          if (tier >= 1) fx.ring(x, y, special ? FX.gold : FX.green, 40 + tier * 10, 0.3, 3);
          fx.text(x, y - 14, special ? t('fxLegendary') : t('fxBought'), { size: 10 + tier, color: special ? FX.gold : FX.green, life: 0.8, rise: 34 });
          break;
        }
        case 'promotion': {
          const [x, y] = centerOf('.scene-frame');
          const accent = stage.accent;
          if (e.stageChanged) {
            fx.flash(accent, 0.45, 450);
            const shots = 3 + tier * 2;
            for (let i = 0; i < shots; i++) {
              later(i * 170, () => {
                const fxX = x + (Math.random() - 0.5) * 360;
                const fxY = y + (Math.random() - 0.6) * 140;
                fx.burst(fxX, fxY, { count: 30 + tier * 10, colors: [accent, FX.gold, FX.white, ...RAINBOW.slice(0, 2 + tier * 2)], speed: [80, 260], size: T.particleSize + 1, glow: Math.max(0.4, T.glow), stars: 0.4, life: 1.1, gravity: 160 });
                fx.ring(fxX, fxY, accent, 90 + tier * 20, 0.5, 4);
              });
            }
            fx.text(x, y - 10, stage.name.toUpperCase(), { size: 18 + tier * 2, color: FX.white, shadow: FX.ink, life: 1.8, rise: 30, pop: 1.8 });
          } else {
            fx.burst(x, y, { count: 18 + tier * 10, colors: [FX.gold, FX.goldLight, accent, FX.white], speed: [80, 240], size: T.particleSize, glow: T.glow, stars: 0.3, life: 0.9, gravity: 200 });
            fx.ring(x, y, FX.gold, 80 + tier * 15, 0.45, 4);
            if (tier >= 2) fx.flash(FX.gold, 0.12, 180);
            fx.text(x, y - 20, t('promoted'), { size: 16 + tier * 2, color: FX.gold, life: 1.3, rise: 40, pop: 1.6 });
          }
          break;
        }
        case 'secret':
        case 'combo':
        case 'opportunityCollect': {
          const [x, y] = recent ? [lastPointer.x, lastPointer.y] : centerOf('.scene-frame');
          const colors = [FX.violet, FX.cyan, FX.electric, FX.white, FX.pink];
          // Spiral of sparkles: several small bursts at rotating angles.
          for (let i = 0; i < 6; i++) {
            later(i * 60, () => fx.burst(x, y, { count: 6 + tier * 2, colors, speed: [90, 200], angle: [i * 60 - 20, i * 60 + 20], size: T.particleSize, glow: 0.7, stars: 0.6, life: 0.9, gravity: 40, drag: 2.5 }));
          }
          fx.ring(x, y, FX.cyan, 70 + tier * 15, 0.5, 3);
          fx.ring(x, y, FX.violet, 45 + tier * 10, 0.4, 2);
          if (e.type !== 'opportunityCollect') {
            fx.flash(FX.violet, 0.15, 260);
            fx.text(x, y - 24, t('fxRare'), { size: 14 + tier, color: FX.cyan, life: 1.4, rise: 40, pop: 1.5 });
          }
          break;
        }
        case 'achievement': {
          const [x, y] = centerOf('.toasts .toast:last-child');
          const count = Object.keys(engine.state.achievements).length;
          const major = count % 10 === 0;
          fx.burst(x, y, { count: (major ? 30 : 10) + tier * 6, colors: [FX.gold, FX.goldLight, FX.orange, FX.white], speed: [60, 200], size: T.particleSize, glow: T.glow, stars: 0.5, life: 0.8, gravity: 160 });
          if (major) {
            fx.ring(x, y, FX.gold, 90, 0.5, 4);
            const [cx, cy] = centerOf('.scene-frame');
            fx.text(cx, cy, t('fxMajorAchievement', { n: count }), { size: 14 + tier * 2, color: FX.gold, life: 1.8, rise: 30, pop: 1.8 });
            if (tier >= 2) fx.flash(FX.gold, 0.18, 300);
          }
          break;
        }
        case 'prestige': {
          const [x, y] = centerOf('.scene-frame');
          fx.flash(FX.white, 0.85, 1100);
          for (let i = 0; i < 5; i++) later(i * 140, () => fx.ring(x, y, RAINBOW[(i * 2) % RAINBOW.length], 200 + i * 60, 0.9, 6));
          for (let i = 0; i < 8; i++) later(200 + i * 120, () => fx.burst(x + (Math.random() - 0.5) * 400, y + (Math.random() - 0.5) * 160, { count: 40, colors: RAINBOW, speed: [100, 320], size: 4, glow: 0.8, stars: 0.5, life: 1.3, gravity: 120 }));
          fx.text(x, y, t('newLifeTitle').toUpperCase(), { size: 24, color: FX.white, life: 2.4, rise: 20, pop: 2 });
          if (!fx.reduced) document.querySelector('.app')?.animate([{ filter: 'hue-rotate(0deg) saturate(1.6)' }, { filter: 'hue-rotate(360deg) saturate(1)' }], { duration: 1600, easing: 'ease-out' });
          break;
        }
      }
    });
    return () => {
      off();
      timers.forEach((id) => window.clearTimeout(id));
      window.removeEventListener('pointerdown', onPointer, { capture: true });
    };
  }, [engine]);

  return <canvas ref={ref} className="fx-layer" aria-hidden="true" />;
}
