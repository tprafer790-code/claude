import { money } from '../../core/bignum';
import { inspectionLevel, TAX_MODES } from '../../data/hacienda';
import { PARTY_BY_ID } from '../../data/parties';
import { t } from '../../i18n';
import { useEngine } from '../hooks';
import { Modal } from './Modal';

const pct = (v: number) => Math.round(v * 100);

/** The Treasury: pick how honest to be, see the risk, own up if needed. */
export function HaciendaModal({ onClose }: { onClose: () => void }) {
  const engine = useEngine();
  const s = engine.state;
  const x = s.tax;
  const party = s.government.party ? PARTY_BY_ID[s.government.party] : null;
  const cost = engine.regularizeCost();
  const amnesty = engine.amnestyOpen();
  const level = inspectionLevel(x.risk);
  return (
    <Modal onClose={onClose} className="hacienda-modal">
      <h2 className="hacienda-title">🏛 {t('haciendaTitle')}</h2>
      <p className="hacienda-intro">{t('haciendaIntro')}</p>
      <p className="hacienda-rate">{t('haciendaRate', { party: party?.name ?? '—', rate: pct(engine.taxRate()), zeal: String(engine.taxZeal()).replace('.', ',') })}</p>
      <div className="tax-modes" role="radiogroup">
        {TAX_MODES.map((m) => {
          const ok = engine.canUseTaxMode(m);
          return (
            <button key={m} role="radio" aria-checked={x.mode === m} disabled={!ok} className={`tax-mode tax-${m} ${x.mode === m ? 'on' : ''}`} onClick={() => engine.setTaxMode(m)}>
              <b>{t(`taxMode_${m}`)}</b>
              <span>{ok ? t(`taxModeDesc_${m}`) : t('taxEngineeringLocked')}</span>
            </button>
          );
        })}
      </div>
      <div className={`tax-risk lvl-${level}`}>
        <span>{t('haciendaRisk')}</span>
        <div className="tax-risk-bar">
          <div className="tax-risk-fill" style={{ width: `${Math.round(x.risk)}%` }} />
          <i style={{ left: '40%' }} />
          <i style={{ left: '80%' }} />
          <span>{Math.round(x.risk)} %</span>
        </div>
      </div>
      {x.hidden.gt(0) && (
        <>
          <p className="tax-hidden">{t('haciendaHidden', { amount: money(x.hidden) })} · {t('haciendaNext', { what: t(`taxLevel_${level}`) })}</p>
          <button className="btn primary" disabled={s.money.lt(cost)} onClick={() => engine.regularize()} title={t(amnesty ? 'amnestyHint' : 'regularizeHint')}>
            {t(amnesty ? 'amnestyButton' : 'regularizeButton', { amount: money(cost) })}
          </button>
          <small className="tax-hint">{t(amnesty ? 'amnestyHint' : 'regularizeHint')} {t('prescriptionHint')}</small>
        </>
      )}
      <button className="btn" onClick={onClose}>{t('close')}</button>
    </Modal>
  );
}
