import { money } from '../../core/bignum';
import { ABILITIES } from '../../data/abilities';
import { BUSINESSES } from '../../data/businesses';
import { ITEM_BY_ID, ITEMS } from '../../data/items';
import { RANKS } from '../../data/ranks';
import { STAGES } from '../../data/stages';
import { ECONOMY } from '../../config/economy';
import { t } from '../../i18n';
import { Icon } from '../components/Icon';
import { useEngine } from '../hooks';

function unlocksFor(i: number): string[] {
  return [
    ...BUSINESSES.filter((b) => !b.secret && b.rankReq === i).map((b) => `Business: ${b.name}`),
    ...ABILITIES.filter((a) => a.rankReq === i).map((a) => `Ability: ${a.name}`),
    ...ITEMS.filter((it) => !it.unobtainableInShop && it.rankReq === i).map((it) => `Object: ${it.name}`),
  ];
}

export function LadderPanel() {
  const engine = useEngine();
  const s = engine.state;
  const peek = 2;
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>{t('tabLadder')}</h2>
        <span className="muted">
          {s.rankIndex + 1}/{RANKS.length}
        </span>
      </div>
      <div className="ladder">
        {STAGES.map((st) => {
          const ranks = RANKS.map((r, i) => ({ r, i })).filter(({ r }) => r.stage === st.id);
          const stageSeen = ranks[0].i <= s.highestRankEver + peek;
          return (
            <section key={st.id} className="ladder-stage" style={{ ['--stage' as string]: st.accent }}>
              <h3>
                <span className="stage-dot" /> {stageSeen ? st.name : '???'} <small>{stageSeen ? st.tagline : ''}</small>
              </h3>
              <ol>
                {ranks.map(({ r, i }) => {
                  const reached = i <= s.rankIndex;
                  const everReached = i <= s.highestRankEver;
                  const visible = i <= s.rankIndex + peek || everReached;
                  const current = i === s.rankIndex;
                  const unlocks = unlocksFor(i);
                  return (
                    <li key={r.id} className={`rung ${reached ? 'reached' : ''} ${current ? 'current' : ''}`}>
                      <span className="rung-num">{i + 1}</span>
                      <div className="rung-body">
                        <div className="rung-name">
                          {visible ? r.name : '???'} {r.requiresItem && visible && <Icon id={ITEM_BY_ID[r.requiresItem].icon} size={14} />}
                        </div>
                        {visible && <div className="rung-desc">{r.desc}</div>}
                        {visible && (
                          <div className="rung-meta">
                            {t('netWorth')} {money(r.req)}
                            {r.requiresItem && ` · ${t('needs')} ${ITEM_BY_ID[r.requiresItem].name}`}
                            {' · '}+{Math.round(ECONOMY.rankIncomeBonus * 100)}% income{r.bonusText ? ` · ${r.bonusText}` : ''}
                            {unlocks.length > 0 && <div className="rung-unlocks">{unlocks.join(' · ')}</div>}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
