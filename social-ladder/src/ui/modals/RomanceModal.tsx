import { PARTNER_BY_ID } from '../../data/romance';
import { t } from '../../i18n';
import { useEngine } from '../hooks';
import { Modal } from './Modal';

type Choice = 'safe' | 'wild' | 'leave';

/** A date that goes well. The night itself is a fade to black. */
export function RomanceModal() {
  const engine = useEngine();
  const partner = engine.state.family.pending ? PARTNER_BY_ID[engine.state.family.pending] : null;
  if (!partner) return null;
  const pick = (c: Choice) => engine.resolveEncounter(c);
  return (
    <Modal onClose={() => {}} dismissable={false} className="romance-modal">
      <small className="romance-kicker">{t('romanceKicker')} · {partner.name}</small>
      <p className="romance-text">{partner.text}</p>
      <div className="romance-choices">
        <button className="dilemma-choice safe" onClick={() => pick('safe')}><b>{t('romanceSafe')}</b><span>{t('romanceSafeHint')}</span></button>
        <button className="dilemma-choice wild" onClick={() => pick('wild')}><b>{t('romanceWild')}</b><span>{t('romanceWildHint')}</span></button>
        <button className="dilemma-choice leave" onClick={() => pick('leave')}><b>{t('romanceLeave')}</b><span>{t('romanceLeaveHint')}</span></button>
      </div>
    </Modal>
  );
}
