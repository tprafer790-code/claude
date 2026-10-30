import type { HelpTopic } from '../help';
import { t } from '../../i18n';
import { useEngine } from '../hooks';
import { Modal } from './Modal';

/** Explains a feature the first time it shows up. */
export function HelpModal({ topic }: { topic: HelpTopic }) {
  const engine = useEngine();
  const close = () => {
    engine.state.flags[`help_${topic.id}`] = true;
    engine.changed();
  };
  return (
    <Modal onClose={close} className="help-modal">
      <small className="vote-kicker">{t('helpKicker')}</small>
      <h2>{t(topic.title)}</h2>
      <p>{t(topic.text)}</p>
      <button className="btn primary" onClick={close}>{t('gotIt')}</button>
    </Modal>
  );
}
