import { decimal, money } from '../../core/bignum';
import { ITEM_BY_ID } from '../../data/items';
import { STAGE_BY_ID } from '../../data/stages';
import { t } from '../../i18n';
import { useEngine } from '../hooks';
import { Icon } from './Icon';
import { AnimatedMoney } from './AnimatedMoney';
import { reducedMotion, TIER_FX, tierForStage } from '../../fx/intensity';
import { statusTitle } from '../../data/social';

export function TopBar({ onSettings, onMenu, menuOpen, menuAlert }: { onSettings: () => void; onMenu: () => void; menuOpen: boolean; menuAlert: boolean }) {
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
          <AnimatedMoney className="cash-value" value={s.money} bump={TIER_FX[tierForStage(stage.index)].counterBump} reduced={reducedMotion(s.settings)} />
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
          <span className={`status-chip ${s.status > 0 ? 'up' : s.status < 0 ? 'down' : ''}`} data-tip={t('statusTip', { mult: decimal(engine.statusMult(), 2) })}>
            {t('status')} {s.status > 0 ? '+' : ''}{Number.isInteger(s.status) ? s.status : decimal(s.status, 1)} · {statusTitle(s.status).name}
          </span>
        </div>
        <div className="progress" data-tip={t('netWorthTip')}>
          <div className="progress-fill" style={{ width: `${(prog.fraction * 100).toFixed(1)}%` }} />
          <span className="progress-label">
            {next ? (
              <>
                {t('netWorth')} {money(s.earnedThisLife)} / {money(engine.rankReq(s.rankIndex + 1))} → <b>{next.name}</b>
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

      <div className="top-actions">
        <button
          className={`icon-btn mute-btn ${s.settings.muted ? 'off' : ''}`}
          onClick={() => {
            s.settings = { ...s.settings, muted: !s.settings.muted };
            engine.changed();
          }}
          aria-label={s.settings.muted ? t('fxUnmute') : t('mute')}
          aria-pressed={s.settings.muted}
          title={s.settings.muted ? t('fxUnmute') : t('mute')}
        >
          <SpeakerIcon muted={s.settings.muted} />
        </button>
        <button className="icon-btn settings-btn" onClick={onSettings} aria-label={t('settings')}>
          <Icon id="tools" size={22} />
        </button>
        <button className={`icon-btn menu-btn ${menuOpen ? 'open' : ''}`} onClick={onMenu} aria-label={menuOpen ? t('menuClose') : t('menuOpen')} aria-expanded={menuOpen} title={t('shop')}>
          <span className="burger" aria-hidden="true"><i /><i /><i /></span>
          {menuAlert && !menuOpen && <i className="menu-dot" />}
        </button>
      </div>
    </header>
  );
}

/** 11×11 pixel speaker, drawn with rects so it stays crisp at any zoom. */
function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 11 11" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="1" y="4" width="2" height="3" fill="currentColor" />
      <rect x="3" y="3" width="1" height="5" fill="currentColor" />
      <rect x="4" y="2" width="1" height="7" fill="currentColor" />
      <rect x="5" y="1" width="1" height="9" fill="currentColor" />
      {muted ? (
        <>
          <rect x="7" y="4" width="1" height="1" fill="#ff3d3d" />
          <rect x="9" y="4" width="1" height="1" fill="#ff3d3d" />
          <rect x="8" y="5" width="1" height="1" fill="#ff3d3d" />
          <rect x="7" y="6" width="1" height="1" fill="#ff3d3d" />
          <rect x="9" y="6" width="1" height="1" fill="#ff3d3d" />
        </>
      ) : (
        <>
          <rect x="7" y="4" width="1" height="3" fill="currentColor" />
          <rect x="9" y="2" width="1" height="7" fill="currentColor" />
          <rect x="8" y="1" width="1" height="1" fill="currentColor" />
          <rect x="8" y="9" width="1" height="1" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
