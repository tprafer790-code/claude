// Lanternwing — supervivencia nocturna contra hordas de sombras.
// Canvas 2D sin dependencias. Simulación a paso fijo (60 Hz) con interpolación
// de dibujo, para que la física sea idéntica a 60, 144 o 165 Hz.
(function () {
  "use strict";

  const { t, setLocale } = window.LW.i18n;
  const P = window.LW.platform;
  const A = window.LW.audio;

  // ---------------------------------------------------------------------------
  // Constantes de diseño
  // ---------------------------------------------------------------------------
  const STEP = 1 / 60;
  const RUN_TIME = 300; // 5 minutos hasta el amanecer
  const BOSS_TIMES = [150, 255];
  const RING_TIMES = [60, 120, 200];
  const FINAL_SWARM = 270;
  const MAX_ENEMIES = 340;
  const MAX_PARTICLES = 420;
  const MAX_GEMS = 320;
  const VIEW_UNITS = 560; // unidades de mundo visibles en el lado corto de la pantalla
  const SAVE_KEY = "lanternwing_save_v1";

  const ENEMY_TYPES = {
    crawler: { r: 11, hp: 9, speed: 54, dmg: 6, xp: 1, nectar: 0.03 },
    skitter: { r: 8, hp: 6, speed: 98, dmg: 5, xp: 1, nectar: 0.03 },
    brute: { r: 22, hp: 80, speed: 40, dmg: 14, xp: 5, nectar: 0.3 },
    boss: { r: 46, hp: 1700, speed: 48, dmg: 22, xp: 40, nectar: 1 },
  };

  const WEAPONS = ["bolt", "halo", "pulse", "star", "fly"];
  const PASSIVES = ["wing", "heart", "lens", "bloom", "tempo", "magnet"];
  const MAX_LEVEL = 5;
  const COLORS = {
    bolt: "#ffe08a",
    halo: "#ff9ec7",
    pulse: "#9fe7ff",
    star: "#c9a7ff",
    fly: "#b6ff7a",
    wing: "#8fd3ff",
    heart: "#ff8a8a",
    lens: "#e6f2ff",
    bloom: "#ffb6f0",
    tempo: "#a7b8ff",
    magnet: "#7affd8",
    heal: "#7fc8ff",
  };

  const SHOP = [
    { id: "vit", base: 30 },
    { id: "spd", base: 30 },
    { id: "dmg", base: 40 },
    { id: "mag", base: 25 },
    { id: "gold", base: 50 },
    { id: "reg", base: 45 },
  ];
  const SHOP_MAX = 5;
  const shopCost = (item, lvl) => Math.round(item.base * Math.pow(1.6, lvl));

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------
  let seed = (Date.now() ^ 0x5f3759df) >>> 0;
  function rand() {
    // xorshift32: rápido y reproducible si se fija la semilla en pruebas
    seed ^= seed << 13;
    seed >>>= 0;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    seed >>>= 0;
    return seed / 4294967296;
  }
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const $ = (id) => document.getElementById(id);

  function fmtTime(s) {
    s = Math.max(0, Math.floor(s));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  // ---------------------------------------------------------------------------
  // Lienzo y escalado
  // ---------------------------------------------------------------------------
  const canvas = $("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  let W = 0, H = 0, DPR = 1, maxDPR = 2, K = 1, UI = 1;
  let vignette = null;
  let bgPattern = null;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, maxDPR);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    K = Math.min(W, H) / VIEW_UNITS; // píxeles CSS por unidad de mundo
    UI = clamp(Math.min(W, H) / 450, 1, 2.2);
    buildVignette();
  }

  function buildVignette() {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(W / 4));
    c.height = Math.max(1, Math.round(H / 4));
    const g = c.getContext("2d");
    const cx = c.width / 2, cy = c.height / 2;
    const r = Math.hypot(cx, cy);
    const grad = g.createRadialGradient(cx, cy, r * 0.25, cx, cy, r);
    grad.addColorStop(0, "rgba(3,5,12,0)");
    grad.addColorStop(0.6, "rgba(3,5,12,0.35)");
    grad.addColorStop(1, "rgba(3,5,12,0.82)");
    g.fillStyle = grad;
    g.fillRect(0, 0, c.width, c.height);
    vignette = c;
  }

  // ---------------------------------------------------------------------------
  // Sprites pre-renderizados (se dibujan una vez y se reutilizan: clave del rendimiento)
  // ---------------------------------------------------------------------------
  const SPR_RES = 3; // resolución interna por unidad de mundo
  const glowCache = new Map();

  function glow(color, radius) {
    const key = color + radius;
    let c = glowCache.get(key);
    if (c) return c;
    c = document.createElement("canvas");
    const size = Math.ceil(radius * 2 * SPR_RES);
    c.width = c.height = size;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.18, color);
    grad.addColorStop(0.45, hexA(color, 0.35));
    grad.addColorStop(1, hexA(color, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    glowCache.set(key, c);
    return c;
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  function makeEnemySprite(type, flash) {
    const r = ENEMY_TYPES[type].r;
    const pad = 1.6;
    const size = Math.ceil(r * 2 * pad * SPR_RES);
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    g.translate(size / 2, size / 2);
    g.scale(SPR_RES, SPR_RES);
    const body = flash ? "#ffffff" : type === "boss" ? "#22102e" : "#160f26";
    const rim = type === "boss" ? "#ff5fd2" : type === "skitter" ? "#53d8d0" : "#8a5cff";
    const eye = type === "skitter" ? "#c6fff9" : "#ff4d6d";
    // halo exterior para que la silueta destaque sobre el fondo oscuro
    const grad = g.createRadialGradient(0, 0, r * 0.6, 0, 0, r * pad);
    grad.addColorStop(0, hexA(rim, 0.45));
    grad.addColorStop(1, hexA(rim, 0));
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, r * pad, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = body;
    g.strokeStyle = flash ? "#ffffff" : rim;
    g.lineWidth = Math.max(1.2, r * 0.12);
    if (type === "skitter") {
      // polilla de sombra: alas triangulares
      g.beginPath();
      g.moveTo(r * 1.1, 0);
      g.lineTo(-r * 0.8, r * 1.1);
      g.lineTo(-r * 0.3, 0);
      g.lineTo(-r * 0.8, -r * 1.1);
      g.closePath();
      g.fill();
      g.stroke();
    } else {
      // escarabajo: patas, caparazón y cabeza
      g.strokeStyle = flash ? "#ffffff" : hexA(rim, 0.8);
      for (let i = -1; i <= 1; i++) {
        g.beginPath();
        g.moveTo(i * r * 0.45, -r * 0.6);
        g.lineTo(i * r * 0.6 - r * 0.1, -r * 1.15);
        g.moveTo(i * r * 0.45, r * 0.6);
        g.lineTo(i * r * 0.6 - r * 0.1, r * 1.15);
        g.stroke();
      }
      g.strokeStyle = flash ? "#ffffff" : rim;
      g.beginPath();
      g.ellipse(-r * 0.1, 0, r * 0.95, r * 0.8, 0, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.beginPath();
      g.moveTo(-r * 1.0, 0);
      g.lineTo(r * 0.7, 0);
      g.stroke();
      g.beginPath();
      g.arc(r * 0.8, 0, r * 0.38, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      if (type === "brute" || type === "boss") {
        g.beginPath();
        g.moveTo(r * 1.05, -r * 0.15);
        g.lineTo(r * 1.5, -r * 0.45);
        g.lineTo(r * 1.15, r * 0.05);
        g.closePath();
        g.fillStyle = flash ? "#ffffff" : rim;
        g.fill();
      }
      if (type === "boss") {
        for (let i = 0; i < 5; i++) {
          const a = -0.9 + i * 0.45;
          g.beginPath();
          g.moveTo(-r * 0.1 + Math.cos(a + Math.PI) * r * 0.8, Math.sin(a + Math.PI) * r * 0.8);
          g.lineTo(-r * 0.1 + Math.cos(a + Math.PI) * r * 1.25, Math.sin(a + Math.PI) * r * 1.25);
          g.stroke();
        }
      }
    }
    // ojos
    g.fillStyle = flash ? "#ffffff" : eye;
    const ex = type === "skitter" ? r * 0.45 : r * 0.92;
    g.beginPath();
    g.arc(ex, -r * 0.16, Math.max(1.2, r * 0.12), 0, Math.PI * 2);
    g.arc(ex, r * 0.16, Math.max(1.2, r * 0.12), 0, Math.PI * 2);
    g.fill();
    return { c, size: size / SPR_RES };
  }

  const enemySprites = {};
  for (const type of Object.keys(ENEMY_TYPES)) {
    enemySprites[type] = [makeEnemySprite(type, false), makeEnemySprite(type, true)];
  }

  function buildBackground() {
    const S = 256;
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const g = c.getContext("2d");
    g.fillStyle = "#0e1a22";
    g.fillRect(0, 0, S, S);
    // Cada forma se dibuja también desplazada un mosaico en cada dirección:
    // así el patrón se repite sin costuras visibles.
    const wrap = (fn) => {
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) fn(ox, oy);
    };
    // manchas de musgo
    for (let i = 0; i < 18; i++) {
      const x = rand() * S, y = rand() * S, r = 10 + rand() * 30;
      g.fillStyle = i % 2 ? "rgba(30,58,52,0.35)" : "rgba(20,40,48,0.4)";
      wrap((ox, oy) => {
        g.beginPath();
        g.arc(x + ox, y + oy, r, 0, Math.PI * 2);
        g.fill();
      });
    }
    // briznas de hierba
    g.strokeStyle = "rgba(70,120,100,0.35)";
    g.lineWidth = 1.2;
    for (let i = 0; i < 90; i++) {
      const x = rand() * S, y = rand() * S;
      const dx = (rand() - 0.5) * 5, dy = -4 - rand() * 6;
      wrap((ox, oy) => {
        g.beginPath();
        g.moveTo(x + ox, y + oy);
        g.lineTo(x + ox + dx, y + oy + dy);
        g.stroke();
      });
    }
    // flores dormidas
    const petals = ["#3f4f8f", "#5a3f7f", "#2f6f6f"];
    for (let i = 0; i < 9; i++) {
      const x = rand() * S, y = rand() * S;
      wrap((ox, oy) => {
        g.fillStyle = petals[i % 3];
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2;
          g.beginPath();
          g.arc(x + ox + Math.cos(a) * 3, y + oy + Math.sin(a) * 3, 2.4, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = "#c8b46a";
        g.beginPath();
        g.arc(x + ox, y + oy, 1.6, 0, Math.PI * 2);
        g.fill();
      });
    }
    bgPattern = ctx.createPattern(c, "repeat");
  }

  // ---------------------------------------------------------------------------
  // Guardado
  // ---------------------------------------------------------------------------
  let save = null;
  function defaultSave() {
    return {
      v: 1,
      nectar: 0,
      up: { vit: 0, spd: 0, dmg: 0, mag: 0, gold: 0, reg: 0 },
      best: 0,
      bestKills: 0,
      runs: 0,
      wins: 0,
      muted: false,
      tut: false,
    };
  }
  function loadSave() {
    const d = defaultSave();
    const s = P.load(SAVE_KEY);
    if (s && typeof s === "object") {
      Object.assign(d, s);
      d.up = Object.assign(defaultSave().up, s.up || {});
    }
    return d;
  }
  function persist() {
    P.save(SAVE_KEY, save);
  }

  // ---------------------------------------------------------------------------
  // Entrada: teclado (por posición física, válido en QWERTY y AZERTY) y puntero
  // ---------------------------------------------------------------------------
  const keys = new Set();
  const joy = { active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0 };
  const JOY_R = 56;

  window.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });
  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    keys.add(e.code);
    onKey(e);
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => {
    keys.clear();
    joy.active = false;
    if (state === "play") pauseGame();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "play") pauseGame();
  });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("pointerdown", (e) => {
    if (state !== "play") return;
    joy.active = true;
    joy.id = e.pointerId;
    joy.ox = joy.x = e.clientX;
    joy.oy = joy.y = e.clientY;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) {}
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!joy.active || e.pointerId !== joy.id) return;
    joy.x = e.clientX;
    joy.y = e.clientY;
    // el origen sigue al dedo si se aleja demasiado: el joystick nunca "se queda corto"
    const dx = joy.x - joy.ox, dy = joy.y - joy.oy;
    const d = Math.hypot(dx, dy);
    if (d > JOY_R * 1.5) {
      joy.ox = joy.x - (dx / d) * JOY_R * 1.5;
      joy.oy = joy.y - (dy / d) * JOY_R * 1.5;
    }
  });
  const endJoy = (e) => {
    if (e.pointerId === joy.id) joy.active = false;
  };
  canvas.addEventListener("pointerup", endJoy);
  canvas.addEventListener("pointercancel", endJoy);

  let botInput = null; // solo para pruebas automatizadas
  function inputVector() {
    if (botInput) return botInput;
    let x = 0, y = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) y -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) y += 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) x -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
    if (x || y) {
      const d = Math.hypot(x, y);
      return [x / d, y / d];
    }
    if (joy.active) {
      const dx = joy.x - joy.ox, dy = joy.y - joy.oy;
      const d = Math.hypot(dx, dy);
      if (d > 6) {
        const m = Math.min(1, d / JOY_R);
        return [(dx / d) * m, (dy / d) * m];
      }
    }
    return [0, 0];
  }

  // ---------------------------------------------------------------------------
  // Estado de la partida
  // ---------------------------------------------------------------------------
  let state = "loading"; // loading | play | levelup | paused | ending | ad | results | home
  let run = null;
  let enemies = [], bullets = [], gems = [], particles = [], rings = [], fireflies = [];
  let nextId = 1;
  let banner = { text: "", time: 0 };
  let shake = 0;

  // Rejilla espacial (hash) para colisiones: evita comparar todos contra todos.
  const CELL = 64;
  const BUCKETS = 4096;
  const bucketHead = new Int32Array(BUCKETS);
  const bucketNext = new Int32Array(MAX_ENEMIES + 8);
  function cellKey(cx, cy) {
    return ((cx * 73856093) ^ (cy * 19349663)) & (BUCKETS - 1);
  }
  function buildGrid() {
    bucketHead.fill(-1);
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const k = cellKey(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
      bucketNext[i] = bucketHead[k];
      bucketHead[k] = i;
    }
  }
  // Llama a fn(enemigo) para los enemigos cercanos a (x, y) dentro de radio r.
  // Si fn devuelve true, se detiene la búsqueda.
  const seenStamp = new Uint32Array(MAX_ENEMIES + 8);
  let stamp = 1;
  function queryEnemies(x, y, r, fn) {
    stamp++;
    const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL);
    const y0 = Math.floor((y - r) / CELL), y1 = Math.floor((y + r) / CELL);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        let i = bucketHead[cellKey(cx, cy)];
        while (i !== -1) {
          if (seenStamp[i] !== stamp) {
            seenStamp[i] = stamp;
            const e = enemies[i];
            if (e && e.hp > 0) {
              const dx = e.x - x, dy = e.y - y, rr = r + e.r;
              if (dx * dx + dy * dy < rr * rr && fn(e)) return;
            }
          }
          i = bucketNext[i];
        }
      }
    }
  }

  function newRun() {
    const up = save.up;
    const maxHp = 100 + up.vit * 10;
    enemies = [];
    bullets = [];
    gems = [];
    particles = [];
    rings = [];
    fireflies = [];
    shake = 0;
    run = {
      time: 0,
      kills: 0,
      level: 1,
      xp: 0,
      need: xpNeed(1),
      pendingLevels: 0,
      nectar: 0,
      spawnAcc: 0,
      bossIdx: 0,
      ringIdx: 0,
      finalAnnounced: false,
      boss: null,
      endTimer: 0,
      won: false,
      player: {
        x: 0, y: 0, px: 0, py: 0,
        r: 13,
        hp: maxHp,
        maxHp,
        invuln: 0,
        face: 0,
        flap: 0,
        hurtFlash: 0,
      },
      weapons: { bolt: 1, halo: 0, pulse: 0, star: 0, fly: 0 },
      passives: { wing: 0, heart: 0, lens: 0, bloom: 0, tempo: 0, magnet: 0 },
      timers: { bolt: 0.4, pulse: 1.5, star: 1, haloAngle: 0 },
      tutorial: !save.tut ? 1 : 0,
      tutorialMoved: 0,
    };
  }

  function xpNeed(l) {
    return Math.round(2 + l * 2.5 + l * l * 0.28);
  }

  function stats() {
    const pa = run.passives, up = save.up;
    return {
      dmg: (1 + pa.lens * 0.12) * (1 + up.dmg * 0.06),
      area: 1 + pa.bloom * 0.12,
      cd: Math.pow(0.92, pa.tempo),
      speed: 165 * (1 + pa.wing * 0.1) * (1 + up.spd * 0.05),
      magnet: 110 * (1 + pa.magnet * 0.3) * (1 + up.mag * 0.15),
      regen: up.reg * 0.3,
    };
  }

  // ---------------------------------------------------------------------------
  // Generación de enemigos
  // ---------------------------------------------------------------------------
  function viewHalfDiag() {
    return Math.hypot(W, H) / 2 / K;
  }

  function spawnEnemy(type, x, y) {
    if (enemies.length >= MAX_ENEMIES) return null;
    const def = ENEMY_TYPES[type];
    const hpMul = 1 + run.time / 85;
    const e = {
      id: nextId++,
      type,
      x, y, px: x, py: y,
      r: def.r,
      hp: def.hp * (type === "boss" ? 1 + run.time / 150 : hpMul),
      maxHp: 0,
      speed: def.speed * (0.9 + rand() * 0.2) * (1 + run.time / 900),
      dmg: def.dmg,
      xp: def.xp,
      nectarChance: def.nectar,
      kx: 0, ky: 0,
      flash: 0,
      haloCd: 0,
      ang: 0,
      wob: rand() * 6.28,
    };
    e.maxHp = e.hp;
    enemies.push(e);
    return e;
  }

  function spawnAround(type) {
    const p = run.player;
    const a = rand() * Math.PI * 2;
    const d = viewHalfDiag() + 30 + rand() * 60;
    return spawnEnemy(type, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d);
  }

  function pickType() {
    const tm = run.time;
    const r = rand();
    if (tm > 90 && r < 0.05 + tm / 4000) return "brute";
    if (tm > 35 && r < 0.38) return "skitter";
    return "crawler";
  }

  function updateSpawns(dt) {
    const tm = run.time;
    let rate = 1.5 + tm * 0.046;
    if (tm >= FINAL_SWARM) rate *= 1.6;
    run.spawnAcc += rate * dt;
    while (run.spawnAcc >= 1) {
      run.spawnAcc -= 1;
      spawnAround(pickType());
    }
    if (run.ringIdx < RING_TIMES.length && tm >= RING_TIMES[run.ringIdx]) {
      run.ringIdx++;
      const p = run.player;
      const d = viewHalfDiag() + 20;
      const n = 22;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        spawnEnemy(tm > 150 ? "skitter" : "crawler", p.x + Math.cos(a) * d, p.y + Math.sin(a) * d);
      }
    }
    if (run.bossIdx < BOSS_TIMES.length && tm >= BOSS_TIMES[run.bossIdx]) {
      run.bossIdx++;
      const b = spawnAround("boss");
      if (b) {
        b.boss = true;
        run.boss = b;
        setBanner(t("bossIncoming"), 3);
        A.sfx.boss();
      }
    }
    if (!run.finalAnnounced && tm >= FINAL_SWARM) {
      run.finalAnnounced = true;
      setBanner(t("finalSwarm"), 3.5);
    }
  }

  function setBanner(text, time) {
    banner.text = text;
    banner.time = time;
  }

  // ---------------------------------------------------------------------------
  // Daño, muertes y recompensas
  // ---------------------------------------------------------------------------
  function hurtEnemy(e, dmg, fromX, fromY, knock) {
    if (e.hp <= 0) return;
    e.hp -= dmg;
    e.flash = 0.08;
    if (knock) {
      const dx = e.x - fromX, dy = e.y - fromY;
      const d = Math.hypot(dx, dy) || 1;
      const k = e.boss ? knock * 0.15 : e.type === "brute" ? knock * 0.5 : knock;
      e.kx += (dx / d) * k;
      e.ky += (dy / d) * k;
    }
    A.sfx.hit();
    if (e.hp <= 0) killEnemy(e);
  }

  function killEnemy(e) {
    run.kills++;
    A.sfx.kill();
    burst(e.x, e.y, e.boss ? 40 : e.type === "brute" ? 14 : 6, e.type === "skitter" ? "#53d8d0" : "#a98bff");
    dropGem(e.x, e.y, e.xp);
    if (rand() < e.nectarChance) {
      const amount = e.boss ? 15 : e.type === "brute" ? 2 : 1;
      run.nectar += amount;
      burst(e.x, e.y, 6, "#ffd36b");
    }
    if (e.boss) {
      run.boss = null;
      // un jefe derrotado concede dos niveles extra
      grantXp(run.need - run.xp);
      grantXp(xpNeed(run.level + 1));
      shake = 10;
      P.happytime();
    }
  }

  function dropGem(x, y, value) {
    if (gems.length >= MAX_GEMS) {
      // fusiona el valor en una gema existente para no crecer sin límite
      const g = gems[(rand() * gems.length) | 0];
      g.value += value;
      g.big = g.value >= 5;
      return;
    }
    gems.push({ x, y, px: x, py: y, value, big: value >= 5, pull: false, vx: 0, vy: 0 });
  }

  function grantXp(v) {
    run.xp += v;
    while (run.xp >= run.need) {
      run.xp -= run.need;
      run.level++;
      run.need = xpNeed(run.level);
      run.pendingLevels++;
    }
  }

  function burst(x, y, n, color) {
    for (let i = 0; i < n && particles.length < MAX_PARTICLES; i++) {
      const a = rand() * Math.PI * 2;
      const s = 40 + rand() * 160;
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.35 + rand() * 0.4,
        max: 0.75,
        color,
        size: 3 + rand() * 4,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Armas
  // ---------------------------------------------------------------------------
  function nearestEnemy(x, y, maxD) {
    let best = null, bd = maxD * maxD;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const dx = e.x - x, dy = e.y - y;
      const d = dx * dx + dy * dy;
      if (d < bd && e.hp > 0) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  function fireBullet(x, y, ang, speed, dmg, life, r, color, pierce) {
    bullets.push({
      x, y, px: x, py: y,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      dmg, life, r, color,
      pierce,
      hits: [],
    });
  }

  function updateWeapons(dt, st) {
    const p = run.player, w = run.weapons, tm = run.timers;

    // Rayo de luz
    if (w.bolt) {
      tm.bolt -= dt;
      if (tm.bolt <= 0) {
        const target = nearestEnemy(p.x, p.y, 420);
        if (target) {
          const lvl = w.bolt;
          const count = 1 + (lvl >= 2 ? 1 : 0) + (lvl >= 4 ? 1 : 0);
          const base = Math.atan2(target.y - p.y, target.x - p.x);
          const dmg = 10 * (1 + 0.25 * (lvl - 1)) * st.dmg;
          for (let i = 0; i < count; i++) {
            const off = (i - (count - 1) / 2) * 0.14;
            fireBullet(p.x, p.y, base + off, 560, dmg, 1.0, 5 * st.area, COLORS.bolt, lvl >= 5 ? 2 : 0);
          }
          A.sfx.shoot();
          tm.bolt = 0.6 * (lvl >= 3 ? 0.82 : 1) * st.cd;
        } else {
          tm.bolt = 0.1;
        }
      }
    }

    // Estallido estelar
    if (w.star) {
      tm.star -= dt;
      if (tm.star <= 0) {
        const lvl = w.star;
        const n = 6 + 2 * (lvl - 1);
        const dmg = 8 * (1 + 0.25 * (lvl - 1)) * st.dmg;
        const rot = rand() * Math.PI;
        for (let i = 0; i < n; i++) {
          fireBullet(p.x, p.y, rot + (i / n) * Math.PI * 2, 380, dmg, 0.85 * st.area, 5, COLORS.star, 0);
        }
        tm.star = (2.0 - 0.15 * (lvl - 1)) * st.cd;
      }
    }

    // Pulso luminoso
    if (w.pulse) {
      tm.pulse -= dt;
      if (tm.pulse <= 0) {
        const lvl = w.pulse;
        const radius = 95 * (1 + 0.15 * (lvl - 1)) * st.area;
        const dmg = 14 * (1 + 0.3 * (lvl - 1)) * st.dmg;
        queryEnemies(p.x, p.y, radius, (e) => {
          hurtEnemy(e, dmg, p.x, p.y, 260);
        });
        rings.push({ x: p.x, y: p.y, r: 10, max: radius, life: 0.35, color: COLORS.pulse });
        A.sfx.pulse();
        tm.pulse = (3.4 - 0.3 * (lvl - 1)) * st.cd;
      }
    }

    // Halo de pétalos
    if (w.halo) {
      const lvl = w.halo;
      const n = 1 + lvl;
      const radius = 64 * st.area;
      const dmg = 7 * (1 + 0.3 * (lvl - 1)) * st.dmg;
      tm.haloAngle += dt * (3.0 + lvl * 0.2);
      for (let i = 0; i < n; i++) {
        const a = tm.haloAngle + (i / n) * Math.PI * 2;
        const hx = p.x + Math.cos(a) * radius, hy = p.y + Math.sin(a) * radius;
        queryEnemies(hx, hy, 9 * st.area, (e) => {
          if (e.haloCd <= 0) {
            e.haloCd = 0.4;
            hurtEnemy(e, dmg, p.x, p.y, 90);
          }
        });
      }
    }

    // Luciérnagas
    if (w.fly) {
      while (fireflies.length < w.fly) {
        fireflies.push({ x: p.x, y: p.y, px: p.x, py: p.y, vx: 0, vy: 0, cd: 0, target: null, phase: rand() * 6.28 });
      }
      const dmg = 9 * (1 + 0.25 * (w.fly - 1)) * st.dmg;
      for (const f of fireflies) {
        f.px = f.x;
        f.py = f.y;
        f.cd -= dt;
        f.phase += dt * 3;
        if (!f.target || f.target.hp <= 0 || Math.hypot(f.target.x - p.x, f.target.y - p.y) > 420) {
          f.target = nearestEnemy(f.x, f.y, 360);
        }
        let tx, ty;
        if (f.target) {
          tx = f.target.x;
          ty = f.target.y;
        } else {
          tx = p.x + Math.cos(f.phase) * 40;
          ty = p.y + Math.sin(f.phase) * 40;
        }
        const dx = tx - f.x, dy = ty - f.y;
        const d = Math.hypot(dx, dy) || 1;
        const sp = 320;
        f.vx += ((dx / d) * sp - f.vx) * Math.min(1, dt * 6);
        f.vy += ((dy / d) * sp - f.vy) * Math.min(1, dt * 6);
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.cd <= 0) {
          queryEnemies(f.x, f.y, 7, (e) => {
            hurtEnemy(e, dmg, f.x, f.y, 60);
            f.cd = 0.4;
            return true;
          });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Opciones de subida de nivel
  // ---------------------------------------------------------------------------
  function levelOptions() {
    const pool = [];
    for (const id of WEAPONS) if (run.weapons[id] < MAX_LEVEL) pool.push({ kind: "w", id });
    for (const id of PASSIVES) if (run.passives[id] < MAX_LEVEL) pool.push({ kind: "p", id });
    // barajado Fisher-Yates
    for (let i = pool.length - 1; i > 0; i--) {
      const j = (rand() * (i + 1)) | 0;
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    // prioriza armas nuevas en los primeros niveles para que la partida evolucione
    if (run.level <= 6) {
      pool.sort((a, b) => score(b) - score(a));
    }
    const opts = pool.slice(0, 3);
    while (opts.length < 3) opts.push({ kind: "heal", id: "heal" });
    return opts;
    function score(o) {
      return o.kind === "w" && run.weapons[o.id] === 0 ? 1 : 0;
    }
  }

  function applyOption(o) {
    const p = run.player;
    if (o.kind === "w") run.weapons[o.id]++;
    else if (o.kind === "p") {
      run.passives[o.id]++;
      if (o.id === "heart") {
        p.maxHp += 20;
        p.hp = Math.min(p.maxHp, p.hp + 30);
      }
    } else {
      p.hp = Math.min(p.maxHp, p.hp + 40);
    }
  }

  // ---------------------------------------------------------------------------
  // Bucle de simulación
  // ---------------------------------------------------------------------------
  function update(dt) {
    const p = run.player;
    const st = stats();
    run.time += dt;

    // Jugador
    p.px = p.x;
    p.py = p.y;
    const [ix, iy] = inputVector();
    if (ix || iy) {
      p.x += ix * st.speed * dt;
      p.y += iy * st.speed * dt;
      p.face = Math.atan2(iy, ix);
      if (run.tutorial) run.tutorialMoved += dt;
    }
    if (run.tutorial && run.tutorialMoved > 1.2 && run.time > 6) {
      run.tutorial = 0;
      save.tut = true;
      persist();
    }
    p.flap += dt * (ix || iy ? 16 : 9);
    if (p.invuln > 0) p.invuln -= dt;
    if (p.hurtFlash > 0) p.hurtFlash -= dt;
    if (st.regen) p.hp = Math.min(p.maxHp, p.hp + st.regen * dt);

    updateSpawns(dt);
    buildGrid();
    updateWeapons(dt, st);

    // Enemigos: persecución, separación ligera y retroceso
    const far = viewHalfDiag() * 1.8;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      e.px = e.x;
      e.py = e.y;
      let dx = p.x - e.x, dy = p.y - e.y;
      let d = Math.hypot(dx, dy) || 1;
      if (d > far && !e.boss) {
        // reubica a los rezagados delante del jugador en lugar de eliminarlos
        const a = Math.atan2(dy, dx) + (rand() - 0.5);
        const nd = viewHalfDiag() + 40;
        e.x = e.px = p.x + Math.cos(a) * nd;
        e.y = e.py = p.y + Math.sin(a) * nd;
        continue;
      }
      let mx = dx / d, my = dy / d;
      if (e.type === "skitter") {
        e.wob += dt * 7;
        const s = Math.sin(e.wob) * 0.6;
        const ox = -my * s, oy = mx * s;
        mx += ox;
        my += oy;
      }
      e.x += mx * e.speed * dt + e.kx * dt;
      e.y += my * e.speed * dt + e.ky * dt;
      e.kx *= 0.86;
      e.ky *= 0.86;
      e.ang = Math.atan2(my, mx);
      if (e.flash > 0) e.flash -= dt;
      if (e.haloCd > 0) e.haloCd -= dt;
    }
    // separación entre enemigos (empuje suave usando la rejilla)
    buildGrid();
    for (let i = 0; i < enemies.length; i += 1) {
      const e = enemies[i];
      queryEnemies(e.x, e.y, e.r, (o) => {
        if (o === e) return false;
        const dx = e.x - o.x, dy = e.y - o.y;
        const d = Math.hypot(dx, dy) || 0.01;
        const overlap = e.r + o.r - d;
        if (overlap > 0) {
          const push = overlap * 0.5;
          const wE = o.boss ? 1 : e.boss ? 0 : 0.5;
          e.x += (dx / d) * push * (e.boss ? 0.1 : 1) * (wE + 0.5);
          e.y += (dy / d) * push * (e.boss ? 0.1 : 1) * (wE + 0.5);
        }
        return false;
      });
    }

    // Contacto con el jugador
    if (p.invuln <= 0) {
      queryEnemies(p.x, p.y, p.r * 0.85, (e) => {
        p.hp -= e.dmg;
        p.invuln = 0.6;
        p.hurtFlash = 0.25;
        shake = Math.max(shake, 6);
        A.sfx.hurt();
        return true;
      });
    }

    // Proyectiles
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.px = b.x;
      b.py = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let dead = b.life <= 0;
      if (!dead) {
        queryEnemies(b.x, b.y, b.r, (e) => {
          if (b.hits.indexOf(e.id) !== -1) return false;
          b.hits.push(e.id);
          hurtEnemy(e, b.dmg, b.x - b.vx * 0.01, b.y - b.vy * 0.01, 120);
          if (b.pierce > 0) {
            b.pierce--;
            return false;
          }
          dead = true;
          return true;
        });
      }
      if (dead) {
        bullets[i] = bullets[bullets.length - 1];
        bullets.pop();
      }
    }

    // Eliminar enemigos muertos (intercambio con el último: O(1))
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].hp <= 0) {
        enemies[i] = enemies[enemies.length - 1];
        enemies.pop();
      }
    }

    // Gemas de rocío
    const mag = st.magnet;
    for (let i = gems.length - 1; i >= 0; i--) {
      const g = gems[i];
      g.px = g.x;
      g.py = g.y;
      const dx = p.x - g.x, dy = p.y - g.y;
      const d = Math.hypot(dx, dy) || 1;
      if (!g.pull && d < mag) g.pull = true;
      if (g.pull) {
        const sp = 140 + Math.max(0, 600 - d) * 0.9;
        g.x += (dx / d) * sp * dt;
        g.y += (dy / d) * sp * dt;
        if (d < p.r + 6) {
          grantXp(g.value);
          A.sfx.pickup();
          gems[i] = gems[gems.length - 1];
          gems.pop();
        }
      }
    }

    // Partículas y anillos
    for (let i = particles.length - 1; i >= 0; i--) {
      const q = particles[i];
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.vx *= 0.92;
      q.vy *= 0.92;
      q.life -= dt;
      if (q.life <= 0) {
        particles[i] = particles[particles.length - 1];
        particles.pop();
      }
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.life -= dt;
      r.r += (r.max - r.r) * Math.min(1, dt * 14);
      if (r.life <= 0) rings.splice(i, 1);
    }
    if (shake > 0) shake = Math.max(0, shake - dt * 30);
    if (banner.time > 0) banner.time -= dt;

    if (p.hp <= 0) {
      p.hp = 0;
      endRun(false);
    } else if (run.time >= RUN_TIME) {
      endRun(true);
    } else if (run.pendingLevels > 0) {
      openLevelUp();
    }
  }

  // ---------------------------------------------------------------------------
  // Dibujo
  // ---------------------------------------------------------------------------
  let camX = 0, camY = 0;

  function render(alpha) {
    const p = run ? run.player : null;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!p) {
      ctx.fillStyle = "#060a14";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const lerp = (a, b) => a + (b - a) * alpha;
    camX = lerp(p.px, p.x);
    camY = lerp(p.py, p.y);
    const k = K * DPR;
    let sx = 0, sy = 0;
    if (shake > 0) {
      sx = (rand() - 0.5) * shake;
      sy = (rand() - 0.5) * shake;
    }
    const ox = canvas.width / 2 - camX * k + sx * DPR;
    const oy = canvas.height / 2 - camY * k + sy * DPR;

    // Fondo en mosaico: el patrón se desplaza con la cámara
    ctx.setTransform(k, 0, 0, k, ox, oy);
    ctx.fillStyle = bgPattern;
    const vw = canvas.width / k, vh = canvas.height / k;
    ctx.fillRect(camX - vw / 2 - 20, camY - vh / 2 - 20, vw + 40, vh + 40);

    const left = camX - vw / 2 - 60, right = camX + vw / 2 + 60;
    const top = camY - vh / 2 - 60, bottom = camY + vh / 2 + 60;
    const visible = (x, y) => x > left && x < right && y > top && y < bottom;

    // Luz del jugador sobre el suelo
    ctx.globalCompositeOperation = "lighter";
    const pl = glow("#ffcf73", 120);
    ctx.globalAlpha = 0.28;
    ctx.drawImage(pl, camX - 120, camY - 120, 240, 240);
    ctx.globalAlpha = 1;

    // Gemas
    const gSmall = glow("#7fe8ff", 7), gBig = glow("#b4a0ff", 11);
    for (let i = 0; i < gems.length; i++) {
      const g = gems[i];
      const x = lerp(g.px, g.x), y = lerp(g.py, g.y);
      if (!visible(x, y)) continue;
      const s = g.big ? 11 : 7;
      ctx.drawImage(g.big ? gBig : gSmall, x - s, y - s, s * 2, s * 2);
    }
    ctx.globalCompositeOperation = "source-over";

    // Enemigos
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const x = lerp(e.px, e.x), y = lerp(e.py, e.y);
      if (!visible(x, y)) continue;
      const spr = enemySprites[e.type][e.flash > 0 ? 1 : 0];
      const c = Math.cos(e.ang), s = Math.sin(e.ang);
      ctx.setTransform(k * c, k * s, -k * s, k * c, x * k + ox, y * k + oy);
      ctx.drawImage(spr.c, -spr.size / 2, -spr.size / 2, spr.size, spr.size);
    }
    ctx.setTransform(k, 0, 0, k, ox, oy);

    // Armas y efectos luminosos
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < bullets.length; i++) {
      const b = bullets[i];
      const x = lerp(b.px, b.x), y = lerp(b.py, b.y);
      if (!visible(x, y)) continue;
      const s = b.r * 2.6;
      ctx.drawImage(glow(b.color, 14), x - s, y - s, s * 2, s * 2);
    }
    if (run.weapons.halo) {
      const st = stats();
      const n = 1 + run.weapons.halo;
      const radius = 64 * st.area;
      const hs = 11 * st.area;
      const img = glow(COLORS.halo, 14);
      for (let i = 0; i < n; i++) {
        const a = run.timers.haloAngle + (i / n) * Math.PI * 2;
        ctx.drawImage(img, camX + Math.cos(a) * radius - hs, camY + Math.sin(a) * radius - hs, hs * 2, hs * 2);
      }
    }
    const fImg = glow(COLORS.fly, 10);
    for (const f of fireflies) {
      const x = lerp(f.px, f.x), y = lerp(f.py, f.y);
      ctx.drawImage(fImg, x - 9, y - 9, 18, 18);
    }
    for (let i = 0; i < particles.length; i++) {
      const q = particles[i];
      if (!visible(q.x, q.y)) continue;
      const s = q.size * (q.life / q.max + 0.3);
      ctx.drawImage(glow(q.color, 8), q.x - s, q.y - s, s * 2, s * 2);
    }
    ctx.globalCompositeOperation = "source-over";
    for (const r of rings) {
      ctx.globalAlpha = Math.max(0, r.life / 0.35);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    drawPlayer(p, camX, camY);

    // Oscuridad en los bordes (sensación de noche, centra la atención)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(vignette, 0, 0, canvas.width, canvas.height);

    drawHud();
  }

  function drawPlayer(p, x, y) {
    const blink = p.invuln > 0 && Math.floor(p.invuln * 20) % 2 === 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(glow(p.hurtFlash > 0 ? "#ff6b6b" : "#ffd36b", 34), -34, -34, 68, 68);
    ctx.globalCompositeOperation = "source-over";
    if (!blink) {
      ctx.rotate(p.face + Math.PI / 2);
      const f = 0.65 + Math.abs(Math.sin(p.flap)) * 0.35;
      ctx.fillStyle = "rgba(255, 236, 190, 0.92)";
      ctx.strokeStyle = "#ffb347";
      ctx.lineWidth = 1.5;
      // alas superiores e inferiores
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(side * 9 * f, -3, 9 * f, 7, side * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(side * 7 * f, 7, 6 * f, 5, -side * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      // cuerpo-farolillo
      ctx.fillStyle = "#fff4cf";
      ctx.beginPath();
      ctx.ellipse(0, 1, 4, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffb347";
      ctx.beginPath();
      ctx.arc(0, 6, 3.2, 0, Math.PI * 2);
      ctx.fill();
      // antenas
      ctx.strokeStyle = "#ffe7a8";
      ctx.beginPath();
      ctx.moveTo(-1.5, -7);
      ctx.quadraticCurveTo(-5, -14, -7, -15);
      ctx.moveTo(1.5, -7);
      ctx.quadraticCurveTo(5, -14, 7, -15);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHud() {
    const d = DPR, u = UI;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    const p = run.player;
    const pad = 10 * u;
    // Barra de experiencia (arriba, ancho completo)
    ctx.fillStyle = "rgba(10,16,30,0.75)";
    ctx.fillRect(0, 0, W, 8 * u);
    ctx.fillStyle = "#7fe8ff";
    ctx.fillRect(0, 0, (W * run.xp) / run.need, 8 * u);

    ctx.textBaseline = "top";
    ctx.font = "bold " + Math.round(15 * u) + "px Trebuchet MS, sans-serif";
    // Nivel y luz (vida)
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffd36b";
    ctx.fillText(t("level") + " " + run.level, pad, 14 * u);
    const bw = 120 * u, bh = 10 * u, by = 36 * u;
    ctx.fillStyle = "rgba(10,16,30,0.8)";
    ctx.fillRect(pad, by, bw, bh);
    ctx.fillStyle = p.hp / p.maxHp < 0.3 ? "#ff6b6b" : "#ffcf73";
    ctx.fillRect(pad, by, (bw * Math.max(0, p.hp)) / p.maxHp, bh);
    ctx.strokeStyle = "rgba(255,211,107,0.6)";
    ctx.lineWidth = 1;
    ctx.strokeRect(pad, by, bw, bh);

    // Tiempo restante hasta el amanecer (centro)
    ctx.textAlign = "center";
    ctx.font = "bold " + Math.round(22 * u) + "px Trebuchet MS, sans-serif";
    ctx.fillStyle = "#f4ecd8";
    ctx.fillText(fmtTime(RUN_TIME - run.time), W / 2, 14 * u);
    // barra de progreso de la noche
    const nw = 110 * u;
    ctx.fillStyle = "rgba(10,16,30,0.75)";
    ctx.fillRect(W / 2 - nw / 2, 42 * u, nw, 4 * u);
    ctx.fillStyle = "#ffb347";
    ctx.fillRect(W / 2 - nw / 2, 42 * u, (nw * run.time) / RUN_TIME, 4 * u);

    // Bajas y néctar (derecha, dejando sitio al botón de pausa)
    ctx.textAlign = "right";
    ctx.font = "bold " + Math.round(14 * u) + "px Trebuchet MS, sans-serif";
    ctx.fillStyle = "#c9b8ff";
    const rx = W - 60;
    ctx.fillText("✦ " + run.kills, rx, 14 * u);
    ctx.fillStyle = "#ffd36b";
    ctx.fillText("● " + run.nectar, rx, 34 * u);

    // Barra del jefe
    if (run.boss && run.boss.hp > 0) {
      const w = Math.min(W * 0.6, 360 * u);
      const y = 58 * u;
      ctx.fillStyle = "rgba(10,16,30,0.8)";
      ctx.fillRect(W / 2 - w / 2, y, w, 9 * u);
      ctx.fillStyle = "#ff5fd2";
      ctx.fillRect(W / 2 - w / 2, y, (w * run.boss.hp) / run.boss.maxHp, 9 * u);
    }

    // Aviso central
    if (banner.time > 0) {
      ctx.textAlign = "center";
      ctx.globalAlpha = Math.min(1, banner.time);
      ctx.font = "bold " + Math.round(20 * u) + "px Trebuchet MS, sans-serif";
      ctx.fillStyle = "#ffd36b";
      ctx.fillText(banner.text, W / 2, H * 0.24);
      ctx.globalAlpha = 1;
    }

    // Tutorial integrado en la partida
    if (run.tutorial) {
      ctx.textAlign = "center";
      ctx.font = "bold " + Math.round(16 * u) + "px Trebuchet MS, sans-serif";
      ctx.fillStyle = "rgba(10,16,30,0.7)";
      const ty = H * 0.72;
      ctx.fillRect(W / 2 - Math.min(W * 0.46, 330 * u), ty - 6 * u, Math.min(W * 0.92, 660 * u), 52 * u);
      ctx.fillStyle = "#f4ecd8";
      ctx.fillText(t("tutorialMove"), W / 2, ty);
      ctx.fillStyle = "#ffd36b";
      ctx.font = Math.round(14 * u) + "px Trebuchet MS, sans-serif";
      ctx.fillText(t("tutorialAuto"), W / 2, ty + 24 * u);
    }

    // Joystick virtual
    if (joy.active && state === "play") {
      ctx.strokeStyle = "rgba(255,211,107,0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(joy.ox, joy.oy, JOY_R, 0, Math.PI * 2);
      ctx.stroke();
      const dx = joy.x - joy.ox, dy = joy.y - joy.oy;
      const dd = Math.hypot(dx, dy) || 1;
      const m = Math.min(JOY_R, dd);
      ctx.fillStyle = "rgba(255,211,107,0.55)";
      ctx.beginPath();
      ctx.arc(joy.ox + (dx / dd) * m, joy.oy + (dy / dd) * m, 18, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---------------------------------------------------------------------------
  // Estados y pantallas
  // ---------------------------------------------------------------------------
  const screens = ["levelUp", "pause", "results", "home"];
  function showScreen(id) {
    for (const s of screens) $(s).classList.toggle("show", s === id);
    $("pauseBtn").classList.toggle("show", id === null && state === "play");
  }

  function setState(s) {
    state = s;
    if (s === "play") {
      P.gameplayStart();
      A.startMusic();
    } else {
      P.gameplayStop();
      joy.active = false;
      keys.clear();
    }
    if (s !== "play") A.stopMusic();
  }

  function startRun() {
    newRun();
    resetLoop();
    setState("play");
    showScreen(null);
  }

  function pauseGame() {
    if (state !== "play") return;
    setState("paused");
    updateSoundBtn();
    showScreen("pause");
    $("resumeBtn").focus();
  }

  function resumeGame() {
    setState("play");
    showScreen(null);
    resetLoop();
  }

  function openLevelUp() {
    setState("levelup");
    A.sfx.levelUp();
    const opts = levelOptions();
    const box = $("cards");
    box.innerHTML = "";
    opts.forEach((o, i) => {
      const b = document.createElement("button");
      b.className = "card";
      const cur = o.kind === "w" ? run.weapons[o.id] : o.kind === "p" ? run.passives[o.id] : 0;
      const nameKey = o.kind === "w" ? "w_" + o.id : o.kind === "p" ? "p_" + o.id : "heal";
      const color = COLORS[o.id] || "#ffffff";
      const tag =
        o.kind === "w" && cur === 0
          ? '<span class="tag">' + t("newWeapon") + "</span>"
          : o.kind !== "heal"
          ? '<span class="tag">' + t("levelShort") + " " + (cur + 1) + "</span>"
          : "";
      b.innerHTML =
        '<span class="icon" style="background:radial-gradient(circle,#fff 0,' + color + " 35%," + hexA(color, 0) + ' 72%)"></span>' +
        '<span class="name">' + t(nameKey) + "</span>" + tag +
        '<span class="desc">' + t(nameKey + "_d") + "</span>" +
        '<span class="key">[' + (i + 1) + "]</span>";
      b.addEventListener("click", () => chooseOption(o));
      box.appendChild(b);
    });
    box._opts = opts;
    showScreen("levelUp");
  }

  function chooseOption(o) {
    if (state !== "levelup") return;
    A.sfx.click();
    applyOption(o);
    run.pendingLevels--;
    if (run.pendingLevels > 0) {
      openLevelUp();
    } else {
      resumeGame();
    }
  }

  function endRun(won) {
    run.won = won;
    run.endTimer = 1.4;
    setState("ending");
    showScreen(null);
    if (won) {
      A.sfx.win();
      // al amanecer las sombras se disuelven
      for (const e of enemies) burst(e.x, e.y, 2, "#ffd36b");
      enemies.length = 0;
    } else {
      A.sfx.lose();
      burst(run.player.x, run.player.y, 40, "#ffd36b");
    }
  }

  function finishRun() {
    const won = run.won;
    const timeBonus = Math.floor(run.time / 10);
    const killBonus = Math.floor(run.kills / 25);
    const base = run.nectar + timeBonus + killBonus + (won ? 25 : 0);
    const earned = Math.round(base * (1 + save.up.gold * 0.1));
    const newBest = run.time > save.best + 0.5;
    save.nectar += earned;
    save.runs++;
    if (won) save.wins++;
    if (newBest) save.best = run.time;
    save.bestKills = Math.max(save.bestKills, run.kills);
    persist();
    if (won || newBest) P.happytime();
    run.earned = earned;
    run.newBest = newBest;
    run.rewardUsed = false;

    // Anuncio intersticial en un punto lógico (fin de partida), nunca en un botón de navegación.
    // El SDK decide la frecuencia (máx. 1 cada 3 min) e ignora las peticiones tempranas.
    setState("ad");
    P.requestAd("midgame", () => A.setAdMuted(true)).then(() => {
      A.setAdMuted(false);
      showResults();
    });
  }

  function showResults() {
    setState("results");
    const won = run.won;
    $("resTitle").textContent = won ? t("victory") : t("defeat");
    $("resSub").textContent = won ? t("victorySub") : t("defeatSub");
    const rows = [
      [t("survived"), fmtTime(run.time)],
      [t("kills"), run.kills],
      [t("levelReached"), run.level],
      [t("nectarEarned"), "● " + run.earned],
    ];
    $("resStats").innerHTML = rows
      .map((r) => "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td></tr>")
      .join("");
    $("resMsg").textContent = run.newBest ? t("best") : "";
    const rb = $("rewardBtn");
    rb.style.display = P.state.rewardedAvailable ? "" : "none";
    rb.disabled = false;
    rb.innerHTML = '<span class="ad-icon"></span>' + t("doubleNectar") + " (+" + run.earned + ") · " + t("watchAd");
    showScreen("results");
    $("againBtn").focus();
  }

  function watchRewarded() {
    if (state !== "results" || run.rewardUsed) return;
    const rb = $("rewardBtn");
    rb.disabled = true;
    $("againBtn").disabled = true;
    $("toHomeBtn").disabled = true;
    P.requestAd("rewarded", () => A.setAdMuted(true)).then((ok) => {
      A.setAdMuted(false);
      $("againBtn").disabled = false;
      $("toHomeBtn").disabled = false;
      run.rewardUsed = true;
      rb.style.display = "none";
      if (ok) {
        save.nectar += run.earned;
        persist();
        $("resMsg").textContent = t("adRewarded");
      } else {
        // sin anuncio no hay recompensa (requisito de CrazyGames)
        $("resMsg").textContent = t("adUnavailable");
      }
    });
  }

  function abandonRun() {
    // salir al jardín conserva solo el néctar recogido, sin anuncio
    if (run) {
      save.nectar += run.nectar;
      persist();
    }
    openHome();
  }

  function openHome() {
    setState("home");
    $("homeNectar").textContent = "● " + save.nectar;
    $("homeBest").textContent = fmtTime(save.best);
    const shop = $("shop");
    shop.innerHTML = "";
    for (const item of SHOP) {
      const lvl = save.up[item.id];
      const cost = shopCost(item, lvl);
      const div = document.createElement("div");
      div.className = "item";
      const maxed = lvl >= SHOP_MAX;
      div.innerHTML =
        '<span class="name">' + t("u_" + item.id) + "</span>" +
        '<span class="desc">' + t("u_" + item.id + "_d") + "</span>" +
        '<span class="pips">' + "◆".repeat(lvl) + "◇".repeat(SHOP_MAX - lvl) + "</span>";
      const b = document.createElement("button");
      b.className = maxed ? "secondary" : "";
      b.textContent = maxed ? t("maxed") : t("buy") + " ● " + cost;
      b.disabled = maxed || save.nectar < cost;
      b.addEventListener("click", () => {
        if (save.nectar < cost || save.up[item.id] >= SHOP_MAX) return;
        save.nectar -= cost;
        save.up[item.id]++;
        persist();
        A.sfx.levelUp();
        openHome();
      });
      div.appendChild(b);
      shop.appendChild(div);
    }
    showScreen("home");
  }

  function updateSoundBtn() {
    $("soundBtn").textContent = t("sound") + ": " + (save.muted ? t("off") : t("on"));
  }

  function onKey(e) {
    if (e.repeat) return;
    if (e.code === "KeyP") {
      if (state === "play") pauseGame();
      else if (state === "paused") resumeGame();
    } else if (state === "levelup" && /^Digit[123]$/.test(e.code)) {
      const opts = $("cards")._opts;
      const o = opts && opts[Number(e.code.slice(5)) - 1];
      if (o) chooseOption(o);
    }
  }

  function bindUi() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    $("pauseBtn").addEventListener("click", pauseGame);
    $("resumeBtn").addEventListener("click", () => {
      A.sfx.click();
      resumeGame();
    });
    $("soundBtn").addEventListener("click", () => {
      save.muted = !save.muted;
      A.setMuted(save.muted);
      persist();
      updateSoundBtn();
    });
    $("restartBtn").addEventListener("click", () => {
      if (run) {
        save.nectar += run.nectar;
        persist();
      }
      startRun();
    });
    $("homeBtn").addEventListener("click", abandonRun);
    $("againBtn").addEventListener("click", startRun);
    $("toHomeBtn").addEventListener("click", openHome);
    $("playBtn").addEventListener("click", startRun);
    $("rewardBtn").addEventListener("click", watchRewarded);
  }

  // ---------------------------------------------------------------------------
  // Bucle principal: paso fijo + calidad adaptativa
  // ---------------------------------------------------------------------------
  let last = 0, acc = 0;
  let frameAvg = 16.7, slowTime = 0;
  const perf = { fps: 60, frames: 0, quality: "high" };

  function resetLoop() {
    last = performance.now();
    acc = 0;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const ms = Math.min(250, now - last);
    last = now;
    frameAvg += (ms - frameAvg) * 0.05;
    perf.fps = 1000 / frameAvg;
    perf.frames++;

    if (state === "play") {
      acc += ms / 1000;
      let steps = 0;
      while (acc >= STEP && steps < 5 && state === "play") {
        update(STEP);
        acc -= STEP;
        steps++;
      }
      if (steps >= 5) acc = 0;
      // si el equipo no da la talla, baja la resolución interna una vez
      if (frameAvg > 24 && maxDPR > 1) {
        slowTime += ms / 1000;
        if (slowTime > 2) {
          maxDPR = 1;
          perf.quality = "low";
          resize();
        }
      } else slowTime = 0;
    } else if (state === "ending") {
      run.endTimer -= ms / 1000;
      // las partículas siguen moviéndose a cámara lenta durante el cierre
      for (const q of particles) {
        q.x += q.vx * 0.004;
        q.y += q.vy * 0.004;
        q.life -= ms / 3000;
      }
      if (run.endTimer <= 0) finishRun();
    }
    if (run) render(state === "play" ? acc / STEP : 1);
    else render(1);
  }

  // ---------------------------------------------------------------------------
  // Arranque
  // ---------------------------------------------------------------------------
  async function boot() {
    resize();
    window.addEventListener("resize", resize);
    buildBackground();
    await P.init();
    P.loadingStart();
    setLocale(P.locale());
    save = loadSave();
    A.setMuted(save.muted);
    bindUi();
    P.loadingStop();
    $("loading").style.display = "none";
    resetLoop();
    requestAnimationFrame(frame);
    // Requisito de Full Launch: el jugador entra directamente en la partida.
    startRun();
  }

  // Ganchos para las pruebas automatizadas (no afectan al juego).
  window.LW.debug = {
    get state() { return state; },
    get run() { return run; },
    get enemies() { return enemies.length; },
    get bullets() { return bullets.length; },
    get perf() { return perf; },
    get save() { return save; },
    setSeed: (s) => { seed = s >>> 0 || 1; },
    skipTo: (tm) => { if (run) run.time = tm; },
    setInput: (v) => { botInput = v; },
    // Avanza la simulación sin dibujar (pruebas de equilibrio aceleradas).
    step: (n) => {
      for (let i = 0; i < n && state === "play"; i++) update(STEP);
      return state;
    },
    // Vector de huida respecto a los enemigos cercanos (bot de pruebas).
    avoid: (radius) => {
      const p = run.player;
      let x = 0, y = 0;
      for (const e of enemies) {
        const dx = p.x - e.x, dy = p.y - e.y;
        const d = Math.hypot(dx, dy);
        if (d < radius && d > 0) {
          const w = (radius - d) / radius;
          x += (dx / d) * w;
          y += (dy / d) * w;
        }
      }
      return [x, y];
    },
    pickFirst: () => {
      const o = $("cards")._opts;
      if (state === "levelup" && o) chooseOption(o[0]);
    },
    nearestGem: () => {
      if (!run || !gems.length) return null;
      const p = run.player;
      let best = null, bd = Infinity;
      for (const g of gems) {
        const d = (g.x - p.x) ** 2 + (g.y - p.y) ** 2;
        if (d < bd) { bd = d; best = g; }
      }
      return { dx: best.x - p.x, dy: best.y - p.y };
    },
  };

  boot();
})();
