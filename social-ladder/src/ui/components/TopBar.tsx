import { money } from '../../core/bignum';
import { ITEM_BY_ID } from '../../data/items';
import { STAGE_BY_ID } from '../../data/stages';
import { t } from '../../i18n';
import { useEngine } from '../hooks';
import { Icon } from './Icon';

export function TopBar({ onSettings }: { onSettings: () => void }) {
  const engine = useEngine();
  const s = engine.state;
  const d = engine.derived;
  const rank = engine.rank;
  const stage = STAGE_BY_ID[rank.stage];
  const next = engine.nextRank();
  const prog = engine.rankProgress();
  const missing = prog.missingItem ? ITEM_BY_ID[prog.missingItem] : null;

  return (
    <header className="topbar">
      <div className="brand">
        <div className="logo" aria-label="The Social Ladder">
          <span className="logo-the">THE</span>
          <span className="logo-main">SOCIAL LADDER</span>
        </div>
      </div>

      <div className="wallet">
        <div className="cash" title={t('cash')}>
          <Icon id="coin" size={22} />
          <span className="cash-value">{money(s.money)}</span>
        </div>
        <div className="rates">
          <span>
            <b>{money(d.incomePerSec, 1)}</b> {t('perSecond')}
          </span>
          <span>
            <b>{money(d.clickValue, 1)}</b> {t('perClick')}
          </span>
        </div>
      </div>

      <div className="rankbox">
        <div className="rank-line">
          <span className="stage-chip">{stage.name}</span>
          <span className="rank-name">{rank.name}</span>
          <span className="rank-num">#{s.rankIndex + 1}</span>
        </div>
        <div className="progress" data-tip={t('netWorthTip')}>
          <div className="progress-fill" style={{ width: `${(prog.fraction * 100).toFixed(1)}%` }} />
          <span className="progress-label">
            {next ? (
              <>
                {t('netWorth')} {money(s.earnedThisLife)} / {money(next.req)} → <b>{next.name}</b>
              </>
            ) : (
              t('topOfLadder')
            )}
          </span>
        </div>
        {missing && (
          <div className="needs">
            <Icon id={missing.icon} size={16} /> {t('needs')}: <b>{missing.name}</b> ({t('statusSymbol')})
          </div>
        )}
      </div>

      <button className="icon-btn settings-btn" onClick={onSettings} aria-label={t('settings')}>
        <Icon id="tools" size={22} />
      </button>
    </header>
  );
}
