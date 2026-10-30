import { useState } from 'react';
import { Decimal, money } from '../../core/bignum';
import { ECONOMY } from '../../config/economy';
import { PERKS } from '../../data/perks';
import { RANKS } from '../../data/ranks';
import { t } from '../../i18n';
import { Icon } from '../components/Icon';
import { useEngine } from '../hooks';

export function LegacyPanel() {
  const engine = useEngine();
  const s = engine.state;
  const [confirming, setConfirming] = useState(false);
  const gain = engine.prestigeGain();
  const unlocked = s.rankIndex >= ECONOMY.prestige.minRankIndex || s.prestige.count > 0;
  const nextRep = s.prestige.reputation + Math.max(1, gain) ;
  const nextAt = new Decimal(ECONOMY.prestige.divisor).mul(Math.pow(nextRep, 3));

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>{t('prestigeTitle')}</h2>
      </div>
      <div className="legacy-stats">
        <div>
          <Icon id="crown" size={26} />
          <span>{t('reputation')}</span>
          <b>{s.prestige.reputation.toLocaleString('en-US')}</b>
          <small>+{Math.round(s.prestige.reputation * ECONOMY.prestige.reputationBonus * 100)}% income & clicks</small>
        </div>
        <div>
          <Icon id="gem" size={26} />
          <span>{t('legacy')}</span>
          <b>{s.prestige.legacy.toLocaleString('en-US')}</b>
          <small>
            {t('prestiges')}: {s.prestige.count}
          </small>
        </div>
      </div>

      <div className="prestige-box">
        <p>{t('prestigeDesc')}</p>
        {!unlocked && <p className="warn">{t('prestigeLocked')} ({RANKS[ECONOMY.prestige.minRankIndex].name})</p>}
        {unlocked && (gain > 0 ? <p className="good">{t('prestigeGain', { n: gain })}</p> : <p className="muted">{t('prestigeNoGain', { next: money(nextAt) })}</p>)}
        <div className="keep-lose">
          <div>
            <b>{t('keep')}</b>
            <p>{t('keepList')}</p>
          </div>
          <div>
            <b>{t('lose')}</b>
            <p>{t('loseList')}</p>
          </div>
        </div>
        {!confirming ? (
          <button className="btn danger" disabled={!engine.canPrestige()} onClick={() => setConfirming(true)}>
            {t('reinvent')}
          </button>
        ) : (
          <div className="confirm">
            <p className="warn">{t('confirmPrestige')}</p>
            <button className="btn danger" onClick={() => { engine.prestige(); setConfirming(false); }}>
              {t('reinvent')} (+{gain})
            </button>
            <button className="btn" onClick={() => setConfirming(false)}>{t('close')}</button>
          </div>
        )}
      </div>

      <h3>{t('perks')}</h3>
      <ul className="cards compact">
        {PERKS.map((p) => {
          const level = s.prestige.perks[p.id] ?? 0;
          const maxed = level >= p.maxLevel;
          const cost = maxed ? 0 : p.cost(level);
          const afford = !maxed && s.prestige.legacy >= cost;
          return (
            <li key={p.id} className="card perk">
              <div className="card-main">
                <Icon id={p.icon} size={28} />
                <div className="card-info">
                  <div className="card-title">
                    {p.name} <span className="tag">{t('level')} {level}/{p.maxLevel}</span>
                  </div>
                  <div className="card-desc">{p.desc(level)}</div>
                  {!maxed && <div className="card-meta">Next: {p.desc(level + 1)}</div>}
                </div>
                <div className="card-side">
                  <button className="btn small" disabled={!afford} onClick={() => engine.buyPerk(p.id)}>
                    {maxed ? t('max') : `${cost} LP`}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
