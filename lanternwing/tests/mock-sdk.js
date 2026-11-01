// SDK simulado para las pruebas: registra cada llamada en window.__sdkCalls.
// Se sirve en lugar de https://sdk.crazygames.com/crazygames-sdk-v3.js.
(function () {
  const calls = (window.__sdkCalls = []);
  const log = (name, arg) => calls.push(arg === undefined ? name : name + ":" + arg);
  const store = {};
  const adMode = window.__adMode || "finish"; // finish | error
  window.CrazyGames = {
    SDK: {
      environment: "crazygames",
      init: () => { log("init"); return Promise.resolve(); },
      game: {
        loadingStart: () => log("loadingStart"),
        loadingStop: () => log("loadingStop"),
        gameplayStart: () => log("gameplayStart"),
        gameplayStop: () => log("gameplayStop"),
        happytime: () => log("happytime"),
      },
      ad: {
        hasAdblock: () => Promise.resolve(false),
        requestAd: (type, cb) => {
          log("requestAd", type);
          setTimeout(() => {
            if (adMode === "error") return cb.adError({ code: "unfilled", message: "No ad" });
            cb.adStarted();
            log("adStarted", type);
            setTimeout(() => cb.adFinished(), 50);
          }, 20);
        },
      },
      user: { systemInfo: { locale: window.__locale || "en-US", device: { type: "desktop" } } },
      data: {
        getItem: (k) => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); log("data.setItem"); },
        removeItem: (k) => { delete store[k]; },
        clear: () => { for (const k in store) delete store[k]; },
      },
    },
  };
})();
