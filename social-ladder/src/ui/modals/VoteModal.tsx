import { LOYALTY_BONUS, PARTIES } from '../../data/parties';
import { t } from '../../i18n';
import { effectText } from '../effectText';
import { useEngine } from '../hooks';
import { Modal } from './Modal';

const PHASE_KEYS = ['phase0', 'phase1', 'phase2'] as const;

/** Elections at the start of a life and on every new social class. */
export function VoteModal() {
  const engine = useEngine();
  const s = engine.state;
  const phase = engine.phase();
  const g = s.government;
  return (
    <Modal onClose={() => {}} dismissable={false} className="vote-modal">
      <small className="vote-kicker">{t('voteKicker')} · {t(PHASE_KEYS[phase])}</small>
      <h2 className="vote-title">{t('voteTitle', { stage: engine.stage.name })}</h2>
      <p className="vote-intro">{t('voteIntro')}</p>
      <div className="parties">
        {PARTIES.map((p) => {
          const now = p.phases[phase];
          const loyal = g.party === p.id;
          return (
            <div key={p.id} className="party" style={{ ['--party' as string]: p.color }}>
              <div className="party-head">
                <span className="party-name">{p.name}</span>
                <span className="party-slogan">“{p.desc}”</span>
              </div>
              <div className="party-now">
                <b>{t('voteNow')}: {now.title}</b>
                <p>{now.text}</p>
                <ul>
                  {now.effects.map((e, i) => (
                    <li key={i}>{effectText(e)}</li>
                  ))}
                  <li className="vote-tax">{t('voteTax', { rate: Math.round(p.tax.rate[phase] * 100), zeal: String(p.tax.inspect).replace('.', ',') })}</li>
                  {now.perk && <li>{t('perkEvery', { s: now.perk.every, label: now.perk.label })}</li>}
                  {loyal && <li className="loyal">{t('voteLoyal', { pct: Math.round(LOYALTY_BONUS * g.mandates * 100) })}</li>}
                </ul>
              </div>
              <div className="party-later">
                <b>{t('voteLater')}</b>
                {p.phases.map((ph, i) =>
                  i <= phase ? null : (
                    <div key={i}>
                      {t(PHASE_KEYS[i])}: {s.flags[`party_${p.id}_${i}`] ? ph.title : t('voteUnknown')}
                    </div>
                  ),
                )}
                {phase === 2 && <div>—</div>}
              </div>
              <button className="btn primary party-vote" onClick={() => engine.vote(p.id)}>
                {t('voteButton', { name: p.name })}
              </button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
