import { STATUS_JAIL } from '../../data/social';
import { t } from '../../i18n';
import { Modal } from './Modal';

/** Status hit rock bottom: the life starts over. */
export function JailModal({ onClose, reason = 'status' }: { onClose: () => void; reason?: 'status' | 'tax' }) {
  return (
    <Modal onClose={onClose} dismissable={false} className="jail-modal">
      <div className="jail-bars" aria-hidden="true" />
      <h2 className="jail-title">{t(reason === 'tax' ? 'jailTaxTitle' : 'jailTitle')}</h2>
      <p>{reason === 'tax' ? t('jailTaxText') : t('jailText', { min: STATUS_JAIL })}</p>
      <button className="btn primary" onClick={onClose}>{t('jailButton')}</button>
    </Modal>
  );
}
