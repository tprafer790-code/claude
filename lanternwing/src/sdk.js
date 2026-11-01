// Envoltorio del SDK HTML5 v3 de CrazyGames.
// El juego debe funcionar igual si el SDK no carga (bloqueador, sin conexión)
// o si se ejecuta fuera de CrazyGames, donde todas las llamadas lanzan error.
(function () {
  "use strict";

  // Anuncios recompensados: activar solo tras el paso a Full Launch, poniendo
  // window.LW_CONFIG = { rewarded: true } en index.html. En Basic Launch los anuncios
  // están desactivados y un botón recompensado sin efecto es motivo de rechazo.
  const ENABLE_REWARDED = !!(window.LW_CONFIG && window.LW_CONFIG.rewarded);

  const state = {
    ready: false,
    sdk: null,
    environment: "none",
    adblock: false,
    rewardedAvailable: false,
    inGameplay: false,
  };

  function sdk() {
    return state.ready ? state.sdk : null;
  }

  function safe(fn) {
    try {
      const r = fn();
      if (r && typeof r.catch === "function") r.catch(() => {});
      return r;
    } catch (e) {
      return undefined;
    }
  }

  async function init() {
    const cg = window.CrazyGames && window.CrazyGames.SDK;
    if (!cg) return state;
    try {
      await cg.init();
      state.sdk = cg;
      state.ready = true;
      state.environment = cg.environment || "unknown";
      if (state.environment === "disabled") {
        state.ready = false;
        return state;
      }
      try {
        state.adblock = !!(await cg.ad.hasAdblock());
      } catch (e) {
        state.adblock = false;
      }
      state.rewardedAvailable =
        ENABLE_REWARDED && state.environment === "crazygames" && !state.adblock;
    } catch (e) {
      state.ready = false;
    }
    return state;
  }

  function locale() {
    const s = sdk();
    const info = s && safe(() => s.user && s.user.systemInfo);
    return (info && info.locale) || navigator.language || "en";
  }

  function deviceType() {
    const s = sdk();
    const info = s && safe(() => s.user && s.user.systemInfo);
    return (info && info.device && info.device.type) || null;
  }

  function loadingStart() {
    const s = sdk();
    if (s) safe(() => s.game.loadingStart());
  }
  function loadingStop() {
    const s = sdk();
    if (s) safe(() => s.game.loadingStop());
  }
  function gameplayStart() {
    if (state.inGameplay) return;
    state.inGameplay = true;
    const s = sdk();
    if (s) safe(() => s.game.gameplayStart());
  }
  function gameplayStop() {
    if (!state.inGameplay) return;
    state.inGameplay = false;
    const s = sdk();
    if (s) safe(() => s.game.gameplayStop());
  }
  function happytime() {
    const s = sdk();
    if (s) safe(() => s.game.happytime());
  }

  // Pide un anuncio. Devuelve una promesa que se resuelve con true si terminó
  // correctamente y false si hubo error (sin relleno, bloqueador, desactivado…).
  // onStart se llama solo cuando el anuncio empieza de verdad (para silenciar).
  function requestAd(type, onStart) {
    const s = sdk();
    if (!s) return Promise.resolve(false);
    return new Promise((resolve) => {
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        resolve(ok);
      };
      try {
        s.ad.requestAd(type, {
          adStarted: () => {
            if (onStart) onStart();
          },
          adFinished: () => finish(true),
          adError: (err) => {
            if (type === "rewarded" && err && err.code === "adsDisabled") {
              state.rewardedAvailable = false;
            }
            finish(false);
          },
        });
      } catch (e) {
        finish(false);
      }
    });
  }

  // Almacenamiento: módulo Data del SDK (sincroniza con la cuenta) o localStorage.
  function storage() {
    const s = sdk();
    if (s && s.data) return s.data;
    try {
      const k = "__lw_test__";
      window.localStorage.setItem(k, "1");
      window.localStorage.removeItem(k);
      return window.localStorage;
    } catch (e) {
      return null;
    }
  }

  function load(key) {
    const st = storage();
    if (!st) return null;
    try {
      let raw = st.getItem(key);
      // Migración: si el SDK no tiene datos, usar los de localStorage si existen.
      if (raw == null && st !== window.localStorage) {
        try {
          raw = window.localStorage.getItem(key);
        } catch (e) {}
      }
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function save(key, value) {
    const st = storage();
    if (!st) return;
    try {
      st.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  window.LW = window.LW || {};
  window.LW.platform = {
    init,
    state,
    locale,
    deviceType,
    loadingStart,
    loadingStop,
    gameplayStart,
    gameplayStop,
    happytime,
    requestAd,
    load,
    save,
  };
})();
