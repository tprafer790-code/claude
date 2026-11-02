import { useRef, useState } from 'react';
import { decimal, fmtDuration, money } from '../../core/bignum';
import { ECONOMY } from '../../config/economy';
import { EVENT_BY_ID } from '../../data/events';
import { STAGE_BY_ID } from '../../data/stages';
import { t } from '../../i18n';
import { audio } from '../../audio/audio';
import { fx } from '../../fx/FxLayer';
import { FX, reducedMotion, shakeAllowed, TIER_FX, tierForStage } from '../../fx/intensity';
import { shake } from '../../fx/shake';
import { useEngine } from '../hooks';
import { celebrate } from './Celebration';
import { flyToCash } from './FxOverlay';
import { Icon } from './Icon';

/** Combo milestones: 5 small, 10 burst, 25 aura, 50 arcade spectacle, 100 celebration. */
const COMBO_MILESTONES = [5, 10, 25, 50, 100];
const RAINBOW = [FX.red, FX.orange, FX.gold, FX.green, FX.cyan, FX.electric, FX.violet, FX.pink];

export function ActionArea({ onOpenEvent }: { onOpenEvent: () => void }) {
  const engine = useEngine();
  const s = engine.state;
  const d = engine.derived;
  const stage = STAGE_BY_ID[engine.rank.stage];
  const tier = tierForStage(stage.index);
  const [pressed, setPressed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const faceRef = useRef<HTMLSpanElement>(null);
  const squash = useRef<Animation | null>(null);
  const flare = useRef<Animation | null>(null);
  const lastCritAt = useRef(0);

  const doClick = (clientX?: number, clientY?: number) => {
    const r = engine.click();
    const st = engine.state.settings;
    const reduced = reducedMotion(st);
    fx.reduced = reduced;
    const T = TIER_FX[tier];
    const btn = buttonRef.current?.getBoundingClientRect();
    const cx = btn ? btn.left + btn.width / 2 : window.innerWidth / 2;
    const cy = btn ? btn.top + btn.height / 2 : window.innerHeight / 2;
    const x = clientX ?? cx;
    const y = clientY ?? cy;
    const now = Date.now();
    // "Critical mode": a click-boosting ability (Double Shift, Power Move) is running.
    const critMode = engine.state.buffs.some((b) => b.target === 'click' && b.mult > 1 && b.endsAt > now);
    // An exceptional crit lands on top of a full combo, an active click boost or a lucky find.
    const exceptional = r.crit && (critMode || r.combo > d.comboMax || !!r.lucky);
    const base = money(r.amount.sub(r.lucky ?? 0), 1);

    if (r.crit) {
      // Back-to-back crits (critical mode) get lighter bursts so the screen stays readable.
      const rapid = performance.now() - lastCritAt.current < 180;
      lastCritAt.current = performance.now();
      const power = (exceptional ? 1.4 : 1) * (rapid ? 0.45 : 1);
      fx.burst(cx, cy, { count: Math.round(T.critParticles * power), colors: [FX.orange, FX.red, FX.gold, FX.goldLight], speed: [140, 340 * Math.max(1, power)], size: T.particleSize + 1, glow: Math.max(0.5, T.glow), stars: T.sparkle ? 0.35 : 0.1, life: 0.75, gravity: 380 });
      const ringColors = [FX.orange, FX.red, FX.gold];
      for (let i = 0; i < (rapid ? 1 : T.critRings + (exceptional ? 1 : 0)); i++) fx.ring(cx, cy, ringColors[i % 3], (btn?.width ?? 300) * 0.35 + i * 30, 0.28 + i * 0.07, 5 - i);
      fx.text(x, y - 18, `${t('crit')} +${base}`, { size: Math.round(T.critSize * (exceptional ? 1.2 : 1)), color: exceptional ? FX.red : FX.orange, shadow: FX.ink, life: 1.1, rise: 70, pop: 1.9, key: 'crit' });
      // Brief screen flash on every crit (skipped for rapid repeats, off with reduced motion).
      if (!rapid) fx.flash(exceptional ? FX.red : FX.orange, exceptional ? 0.2 : 0.11, exceptional ? 140 : 90);
      flyToCash(cx, cy, exceptional ? 8 : 5);
      if (faceRef.current && !reduced) {
        flare.current?.cancel();
        flare.current = faceRef.current.animate([{ filter: 'brightness(1.9) saturate(1.6)' }, { filter: 'brightness(1)' }], { duration: exceptional ? 220 : 160, easing: 'ease-out' });
      }
    } else {
      const colors = tier === 0 ? [FX.gold, FX.goldLight] : tier === 1 ? [FX.gold, FX.goldLight, stage.accent] : [FX.gold, FX.goldLight, stage.accent, FX.cyan, FX.violet];
      fx.burst(x, y, { count: T.clickParticles, colors, speed: [70, 190], angle: [-155, -25], size: T.particleSize, glow: T.glow, stars: T.sparkle ? 0.25 : 0, life: 0.55, gravity: 520 });
      fx.text(x + (Math.random() * 24 - 12), y - 12, `+${base}`, { size: T.floatSize, color: FX.gold, life: 0.85, rise: 55 + tier * 8 });
      // Every few clicks a coin flies to the wallet: a steady trickle, not a flood.
      if (r.combo % 3 === 1) flyToCash(x, y, 1);
    }
    if (r.lucky) {
      fx.burst(x, y, { count: 14, colors: [FX.cyan, FX.violet, FX.white], speed: [60, 160], size: T.particleSize, glow: 0.7, stars: 0.6, life: 0.9, gravity: 60 });
      fx.text(x, y - 46, `${t('lucky')} +${money(r.lucky)}`, { size: T.floatSize, color: FX.cyan, life: 1.3, rise: 50 });
    }

    // Combo milestones.
    const level = COMBO_MILESTONES.indexOf(r.combo);
    if (level >= 0) {
      const top = (btn?.top ?? cy) + 4;
      const w = btn?.width ?? 300;
      if (level === 0) {
        fx.text(cx, top - 6, t('fxComboHit', { n: r.combo }), { size: 11, color: FX.cyan, life: 0.7, rise: 24 });
      } else {
        const colors = level >= 3 ? RAINBOW : [FX.cyan, FX.electric, FX.violet, FX.white];
        fx.ring(cx, cy, FX.cyan, w * 0.4, 0.4, 4);
        fx.burst(cx, top, { count: 10 + level * 12, colors, speed: [100, 240 + level * 30], angle: [-170, -10], size: T.particleSize, glow: 0.6, stars: 0.5, life: 0.8, gravity: 260 });
        fx.text(cx, top - 6, t('fxComboHit', { n: r.combo }), { size: 12 + level * 3, color: level >= 3 ? FX.gold : FX.cyan, life: 1.1, rise: 30, pop: 1.6 });
      }
      if (level >= 3) {
        // 50 and 100: arcade-style rainbow rings, a flash and side fountains.
        RAINBOW.forEach((c, i) => fx.ring(cx, cy, c, w * 0.3 + i * 18, 0.45 + i * 0.04, 4));
        fx.flash(FX.cyan, 0.14, 160);
        fx.burst(btn?.left ?? cx, cy, { count: 30, colors: RAINBOW, speed: [150, 320], angle: [-120, -60], size: T.particleSize + 1, glow: 0.7, stars: 0.4, life: 1, gravity: 300 });
        fx.burst(btn?.right ?? cx, cy, { count: 30, colors: RAINBOW, speed: [150, 320], angle: [-120, -60], size: T.particleSize + 1, glow: 0.7, stars: 0.4, life: 1, gravity: 300 });
      }
      if (level === 4) celebrate({ kind: 'combo', kicker: t('fxComboKicker'), title: `×${r.combo}`, sub: t('fxComboLegend'), still: reduced });
      audio.comboMilestone(level);
    }

    // Viewport shake: every crit, and every click while critical mode is on.
    if (shakeAllowed(st)) {
      const play = buttonRef.current?.closest('.play') ?? null;
      if (r.crit) shake(play, exceptional ? 8 : 5, exceptional ? 100 : 75);
      else if (critMode) shake(play, 2, 60);
    }

    // Squash-and-stretch on the button; restarts instantly on rapid clicks.
    if (buttonRef.current && !reduced) {
      squash.current?.cancel();
      const k = 0.06 + tier * 0.012 + (r.crit ? 0.04 : 0);
      squash.current = buttonRef.current.animate(
        [
          { transform: 'scale(1, 1)' },
          { transform: `scale(${1 + k * 0.4}, ${1 - k})`, offset: 0.25 },
          { transform: `scale(${1 - k * 0.25}, ${1 + k * 0.45})`, offset: 0.6 },
          { transform: 'scale(1, 1)' },
        ],
        { duration: r.crit ? 220 : 170, easing: 'ease-out' },
      );
    }
  };

  const live = engine.liveCombo();
  const comboSteps = Math.min(Math.max(0, live - 1), d.comboMax);
  const comboActive = live > 1;
  const now = Date.now();
  const buffs = s.buffs.filter((b) => b.endsAt > now);
  const ev = s.pendingEvent ? EVENT_BY_ID[s.pendingEvent] : null;
  const critMode = buffs.some((b) => b.target === 'click' && b.mult > 1);

  return (
    <div className="action-area">
      <div className="status-row">
        {ev && (
          <button className="event-pill" onClick={onOpenEvent}>
            <Icon id="scroll" size={18} />
            <span>
              <b>{ev.title}</b> — {t('eventWaiting')}
            </span>
          </button>
        )}
        {buffs.map((b) => (
          <span key={b.id} className={`buff ${b.mult < 1 ? 'debuff' : ''}`} title={`${b.target === 'income' ? t('income') : t('clicks')} ×${b.mult}`}>
            {b.label} ×{b.mult} · {Math.ceil((b.endsAt - now) / 1000)}s
          </span>
        ))}
      </div>

      <div className="click-zone">
        <button
          ref={buttonRef}
          className={`big-button ${pressed ? 'pressed' : ''} ${critMode ? 'crit-mode' : ''} ${live >= 25 ? 'combo-aura' : ''} ${live >= 50 ? 'combo-50' : ''}`}
          onPointerDown={(e) => {
            setPressed(true);
            doClick(e.clientX, e.clientY);
          }}
          onPointerUp={() => setPressed(false)}
          onPointerLeave={() => setPressed(false)}
          onKeyDown={(e) => {
            if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
              e.preventDefault();
              doClick();
            }
          }}
          aria-label={stage.action}
        >
          <span className="big-button-face" ref={faceRef}>
            {critMode && <span className="crit-mode-tag">{t('fxCritMode')}</span>}
            <span className="big-button-verb">{stage.action}</span>
            <span className="big-button-sub">
              +{money(d.clickValue, 1)} · {stage.actionHint}
            </span>
          </span>
        </button>
      </div>

      <div className={`combo ${live >= 25 ? 'hot' : ''}`} data-tip={t('comboTip')}>
        <span className="combo-label">
          {t('combo')} {comboActive ? `×${decimal(1 + comboSteps * ECONOMY.click.comboStep, 2)}` : ''}
        </span>
        <div className="combo-bar">
          <div className="combo-fill" style={{ width: `${(comboSteps / d.comboMax) * 100}%` }} />
        </div>
        <span className="combo-crit">{t('critLine', { pct: (d.critChance * 100).toFixed(0), mult: ECONOMY.click.critMultiplier })}</span>
      </div>

      {engine.availableAbilities().length > 0 && (
        <div className="abilities">
          {engine.availableAbilities().map((a) => {
            const cd = engine.abilityCooldown(a.id);
            return (
              <button key={a.id} className={`ability ${cd > 0 ? 'cooling' : 'ready'}`} disabled={cd > 0} onClick={(ev) => {
                  if (!engine.useAbility(a.id) || reducedMotion(s.settings)) return;
                  ev.currentTarget.querySelector('img')?.animate([{ transform: 'scale(1) rotate(0)' }, { transform: 'scale(1.5) rotate(-20deg)' }, { transform: 'scale(0.9) rotate(10deg)' }, { transform: 'none' }], { duration: 320, easing: 'ease-out' });
                  const r = ev.currentTarget.getBoundingClientRect();
                  fx.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 16, colors: [FX.gold, FX.cyan, FX.white], speed: [80, 200], size: 3, glow: 0.5, stars: 0.5, life: 0.6, gravity: 120 });
                }} title={a.desc}>
                <Icon id={a.icon} size={20} />
                <span className="ability-name">{a.name}</span>
                <span className="ability-cd">{cd > 0 ? fmtDuration(cd) : t('ready')}</span>
                {cd > 0 && <span className="ability-shade" style={{ width: `${(cd / a.cooldown) * 100}%` }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
