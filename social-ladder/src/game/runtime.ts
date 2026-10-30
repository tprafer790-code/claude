import { ECONOMY } from '../config/economy';
import { GameEngine, type OfflineSummary } from './engine';
import { importSave, loadFrom, saveTo, SAVE_KEY, BACKUP_KEY, type KeyValueStore } from './persistence';
import { createInitialState, type GameState } from './state';

/** Gap after which a frozen/background tab is treated as "time away". */
const AWAY_THRESHOLD_MS = 5000;

function safeStorage(): KeyValueStore {
  try {
    const k = '__sl_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    const mem = new Map<string, string>();
    return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) };
  }
}

/**
 * Browser runtime: owns the engine, the fixed-rate game loop, autosave and
 * offline/away detection. Kept separate from the engine so the engine stays
 * pure and testable.
 */
export class Runtime {
  engine: GameEngine;
  readonly store = safeStorage();
  recoveredFromBackup = false;
  private lastTick = Date.now();
  private sinceSave = 0;
  private timer: number | null = null;
  private awayListeners = new Set<(s: OfflineSummary) => void>();
  pendingOffline: OfflineSummary | null = null;

  constructor() {
    const loaded = loadFrom(this.store);
    this.engine = new GameEngine(loaded?.state ?? createInitialState());
    this.recoveredFromBackup = !!loaded?.recovered;
    if (loaded) this.pendingOffline = this.engine.applyOffline(loaded.state.lastSavedAt);
    this.engine.ensureDaily(today());
  }

  onAway(fn: (s: OfflineSummary) => void) {
    this.awayListeners.add(fn);
    return () => void this.awayListeners.delete(fn);
  }

  start() {
    if (this.timer !== null) return;
    this.lastTick = Date.now();
    this.timer = window.setInterval(() => this.loop(), 1000 / ECONOMY.tickRate);
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('pagehide', this.saveNow);
    window.addEventListener('beforeunload', this.saveNow);
  }

  private onVisibility = () => {
    this.engine.visible = document.visibilityState === 'visible';
    if (!this.engine.visible) this.saveNow();
    else this.loop();
  };

  private loop() {
    const now = Date.now();
    const gap = now - this.lastTick;
    this.lastTick = now;
    if (gap > AWAY_THRESHOLD_MS) {
      // Tab was frozen or in background: credit it as offline time (with the same rules).
      const summary = this.engine.applyOffline(now - gap);
      if (summary) this.awayListeners.forEach((fn) => fn(summary));
      this.engine.ensureDaily(today());
      return;
    }
    if (gap <= 0) return;
    this.engine.tick(gap / 1000);
    this.sinceSave += gap / 1000;
    if (this.sinceSave >= ECONOMY.autosaveSeconds) this.saveNow();
  }

  saveNow = () => {
    this.sinceSave = 0;
    try {
      saveTo(this.store, this.engine.state);
    } catch {
      /* storage full or blocked: the game keeps running */
    }
  };

  /** Replaces the whole state (import / hard reset) and persists it. */
  replaceState(state: GameState) {
    this.engine.state = state;
    this.engine.opportunity = null;
    this.engine.changed();
    this.saveNow();
  }

  importCode(code: string) {
    const state = importSave(code);
    state.lastSavedAt = Date.now();
    this.replaceState(state);
  }

  hardReset() {
    this.store.removeItem(SAVE_KEY);
    this.store.removeItem(BACKUP_KEY);
    const fresh = createInitialState();
    fresh.settings = { ...this.engine.state.settings };
    this.replaceState(fresh);
  }
}

export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
