import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Decimal, fmtDuration, money } from '../../core/bignum';
import { RANKS } from '../../data/ranks';
import type { Runtime } from '../../game/runtime';
import { deserialize, serialize } from '../../game/persistence';
import { t } from '../../i18n';
import * as online from '../../online/online';
import { Icon } from '../components/Icon';
import { pushToast } from '../components/Toasts';
import { useEngine } from '../hooks';
import { LEAGUE } from '../../data/retention';
import { ChestIcon } from '../components/Retention';

const fromLog = (v: number) => money(Decimal.pow(10, v));

export function RankingPanel({ runtime }: { runtime: Runtime }) {
  const engine = useEngine();
  const s = engine.state;

  const records = (
    <div className="records">
      <h3>{t('personalRecords')}</h3>
      <dl>
        <dt>{t('lifetime')}</dt><dd>{money(s.lifetimeEarned)}</dd>
        <dt>{t('bestLife')}</dt><dd>{money(s.stats.bestLifeEarned)}</dd>
        <dt>{t('highestRank')}</dt><dd>{RANKS[s.highestRankEver].name}</dd>
        <dt>{t('prestiges')}</dt><dd>{s.prestige.count}</dd>
        <dt>{t('reputation')}</dt><dd>{s.prestige.reputation}</dd>
        <dt>{t('achievements')}</dt><dd>{Object.keys(s.achievements).length}</dd>
        <dt>{t('totalClicks')}</dt><dd>{s.stats.totalClicks.toLocaleString('en-US')}</dd>
        <dt>{t('playTime')}</dt><dd>{fmtDuration(s.stats.playSeconds)}</dd>
      </dl>
    </div>
  );

  if (!online.onlineConfigured) {
    return (
      <div className="panel">
        <div className="panel-head"><h2>{t('tabRanking')}</h2></div>
        <LeagueBoard />
        <div className="notice">
          <Icon id="cloud" size={30} />
          <div>
            <b>{t('leaderboardOffline')}</b>
            <p>{t('leaderboardOfflineDesc')}</p>
          </div>
        </div>
        {records}
      </div>
    );
  }
  return (
    <div className="panel">
      <div className="panel-head"><h2>{t('tabRanking')}</h2></div>
      <LeagueBoard />
      <OnlineRanking runtime={runtime} />
      {records}
    </div>
  );
}

