import { money } from '../../core/bignum';
import { EVENT_BY_ID } from '../../data/events';
import { t } from '../../i18n';
import { Icon } from '../components/Icon';
import { useEngine } from '../hooks';
import { Modal } from './Modal';

export function EventModal({ onClose }: { onClose: () => void }) {
  const engine = useEngine();
  const ev = engine.state.pendingEvent ? EVENT_BY_ID[engine.state.pendingEvent] : null;
  if (!ev) return null;
  return (
    <Modal onClose={onClose} className={`event-modal ${ev.rare ? 'rare' : ''}`}>
      <div className="modal-head">
        <Icon id={ev.rare ? 'gem' : 'scroll'} size={30} />
        <div>
          <small>{ev.rare ? 'RARE EVENT' : t('event').toUpperCase()}</small>
          <h2>{ev.title}</h2>
        </div>
      </div>
      <p className="event-text">{ev.text}</p>
      <div className="choices">
        {ev.choices.map((c, i) => {
          const cost = engine.choiceCost(c.costSeconds);
          const afford = engine.state.money.gte(cost);
          return (
            <button
              key={i}
              className="choice"
              disabled={!afford}
              onClick={() => {
                if (engine.resolveEvent(i)) onClose();
              }}
            >
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
