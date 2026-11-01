// Lanternwing — supervivencia nocturna contra hordas de sombras.
// Canvas 2D sin dependencias. Simulación a paso fijo (60 Hz) con interpolación
// de dibujo, para que la física sea idéntica a 60, 144 o 165 Hz.
(function () {
  "use strict";

  const { t, setLocale } = window.LW.i18n;
  const P = window.LW.platform;
  const A = window.LW.audio;
  const M = window.LW.meta;

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
    // escupidor: mantiene la distancia y lanza esporas que hay que esquivar
    spitter: { r: 13, hp: 20, speed: 50, dmg: 6, xp: 2, nectar: 0.08 },
    // gemelo: al disiparse se divide en tres polillas pequeñas
    splitter: { r: 16, hp: 26, speed: 44, dmg: 8, xp: 2, nectar: 0.08 },
    boss: { r: 46, hp: 1700, speed: 48, dmg: 22, xp: 40, nectar: 1 },
  };

  const WEAPONS = ["bolt", "halo", "pulse", "star", "fly"];
  const PASSIVES = ["wing", "heart", "lens", "bloom", "tempo", "magnet"];
  const MAX_LEVEL = 5;
  // Evoluciones: arma al nivel 5 + su pasiva compañera al nivel 2 o más.
  const EVO_PARTNER = { bolt: "lens", halo: "bloom", pulse: "heart", star: "tempo", fly: "magnet" };
  const EVO_COLORS = { bolt: "#fff6c8", halo: "#ff5fa8", pulse: "#e8fbff", star: "#e7d4ff", fly: "#e4ff9a" };
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
  const ctx = canvas.getContext("2d");
  const bgEl = $("bg");
  let W = 0, H = 0, DPR = 1, K = 1, UI = 1;
  // Escalera de calidad: resolución interna máxima del lienzo. Si el equipo no mantiene
  // la fluidez, se baja un peldaño (menos píxeles que rellenar = más fotogramas).
  const QUALITY = [2, 1, 0.75, 0.6];
  // Modo de bajo consumo: con 4 GB de RAM o menos (o 4 núcleos o menos) se empieza
  // directamente en resolución 1× en lugar de esperar a que la escalera de calidad baje.
  // Ahorra memoria de lienzo (×4 menos píxeles) y evita los primeros segundos a tirones.
  const LOW_END = (navigator.deviceMemory > 0 && navigator.deviceMemory <= 4) ||
    (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4);
  let qualityLevel = LOW_END ? 1 : 0;
  let touchUi = (window.matchMedia && matchMedia("(pointer: coarse)").matches) || navigator.maxTouchPoints > 0;
  window.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch" && !touchUi) {
      touchUi = true;
      if (state === "play") $("dashBtn").classList.add("show");
    }
  }, true);
  let bgTile = null; // imagen del mosaico de fondo (data URL)
  let bgTileCss = 256;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, QUALITY[qualityLevel]);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    K = Math.min(W, H) / VIEW_UNITS; // píxeles CSS por unidad de mundo
    UI = clamp(Math.min(W, H) / 450, 1, 2.2);
    layoutBackground();
  }

  // El fondo y la viñeta son capas HTML que compone el navegador (GPU), no el lienzo:
  // rellenar dos veces la pantalla completa por fotograma era el mayor coste medido.
  // Con calidad reducida también se reduce el número de partículas.
  function maxParticles() {
    return DPR < 1 ? MAX_PARTICLES / 2 : MAX_PARTICLES;
  }

  function layoutBackground() {
    // luz cálida del jugador (siempre en el centro, porque la cámara lo sigue)
    const lr = Math.round(130 * K);
    paintVignette(lr);
    if (!bgTile) return;
    bgTileCss = 256 * K;
    bgEl.style.width = W + bgTileCss * 2 + "px";
    bgEl.style.height = H + bgTileCss * 2 + "px";
    bgEl.style.backgroundSize = bgTileCss + "px " + bgTileCss + "px";
  }

  // Amanecer progresivo: el último minuto la oscuridad se aclara y el horizonte se tiñe.
  // Va dentro de la misma capa de la viñeta y cambia solo en 4 pasos: una capa extra a
  // pantalla completa, o repintar la viñeta a menudo, costaba ~5 fps en equipos lentos.
  let dawnF = 0, vignetteLr = 0;
  function paintVignette(lr) {
    vignetteLr = lr;
    const f = dawnF;
    const dark = (a) => +(a * (1 - 0.5 * f)).toFixed(3);
    $("vignette").style.background =
      (f > 0 ? "linear-gradient(to top, rgba(255,150,120," + +(0.24 * f).toFixed(3) + "), rgba(255,170,130,0) 60%)," : "") +
      "radial-gradient(circle " + lr + "px at center, rgba(255,207,115,0.2), rgba(255,207,115,0) 100%)," +
      "radial-gradient(circle farthest-corner at center, rgba(3,5,12,0) 25%, rgba(3,5,12," + dark(0.35) + ") 60%, rgba(3,5,12," + dark(0.82) + ") 100%)";
  }
  function setDawn(f) {
    f = Math.floor(clamp(f, 0, 1) * 4) / 4;
    if (f === dawnF) return;
    dawnF = f;
    paintVignette(vignetteLr);
  }

  function moveBackground(x, y) {
    const mod = (v) => ((v % bgTileCss) + bgTileCss) % bgTileCss;
    const tx = mod(x) - bgTileCss, ty = mod(y) - bgTileCss;
    bgEl.style.transform = "translate3d(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px,0)";
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

  // lite: versión sin halo y con lienzo más ajustado, para la calidad reducida
  // (menos píxeles semitransparentes que mezclar cuando hay cientos de enemigos)
  const ENEMY_RIM = {
    crawler: "#8a5cff", skitter: "#53d8d0", brute: "#8a5cff", boss: "#ff5fd2",
    spitter: "#ff9a4d", splitter: "#9dff6b",
  };

  function makeEnemySprite(type, flash, lite) {
    const r = ENEMY_TYPES[type].r;
    const pad = lite ? 1.2 : 1.6;
    const size = Math.ceil(r * 2 * pad * SPR_RES);
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    g.translate(size / 2, size / 2);
    g.scale(SPR_RES, SPR_RES);
    const body = flash ? "#ffffff" : type === "boss" ? "#22102e" : "#160f26";
    const rim = ENEMY_RIM[type];
    const eye = type === "skitter" ? "#c6fff9" : type === "spitter" ? "#fff0b0" : "#ff4d6d";
    // halo exterior para que la silueta destaque sobre el fondo oscuro
    if (!lite) {
      const grad = g.createRadialGradient(0, 0, r * 0.6, 0, 0, r * pad);
      grad.addColorStop(0, hexA(rim, 0.45));
      grad.addColorStop(1, hexA(rim, 0));
      g.fillStyle = grad;
      g.beginPath();
      g.arc(0, 0, r * pad, 0, Math.PI * 2);
      g.fill();
    }
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
    } else if (type === "spitter") {
      // flor de sombra: pétalos puntiagudos alrededor de una boca
      g.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const rr = i % 2 ? r * 0.7 : r * 1.15;
        g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = flash ? "#ffffff" : rim;
      g.beginPath();
      g.arc(r * 0.45, 0, r * 0.28, 0, Math.PI * 2);
      g.fill();
    } else if (type === "splitter") {
      // gemelo: tres lóbulos unidos
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + Math.PI / 3;
        g.beginPath();
        g.arc(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, r * 0.62, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      }
      g.beginPath();
      g.arc(0, 0, r * 0.45, 0, Math.PI * 2);
      g.fill();
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
    const ex = type === "skitter" ? r * 0.45 : type === "spitter" ? -r * 0.1 : type === "splitter" ? r * 0.1 : r * 0.92;
    g.beginPath();
    g.arc(ex, -r * 0.16, Math.max(1.2, r * 0.12), 0, Math.PI * 2);
    g.arc(ex, r * 0.16, Math.max(1.2, r * 0.12), 0, Math.PI * 2);
    g.fill();
    return { c, size: size / SPR_RES };
  }

  const enemySprites = {};
  for (const type of Object.keys(ENEMY_TYPES)) {
    enemySprites[type] = [
      makeEnemySprite(type, false), makeEnemySprite(type, true),
      makeEnemySprite(type, false, true), makeEnemySprite(type, true, true),
    ];
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
    bgTile = c.toDataURL("image/png");
    bgEl.style.backgroundImage = "url(" + bgTile + ")";
    layoutBackground();
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
    M.migrate(d);
    M.ensureMissions(d, rand);
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
  let orbs = [], items = [], texts = [];
  const ITEM_COLORS = { moon: "#9fe7ff", wind: "#b8ffcf" };
  const MOTES = new Float32Array(26 * 4);
  for (let i = 0; i < MOTES.length; i++) MOTES[i] = Math.random();
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
    const moth = M.getMoth(save.moth) || M.MOTHS[0];
    const maxHp = 100 + up.vit * 10 + (moth.perk.hp || 0);
    enemies = [];
    bullets = [];
    gems = [];
    particles = [];
    rings = [];
    fireflies = [];
    orbs = [];
    items = [];
    texts = [];
    shake = 0;
    dashQueued = false;
    setDawn(0);
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
        dashT: 0, // tiempo restante del impulso
        dashCd: 0, // recarga del impulso
        dx: 1, dy: 0,
      },
      weapons: { bolt: moth.weapon === "bolt" ? 2 : 1, halo: 0, pulse: 0, star: 0, fly: 0 },
      evo: { bolt: false, halo: false, pulse: false, star: false, fly: false },
      evolved: 0,
      passives: { wing: 0, heart: 0, lens: 0, bloom: 0, tempo: 0, magnet: 0 },
      timers: { bolt: 0.4, pulse: 1.5, star: 1, haloAngle: 0 },
      tutorial: !save.tut ? 1 : 0,
      tutorialMoved: 0,
      moth,
      night: save.nightSel,
      nm: M.nightMods(save.nightSel),
      combo: 0,
      comboTimer: 0,
      bestCombo: 0,
      bosses: 0,
      missionTimer: 0,
      completed: [],
      itemsPicked: 0,
      dashes: 0,
      noHit: 0, // segundos seguidos sin recibir daño
      noHitBest: 0,
      lowHp: false,
    };
    if (moth.weapon !== "bolt") run.weapons[moth.weapon] = 1;
    M.activate(save);
  }

  // Valores de la partida que usan las misiones.
  function missionCtx(pending) {
    let maxed = 0;
    for (const id of WEAPONS) if (run.weapons[id] >= MAX_LEVEL) maxed++;
    return {
      kills: run.kills,
      time: run.time,
      level: run.level,
      bosses: run.bosses,
      nectar: run.nectar,
      maxed,
      bestCombo: run.bestCombo,
      evolved: run.evolved,
      noHitBest: run.noHitBest,
      items: run.itemsPicked,
      pendingKills: pending ? run.kills : 0,
    };
  }

  function checkMissions(pending) {
    const done = M.check(save, missionCtx(pending), rand);
    if (done.length) {
      run.completed.push(...done);
      persist();
      const d = done[0];
      setBanner(t("missionDone") + "  +" + d.reward + " ●", 2.5);
      A.sfx.levelUp();
    }
  }

  function xpNeed(l) {
    // el primer nivel llega en pocos segundos: recompensa inmediata al empezar
    if (l === 1) return 3;
    return Math.round(2 + l * 2.5 + l * l * 0.28);
  }

  function stats() {
    const pa = run.passives, up = save.up;
    return {
      dmg: (1 + pa.lens * 0.12) * (1 + up.dmg * 0.06),
      area: (1 + pa.bloom * 0.12) * (1 + (run.moth.perk.area || 0)),
      cd: Math.pow(0.92, pa.tempo) * (1 - (run.moth.perk.cd || 0)),
      speed: 165 * (1 + pa.wing * 0.1) * (1 + up.spd * 0.05),
      magnet: 110 * (1 + pa.magnet * 0.3) * (1 + up.mag * 0.15) * (1 + (run.moth.perk.magnet || 0)),
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
      hp: def.hp * (type === "boss" ? 1 + run.time / 150 : hpMul) * run.nm.hp,
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
      fire: 1.2 + rand() * 1.8, // espera hasta el siguiente disparo o embestida
      mode: 0, // jefe: 0 persigue, 1 avisa, 2 embiste
      modeT: 0,
      cdx: 0, cdy: 0,
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
    if (tm > 120 && r < 0.08 + tm / 9000) return "spitter";
    if (tm > 60 && r < 0.2 + tm / 5000) return "splitter";
    if (tm > 35 && r < 0.38) return "skitter";
    return "crawler";
  }

  function updateSpawns(dt) {
    const tm = run.time;
    let rate = (1.5 + tm * 0.046) * run.nm.spawn;
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
        b.fire = 4; // primera embestida tras unos segundos para que el jugador lo vea venir
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
    // racha: bajas encadenadas sin pausa larga
    run.combo++;
    run.comboTimer = 1.0;
    if (run.combo > run.bestCombo) run.bestCombo = run.combo;
    if (run.combo % 100 === 0) {
      run.nectar += 1;
      burst(run.player.x, run.player.y, 10, "#ffd36b");
    }
    A.sfx.kill();
    burst(e.x, e.y, e.boss ? 40 : e.type === "brute" ? 14 : 6, e.type === "crawler" || e.type === "brute" ? "#a98bff" : ENEMY_RIM[e.type]);
    dropGem(e.x, e.y, e.xp);
    if (e.type === "splitter") {
      // se divide en tres polillas pequeñas que salen despedidas
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + rand();
        const c = spawnEnemy("skitter", e.x + Math.cos(a) * 10, e.y + Math.sin(a) * 10);
        if (c) {
          c.hp = c.maxHp = c.hp * 0.6;
          c.xp = 0; // ya soltó rocío el padre
          c.kx = Math.cos(a) * 160;
          c.ky = Math.sin(a) * 160;
        }
      }
    }
    // objetos: flor de luna (cura) y semilla de viento (atrae todo el rocío)
    if (e.boss) {
      dropItem(e.x - 20, e.y, "moon");
      dropItem(e.x + 20, e.y, "wind");
    } else {
      const ch = e.type === "brute" ? 0.05 : 0.0035;
      if (rand() < ch) dropItem(e.x, e.y, rand() < 0.6 ? "moon" : "wind");
    }
    if (rand() < e.nectarChance) {
      const amount = e.boss ? 15 : e.type === "brute" ? 2 : 1;
      run.nectar += amount;
      burst(e.x, e.y, 6, "#ffd36b");
    }
    if (e.boss) {
      run.bosses++;
      run.boss = null;
      // un jefe derrotado concede dos niveles extra
      grantXp(run.need - run.xp);
      grantXp(xpNeed(run.level + 1));
      shakeAdd(10);
      P.happytime();
    }
  }

  const DASH_MUL = 3.2, DASH_TIME = 0.18, DASH_CD = 2.4;
  let dashQueued = false, dashBtnCd = false;

  function tryDash() {
    const p = run.player;
    if (p.dashCd > 0 || p.dashT > 0) return false;
    p.dashT = DASH_TIME;
    p.dashCd = DASH_CD;
    run.dashes++;
    if (!save.dashTut) {
      save.dashTut = true;
      persist();
    }
    A.sfx.pulse();
    return true;
  }

  function hurtPlayer(dmg) {
    const p = run.player;
    p.hp -= dmg;
    p.invuln = 0.6;
    p.hurtFlash = 0.25;
    run.noHit = 0;
    shakeAdd(6);
    A.sfx.hurt();
    if (!run.lowHp && p.hp > 0 && p.hp < p.maxHp * 0.3) {
      run.lowHp = true;
      setBanner(t("lowLight"), 2);
    } else if (p.hp >= p.maxHp * 0.5) run.lowHp = false;
  }

  function fireOrb(x, y, dx, dy, speed, dmg) {
    if (orbs.length >= 80) return;
    orbs.push({ x, y, px: x, py: y, vx: dx * speed, vy: dy * speed, r: 6, life: 3.4, dmg: dmg * run.nm.dmg });
  }

  function shakeAdd(v) {
    if (!save.shakeOff) shake = Math.max(shake, v);
  }

  function dropItem(x, y, kind) {
    if (items.length >= 12) return;
    items.push({ x, y, kind, life: 40, bob: rand() * 6.28 });
  }

  function pickItem(it) {
    const p = run.player;
    run.itemsPicked++;
    if (it.kind === "moon") {
      p.hp = Math.min(p.maxHp, p.hp + 25);
      burst(p.x, p.y, 14, ITEM_COLORS.moon);
      floatText(p.x, p.y - 20, "+25", ITEM_COLORS.moon);
    } else {
      for (let i = 0; i < gems.length; i++) gems[i].pull = true;
      burst(p.x, p.y, 14, ITEM_COLORS.wind);
      rings.push({ x: p.x, y: p.y, r: 10, max: 260, life: 0.35, color: ITEM_COLORS.wind });
    }
    A.sfx.levelUp();
  }

  function floatText(x, y, text, color) {
    if (texts.length >= 24) texts.shift();
    texts.push({ x, y, text, color, life: 0.9 });
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
    for (let i = 0; i < n && particles.length < maxParticles(); i++) {
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

  function haloCount() {
    return run.evo.halo ? 8 : 1 + run.weapons.halo;
  }
  function haloRadius(st) {
    return 64 * st.area * (run.evo.halo ? 1.35 : 1);
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
          const evo = run.evo.bolt;
          const count = evo ? 5 : 1 + (lvl >= 2 ? 1 : 0) + (lvl >= 4 ? 1 : 0);
          const base = Math.atan2(target.y - p.y, target.x - p.x);
          const dmg = 10 * (1 + 0.25 * (lvl - 1)) * st.dmg * (evo ? 1.6 : 1);
          for (let i = 0; i < count; i++) {
            const off = (i - (count - 1) / 2) * 0.14;
            fireBullet(p.x, p.y, base + off, evo ? 680 : 560, dmg, 1.0, (evo ? 7 : 5) * st.area,
              evo ? EVO_COLORS.bolt : COLORS.bolt, evo ? 4 : lvl >= 5 ? 2 : 0);
          }
          A.sfx.shoot();
          tm.bolt = 0.6 * (lvl >= 3 ? 0.82 : 1) * st.cd * (evo ? 0.75 : 1);
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
        const evo = run.evo.star;
        const n = evo ? 24 : 6 + 2 * (lvl - 1);
        const dmg = 8 * (1 + 0.25 * (lvl - 1)) * st.dmg * (evo ? 1.4 : 1);
        const rot = rand() * Math.PI;
        for (let i = 0; i < n; i++) {
          fireBullet(p.x, p.y, rot + (i / n) * Math.PI * 2, evo ? 440 : 380, dmg, 0.85 * st.area, 5,
            evo ? EVO_COLORS.star : COLORS.star, evo ? 1 : 0);
        }
        tm.star = evo ? 1.0 * st.cd : (2.0 - 0.15 * (lvl - 1)) * st.cd;
      }
    }

    // Pulso luminoso
    if (w.pulse) {
      tm.pulse -= dt;
      if (tm.pulse <= 0) {
        const lvl = w.pulse;
        const evo = run.evo.pulse;
        const radius = 95 * (1 + 0.15 * (lvl - 1)) * st.area * (evo ? 1.4 : 1);
        const dmg = 14 * (1 + 0.3 * (lvl - 1)) * st.dmg * (evo ? 1.5 : 1);
        let hits = 0;
        queryEnemies(p.x, p.y, radius, (e) => {
          hurtEnemy(e, dmg, p.x, p.y, 260);
          hits++;
        });
        // evolución: cada pulso cura un poco por sombra alcanzada
        if (evo && hits) p.hp = Math.min(p.maxHp, p.hp + Math.min(6, hits));
        // el pulso también disipa las esporas enemigas cercanas
        for (let i = orbs.length - 1; i >= 0; i--) {
          const o = orbs[i];
          if ((o.x - p.x) ** 2 + (o.y - p.y) ** 2 < radius * radius) {
            orbs[i] = orbs[orbs.length - 1];
            orbs.pop();
          }
        }
        rings.push({ x: p.x, y: p.y, r: 10, max: radius, life: 0.35, color: evo ? EVO_COLORS.pulse : COLORS.pulse });
        A.sfx.pulse();
        tm.pulse = evo ? 1.8 * st.cd : (3.4 - 0.3 * (lvl - 1)) * st.cd;
      }
    }

    // Halo de pétalos
    if (w.halo) {
      const lvl = w.halo;
      const n = haloCount();
      const radius = haloRadius(st);
      const dmg = 7 * (1 + 0.3 * (lvl - 1)) * st.dmg * (run.evo.halo ? 1.5 : 1);
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
      const flyCount = run.evo.fly ? 8 : w.fly;
      while (fireflies.length < flyCount) {
        fireflies.push({ x: p.x, y: p.y, px: p.x, py: p.y, vx: 0, vy: 0, cd: 0, target: null, phase: rand() * 6.28 });
      }
      const dmg = 9 * (1 + 0.25 * (w.fly - 1)) * st.dmg * (run.evo.fly ? 1.5 : 1);
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
        const sp = run.evo.fly ? 420 : 320;
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
  function availableEvos() {
    const out = [];
    for (const id of WEAPONS) {
      if (!run.evo[id] && run.weapons[id] >= MAX_LEVEL && run.passives[EVO_PARTNER[id]] >= 2) out.push({ kind: "evo", id });
    }
    return out;
  }

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
    // una evolución disponible aparece siempre en primer lugar
    const evos = availableEvos();
    const opts = evos.slice(0, 1).concat(pool).slice(0, 3);
    while (opts.length < 3) opts.push({ kind: "heal", id: "heal" });
    return opts;
    function score(o) {
      return o.kind === "w" && run.weapons[o.id] === 0 ? 1 : 0;
    }
  }

  function applyOption(o) {
    const p = run.player;
    if (o.kind === "evo") {
      run.evo[o.id] = true;
      run.evolved++;
      setBanner(t("evolved").replace("{x}", t("e_" + o.id)), 2.5);
      shakeAdd(5);
      burst(p.x, p.y, 30, EVO_COLORS[o.id]);
      if (o.id === "fly") fireflies.length = 0;
    } else if (o.kind === "w") run.weapons[o.id]++;
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
    if (run.comboTimer > 0) {
      run.comboTimer -= dt;
      if (run.comboTimer <= 0) run.combo = 0;
    }
    run.missionTimer -= dt;
    if (run.missionTimer <= 0) {
      run.missionTimer = 0.5;
      checkMissions(true);
    }

    // Jugador
    p.px = p.x;
    p.py = p.y;
    const [ix, iy] = inputVector();
    if (ix || iy) {
      const il = Math.hypot(ix, iy) || 1;
      p.dx = ix / il;
      p.dy = iy / il;
    }
    if (dashQueued) {
      dashQueued = false;
      tryDash();
    }
    if (p.dashCd > 0) p.dashCd -= dt;
    if (p.dashT > 0) {
      // impulso: velocidad ×3,2 en la dirección fijada y sin recibir daño
      p.dashT -= dt;
      p.x += p.dx * st.speed * DASH_MUL * dt;
      p.y += p.dy * st.speed * DASH_MUL * dt;
      if (particles.length < maxParticles()) {
        particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.3, max: 0.3, color: run.moth.color, size: 7 });
      }
    } else if (ix || iy) {
      p.x += ix * st.speed * dt;
      p.y += iy * st.speed * dt;
    }
    if (ix || iy) {
      p.face = Math.atan2(iy, ix);
      if (run.tutorial) run.tutorialMoved += dt;
    }
    if (run.time > RUN_TIME - 60) setDawn((run.time - (RUN_TIME - 60)) / 60);
    const cdNow = p.dashCd > 0;
    if (cdNow !== dashBtnCd) {
      dashBtnCd = cdNow;
      $("dashBtn").classList.toggle("cd", cdNow);
    }
    if (!save.dashTut && !run.dashHinted && run.time > 14) {
      run.dashHinted = true;
      setBanner(t("tutorialDash"), 4.5);
    }
    run.noHit += dt;
    if (run.noHit > run.noHitBest) run.noHitBest = run.noHit;
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
      let spd = e.speed;
      if (e.type === "spitter") {
        // mantiene la distancia y rodea al jugador; dispara cuando está a tiro
        if (d < 200) {
          mx = -mx;
          my = -my;
          spd *= 0.8;
        } else if (d < 300) {
          const tx = -my, ty = mx;
          mx = tx;
          my = ty;
          spd *= 0.5;
        }
        e.fire -= dt;
        if (e.fire < 0.35 && e.fire + dt >= 0.35) e.flash = 0.35; // aviso: parpadea antes de disparar
        if (e.fire <= 0) {
          e.fire = 2.6 + rand() * 1.2;
          if (d < 420) fireOrb(e.x, e.y, dx / d, dy / d, 160, 5);
        }
      } else if (e.boss) {
        // embestida: avisa 0,8 s con una línea y luego carga en línea recta
        e.fire -= dt;
        if (e.mode === 0 && e.fire <= 0 && d < 520) {
          e.mode = 1;
          e.modeT = 0.8;
          e.cdx = dx / d;
          e.cdy = dy / d;
        } else if (e.mode === 1) {
          e.modeT -= dt;
          spd = 0;
          mx = e.cdx;
          my = e.cdy;
          if (e.modeT <= 0) {
            e.mode = 2;
            e.modeT = 0.65;
            shakeAdd(4);
          }
        } else if (e.mode === 2) {
          e.modeT -= dt;
          mx = e.cdx;
          my = e.cdy;
          spd = 330;
          if (e.modeT <= 0) {
            e.mode = 0;
            e.fire = 5 + rand() * 2;
            // anillo de esporas al terminar la carga
            for (let k = 0; k < 8; k++) {
              const a = (k / 8) * Math.PI * 2;
              fireOrb(e.x, e.y, Math.cos(a), Math.sin(a), 140, 6);
            }
          }
        }
      }
      if (e.type === "skitter") {
        e.wob += dt * 7;
        const s = Math.sin(e.wob) * 0.6;
        const ox = -my * s, oy = mx * s;
        mx += ox;
        my += oy;
      }
      e.x += mx * spd * dt + e.kx * dt;
      e.y += my * spd * dt + e.ky * dt;
      e.kx *= 0.86;
      e.ky *= 0.86;
      e.ang = e.type === "spitter" ? Math.atan2(dy, dx) : Math.atan2(my, mx);
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

    // Contacto con el jugador (el impulso da invulnerabilidad)
    if (p.invuln <= 0 && p.dashT <= 0) {
      queryEnemies(p.x, p.y, p.r * 0.85, (e) => {
        hurtPlayer(e.dmg);
        return true;
      });
    }

    // Esporas enemigas
    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i];
      o.px = o.x;
      o.py = o.y;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.life -= dt;
      let dead = o.life <= 0;
      if (!dead && p.invuln <= 0 && p.dashT <= 0) {
        const ddx = p.x - o.x, ddy = p.y - o.y;
        if (ddx * ddx + ddy * ddy < (p.r * 0.8 + o.r) * (p.r * 0.8 + o.r)) {
          hurtPlayer(o.dmg);
          dead = true;
        }
      }
      if (dead) {
        orbs[i] = orbs[orbs.length - 1];
        orbs.pop();
      }
    }

    // Objetos en el suelo
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.life -= dt;
      it.bob += dt * 3;
      const ddx = p.x - it.x, ddy = p.y - it.y;
      const d2 = ddx * ddx + ddy * ddy;
      if (d2 < st.magnet * st.magnet * 0.5) {
        const d = Math.sqrt(d2) || 1;
        it.x += (ddx / d) * 260 * dt;
        it.y += (ddy / d) * 260 * dt;
      }
      if (d2 < (p.r + 14) * (p.r + 14)) {
        pickItem(it);
        it.life = 0;
      }
      if (it.life <= 0) {
        items[i] = items[items.length - 1];
        items.pop();
      }
    }
    for (let i = texts.length - 1; i >= 0; i--) {
      texts[i].life -= dt;
      texts[i].y -= 40 * dt;
      if (texts[i].life <= 0) texts.splice(i, 1);
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!p) return;
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

    // Fondo en mosaico (capa HTML): se desplaza con la cámara
    moveBackground(W / 2 - camX * K + sx, H / 2 - camY * K + sy);
    ctx.setTransform(k, 0, 0, k, ox, oy);
    const vw = canvas.width / k, vh = canvas.height / k;

    const left = camX - vw / 2 - 60, right = camX + vw / 2 + 60;
    const top = camY - vh / 2 - 60, bottom = camY + vh / 2 + 60;
    const visible = (x, y) => x > left && x < right && y > top && y < bottom;

    // (la luz del jugador sobre el suelo es parte de la capa #vignette)
    ctx.globalCompositeOperation = "lighter";

    // Motas de polen flotando (ambiente): posiciones fijas en el mundo que se repiten
    const nm = DPR < 1 || LOW_END ? 12 : 26;
    const spanX = vw + 120, spanY = vh + 120;
    const mImg = glow("#fff2b0", 6);
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < nm; i++) {
      const sx0 = MOTES[i * 4] * 2000 + run.time * (MOTES[i * 4 + 2] - 0.5) * 30;
      const sy0 = MOTES[i * 4 + 1] * 2000 - run.time * (8 + MOTES[i * 4 + 3] * 14);
      const x = left + ((((sx0 - left) % spanX) + spanX) % spanX);
      const y = top + ((((sy0 - top) % spanY) + spanY) % spanY);
      const sz = 2 + MOTES[i * 4 + 3] * 3;
      ctx.drawImage(mImg, x - sz, y - sz, sz * 2, sz * 2);
    }
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
    const liteOff = DPR < 1 ? 2 : 0;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const x = lerp(e.px, e.x), y = lerp(e.py, e.y);
      if (!visible(x, y)) continue;
      const spr = enemySprites[e.type][(e.flash > 0 ? 1 : 0) + liteOff];
      const c = Math.cos(e.ang), s = Math.sin(e.ang);
      ctx.setTransform(k * c, k * s, -k * s, k * c, x * k + ox, y * k + oy);
      ctx.drawImage(spr.c, -spr.size / 2, -spr.size / 2, spr.size, spr.size);
    }
    ctx.setTransform(k, 0, 0, k, ox, oy);

    // Aviso de embestida del jefe: línea que marca la trayectoria
    if (run.boss && run.boss.mode === 1) {
      const b = run.boss;
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(run.time * 30);
      ctx.strokeStyle = "#ff5fd2";
      ctx.lineWidth = b.r * 1.2;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + b.cdx * 260, b.y + b.cdy * 260);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Objetos (flor de luna y semilla de viento)
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!visible(it.x, it.y)) continue;
      const y = it.y + Math.sin(it.bob) * 3;
      const col = ITEM_COLORS[it.kind];
      if (it.life < 5 && Math.floor(it.life * 6) % 2) continue; // parpadea antes de desaparecer
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(glow(col, 16), it.x - 26, y - 26, 52, 52);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = col;
      ctx.strokeStyle = "#0b1020";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (it.kind === "moon") {
        for (let j = 0; j < 5; j++) {
          const a = (j / 5) * Math.PI * 2 + it.bob * 0.2;
          ctx.moveTo(it.x + Math.cos(a) * 8 + 4.5, y + Math.sin(a) * 8);
          ctx.arc(it.x + Math.cos(a) * 8, y + Math.sin(a) * 8, 4.5, 0, Math.PI * 2);
        }
      } else {
        ctx.ellipse(it.x, y, 5, 11, it.bob * 0.4, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(it.x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Esporas enemigas: halo naranja con núcleo oscuro (se distinguen de la luz propia)
    if (orbs.length) {
      ctx.globalCompositeOperation = "lighter";
      const oImg = glow("#ff8a3d", 12);
      for (let i = 0; i < orbs.length; i++) {
        const o = orbs[i];
        const x = lerp(o.px, o.x), y = lerp(o.py, o.y);
        ctx.drawImage(oImg, x - 19, y - 19, 38, 38);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#2a0d05";
      ctx.strokeStyle = "#ffb070";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < orbs.length; i++) {
        const o = orbs[i];
        const x = lerp(o.px, o.x), y = lerp(o.py, o.y);
        ctx.moveTo(x + 4.5, y);
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();
    }

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
      const n = haloCount();
      const radius = haloRadius(st);
      const hs = 11 * st.area * (run.evo.halo ? 1.3 : 1);
      const img = glow(run.evo.halo ? EVO_COLORS.halo : COLORS.halo, 14);
      for (let i = 0; i < n; i++) {
        const a = run.timers.haloAngle + (i / n) * Math.PI * 2;
        ctx.drawImage(img, camX + Math.cos(a) * radius - hs, camY + Math.sin(a) * radius - hs, hs * 2, hs * 2);
      }
    }
    const fImg = glow(run.evo.fly ? EVO_COLORS.fly : COLORS.fly, 10);
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

    // Textos flotantes (curaciones)
    if (texts.length) {
      ctx.textAlign = "center";
      ctx.font = "bold 13px Trebuchet MS, sans-serif";
      for (const tx of texts) {
        ctx.globalAlpha = Math.min(1, tx.life * 2);
        ctx.fillStyle = tx.color;
        ctx.fillText(tx.text, tx.x, tx.y);
      }
      ctx.globalAlpha = 1;
    }

    drawHud();
  }

  function drawPlayer(p, x, y) {
    const blink = p.invuln > 0 && Math.floor(p.invuln * 20) % 2 === 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(glow(p.hurtFlash > 0 ? "#ff6b6b" : "#ffd36b", 34), -34, -34, 68, 68);
    ctx.globalCompositeOperation = "source-over";
    // recarga del impulso: arco fino alrededor de la polilla
    if (p.dashCd > 0) {
      ctx.strokeStyle = "rgba(255,240,210,0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 21, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.dashCd / DASH_CD));
      ctx.stroke();
    }
    if (!blink) {
      ctx.rotate(p.face + Math.PI / 2);
      const f = 0.65 + Math.abs(Math.sin(p.flap)) * 0.35;
      ctx.fillStyle = "rgba(255, 240, 210, 0.92)";
      ctx.strokeStyle = run.moth.color;
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
    ctx.fillText(t("level") + " " + run.level + (run.night > 1 ? "  ·  " + t("nightShort") + run.night : ""), pad, 14 * u);
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

    // Racha de bajas (refuerzo inmediato: el número crece mientras se encadenan bajas)
    if (run.combo >= 10) {
      const pop = 1 + Math.max(0, run.comboTimer - 0.75) * 1.2;
      ctx.textAlign = "left";
      // tamaño de letra fijo y escala por transformación: cambiar la fuente en cada
      // fotograma obliga al navegador a recalcularla y es caro
      ctx.font = "bold " + Math.round(15 * u) + "px Trebuchet MS, sans-serif";
      ctx.fillStyle = run.combo >= 100 ? "#ffd36b" : "#f4ecd8";
      ctx.globalAlpha = Math.min(1, run.comboTimer / 0.4);
      ctx.setTransform(d * pop, 0, 0, d * pop, pad * d, 54 * u * d);
      ctx.fillText(t("combo") + " x" + run.combo, 0, 0);
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.globalAlpha = 1;
    }

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
      // flecha en el borde si el jefe está fuera de la pantalla
      const bx = W / 2 + (run.boss.x - camX) * K, byy = H / 2 + (run.boss.y - camY) * K;
      const m = 34 * u;
      if (bx < 0 || bx > W || byy < 0 || byy > H) {
        const a = Math.atan2(byy - H / 2, bx - W / 2);
        const ex = clamp(bx, m, W - m), ey = clamp(byy, m + 60 * u, H - m);
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(a);
        ctx.fillStyle = "#ff5fd2";
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(run.time * 8);
        ctx.beginPath();
        ctx.moveTo(14 * u, 0);
        ctx.lineTo(-8 * u, -10 * u);
        ctx.lineTo(-8 * u, 10 * u);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
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
    $("dashBtn").classList.toggle("show", id === null && state === "play" && touchUi);
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
    // primeros segundos: unas sombras ya visibles para que la acción empiece al instante
    const p0 = run.player;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rand();
      const d = viewHalfDiag() * (0.55 + rand() * 0.2);
      spawnEnemy("crawler", p0.x + Math.cos(a) * d, p0.y + Math.sin(a) * d);
    }
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
      const nameKey = o.kind === "w" ? "w_" + o.id : o.kind === "p" ? "p_" + o.id : o.kind === "evo" ? "e_" + o.id : "heal";
      const color = (o.kind === "evo" ? EVO_COLORS[o.id] : COLORS[o.id]) || "#ffffff";
      if (o.kind === "evo") b.className = "card evo";
      // pista de evolución: qué pasiva hace evolucionar el arma
      const hint = o.kind === "w" ? '<span class="hint">' + t("evoHint").replace("{x}", t("p_" + EVO_PARTNER[o.id])) + "</span>" : "";
      const tag =
        o.kind === "evo"
          ? '<span class="tag">' + t("evolution") + "</span>"
          : o.kind === "w" && cur === 0
          ? '<span class="tag">' + t("newWeapon") + "</span>"
          : o.kind !== "heal"
          ? '<span class="tag">' + t("levelShort") + " " + (cur + 1) + "</span>"
          : "";
      b.innerHTML =
        '<span class="icon" style="background:radial-gradient(circle,#fff 0,' + color + " 35%," + hexA(color, 0) + ' 72%)"></span>' +
        '<span class="name">' + t(nameKey) + "</span>" + tag +
        '<span class="desc">' + t(nameKey + "_d") + "</span>" + hint +
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
    const earned = Math.round(base * (1 + save.up.gold * 0.1) * run.nm.nectar);
    const nb = save.nightBest[run.night] || 0;
    const newBest = run.time > nb + 0.5;
    save.nectar += earned;
    save.runs++;
    save.totalKills += run.kills;
    save.bestCombo = Math.max(save.bestCombo, run.bestCombo);
    if (newBest) save.nightBest[run.night] = run.time;
    if (run.time > save.best) save.best = run.time;
    save.bestKills = Math.max(save.bestKills, run.kills);
    run.unlockedNight = 0;
    if (won) {
      save.wins++;
      if (run.night === save.night && save.night < M.MAX_NIGHT) {
        save.night++;
        save.nightSel = save.night;
        run.unlockedNight = save.night;
      }
    }
    checkMissions(false);
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

  function missionText(m) {
    const n = m.type === "survive" ? fmtTime(m.target) : m.target;
    return t("m_" + m.type).replace("{n}", n);
  }

  // Siguiente meta visible: la mejora más barata que aún no se puede pagar.
  function nextGoal() {
    let best = null;
    for (const item of SHOP) {
      const lvl = save.up[item.id];
      if (lvl >= SHOP_MAX) continue;
      const cost = shopCost(item, lvl);
      if (!best || cost < best.cost) best = { name: t("u_" + item.id), cost };
    }
    for (const m of M.MOTHS) {
      if (save.moths.indexOf(m.id) !== -1) continue;
      if (!best || m.cost < best.cost) best = { name: t("moth_" + m.id), cost: m.cost };
    }
    return best;
  }

  function showResults() {
    setState("results");
    const won = run.won;
    $("resTitle").textContent = won ? t("victory") : t("defeat");
    // casi lo consigues: mostrar lo cerca que estuvo anima a reintentar
    const left = RUN_TIME - run.time;
    $("resSub").textContent = won
      ? t("victorySub")
      : left < 90
      ? t("nearMiss").replace("{t}", fmtTime(left))
      : t("defeatSub");
    const rows = [
      [t("night"), run.night],
      [t("survived"), fmtTime(run.time)],
      [t("kills"), run.kills],
      [t("bestCombo"), "x" + run.bestCombo],
      [t("levelReached"), run.level],
      [t("nectarEarned"), "● " + run.earned],
    ];
    $("resStats").innerHTML = rows
      .map((r) => "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td></tr>")
      .join("");
    const msgs = [];
    if (run.unlockedNight) msgs.push(t("nightUnlocked").replace("{n}", run.unlockedNight));
    if (run.newBest) msgs.push(t("best"));
    for (const d of run.completed) msgs.push("✓ " + missionText(d) + "  +" + d.reward + " ●");
    const goal = nextGoal();
    if (goal) {
      msgs.push(
        save.nectar >= goal.cost
          ? t("goalReady").replace("{x}", goal.name)
          : t("goalNext").replace("{n}", goal.cost - save.nectar).replace("{x}", goal.name)
      );
    }
    $("resMsg").innerHTML = msgs.map((m) => "<div>" + m + "</div>").join("");
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
    if (run && state !== "results" && state !== "home") {
      save.nectar += run.nectar;
      save.totalKills += run.kills;
      persist();
    }
    openHome();
  }

  let homeTab = "upgrades";

  function openHome() {
    setState("home");
    M.ensureMissions(save, rand);
    $("homeNectar").textContent = "● " + save.nectar;
    $("homeBest").textContent = fmtTime(save.nightBest[save.nightSel] || 0);
    $("nightLabel").textContent = t("night") + " " + save.nightSel + " / " + save.night;
    $("nightDesc").textContent =
      save.nightSel > 1 ? t("nightDesc").replace("{n}", Math.round((M.nightMods(save.nightSel).nectar - 1) * 100)) : t("nightDesc1");
    $("nightPrev").disabled = save.nightSel <= 1;
    $("nightNext").disabled = save.nightSel >= save.night;
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("on", b.dataset.tab === homeTab));
    const box = $("shop");
    box.innerHTML = "";
    if (homeTab === "upgrades") renderUpgrades(box);
    else if (homeTab === "moths") renderMoths(box);
    else renderMissions(box);
    showScreen("home");
  }

  function shopItem(box, name, desc, extra, btnText, disabled, onClick, cls) {
    const div = document.createElement("div");
    div.className = "item" + (cls ? " " + cls : "");
    div.innerHTML = '<span class="name">' + name + "</span>" + '<span class="desc">' + desc + "</span>" + (extra || "");
    if (btnText) {
      const b = document.createElement("button");
      b.textContent = btnText;
      b.disabled = disabled;
      if (disabled) b.className = "secondary";
      b.addEventListener("click", onClick);
      div.appendChild(b);
    }
    box.appendChild(div);
  }

  function renderUpgrades(box) {
    for (const item of SHOP) {
      const lvl = save.up[item.id];
      const cost = shopCost(item, lvl);
      const maxed = lvl >= SHOP_MAX;
      shopItem(
        box,
        t("u_" + item.id),
        t("u_" + item.id + "_d"),
        '<span class="pips">' + "◆".repeat(lvl) + "◇".repeat(SHOP_MAX - lvl) + "</span>",
        maxed ? t("maxed") : t("buy") + " ● " + cost,
        maxed || save.nectar < cost,
        () => {
          if (save.nectar < cost || save.up[item.id] >= SHOP_MAX) return;
          save.nectar -= cost;
          save.up[item.id]++;
          persist();
          A.sfx.levelUp();
          openHome();
        }
      );
    }
  }

  function renderMoths(box) {
    for (const m of M.MOTHS) {
      const owned = save.moths.indexOf(m.id) !== -1;
      const selected = save.moth === m.id;
      const swatch = '<span class="swatch" style="background:radial-gradient(circle,#fff 0,' + m.color + ' 45%,transparent 72%)"></span>';
      shopItem(
        box,
        t("moth_" + m.id),
        t("w_" + m.weapon) + " · " + t("moth_" + m.id + "_d"),
        swatch,
        selected ? t("selected") : owned ? t("select") : t("unlock") + " ● " + m.cost,
        selected || (!owned && save.nectar < m.cost),
        () => {
          if (!owned) {
            if (save.nectar < m.cost) return;
            save.nectar -= m.cost;
            save.moths.push(m.id);
            A.sfx.levelUp();
          } else A.sfx.click();
          save.moth = m.id;
          persist();
          openHome();
        },
        selected ? "sel" : ""
      );
    }
  }

  function renderMissions(box) {
    for (const m of save.missions) {
      const prog = Math.min(m.target, M.progress(m, save, null));
      const pct = Math.round((100 * prog) / m.target);
      shopItem(
        box,
        missionText(m),
        "● " + M.reward(m.type, m.tier),
        '<span class="bar"><span style="width:' + pct + '%"></span></span>' +
          (M.MISSIONS[m.type].scope === "total" ? '<span class="desc">' + prog + " / " + m.target + "</span>" : '<span class="desc">' + t("oneNight") + "</span>"),
        null
      );
    }
  }

  function updateSoundBtn() {
    $("soundBtn").textContent = t("sound") + ": " + (save.muted ? t("off") : t("on"));
    $("musicBtn").textContent = t("music") + ": " + (save.musicOff ? t("off") : t("on"));
    $("shakeBtn").textContent = t("shake") + ": " + (save.shakeOff ? t("off") : t("on"));
  }

  function onKey(e) {
    if (e.repeat) return;
    if ((e.code === "Space" || e.code === "ShiftLeft" || e.code === "ShiftRight") && state === "play") {
      dashQueued = true;
    } else if (e.code === "KeyP") {
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
        save.totalKills += run.kills;
        persist();
      }
      startRun();
    });
    $("homeBtn").addEventListener("click", abandonRun);
    $("musicBtn").addEventListener("click", () => {
      save.musicOff = !save.musicOff;
      A.setMusic(!save.musicOff);
      persist();
      updateSoundBtn();
    });
    $("shakeBtn").addEventListener("click", () => {
      save.shakeOff = !save.shakeOff;
      if (save.shakeOff) shake = 0;
      persist();
      updateSoundBtn();
    });
    $("dashBtn").addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (state === "play") dashQueued = true;
    });
    $("againBtn").addEventListener("click", startRun);
    $("toHomeBtn").addEventListener("click", openHome);
    $("playBtn").addEventListener("click", startRun);
    $("rewardBtn").addEventListener("click", watchRewarded);
    document.querySelectorAll(".tab").forEach((b) =>
      b.addEventListener("click", () => {
        homeTab = b.dataset.tab;
        A.sfx.click();
        openHome();
      })
    );
    $("nightPrev").addEventListener("click", () => {
      save.nightSel = Math.max(1, save.nightSel - 1);
      persist();
      openHome();
    });
    $("nightNext").addEventListener("click", () => {
      save.nightSel = Math.min(save.night, save.nightSel + 1);
      persist();
      openHome();
    });
  }

  // ---------------------------------------------------------------------------
  // Bucle principal: paso fijo + calidad adaptativa
  // ---------------------------------------------------------------------------
  let last = 0, acc = 0;
  let frameAvg = 16.7, slowTime = 0;
  const perf = { fps: 60, frames: 0, quality: "x" + QUALITY[qualityLevel], updMs: 0, renMs: 0, bootMs: 0 };

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
      const t0 = performance.now();
      while (acc >= STEP && steps < 5 && state === "play") {
        update(STEP);
        acc -= STEP;
        steps++;
      }
      perf.updMs += (performance.now() - t0 - perf.updMs) * 0.05;
      if (steps >= 5) acc = 0;
      // si el equipo no da la talla, baja la resolución interna una vez
      if (frameAvg > 24 && QUALITY[QUALITY.length - 1] < DPR) {
        slowTime += ms / 1000;
        if (slowTime > 2) {
          // baja al siguiente peldaño que de verdad reduzca la resolución actual
          while (QUALITY[qualityLevel] >= DPR) qualityLevel++;
          perf.quality = "x" + QUALITY[qualityLevel];
          resize();
          slowTime = 0;
          frameAvg = 16.7;
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
    const t1 = performance.now();
    if (run) render(state === "play" ? acc / STEP : 1);
    else render(1);
    perf.renMs += (performance.now() - t1 - perf.renMs) * 0.05;
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
    A.setMusic(!save.musicOff);
    bindUi();
    P.loadingStop();
    $("loading").style.display = "none";
    resetLoop();
    requestAnimationFrame(frame);
    // Requisito de Full Launch: el jugador entra directamente en la partida.
    startRun();
    perf.bootMs = performance.now();
  }

  // Ganchos para las pruebas automatizadas (no afectan al juego).
  window.LW.debug = {
    get state() { return state; },
    get run() { return run; },
    get enemies() { return enemies.length; },
    get bullets() { return bullets.length; },
    counts: () => ({ enemies: enemies.length, bullets: bullets.length, gems: gems.length, particles: particles.length, rings: rings.length }),
    get perf() { return perf; },
    get save() { return save; },
    setSeed: (s) => { seed = s >>> 0 || 1; },
    skipTo: (tm) => { if (run) run.time = tm; },
    setInput: (v) => { botInput = v; },
    dash: () => tryDash(),
    get orbs() { return orbs.length; },
    get items() { return items.length; },
    get lowEnd() { return LOW_END; },
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
    spawn: (type, dx, dy) => spawnEnemy(type, run.player.x + dx, run.player.y + dy),
    clearEnemies: () => { enemies.length = 0; orbs.length = 0; },
    dropItem: (kind, dx, dy) => dropItem(run.player.x + dx, run.player.y + dy, kind),
    options: () => levelOptions(),
    get dawn() { return dawnF; },
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
