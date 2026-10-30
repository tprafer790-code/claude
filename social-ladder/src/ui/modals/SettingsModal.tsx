import { useState } from 'react';
import { decimal, fmtDuration, money } from '../../core/bignum';
import { RANKS } from '../../data/ranks';
import type { Runtime } from '../../game/runtime';
import { exportSave } from '../../game/persistence';
import { t } from '../../i18n';
import { pushToast } from '../components/Toasts';
import { useEngine } from '../hooks';
import { Modal } from './Modal';

export function SettingsModal({ runtime, onClose }: { runtime: Runtime; onClose: () => void }) {
  const engine = useEngine();
  const s = engine.state;
  const st = s.settings;
  const [importing, setImporting] = useState(false);
  const [code, setCode] = useState('');
  const [resetText, setResetText] = useState('');
  const [name, setName] = useState(st.playerName);
  const d = engine.derived;

  const set = (patch: Partial<typeof st>) => {
    s.settings = { ...st, ...patch };
    engine.changed();
  };

  return (
    <Modal onClose={onClose} className="settings-modal">
      <div className="modal-head">
        <h2>{t('settings')}</h2>
        <button className="icon-btn" onClick={onClose} aria-label={t('close')}>✕</button>
      </div>

      <div className="settings-grid">
        <label>
          {t('sound')}
          <input type="range" min={0} max={1} step={0.05} value={st.sfxVolume} onChange={(e) => set({ sfxVolume: Number(e.target.value) })} />
        </label>
        <label>
          {t('music')}
          <input type="range" min={0} max={1} step={0.05} value={st.musicVolume} onChange={(e) => set({ musicVolume: Number(e.target.value) })} />
        </label>
        <label className="check">
          <input type="checkbox" checked={st.muted} onChange={(e) => set({ muted: e.target.checked })} /> {t('mute')}
        </label>
        <label className="check">
          <input type="checkbox" checked={st.reducedMotion} onChange={(e) => set({ reducedMotion: e.target.checked })} /> {t('reducedMotion')}
        </label>
        <label>
          {t('language')}
          <select value={st.language} onChange={(e) => set({ language: e.target.value as 'en' | 'es' })}>
            <option value="en">English</option>
            <option value="es">{t('langEs')}</option>
          </select>
        </label>
        <label>
          {t('playerName')}
          <span className="row">
            <input maxLength={20} value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn small" onClick={() => set({ playerName: name.trim() })}>{t('save')}</button>
          </span>
        </label>
      </div>

      <h3>{t('stats')}</h3>
      <dl className="stats">
        <dt>{t('lifetime')}</dt><dd>{money(s.lifetimeEarned)}</dd>
        <dt>{t('bestLife')}</dt><dd>{money(s.stats.bestLifeEarned)}</dd>
        <dt>{t('highestRank')}</dt><dd>{RANKS[s.highestRankEver].name}</dd>
        <dt>{t('totalClicks')}</dt><dd>{s.stats.totalClicks.toLocaleString('en-US')}</dd>
        <dt>{t('playTime')}</dt><dd>{fmtDuration(s.stats.playSeconds)}</dd>
        <dt>{t('income')} ×</dt><dd>{decimal(d.incomeMult, 2)} ({t('incomeBreakdown', { ranks: Math.round(d.breakdown.ranks * 100), ach: Math.round(d.breakdown.achievements * 100), col: Math.round(d.breakdown.collection * 100), life: Math.round(d.breakdown.lifestyleIncome * 100) })})</dd>
        <dt>{t('clicks')} ×</dt><dd>{decimal(d.clickMult, 2)}</dd>
        <dt>{t('offline')}</dt><dd>{t('offlineStat', { pct: Math.round(d.offlineEfficiency * 100), hours: d.offlineCapHours })}</dd>
      </dl>

      <h3>{t('save')}</h3>
      <div className="row wrap">
        <button className="btn" onClick={() => { runtime.saveNow(); pushToast({ icon: 'scroll', title: t('saved'), text: '', tone: 'good' }); }}>{t('save')}</button>
        <button className="btn" onClick={async () => {
          const c = exportSave(s);
          try {
            await navigator.clipboard.writeText(c);
            pushToast({ icon: 'scroll', title: t('copied'), text: '', tone: 'good' });
          } catch {
            setCode(c);
            setImporting(true);
          }
        }}>{t('exportSave')}</button>
        <button className="btn" onClick={() => setImporting((v) => !v)}>{t('importSave')}</button>
      </div>
      {importing && (
        <div className="import">
          <textarea placeholder={t('importPrompt')} value={code} onChange={(e) => setCode(e.target.value)} rows={3} />
          <button className="btn" onClick={() => {
            try {
              runtime.importCode(code);
              setImporting(false);
              onClose();
            } catch {
              pushToast({ icon: 'lock', title: t('invalidSave'), text: '', tone: 'info' });
            }
          }}>{t('importSave')}</button>
        </div>
      )}

      <details className="danger-zone">
        <summary>{t('hardReset')}</summary>
        <p>{t('hardResetConfirm', { word: t('resetWord') })}</p>
        <div className="row">
          <input value={resetText} onChange={(e) => setResetText(e.target.value)} placeholder={t('resetWord')} />
          <button className="btn danger" disabled={resetText.trim().toUpperCase() !== t('resetWord')} onClick={() => { runtime.hardReset(); onClose(); }}>{t('hardReset')}</button>
        </div>
      </details>

      <p className="credits">{t('credits')}</p>
    </Modal>
  );
}
