import { money } from '../../core/bignum';
import { t } from '../../i18n';
import { Icon } from '../components/Icon';
import { useEngine } from '../hooks';

export function UpgradesPanel() {
  const engine = useEngine();
  const s = engine.state;
  const list = engine.availableUpgrades();
  const owned = Object.keys(s.upgrades).length;
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>{t('tabUpgrades')}</h2>
        <span className="muted">
          {t('owned')}: {owned}
        </span>
      </div>
      {list.length === 0 && <p className="empty">{t('noUpgrades')}</p>}
      <ul className="grid-cards">
        {list.map((u) => {
          const afford = s.money.gte(u.cost);
          return (
            <li key={u.id}>
              <button className={`upgrade ${afford ? 'afford' : ''}`} onClick={() => engine.buyUpgrade(u.id)} disabled={!afford} title={u.desc}>
                <Icon id={u.icon} size={30} />
                <span className="upgrade-name">{u.name}</span>
                <span className="upgrade-desc">{u.desc}</span>
                <span className={`price ${afford ? '' : 'no'}`}>{money(u.cost)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
