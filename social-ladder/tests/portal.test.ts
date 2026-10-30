import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PORTAL } from '../src/edition';

/** A fake CrazyGames SDK that records every call. */
function fakeSdk(environment = 'crazygames', ad: 'finish' | 'error' | 'none' = 'finish') {
  const calls: string[] = [];
  const sdk = {
    environment,
    init: vi.fn(async () => void calls.push('init')),
    game: {
      settings: { muteAudio: false },
      gameplayStart: () => calls.push('start'),
      gameplayStop: () => calls.push('stop'),
      loadingStart: () => calls.push('loadingStart'),
      loadingStop: () => calls.push('loadingStop'),
      happytime: () => calls.push('happytime'),
      addSettingsChangeListener: () => undefined,
    },
    ad: {
      requestAd: (type: string, cb: { adStarted?: () => void; adFinished?: () => void; adError?: (e: unknown) => void }) => {
        calls.push(`ad:${type}`);
        if (ad === 'none') return cb.adError?.({ code: 'unfilled', message: 'No ad available' });
        cb.adStarted?.();
        if (ad === 'finish') cb.adFinished?.();
        else cb.adError?.({ code: 'other', message: 'failed' });
      },
    },
    data: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined },
  };
  (globalThis as unknown as { window: unknown }).window = { CrazyGames: { SDK: sdk } };
  return calls;
}

async function freshPortal() {
  vi.resetModules();
  return (await import('../src/portal')).portal;
}

describe.runIf(PORTAL === 'crazygames')('CrazyGames portal', () => {
  beforeEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it('reports gameplay start and stop without repeats', async () => {
    const calls = fakeSdk();
    const portal = await freshPortal();
    await portal.init();
    portal.setPlaying(true);
    portal.setPlaying(true);
    portal.setPlaying(false);
    portal.setPlaying(false);
    portal.setPlaying(true);
    expect(calls.filter((c) => c === 'start' || c === 'stop')).toEqual(['start', 'stop', 'start']);
  });

  it('pauses during an ad and rewards only a finished ad', async () => {
    const calls = fakeSdk('crazygames', 'finish');
    const portal = await freshPortal();
    await portal.init();
    const pauses: boolean[] = [];
    portal.onPause((p) => pauses.push(p));
    portal.setPlaying(true);
    expect(await portal.rewarded()).toBe(true);
    expect(pauses).toEqual([true, false]);
    // Gameplay stops for the ad and resumes after it.
    expect(calls.filter((c) => c === 'start' || c === 'stop')).toEqual(['start', 'stop', 'start']);

    fakeSdk('crazygames', 'error');
    const failing = await freshPortal();
    await failing.init();
    expect(await failing.rewarded()).toBe(false);
  });

  it('carries on when no ad is available', async () => {
    fakeSdk('crazygames', 'none');
    const portal = await freshPortal();
    await portal.init();
    const pauses: boolean[] = [];
    portal.onPause((p) => pauses.push(p));
    expect(await portal.rewarded()).toBe(false);
    expect(pauses).toEqual([]);
  });

  it('stays inert outside CrazyGames or without the SDK', async () => {
    const calls = fakeSdk('disabled');
    const portal = await freshPortal();
    await portal.init();
    portal.setPlaying(true);
    expect(portal.active).toBe(false);
    expect(await portal.rewarded()).toBe(false);
    expect(calls).toEqual(['init']);

    delete (globalThis as { window?: unknown }).window;
    const none = await freshPortal();
    await none.init();
    expect(none.active).toBe(false);
  });
});

describe.runIf(PORTAL === 'crazygames')('CrazyGames portal during ads', () => {
  it('resumes gameplay if the game asked for it while the ad played', async () => {
    const calls = fakeSdk('crazygames', 'finish');
    // Hold the ad open until the game has changed its mind.
    let finish = () => undefined as void;
    (globalThis as unknown as { window: { CrazyGames: { SDK: { ad: { requestAd: unknown } } } } }).window.CrazyGames.SDK.ad.requestAd = (_t: string, cb: { adStarted: () => void; adFinished: () => void }) => {
      cb.adStarted();
      finish = cb.adFinished;
    };
    const portal = await freshPortal();
    await portal.init();
    const ad = portal.midgame();
    portal.setPlaying(true);
    expect(calls.filter((c) => c === 'start')).toEqual([]);
    finish();
    await ad;
    expect(calls.filter((c) => c === 'start' || c === 'stop')).toEqual(['start']);
  });
});
