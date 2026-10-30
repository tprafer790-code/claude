import { ECONOMY } from '../config/economy';
import { useEffect, useState } from 'react';
import type { Runtime } from '../game/runtime';
import type { OfflineSummary } from '../game/engine';
import { audio } from '../audio/audio';
import { setLanguage, t, type StringKey } from '../i18n';
import { ACHIEVEMENT_BY_ID } from '../data/achievements';
import { SECRET_BY_ID } from '../data/secrets';
import { COMBO_BY_ID } from '../data/combos';
import { STAGE_BY_ID } from '../data/stages';
import { money } from '../core/bignum';
import { EngineContext, useEngine } from './hooks';
import { TopBar } from './components/TopBar';
import { SceneView } from './components/SceneView';
import { ActionArea } from './components/ActionArea';
import { Toasts, pushToast } from './components/Toasts';
import { Tutorial } from './components/Tutorial';
import { BusinessPanel } from './panels/BusinessPanel';
import { UpgradesPanel } from './panels/UpgradesPanel';
import { ObjectsPanel } from './panels/ObjectsPanel';
import { LadderPanel } from './panels/LadderPanel';
import { GoalsPanel } from './panels/GoalsPanel';
import { LegacyPanel } from './panels/LegacyPanel';
import { RankingPanel } from './panels/RankingPanel';
import { EventModal } from './modals/EventModal';
import { OfflineModal } from './modals/OfflineModal';
import { PromotionModal } from './modals/PromotionModal';
import { SettingsModal } from './modals/SettingsModal';
import type { IconId } from '../data/types';
import { Icon } from './components/Icon';
import { FxOverlay } from './components/FxOverlay';
import { Celebration } from './components/Celebration';
import { reducedMotion, tierForStage } from '../fx/intensity';
import { CasinoPanel } from './panels/CasinoPanel';
import { VoteModal } from './modals/VoteModal';
import { DilemmaModal } from './modals/DilemmaModal';
import { PARTY_BY_ID } from '../data/parties';

type Tab = 'business' | 'upgrades' | 'objects' | 'casino' | 'ladder' | 'goals' | 'legacy' | 'ranking';
const TABS: { id: Tab; label: StringKey; icon: IconId }[] = [
  { id: 'business', label: 'tabBusiness', icon: 'store' },
  { id: 'upgrades', label: 'tabUpgrades', icon: 'star' },
  { id: 'objects', label: 'tabObjects', icon: 'box' },
  { id: 'casino', label: 'casino', icon: 'gem' },
  { id: 'ladder', label: 'tabLadder', icon: 'trophy' },
  { id: 'goals', label: 'tabGoals', icon: 'scroll' },
  { id: 'legacy', label: 'tabLegacy', icon: 'crown' },
  { id: 'ranking', label: 'tabRanking', icon: 'chart' },
];

export function App({ runtime }: { runtime: Runtime }) {
  return (
    <EngineContext.Provider value={runtime.engine}>
      <Game runtime={runtime} />
    </EngineContext.Provider>
  );
}

