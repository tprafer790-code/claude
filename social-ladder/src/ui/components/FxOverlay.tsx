import { useEffect, useRef } from 'react';
import { ITEM_BY_ID } from '../../data/items';
import { STAGE_BY_ID } from '../../data/stages';
import { fx } from '../../fx/FxLayer';
import { FX, reducedMotion, TIER_FX, tierForStage } from '../../fx/intensity';
import { t } from '../../i18n';
import { useEngineStatic } from '../hooks';
import { ACHIEVEMENT_BY_ID } from '../../data/achievements';
import { COMBO_BY_ID } from '../../data/combos';
import { RANKS } from '../../data/ranks';
import { SECRET_BY_ID } from '../../data/secrets';
import { ECONOMY } from '../../config/economy';
import { resetUnlocked, trackUnlocked } from '../../fx/fresh';
import { celebrate } from './Celebration';

const RAINBOW = [FX.red, FX.orange, FX.gold, FX.green, FX.cyan, FX.electric, FX.violet, FX.pink];

/** Pops the shop card of something just bought (cards carry data-fx="kind:id"). */
function popCard(key: string) {
  const el = document.querySelector(`[data-fx="${key}"]`) as HTMLElement | null;
  el?.animate(
    [
      { transform: 'scale(1)', filter: 'brightness(1)' },
      { transform: 'scale(1.04)', filter: 'brightness(1.6) saturate(1.4)', offset: 0.35 },
      { transform: 'scale(1)', filter: 'brightness(1)' },
    ],
    { duration: 260, easing: 'ease-out' },
  );
}

/** Coins fly from a point to the money counter. */
export function flyToCash(x: number, y: number, count: number) {
  const [tx, ty] = centerOf('.cash .px-icon');
  fx.fly(x, y, tx, ty, count);
}

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
    let lastPulse = 0;
    fx.onArrive = () => {
      const now = performance.now();
      if (now - lastPulse < 90 || fx.reduced) return;
      lastPulse = now;
      document.querySelector('.cash .px-icon')?.animate([{ transform: 'scale(1) rotate(0)' }, { transform: 'scale(1.35) rotate(-15deg)' }, { transform: 'scale(1) rotate(0)' }], { duration: 160 });
    };
    return () => {
      fx.onArrive = null;
      fx.detach();
    };
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

    // Newly unlocked shop entries flash once (checked a few times per second, not every tick).
    const scan = () => {
      const s = engine.state;
      const keys = [
        ...engine.visibleBusinesses().map((b) => `business:${b.id}`),
        ...engine.availableUpgrades().map((u) => `upgrade:${u.id}`),
        ...engine.shopItems().filter((it) => it.rankReq <= s.rankIndex).map((it) => `item:${it.id}`),
      ];
      trackUnlocked(keys);
    };
    scan();
    const scanTimer = window.setInterval(scan, 400);

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
          popCard(`${e.kind}:${e.id}`);
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

          } else {
            fx.burst(x, y, { count: 18 + tier * 10, colors: [FX.gold, FX.goldLight, accent, FX.white], speed: [80, 240], size: T.particleSize, glow: T.glow, stars: 0.3, life: 0.9, gravity: 200 });
            fx.ring(x, y, FX.gold, 80 + tier * 15, 0.45, 4);
            if (tier >= 2) fx.flash(FX.gold, 0.12, 180);
            const r = RANKS[e.to];
            celebrate({ kind: 'rank', kicker: t('promoted'), title: r.name, sub: r.bonusText ?? t('rankIncome', { pct: Math.round(ECONOMY.rankIncomeBonus * 100) }), still: fx.reduced });
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
          if (e.type === 'opportunityCollect') flyToCash(x, y, 8);
          else {
            fx.flash(FX.violet, 0.15, 260);
            const name = e.type === 'secret' ? SECRET_BY_ID[e.id]?.name : COMBO_BY_ID[e.id]?.name;
            celebrate({ kind: 'rare', kicker: t(e.type === 'secret' ? 'fxSecret' : 'fxRare'), title: name ?? t('fxRare'), still: fx.reduced });
          }
          break;
        }
        case 'achievement': {
          const [x, y] = centerOf('.toasts .toast:last-child');
          const count = Object.keys(engine.state.achievements).length;
          const major = count % 10 === 0;
          fx.burst(x, y, { count: (major ? 30 : 10) + tier * 6, colors: [FX.gold, FX.goldLight, FX.orange, FX.white], speed: [60, 200], size: T.particleSize, glow: T.glow, stars: 0.5, life: 0.8, gravity: 160 });
          const [cx, cy] = centerOf('.scene-frame');
          fx.burst(cx, cy, { count: (major ? 40 : 18) + tier * 6, colors: [FX.gold, FX.goldLight, FX.orange, FX.pink, FX.cyan], speed: [100, 280], size: T.particleSize, glow: T.glow, stars: 0.4, life: 1, gravity: 240 });
          if (major) {
            fx.ring(x, y, FX.gold, 90, 0.5, 4);
            if (tier >= 2) fx.flash(FX.gold, 0.18, 300);
          }
          const a = ACHIEVEMENT_BY_ID[e.id];
          celebrate({ kind: 'achievement', kicker: major ? t('fxMajorAchievement', { n: count }) : t('fxAchievement'), title: a?.name ?? '', sub: t('rankIncome', { pct: Math.round(ECONOMY.achievementIncomeBonus * 100) }), still: fx.reduced });
          break;
        }
        case 'mission': {
          const [x, y] = centerOf('.tabs');
          flyToCash(x, y, 8);
          break;
        }
        case 'prestige': {
          resetUnlocked();
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
      window.clearInterval(scanTimer);
      window.removeEventListener('pointerdown', onPointer, { capture: true });
    };
  }, [engine]);

  return <canvas ref={ref} className="fx-layer" aria-hidden="true" />;
}