function OnlineRanking({ runtime }: { runtime: Runtime }) {
  const engine = useEngine();
  const [session, setSession] = useState<Session | null>(null);
  const [kind, setKind] = useState<online.BoardKind>('global');
  const [rows, setRows] = useState<online.LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let off = () => {};
    void online.getSession().then(setSession).catch(() => setSession(null));
    void online.onAuthChange(setSession).then((u) => (off = u));
    return () => off();
  }, []);

  useEffect(() => {
    setRows(null);
    setError(null);
    online.fetchBoard(kind).then(setRows).catch((e: Error) => setError(e.message));
  }, [kind]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      pushToast({ icon: 'lock', title: t('onlineError'), text: (e as Error).message, tone: 'info' });
    } finally {
      setBusy(false);
    }
  };

  const fmtValue = (v: number) => (kind === 'global' || kind === 'weekly' ? fromLog(v) : v.toLocaleString('en-US'));

  return (
    <>
      <div className="subtabs">
        {(['global', 'weekly', 'prestige', 'achievements'] as const).map((k) => (
          <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
            {t(k === 'global' ? 'global' : k === 'weekly' ? 'weekly' : k === 'prestige' ? 'prestigeBoard' : 'achievementBoard')}
          </button>
        ))}
      </div>
      {error && <p className="warn">{error}</p>}
      {!rows && !error && <p className="muted">…</p>}
      {rows && rows.length === 0 && <p className="empty">{t('noEntries')}</p>}
      {rows && rows.length > 0 && (
        <table className="board">
          <thead>
            <tr><th>{t('rankShort')}</th><th>{t('player')}</th><th>{kind === 'prestige' ? t('reputation') : kind === 'achievements' ? t('achievements') : t('lifetime')}</th><th>{t('highestRank')}</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.user_id} className={session?.user.id === r.user_id ? 'me' : ''}>
                <td>{r.position}</td>
                <td>{r.display_name}{session?.user.id === r.user_id ? ` (${t('you')})` : ''}</td>
                <td>{fmtValue(r.value)}</td>
                <td>{RANKS[r.highest_rank]?.name ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!session ? (
        <form className="signin" onSubmit={(e) => { e.preventDefault(); void run(async () => { await online.signInWithEmail(email); pushToast({ icon: 'scroll', title: t('signInSent'), text: email, tone: 'good' }); }); }}>
          <input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn" disabled={busy}>{t('signIn')}</button>
        </form>
      ) : (
        <div className="online-actions">
          <span className="muted">{session.user.email}</span>
          <button className="btn" disabled={busy} onClick={() => void run(async () => {
            if (engine.state.settings.playerName) await online.upsertProfile(engine.state.settings.playerName);
            const r = await online.submitScore(engine.state);
            pushToast({ icon: r.ok ? 'trophy' : 'lock', title: r.ok ? t('submitScore') : t('rejected'), text: r.message, tone: r.ok ? 'gold' : 'info' });
            setRows(await online.fetchBoard(kind));
          })}>{t('submitScore')}</button>
          <button className="btn" disabled={busy} onClick={() => void run(async () => { await online.saveToCloud(serialize(engine.state)); pushToast({ icon: 'cloud', title: t('cloudSave'), text: '✓', tone: 'good' }); })}>{t('cloudSave')}</button>
          <button className="btn" disabled={busy} onClick={() => void run(async () => {
            const data = await online.loadFromCloud();
            if (!data) throw new Error(t('noCloudSave'));
            const st = deserialize(data);
            st.lastSavedAt = Date.now();
            runtime.replaceState(st);
          })}>{t('cloudLoad')}</button>
          <button className="btn" onClick={() => void run(online.signOut)}>{t('signOut')}</button>
        </div>
      )}
    </>
  );
}

/** Weekly league against simulated rivals: wealth and lowest status. */
function LeagueBoard() {
  const engine = useEngine();
  const [kind, setKind] = useState<'wealth' | 'villain'>('wealth');
  const s = engine.state;
  if (!s.league.week) return null;
  const rows = engine.leagueTable(kind);
  const ends = (new Date(s.league.week + 'T00:00:00').getTime() + 7 * 86400000 - engine.now()) / 1000;
  return (
    <div className="league">
      <h3>{t('leagueTitle')}</h3>
      <p className="muted">{t('leagueEnds', { t: fmtDuration(Math.max(0, ends)) })}</p>
      <div className="league-prizes">
        {LEAGUE.rewards.map((r, i) => (
          <span key={r.upTo}><ChestIcon rarity={r.chest} size={16} /> {i === 0 ? '1.º' : `${LEAGUE.rewards[i - 1].upTo + 1}-${r.upTo}.º`}</span>
        ))}
        <span><ChestIcon rarity={LEAGUE.villainChest} size={16} /> {t('leagueVillainPrize')}</span>
      </div>
      <div className="subtabs">
        <button className={kind === 'wealth' ? 'on' : ''} onClick={() => setKind('wealth')}>{t('leagueWealth')}</button>
        <button className={kind === 'villain' ? 'on' : ''} onClick={() => setKind('villain')}>{t('leagueVillain')}</button>
      </div>
      <table className="board">
        <thead>
          <tr><th>{t('rankShort')}</th><th>{t('player')}</th><th>{kind === 'wealth' ? t('leagueEarned') : t('leagueLowest')}</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.name + i} className={r.me ? 'me' : ''}>
              <td>{i + 1}</td>
              <td>{r.me && s.settings.playerName ? `${r.name} (${t('you')})` : r.name}</td>
              <td>{kind === 'wealth' ? money(r.value) : r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">{t('leagueSimulated')}</p>
    </div>
  );
}
