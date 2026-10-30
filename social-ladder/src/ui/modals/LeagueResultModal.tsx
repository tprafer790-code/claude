import { t } from '../../i18n';
import type { ChestRarity } from '../../data/retention';
import { ChestIcon } from '../components/Retention';
import { useEngine } from '../hooks';
import { Modal } from './Modal';

/** Last week's final positions and prizes, shown once. */
export function LeagueResultModal() {
  const engine = useEngine();
  const r = engine.state.league.lastResult!;
  const close = () => {
    engine.state.flags[`league_${r.week}`] = true;
    engine.changed();
  };
  return (
    <Modal onClose={close} className="league-modal">
      <small className="vote-kicker">{t('leagueKicker')}</small>
      <h2>{t('leagueResultTitle', { n: r.wealth })}</h2>
      <p>{t('leagueResultVillain', { n: r.villain })}</p>
      {r.chests.length > 0 ? (
        <p className="chest-held">
          {r.chests.map((c, i) => <span key={i}><ChestIcon rarity={c as ChestRarity} size={28} /></span>)}
          <span>{t('leagueResultPrize', { n: r.chests.length })}</span>
        </p>
      ) : (
        <p className="muted">{t('leagueResultNone')}</p>
      )}
      <button className="btn primary" onClick={close}>{t('continue')}</button>
    </Modal>
  );
}
