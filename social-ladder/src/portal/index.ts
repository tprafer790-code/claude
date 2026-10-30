import { PORTAL } from '../edition';

/**
 * Bridge to the web portal's SDK (CrazyGames, HTML5 SDK v3). Every call is a
 * no-op when the build has no portal, when the SDK did not load (ad blocker,
 * offline) or when the page runs outside the portal ("disabled" environment),
 * so the game never depends on it.
 *
 * Docs: https://docs.crazygames.com/sdk/html5-v3/intro
 */

type AdType = 'midgame' | 'rewarded';
interface AdCallbacks {
  adStarted?: () => void;
  adFinished?: () => void;
  adError?: (error: { code: string; message: string }) => void;
}
interface CrazySettings {
  muteAudio?: boolean;
  disableChat?: boolean;
}
interface CrazySdk {
  init(): Promise<void>;
  environment: 'local' | 'crazygames' | 'disabled';
  game: {
    gameplayStart(): void;
    gameplayStop(): void;
    loadingStart(): void;
    loadingStop(): void;
    happytime(): void;
    settings: CrazySettings;
    addSettingsChangeListener(fn: (s: CrazySettings) => void): void;
  };
  ad: { requestAd(type: AdType, callbacks: AdCallbacks): void };
  data: { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void };
}

/** The SDK must answer within this time, or the game starts without it. */
const INIT_TIMEOUT_MS = 5000;

function sdk(): CrazySdk | null {
  if (PORTAL !== 'crazygames' || typeof window === 'undefined') return null;
  return (window as unknown as { CrazyGames?: { SDK?: CrazySdk } }).CrazyGames?.SDK ?? null;
}

class Portal {
  private api: CrazySdk | null = null;
  /** What the SDK was last told, and what the game currently wants. */
  private playing = false;
  private wanted = false;
  private adRunning = false;
  private pauseListeners = new Set<(paused: boolean) => void>();
  private muteListeners = new Set<(muted: boolean) => void>();

  /** True once the SDK is initialised on a portal (or its local test mode). */
  get active() {
    return this.api !== null;
  }

  /** Ads can be offered (rewarded buttons are hidden otherwise). */
  get adsAvailable() {
    return this.active;
  }

  async init(): Promise<void> {
    const api = sdk();
    if (!api) return;
    try {
      await Promise.race([api.init(), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), INIT_TIMEOUT_MS))]);
      if (api.environment === 'disabled') return;
      this.api = api;
      api.game.addSettingsChangeListener((s) => this.muteListeners.forEach((fn) => fn(!!s.muteAudio)));
    } catch {
      this.api = null;
    }
  }

  /** The portal's "mute audio" setting; it wins over the game's own settings. */
  get muteAudio() {
    return !!this.api?.game.settings?.muteAudio;
  }

  onMuteChange(fn: (muted: boolean) => void) {
    this.muteListeners.add(fn);
    return () => void this.muteListeners.delete(fn);
  }

  /** The game pauses while an ad plays. */
  onPause(fn: (paused: boolean) => void) {
    this.pauseListeners.add(fn);
    return () => void this.pauseListeners.delete(fn);
  }

  loadingStart() {
    this.call((a) => a.game.loadingStart());
  }
  loadingStop() {
    this.call((a) => a.game.loadingStop());
  }

  /**
   * Reports whether the player is in gameplay (true) or in a break: a menu,
   * a pop-up or an ad. Repeated values are ignored, so start never follows start.
   */
  setPlaying(on: boolean) {
    this.wanted = on;
    if (!this.adRunning) this.report(on);
  }

  private report(on: boolean) {
    if (on === this.playing) return;
    this.playing = on;
    this.call((a) => (on ? a.game.gameplayStart() : a.game.gameplayStop()));
  }

  /** A moment of joy (a new social class): used sparingly, as the docs ask. */
  happytime() {
    this.call((a) => a.game.happytime());
  }

  /** Mid-game ad at a natural break. The portal enforces its own cooldown. */
  midgame(): Promise<void> {
    return this.ad('midgame').then(() => undefined);
  }

  /** Rewarded ad. Resolves true only when the ad played to the end. */
  rewarded(): Promise<boolean> {
    return this.ad('rewarded');
  }

  /** localStorage-compatible store synced to the player's account, when available. */
  get storage() {
    return this.api?.data ?? null;
  }

  private ad(type: AdType): Promise<boolean> {
    const api = this.api;
    if (!api || this.adRunning) return Promise.resolve(false);
    return new Promise((resolve) => {
      let started = false;
      const end = (ok: boolean) => {
        if (started) {
          this.adRunning = false;
          this.pauseListeners.forEach((fn) => fn(false));
          // Back to whatever the game wants now (it may have changed during the ad).
          this.report(this.wanted);
        }
        resolve(ok);
      };
      try {
        api.ad.requestAd(type, {
          adStarted: () => {
            started = true;
            this.report(false);
            this.adRunning = true;
            this.pauseListeners.forEach((fn) => fn(true));
          },
          adFinished: () => end(true),
          // Unfilled, cooldown, ad blocker: no reward, the game simply goes on.
          adError: () => end(false),
        });
      } catch {
        end(false);
      }
    });
  }

  private call(fn: (api: CrazySdk) => void) {
    if (!this.api) return;
    try {
      fn(this.api);
    } catch {
      /* the SDK must never break the game */
    }
  }
}

export const portal = new Portal();
