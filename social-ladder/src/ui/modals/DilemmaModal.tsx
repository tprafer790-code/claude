import { DILEMMA_SECONDS } from '../../game/engine';
import { DILEMMA_BY_ID } from '../../data/dilemmas';
import { money } from '../../core/bignum';
import { t } from '../../i18n';
import { useEngine } from '../hooks';
import { Modal } from './Modal';

/** A moral dilemma pops up: answer YES or NO before the clock runs out. */
export function DilemmaModal() {
  const engine = useEngine();
  const s = engine.state;
  const d = s.pendingDilemma ? DILEMMA_BY_ID[s.pendingDilemma] : null;
  if (!d) return null;
  const left = Math.max(0, s.dilemmaTimeLeft);
  return (
    <Modal onClose={() => {}} dismissable={false} className="dilemma-modal">
      <small className="dilemma-kicker">{t('dilemmaKicker')}</small>
      <h2 className="dilemma-title">{d.title}</h2>
      <p className="dilemma-text">{d.text}</p>
      <div className="dilemma-timer" aria-label={t('dilemmaTimer', { s: Math.ceil(left) })}>
        <div className="dilemma-timer-fill" style={{ width: `${(left / DILEMMA_SECONDS) * 100}%` }} />
        <span>{t('dilemmaTimer', { s: Math.ceil(left) })}</span>
      </div>
      <div className="dilemma-choices">
        {([true, false] as const).map((yes) => {
          const c = yes ? d.yes : d.no;
          const cost = engine.choiceCost(c.costSeconds);
          const afford = s.money.gte(cost);
          return (
            <button key={String(yes)} className={`dilemma-choice ${yes ? 'yes' : 'no'}`} disabled={!afford} onClick={() => engine.resolveDilemma(yes)}>
              <b>{c.label}</b>
              <span>{c.hint}</span>
              {cost.gt(0) && <span className={`price ${afford ? '' : 'no'}`}>{afford ? `-${money(cost)}` : `${t('cantAfford')} (${money(cost)})`}</span>}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