function Game({ runtime }: { runtime: Runtime }) {
  const engine = useEngine();
  const s = engine.state;
  const [tab, setTab] = useState<Tab>(() => (localStorageGet('sl:tab') as Tab) || 'business');
  const [offline, setOffline] = useState<OfflineSummary | null>(runtime.pendingOffline);
  const [majorPromo, setMajorPromo] = useState<number | null>(null);
  const [eventOpen, setEventOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const openMenu = (to?: Tab) => {
    if (to) setTab(to);
    setMenuOpen(true);
  };

  // Escape closes the shop menu (modals handle their own Escape).
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  setLanguage(s.settings.language);

  useEffect(() => {
    try {
      localStorage.setItem('sl:tab', tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  useEffect(() => {
    audio.setVolumes(s.settings.sfxVolume, s.settings.musicVolume, s.settings.muted);
  }, [s.settings.sfxVolume, s.settings.musicVolume, s.settings.muted]);

  useEffect(() => {
    audio.setStage(STAGE_BY_ID[engine.rank.stage].index);
  }, [engine.rank.stage]);

  useEffect(() => runtime.onAway((summary) => setOffline(summary)), [runtime]);

  // Transient game events → sound, toasts, celebrations.
  useEffect(() => {
    return engine.onEvent((e) => {
      switch (e.type) {
        case 'click': audio.click(e.combo, e.crit, e.crit && (e.combo > engine.derived.comboMax || !!e.lucky) ? 1.4 : 1); if (e.lucky) audio.rare(); if (e.lucky) pushToast({ icon: 'coin', title: t('luckyFindTitle'), text: t('luckyFindText', { amount: money(e.lucky) }), tone: 'good' }); break;
        case 'purchase': audio.purchase(tierForStage(STAGE_BY_ID[engine.rank.stage].index)); break;
        case 'promotion': {
                    audio.promotion(e.stageChanged);
          // Ordinary promotions get the full-screen celebration band (FxOverlay); a new social class opens its modal.
          if (e.stageChanged) setMajorPromo(e.to);
          break;
        }
        case 'achievement': {
          const a = ACHIEVEMENT_BY_ID[e.id];
          if (Object.keys(engine.state.achievements).length % 10 === 0) audio.fanfare();
          else audio.achievement();
          pushToast({ icon: a.icon, title: t('achievementToast', { name: a.name }), text: a.desc, tone: 'gold', sub: t('rankIncome', { pct: Math.round(ECONOMY.achievementIncomeBonus * 100) }) });
          break;
        }
        case 'secret': {
          const sec = SECRET_BY_ID[e.id];
          audio.secret();
          pushToast({ icon: 'key', title: t('secretToast', { name: sec.name }), text: sec.desc, tone: 'rare' });
          break;
        }
        case 'combo': {
          const c = COMBO_BY_ID[e.id];
          audio.secret();
          pushToast({ icon: 'star', title: t('comboToast', { name: c.name }), text: c.desc, tone: 'rare' });
          break;
        }
        case 'eventStart': audio.event(); break;
        case 'eventResult': pushToast({ icon: 'scroll', title: e.title, text: e.text, tone: 'info', sub: e.summary.join(' · ') }); break;
        case 'opportunitySpawn': audio.opportunity(); break;
        case 'opportunityCollect': audio.coin(); pushToast({ icon: 'gem', title: t('opportunityTitle'), text: e.text, tone: 'good' }); break;
        case 'mission': audio.coin(); pushToast({ icon: 'scroll', title: t('missionComplete'), text: `+${money(e.reward)}`, tone: 'good' }); break;
        case 'prestige': audio.prestige(); pushToast({ icon: 'crown', title: t('newLifeTitle'), text: t('newLifeText', { n: e.gained }), tone: 'rare' }); break;
        case 'ability': audio.coin(); break;
        case 'toast': pushToast({ icon: 'star', title: e.text, text: '', tone: e.tone === 'bad' ? 'info' : e.tone === 'rare' ? 'rare' : 'good' }); break;
        case 'vote': audio.fanfare(); break;
        case 'partyPerk': {
          if (e.tone === 'good') audio.coin(); else audio.denied();
          pushToast({ icon: e.tone === 'good' ? 'bank' : 'scroll', title: `${PARTY_BY_ID[e.party]?.name ?? ''} · ${e.label}`, text: e.text, tone: e.tone === 'good' ? 'good' : 'info', sub: e.summary.join(' · ') });
          break;
        }
        case 'dilemmaStart': audio.event(); break;
        case 'dilemmaResult': {
          if (e.statusDelta < 0) audio.denied(); else audio.achievement();
          pushToast({ icon: 'scroll', title: e.title, text: e.timedOut ? `${t('dilemmaTimeout')} ${e.text}` : e.text, tone: e.statusDelta < 0 ? 'info' : 'good', sub: e.summary.join(' · ') });
          break;
        }
        case 'rivalBeaten': audio.fanfare(); break;
        case 'vault': audio.secret(); pushToast({ icon: 'key', title: t('vaultOpened'), text: e.text, tone: 'rare', sub: e.summary.join(' · ') }); break;
      }
    });
  }, [engine]);

  // Keyboard: typed secrets + space/enter for the main action.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const tag = (ev.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      engine.typeKey(ev.key);
      engine.noteActivity();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine]);

  const stage = STAGE_BY_ID[engine.rank.stage];
  const upgradeAlert = engine.availableUpgrades().some((u) => s.money.gte(engine.upgradeCost(u.id)));
  const menuAlert = upgradeAlert || engine.visibleBusinesses().some((b) => s.money.gte(engine.businessCost(b.id, 1))) || engine.visibleMissions().some((m) => { const [c, g] = m.progress(s); return c >= g; });
  const unlockAudio = () => audio.unlock();

  return (
    <div className={`app stage-${stage.id} ${reducedMotion(s.settings) ? 'reduced-motion' : ''}`} data-tier={tierForStage(stage.index)} style={{ ['--accent' as string]: stage.accent, ['--accent-dark' as string]: stage.accentDark }} onPointerDown={unlockAudio}>
      <TopBar onSettings={() => setSettingsOpen(true)} onMenu={() => setMenuOpen((o) => !o)} menuOpen={menuOpen} menuAlert={menuAlert} />
      <main className="layout">
        <section className="play">
          <SceneView />
          <ActionArea onOpenEvent={() => setEventOpen(true)} />
          <Tutorial onOpen={openMenu} />
        </section>
        {menuOpen && <div className="drawer-backdrop" onPointerDown={() => setMenuOpen(false)} />}
        <aside className={`panels drawer ${menuOpen ? 'open' : ''}`} aria-hidden={!menuOpen} inert={!menuOpen}>
          <button className="drawer-close icon-btn" onClick={() => setMenuOpen(false)} aria-label={t('menuClose')}>✕</button>
          <nav className="tabs" role="tablist">
            {TABS.map((tb) => (
              <button key={tb.id} role="tab" aria-selected={tab === tb.id} className={`tab ${tab === tb.id ? 'active' : ''}`} onClick={() => setTab(tb.id)}>
                <Icon id={tb.icon} size={20} />
                <span>{t(tb.label)}</span>
                {tb.id === 'goals' && engine.visibleMissions().some((m) => { const [c, g] = m.progress(s); return c >= g; }) && <i className="dot" />}
                {tb.id === 'upgrades' && upgradeAlert && <i className="dot" />}
              </button>
            ))}
          </nav>
          {menuOpen && <div className="panel-body">
            {tab === 'business' && <BusinessPanel />}
            {tab === 'upgrades' && <UpgradesPanel />}
            {tab === 'objects' && <ObjectsPanel />}
            {tab === 'ladder' && <LadderPanel />}
            {tab === 'goals' && <GoalsPanel />}
            {tab === 'legacy' && <LegacyPanel />}
            {tab === 'casino' && <CasinoPanel />}
            {tab === 'ranking' && <RankingPanel runtime={runtime} />}
          </div>}
        </aside>
      </main>
      <Toasts />
      <FxOverlay />
      <Celebration />
      {offline && <OfflineModal summary={offline} onClose={() => setOffline(null)} />}
      {majorPromo !== null && <PromotionModal rankIndex={majorPromo} onClose={() => setMajorPromo(null)} />}
      {eventOpen && s.pendingEvent && <EventModal onClose={() => setEventOpen(false)} />}
      {settingsOpen && <SettingsModal runtime={runtime} onClose={() => setSettingsOpen(false)} />}
      {s.pendingVote && !offline && majorPromo === null && <VoteModal />}
      {s.pendingDilemma && !s.pendingVote && !offline && majorPromo === null && <DilemmaModal />}
    </div>
  );
}

function localStorageGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
