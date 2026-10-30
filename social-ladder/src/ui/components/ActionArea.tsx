import { useRef, useState } from 'react';
import { decimal, fmtDuration, money } from '../../core/bignum';
import { ECONOMY } from '../../config/economy';
import { EVENT_BY_ID } from '../../data/events';
import { STAGE_BY_ID } from '../../data/stages';
import { t } from '../../i18n';
import { useEngine } from '../hooks';
import { Icon } from './Icon';

interface Floater {
  id: number;
  x: number;
  y: number;
  text: string;
  kind: 'normal' | 'crit' | 'lucky';
}

let floaterSeq = 0;

export function ActionArea({ onOpenEvent }: { onOpenEvent: () => void }) {
  const engine = useEngine();
  const s = engine.state;
  const d = engine.derived;
  const stage = STAGE_BY_ID[engine.rank.stage];
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [pressed, setPressed] = useState(false);
  const [shake, setShake] = useState(0);
  const zoneRef = useRef<HTMLDivElement>(null);

  const doClick = (clientX?: number, clientY?: number) => {
    const r = engine.click();
    const rect = zoneRef.current?.getBoundingClientRect();
    const x = rect && clientX !== undefined ? clientX - rect.left : (rect?.width ?? 200) / 2;
    const y = rect && clientY !== undefined ? clientY - rect.top : 40;
    const items: Floater[] = [{ id: ++floaterSeq, x: x + (Math.random() * 30 - 15), y, text: `+${money(r.amount.sub(r.lucky ?? 0), 1)}${r.crit ? ' ' + t('crit') : ''}`, kind: r.crit ? 'crit' : 'normal' }];
    if (r.lucky) items.push({ id: ++floaterSeq, x, y: y - 24, text: `${t('lucky')} +${money(r.lucky)}`, kind: 'lucky' });
    setFloaters((f) => [...f.slice(-24), ...items]);
    window.setTimeout(() => setFloaters((f) => f.filter((fl) => !items.includes(fl))), 1000);
    if (r.crit && !s.settings.reducedMotion) setShake((n) => n + 1);
  };

  const live = engine.liveCombo();
  const comboSteps = Math.min(Math.max(0, live - 1), d.comboMax);
  const comboActive = live > 1;
  const now = Date.now();
  const buffs = s.buffs.filter((b) => b.endsAt > now);
  const ev = s.pendingEvent ? EVENT_BY_ID[s.pendingEvent] : null;

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

      <div className="click-zone" ref={zoneRef}>
        <button
          className={`big-button ${pressed ? 'pressed' : ''} ${shake % 2 ? 'shake-a' : shake ? 'shake-b' : ''}`}
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
          <span className="big-button-face">
            <span className="big-button-verb">{stage.action}</span>
            <span className="big-button-sub">
              +{money(d.clickValue, 1)} · {stage.actionHint}
            </span>
          </span>
        </button>
        {floaters.map((f) => (
          <span key={f.id} className={`floater ${f.kind}`} style={{ left: f.x, top: f.y }}>
            {f.text}
          </span>
        ))}
      </div>

      <div className="combo" data-tip={t('comboTip')}>
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
              <button key={a.id} className={`ability ${cd > 0 ? 'cooling' : 'ready'}`} disabled={cd > 0} onClick={() => engine.useAbility(a.id)} title={a.desc}>
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
