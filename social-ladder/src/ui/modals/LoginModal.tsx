import { money } from '../../core/bignum';
import { LOGIN_DAYS } from '../../data/retention';
import { t } from '../../i18n';
import { ChestIcon } from '../components/Retention';
import { useEngine } from '../hooks';
import { Modal } from './Modal';

/** Seven-day calendar shown on the first visit of each day. */
export function LoginModal() {
  const engine = useEngine();
  const l = engine.state.login;
  const day = l.pendingDay;
  return (
    <Modal onClose={() => engine.claimLogin()} className="login-modal">
      <small className="vote-kicker">{t('loginKicker')}</small>
      <h2>{t('loginTitle', { n: day })}</h2>
      <p className="muted">{t('loginText')}</p>
      <ol className="login-days">
        {LOGIN_DAYS.map((d, i) => {
          const n = i + 1;
          const state = n < day ? 'done' : n === day ? 'today' : 'future';
          return (
            <li key={n} className={`login-day ${state} ${n === 7 ? 'grand' : ''}`}>
              <small>{t('loginDay', { n })}</small>
              {d.chest ? <ChestIcon rarity={d.chest} size={n === 7 ? 30 : 22} /> : <span className="login-coin">$</span>}
              <b>{n === day ? `+${money(engine.loginReward(n))}` : n < day ? '✓' : `${Math.round(d.seconds / 60)} min`}</b>
            </li>
          );
        })}
      </ol>
      <button className="btn primary" onClick={() => engine.claimLogin()}>{t('loginClaim')}</button>
    </Modal>
  );
}
