import { useState } from 'react';
import { money } from '../../core/bignum';
import { ACHIEVEMENTS, type AchievementCategory } from '../../data/achievements';
import { SECRETS } from '../../data/secrets';
import { t } from '../../i18n';
import { Icon } from '../components/Icon';
import { useEngine } from '../hooks';

const CATS: AchievementCategory[] = ['wealth', 'social', 'clicking', 'objects', 'business', 'events', 'exploration', 'secrets', 'prestige'];

export function GoalsPanel() {
  const engine = useEngine();
  const s = engine.state;
  const [sub, setSub] = useState<'missions' | 'achievements' | 'secrets'>('missions');
  const daily = engine.dailyProgress();
  const achCount = Object.keys(s.achievements).length;
  const secCount = Object.keys(s.secrets).length;

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="subtabs">
          <button className={sub === 'missions' ? 'on' : ''} onClick={() => setSub('missions')}>{t('missions')}</button>
          <button className={sub === 'achievements' ? 'on' : ''} onClick={() => setSub('achievements')}>{t('achievements')} ({achCount}/{ACHIEVEMENTS.length})</button>
          <button className={sub === 'secrets' ? 'on' : ''} onClick={() => setSub('secrets')}>{t('secrets')} ({secCount}/{SECRETS.length})</button>
        </div>
      </div>

      {sub === 'missions' && (
        <>
          <ul className="cards compact">
            {engine.visibleMissions().map((m) => {
              const [cur, target] = m.progress(s);
              const done = cur >= target;
              return (
                <li key={m.id} className={`card mission ${done ? 'done' : ''}`}>
                  <div className="card-main">
                    <Icon id="scroll" size={28} />
                    <div className="card-info">
                      <div className="card-title">{m.text}</div>
                      <div className="mini-bar">
                        <div style={{ width: `${Math.min(100, (cur / target) * 100)}%` }} />
                      </div>
                      <div className="card-meta">
                        {Math.min(cur, target).toLocaleString('en-US')} / {target.toLocaleString('en-US')} · {t('reward', { amount: money(engine.missionReward(m.id)) })}
                      </div>
                    </div>
                    <div className="card-side">
                      <button className="btn small" disabled={!done} onClick={() => engine.claimMission(m.id)}>{t('claim')}</button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {daily && (
            <div className={`daily ${daily.claimed ? 'claimed' : ''}`}>
              <div className="daily-head">
                <Icon id="watch" size={22} /> <b>{t('daily')}</b> <span className="muted">{t('dailyStreak', { n: s.daily.streak })}</span>
              </div>
              <div>{daily.text}</div>
              <div className="mini-bar">
                <div style={{ width: `${Math.min(100, (daily.cur / daily.target) * 100)}%` }} />
              </div>
              <div className="daily-foot">
                <span>
                  {Math.min(daily.cur, daily.target)} / {daily.target}
                </span>
                <button className="btn small" disabled={daily.claimed || daily.cur < daily.target} onClick={() => engine.claimDaily()}>
                  {daily.claimed ? '✓' : t('claim')}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {sub === 'achievements' && (
        <div className="ach-list">
          {CATS.map((cat) => (
            <section key={cat}>
              <h3 className="cat">{cat}</h3>
              <div className="ach-grid">
                {ACHIEVEMENTS.filter((a) => a.category === cat).map((a) => {
                  const got = !!s.achievements[a.id];
                  const secret = a.hidden && !got;
                  return (
                    <div key={a.id} className={`ach ${got ? 'got' : ''}`} title={secret ? t('hidden') : `${a.name}: ${a.desc}`}>
                      <Icon id={secret ? 'lock' : a.icon} size={26} dim={!got} />
                      <span>{secret ? '???' : a.name}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {sub === 'secrets' && (
        <ul className="cards compact">
          {SECRETS.map((sec) => {
            const found = !!s.secrets[sec.id];
            return (
              <li key={sec.id} className={`card secret ${found ? 'found' : ''}`}>
                <div className="card-main">
                  <Icon id={found ? 'key' : 'lock'} size={28} />
                  <div className="card-info">
                    <div className="card-title">{found ? sec.name : '???'}</div>
                    <div className="card-desc">{found ? sec.desc : `“${sec.hint}”`}</div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
