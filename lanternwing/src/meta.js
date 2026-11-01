// Lanternwing — progresión entre partidas: misiones, polillas desbloqueables y noches.
// Objetivo: dar siempre al jugador una meta cercana y visible ("una partida más").
(function () {
  "use strict";

  // Polillas: cada una empieza con un arma distinta y una ventaja pequeña.
  // Cambian la forma de jugar sin desequilibrar la partida.
  const MOTHS = [
    { id: "lantern", cost: 0, weapon: "bolt", color: "#ffb347", perk: {} },
    { id: "rose", cost: 150, weapon: "halo", color: "#ff7fb5", perk: { hp: 20 } },
    { id: "frost", cost: 300, weapon: "pulse", color: "#7fd8ff", perk: { area: 0.1 } },
    { id: "glow", cost: 450, weapon: "fly", color: "#9cf05a", perk: { magnet: 0.25 } },
    { id: "star", cost: 650, weapon: "star", color: "#b48cff", perk: { cd: 0.08 } },
  ];

  // Noches: cada victoria desbloquea una noche más difícil que paga más néctar.
  const MAX_NIGHT = 5;
  function nightMods(n) {
    const k = Math.max(0, n - 1);
    return { hp: 1 + 0.5 * k, spawn: 1 + 0.2 * k, nectar: 1 + 0.5 * k };
  }

  // Misiones: 3 activas a la vez; al completarse se sustituyen por otra de nivel superior.
  // "run": se mide dentro de una sola partida. "total": se acumula entre partidas.
  const MISSIONS = {
    kills: { scope: "run", targets: [100, 250, 450, 700, 1000, 1400], reward: 30 },
    survive: { scope: "run", targets: [60, 120, 180, 240, 300, 300], reward: 30 },
    level: { scope: "run", targets: [8, 12, 15, 18, 22, 26], reward: 35 },
    boss: { scope: "run", targets: [1, 1, 2, 2, 2, 2], reward: 50 },
    nectarRun: { scope: "run", targets: [8, 15, 25, 40, 60, 90], reward: 35 },
    maxWeapon: { scope: "run", targets: [1, 1, 2, 2, 3, 3], reward: 45 },
    combo: { scope: "run", targets: [50, 100, 200, 350, 500, 700], reward: 35 },
    totalKills: { scope: "total", targets: [500, 1500, 3000, 6000, 10000, 16000], reward: 60 },
    wins: { scope: "total", targets: [1, 2, 4, 6, 9, 12], reward: 80 },
  };
  const TYPES = Object.keys(MISSIONS);

  function migrate(save) {
    const d = {
      night: 1, // noche máxima desbloqueada
      nightSel: 1,
      nightBest: {},
      moth: "lantern",
      moths: ["lantern"],
      missions: [],
      mTier: {},
      totalKills: 0,
      missionsDone: 0,
      bestCombo: 0,
    };
    for (const k in d) if (save[k] === undefined) save[k] = d[k];
    if (!Array.isArray(save.moths) || save.moths.indexOf("lantern") === -1) save.moths = ["lantern"];
    if (!getMoth(save.moth) || save.moths.indexOf(save.moth) === -1) save.moth = "lantern";
    save.night = Math.min(MAX_NIGHT, Math.max(1, save.night | 0));
    save.nightSel = Math.min(save.night, Math.max(1, save.nightSel | 0));
    save.missions = (save.missions || []).filter((m) => m && MISSIONS[m.type]);
    return save;
  }

  function getMoth(id) {
    for (const m of MOTHS) if (m.id === id) return m;
    return null;
  }

  function target(type, tier) {
    const t = MISSIONS[type].targets;
    const base = t[Math.min(tier, t.length - 1)];
    // más allá de la tabla, la meta sigue creciendo poco a poco
    return tier < t.length ? base : Math.round(base * (1 + 0.25 * (tier - t.length + 1)));
  }

  function reward(type, tier) {
    return Math.round(MISSIONS[type].reward * (1 + 0.5 * tier));
  }

  function newMission(save, rand, exclude) {
    const pool = TYPES.filter((t) => exclude.indexOf(t) === -1);
    // la primera misión de un jugador nuevo es siempre alcanzable en la primera partida
    const type = save.missionsDone === 0 && exclude.indexOf("kills") === -1 ? "kills" : pool[(rand() * pool.length) | 0];
    const tier = save.mTier[type] || 0;
    return { type, tier, target: target(type, tier) };
  }

  function ensureMissions(save, rand) {
    while (save.missions.length < 3) {
      save.missions.push(newMission(save, rand, save.missions.map((m) => m.type)));
    }
  }

  // ctx: valores de la partida en curso (o null fuera de partida).
  function progress(m, save, ctx) {
    const c = ctx || {};
    switch (m.type) {
      case "kills": return c.kills || 0;
      case "survive": return Math.floor(c.time || 0);
      case "level": return c.level || 0;
      case "boss": return c.bosses || 0;
      case "nectarRun": return c.nectar || 0;
      case "maxWeapon": return c.maxed || 0;
      case "combo": return c.bestCombo || 0;
      case "totalKills": return save.totalKills + (c.pendingKills || 0);
      case "wins": return save.wins;
      default: return 0;
    }
  }

  // Comprueba y cobra las misiones cumplidas. Devuelve la lista de completadas.
  function check(save, ctx, rand) {
    const done = [];
    for (let i = 0; i < save.missions.length; i++) {
      const m = save.missions[i];
      // una misión nueva no cuenta hasta la siguiente partida: evita completar
      // misiones en cadena dentro de una misma noche y mantiene metas para volver
      if (m.fresh) continue;
      if (progress(m, save, ctx) >= m.target) {
        const r = reward(m.type, m.tier);
        save.nectar += r;
        save.missionsDone++;
        save.mTier[m.type] = (save.mTier[m.type] || 0) + 1;
        done.push({ type: m.type, target: m.target, reward: r });
        const others = save.missions.filter((_, j) => j !== i).map((x) => x.type).concat([m.type]);
        save.missions[i] = newMission(save, rand, others);
        save.missions[i].fresh = true;
      }
    }
    return done;
  }

  // Al empezar una partida, las misiones nuevas pasan a estar activas.
  function activate(save) {
    for (const m of save.missions) delete m.fresh;
  }

  window.LW = window.LW || {};
  window.LW.meta = { MOTHS, MAX_NIGHT, MISSIONS, nightMods, migrate, getMoth, ensureMissions, activate, progress, check, reward };
})();
