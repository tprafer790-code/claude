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
import { RomanceModal } from './modals/RomanceModal';
import { JailModal } from './modals/JailModal';
import { HelpModal } from './modals/HelpModal';
import { nextHelp } from './help';
import { LoginModal } from './modals/LoginModal';
import { ChestModal } from './modals/ChestModal';
import { LeagueResultModal } from './modals/LeagueResultModal';
import { portal } from '../portal';
import { flyToCash } from './components/FxOverlay';

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
  const [jailed, setJailed] = useState<'status' | 'tax' | null>(null);
  const [fade, setFade] = useState(false);
  const [chestsOpen, setChestsOpen] = useState(false);
  // The portal counts gameplay from the player's first input, not from load.
  const [started, setStarted] = useState(false);
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

  // The portal's mute setting wins over ours, and ads play in silence.
  useEffect(() => {
    audio.silence('portal', portal.muteAudio);
    const offMute = portal.onMuteChange((m) => audio.silence('portal', m));
    const offPause = portal.onPause((p) => audio.silence('ad', p));
    return () => {
      offMute();
      offPause();
    };
  }, []);

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
          if (e.stageChanged) {
            setMajorPromo(e.to);
            portal.happytime();
          }
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
        case 'prestige': void portal.midgame(); audio.prestige(); pushToast({ icon: 'crown', title: t('newLifeTitle'), text: t('newLifeText', { n: e.gained }), tone: 'rare' }); break;
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
        case 'status':
          if (e.payout.gt(0)) pushToast({ icon: 'coin', title: t('fxStatus', { v: `${e.delta > 0 ? '+' : ''}${e.delta}` }), text: t(e.delta < 0 ? 'statusPayoutLoss' : 'statusPayoutGain', { amount: money(e.payout) }), tone: e.delta < 0 ? 'info' : 'good' });
          break;
        case 'aid': audio.coin(); pushToast({ icon: 'bank', title: `${PARTY_BY_ID[e.party]?.aid?.label ?? ''}: +${money(e.amount)}`, text: t('aidInflation', { pct: e.inflation }), tone: 'good' }); break;
        case 'attack':
          audio.denied();
          pushToast({ icon: 'scroll', title: t('attackTitle', { n: e.damage }), text: e.knockedOut ? `${e.text} ${t('knockedOut', { amount: money(e.bill) })}` : e.text, tone: 'info' });
          break;
        case 'heal': audio.achievement(); pushToast({ icon: 'star', title: t('healed'), text: `-${money(e.cost)}`, tone: 'good' }); break;
        case 'jail': audio.prestige(); setMenuOpen(false); setJailed(e.reason); break;
        case 'happening': {
          if (e.tone === 'good') audio.coin(); else audio.denied();
          pushToast({ icon: e.tone === 'good' ? 'bank' : 'scroll', title: PARTY_BY_ID[e.party]?.name ?? '', text: e.text, tone: e.tone === 'good' ? 'good' : 'info', sub: e.summary.join(' · ') });
          break;
        }
        case 'taxRefund': audio.coin(); pushToast({ icon: 'bank', title: t('taxRefundTitle'), text: t('taxRefundText', { amount: money(e.amount) }), tone: 'good', sub: e.status ? t('statusDelta', { v: `+${e.status}` }) : undefined }); break;
        case 'inspection':
          audio.denied();
          pushToast({
            icon: 'scroll',
            title: t(`inspectionTitle_${e.level}`),
            text: t(`taxLetter_${e.level}`),
            tone: e.level === 'crime' ? 'rare' : 'info',
            sub: [t('inspectionFine', { amount: money(e.fine) }), t('statusDelta', { v: String(e.status) }), e.seized ? t('inspectionSeized') : '', e.level === 'crime' ? t(e.prison ? 'inspectionPrison' : 'inspectionLawyer') : ''].filter(Boolean).join(' · '),
          });
          break;
        case 'regularize': audio.coin(); pushToast({ icon: 'bank', title: t('regularizeTitle'), text: t(e.amnesty ? 'amnestyText' : 'regularizeText', { amount: money(e.cost) }), tone: 'good' }); break;
        case 'prescribed': audio.achievement(); pushToast({ icon: 'star', title: t('prescribedTitle'), text: t('prescribedText'), tone: 'rare' }); break;
        case 'encounterStart': audio.rare(); break;
        case 'encounterResult':
          if (e.choice !== 'leave') setFade(true);
          window.setTimeout(() => pushToast({ icon: 'star', title: t('romanceKicker'), text: t(e.choice === 'safe' ? 'romanceSafeResult' : e.choice === 'wild' ? 'romanceWildResult' : 'romanceLeaveResult'), tone: 'good' }), e.choice === 'leave' ? 0 : 2200);
          if (e.pregnant) window.setTimeout(() => pushToast({ icon: 'scroll', title: t('romanceKicker'), text: t('romancePregnant'), tone: 'rare' }), 4500);
          break;
        case 'baby': audio.fanfare(); pushToast({ icon: 'star', title: t('babyTitle'), text: t('babyText', { n: e.children }), tone: 'rare' }); break;
        case 'childSupport': pushToast({ icon: 'bank', title: t('childSupportTitle'), text: t('childSupportText', { n: e.children, amount: money(e.amount) }), tone: 'info' }); break;
        case 'chestDrop':
          if (e.source === 'time' || e.source === 'click') {
            audio.rare();
            pushToast({ icon: 'box', title: t(e.rarity === 'legendary' ? 'chestDropLegend' : e.rarity === 'rare' ? 'chestDropRare' : 'chestDrop'), text: t('chestDropText'), tone: e.rarity === 'common' ? 'good' : 'rare' });
          }
          break;
        case 'loginReward': audio.fanfare(); flyToCash(window.innerWidth / 2, window.innerHeight / 2, 10); break;
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
  // One blocking pop-up at a time, most important first.
  const help = nextHelp(s);
  const busy = !!offline || majorPromo !== null || settingsOpen || eventOpen || chestsOpen;
  const leagueResult = s.league.lastResult && !s.flags[`league_${s.league.lastResult.week}`];
  const modal = busy ? null : jailed ? 'jail' : s.pendingVote ? 'vote' : s.login.pendingDay ? 'login' : leagueResult ? 'league' : s.family.pending ? 'romance' : s.pendingDilemma ? 'dilemma' : help ? 'help' : null;
  const unlockAudio = () => {
    audio.unlock();
    setStarted(true);
  };
  const playing = started && !menuOpen && !busy && !modal && !fade;
  useEffect(() => portal.setPlaying(playing), [playing]);
  // Natural breaks for a mid-game ad: after a new social class, jail or a new life.
  const breakAd = () => void portal.midgame();

  return (
    <div className={`app stage-${stage.id} ${reducedMotion(s.settings) ? 'reduced-motion' : ''}`} data-tier={tierForStage(stage.index)} style={{ ['--accent' as string]: stage.accent, ['--accent-dark' as string]: stage.accentDark }} onPointerDown={unlockAudio} onKeyDown={() => setStarted(true)}>
      <TopBar onSettings={() => setSettingsOpen(true)} onMenu={() => setMenuOpen((o) => !o)} menuOpen={menuOpen} menuAlert={menuAlert} />
      <main className="layout">
        <section className="play">
          <SceneView />
          <ActionArea onOpenEvent={() => setEventOpen(true)} onOpenChests={() => setChestsOpen(true)} onOpenLeague={() => openMenu('ranking')} />
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
      {majorPromo !== null && <PromotionModal rankIndex={majorPromo} onClose={() => { setMajorPromo(null); breakAd(); }} />}
      {eventOpen && s.pendingEvent && <EventModal onClose={() => setEventOpen(false)} />}
      {settingsOpen && <SettingsModal runtime={runtime} onClose={() => setSettingsOpen(false)} />}
      {fade && <div className="fade-black" onAnimationEnd={() => setFade(false)}><span>{t('fadeText')}</span></div>}
      {modal === 'jail' && <JailModal reason={jailed ?? 'status'} onClose={() => { setJailed(null); breakAd(); }} />}
      {chestsOpen && <ChestModal onClose={() => setChestsOpen(false)} />}
      {modal === 'vote' && <VoteModal />}
      {modal === 'login' && <LoginModal />}
      {modal === 'league' && <LeagueResultModal />}
      {modal === 'romance' && <RomanceModal />}
      {modal === 'dilemma' && <DilemmaModal />}
      {modal === 'help' && help && <HelpModal topic={help} />}
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
