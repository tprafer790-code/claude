import { fmtDuration, money } from '../../core/bignum';
import type { OfflineSummary } from '../../game/engine';
import { t } from '../../i18n';
import { Icon } from '../components/Icon';
import { useEngine } from '../hooks';
import { Modal } from './Modal';
import { BUSINESS_BY_ID } from '../../data/businesses';

export function OfflineModal({ summary, onClose }: { summary: OfflineSummary; onClose: () => void }) {
  const engine = useEngine();
  return (
    <Modal onClose={onClose} className="offline-modal">
      <div className="modal-head">
        <Icon id="moon" size={30} />
        <h2>{t('welcomeBack')}</h2>
      </div>
      <p>{t('away', { time: fmtDuration(summary.seconds) })}</p>
      <div className="big-number">
        <small>{summary.topBusiness ? t('offlineHeadline', { business: BUSINESS_BY_ID[summary.topBusiness]?.name ?? '' }) : t('offlineEarned')}</small>
        <b>+{money(summary.earned)}</b>
      </div>
      {!summary.topBusiness && <p className="warn">{t('offlineNoBusiness')}</p>}
      {summary.chest && <p className="offline-chest">{t('offlineChest')}</p>}
      <p className="muted">{t('offlineEfficiency', { pct: Math.round(summary.efficiency * 100) })}</p>
      {summary.capped && <p className="warn">{t('offlineCapped', { hours: engine.derived.offlineCapHours })}</p>}
      {summary.ranksGained.length > 0 && (
        <div className="offline-ranks">
          <b>{t('promoted')}</b>
          <ul>
            {summary.ranksGained.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}
      {summary.resolved.length > 0 && (
        <ul className="offline-resolved">
          {summary.resolved.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
      <button className="btn primary" onClick={onClose}>
        {t('continue')}
      </button>
    </Modal>
  );
}
