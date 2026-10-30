import { useState } from 'react';
import { money } from '../../core/bignum';
import { RANKS } from '../../data/ranks';
import type { BuyQty } from '../../game/engine';
import { t } from '../../i18n';
import { Icon } from '../components/Icon';
import { useEngine } from '../hooks';

const QTYS: BuyQty[] = [1, 10, 100, 'max'];

export function BusinessPanel() {
  const engine = useEngine();
  const s = engine.state;
  const d = engine.derived;
  const [qty, setQty] = useState<BuyQty>(1);
  const list = engine.visibleBusinesses();
  const locked = engine.nextLockedBusiness();

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>{t('tabBusiness')}</h2>
        <div className="qty">
          {QTYS.map((q) => (
            <button key={q} className={qty === q ? 'on' : ''} onClick={() => setQty(q)}>
              {q === 'max' ? 'MAX' : `×${q}`}
            </button>
          ))}
        </div>
      </div>
      <ul className="cards">
        {list.map((b) => {
          const owned = s.businesses[b.id] ?? 0;
          const n = engine.resolveQty(b.id, qty);
          const cost = engine.businessCost(b.id, qty);
          const afford = s.money.gte(cost);
          const income = d.businessIncome[b.id];
          const perUnit = income && owned ? income.div(owned) : null;
          const nextUp = engine.nextBusinessUpgradeAt(b.id);
          return (
            <li key={b.id} className={`card biz ${afford ? 'afford' : ''} ${b.secret ? 'secret' : ''}`}>
              <button className="card-main" onClick={() => engine.buyBusiness(b.id, qty)} disabled={!afford}>
                <Icon id={b.icon} size={36} />
                <div className="card-info">
                  <div className="card-title">
                    {b.name} {b.secret && <span className="tag rare">SECRET</span>}
                  </div>
                  <div className="card-desc">{b.desc}</div>
                  <div className="card-meta">
                    {owned > 0 ? (
                      <>
                        <b>{money(income ?? 0, 1)}/s</b> · {money(perUnit ?? 0, 1)}/s each · ×{d.businessMult[b.id]?.toLocaleString('en-US')}
                      </>
                    ) : (
                      <>+{money(b.baseIncome * d.incomeMult * (d.businessMult[b.id] ?? 1), 1)}/s each</>
                    )}
                    {nextUp !== null && <span className="muted"> · {t('nextUpgradeAt', { n: nextUp })}</span>}
                  </div>
                </div>
                <div className="card-side">
                  <div className="owned">{owned}</div>
                  <div className={`price ${afford ? '' : 'no'}`}>
                    {t('buy')} {qty === 'max' || qty !== 1 ? `×${n}` : ''}
                    <br />
                    {money(cost)}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
        {locked && (
          <li className="card locked">
            <div className="card-main">
              <Icon id="lock" size={36} />
              <div className="card-info">
                <div className="card-title">???</div>
                <div className="card-desc">{t('unlocksAt', { rank: RANKS[locked.rankReq].name })}</div>
              </div>
            </div>
          </li>
        )}
      </ul>
    </div>
  );
}
