// Texturas procedurales generadas en el navegador (sin recursos externos).
// Cada generador produce color, altura y rugosidad en tramas repetibles (tileables);
// la altura se convierte en mapa de normales. Así los materiales responden a la luz
// rasante sin depender de fotografías con licencia.
import * as THREE from 'three';

// ---------- Ruido determinista y repetible ----------
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class TileNoise {
  constructor(seed = 1) {
    const rnd = mulberry32(seed);
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256).map((_, i) => i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
    this.vals = new Float32Array(256).map(() => rnd());
  }
  // Ruido de valor con periodo entero `per` (u, v en [0, per)).
  value(u, v, per) {
    const xi = Math.floor(u), yi = Math.floor(v);
    const xf = u - xi, yf = v - yi;
    const x0 = ((xi % per) + per) % per, y0 = ((yi % per) + per) % per;
    const x1 = (x0 + 1) % per, y1 = (y0 + 1) % per;
    const P = this.perm, V = this.vals;
    // Los índices se pliegan a 0..255 tras aplicar el periodo (periodos > 256 siguen siendo repetibles).
    const h = (i, j) => V[P[P[i & 255] + (j & 255)]];
    const a = h(x0, y0), b = h(x1, y0), c = h(x0, y1), d = h(x1, y1);
    const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  // fBm repetible: x, y en [0,1).
  fbm(x, y, base = 4, oct = 5, gain = 0.5) {
    let sum = 0, amp = 0.5, per = base, norm = 0;
    for (let o = 0; o < oct; o++) {
      sum += amp * this.value(x * per, y * per, per);
      norm += amp; amp *= gain; per *= 2;
    }
    return sum / norm;
  }
}

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const mix = (a, b, t) => a + (b - a) * t;
const hex = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };

// ---------- Ensamblado de mapas ----------
function makeMaps(size, fn, { normalStrength = 2, repeat = [1, 1], anisotropy = 8 } = {}) {
  const n = size * size;
  const col = new Uint8Array(n * 4);
  const rough = new Uint8Array(n * 4);
  const height = new Float32Array(n);
  const out = { r: 0, g: 0, b: 0, h: 0, ro: 0.8 };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      fn(x / size, y / size, out);
      const i = y * size + x, j = i * 4;
      col[j] = clamp01(out.r) * 255; col[j + 1] = clamp01(out.g) * 255; col[j + 2] = clamp01(out.b) * 255; col[j + 3] = 255;
      // roughnessMap lee el canal G; aoMap/metalness no se usan.
      const ro = clamp01(out.ro) * 255;
      rough[j] = 255; rough[j + 1] = ro; rough[j + 2] = 0; rough[j + 3] = 255;
      height[i] = out.h;
    }
  }
  const nor = new Uint8Array(n * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = height[y * size + ((x - 1 + size) % size)], r = height[y * size + ((x + 1) % size)];
      const u = height[((y - 1 + size) % size) * size + x], d = height[((y + 1) % size) * size + x];
      let nx = (l - r) * normalStrength * size / 256, ny = (u - d) * normalStrength * size / 256, nz = 1;
      const len = Math.hypot(nx, ny, nz); nx /= len; ny /= len; nz /= len;
      const j = (y * size + x) * 4;
      nor[j] = (nx * 0.5 + 0.5) * 255; nor[j + 1] = (ny * 0.5 + 0.5) * 255; nor[j + 2] = (nz * 0.5 + 0.5) * 255; nor[j + 3] = 255;
    }
  }
  const tex = (data, srgb) => {
    const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = anisotropy;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  };
  return { map: tex(col, true), normalMap: tex(nor, false), roughnessMap: tex(rough, false) };
}

// Disposición de bloques en hiladas (sillería) repetible.
function courses(rnd, rows, minLen, maxLen) {
  const out = [];
  for (let r = 0; r < rows; r++) {
    const cuts = [0];
    let x = rnd() * 0.3;
    const start = x;
    while (x < 1 + start - minLen) { cuts.push(x - start); x += minLen + rnd() * (maxLen - minLen); }
    out.push({ offset: start, cuts, tints: cuts.map(() => rnd()) });
  }
  return out;
}

// ---------- Generadores ----------
const G = {
  // Mampostería de hiladas finas (lajas apiladas de alturas variables), juntas
  // oscuras y rehundidas. Referencia de oficio: muros de lajas de gneis/caliza.
  stone(size) {
    const N = new TileNoise(11), rnd = mulberry32(7);
    const heights = []; let acc = 0;
    while (acc < 1) { const h = 0.035 + Math.pow(rnd(), 1.8) * 0.09; heights.push(h); acc += h; }
    const sc = 1 / acc; let y = 0;
    const rows = heights.map((h) => { const r = { y0: y, h: h * sc }; y += h * sc; return r; });
    const C = courses(rnd, rows.length, 0.18, 0.75);
    const tones = [hex('#cdbfa8'), hex('#d5c6ad'), hex('#c4b6a0'), hex('#dbcdb4'), hex('#bfb29c'), hex('#cfbd9f')];
    return makeMaps(size, (u, v, o) => {
      let r = 0; while (r < rows.length - 1 && v >= rows[r + 1].y0) r++;
      const R = rows[r], ly = (v - R.y0) / R.h;
      const c = C[r]; const uu = (u + c.offset) % 1;
      let k = 0; for (let i = 0; i < c.cuts.length; i++) if (uu >= c.cuts[i]) k = i;
      const next = k + 1 < c.cuts.length ? c.cuts[k + 1] : 1;
      const w = next - c.cuts[k], lx = (uu - c.cuts[k]) / w;
      const n = N.fbm(u, v, 8, 6), fine = N.fbm(u, v, 96, 3), streak = N.fbm(u * 0.5, v * 6, 8, 4);
      // distancia al borde en unidades de tesela
      const ex = Math.min(lx, 1 - lx) * w, ey = Math.min(ly, 1 - ly) * R.h;
      const edge = Math.min(ex * 1.6, ey);
      const joint = 0.0045 + (n - 0.5) * 0.004;
      if (edge < joint) { o.r = 0.2; o.g = 0.18; o.b = 0.16; o.h = 0; o.ro = 1; return; }
      const t = c.tints[k];
      const base = tones[Math.floor(t * tones.length) % tones.length];
      const tone = 0.9 + (n - 0.5) * 0.2 + (fine - 0.5) * 0.12 + (streak - 0.5) * 0.1;
      const bevel = clamp01((edge - joint) / 0.012);
      const shade = 0.88 + 0.12 * bevel;
      o.r = base[0] * tone * shade; o.g = base[1] * tone * shade; o.b = base[2] * tone * shade;
      o.h = 0.35 + 0.4 * bevel + n * 0.15 + fine * 0.1 + (t - 0.5) * 0.15;
      o.ro = 0.7 + fine * 0.25;
    }, { normalStrength: 2.2 });
  },

  // Losas de pavimento grandes, más claras y lisas.
  paving(size) {
    const N = new TileNoise(21), rnd = mulberry32(3);
    const rows = 4, C = courses(rnd, rows, 0.32, 0.5);
    return makeMaps(size, (u, v, o) => {
      const r = Math.floor(v * rows), ly = v * rows - r;
      const c = C[r]; const uu = (u + c.offset) % 1;
      let k = 0; for (let i = 0; i < c.cuts.length; i++) if (uu >= c.cuts[i]) k = i;
      const next = k + 1 < c.cuts.length ? c.cuts[k + 1] : 1;
      const w = next - c.cuts[k], lx = (uu - c.cuts[k]) / w;
      const edge = Math.min(lx * w * rows, (1 - lx) * w * rows, ly, 1 - ly);
      const n = N.fbm(u, v, 6, 6), f = N.fbm(u, v, 96, 2);
      const t = (c.tints[k] - 0.5) * 0.12;
      if (edge < 0.012) { o.r = 0.42; o.g = 0.38; o.b = 0.33; o.h = 0; o.ro = 0.9; return; }
      const tone = 0.86 + n * 0.22 + t;
      o.r = 0.80 * tone; o.g = 0.73 * tone; o.b = 0.63 * tone;
      o.h = 0.6 + n * 0.25 + f * 0.05; o.ro = 0.62 + n * 0.25;
    }, { normalStrength: 1.6 });
  },

  // Tarima de roble: tablas anchas con veta, juntas y variación por tabla.
  planks(size, { color = '#6b4a31', gap = true, seed = 5 } = {}) {
    const N = new TileNoise(seed), rnd = mulberry32(seed + 9);
    const rows = 8, C = courses(rnd, rows, 0.35, 0.7);
    const base = hex(color);
    return makeMaps(size, (u, v, o) => {
      const r = Math.floor(v * rows), ly = v * rows - r;
      const c = C[r]; const uu = (u + c.offset) % 1;
      let k = 0; for (let i = 0; i < c.cuts.length; i++) if (uu >= c.cuts[i]) k = i;
      const next = k + 1 < c.cuts.length ? c.cuts[k + 1] : 1;
      const w = next - c.cuts[k], lx = (uu - c.cuts[k]) / w;
      const t = c.tints[k];
      const grainN = N.fbm(u * 0.25 + t, v, 4, 4);
      const grain = Math.sin((v * rows * 3.5 + grainN * 7 + t * 40) * Math.PI) * 0.5 + 0.5;
      const pores = N.fbm(u, v * 0.2 + t, 128, 2);
      const edge = Math.min(ly, 1 - ly, lx * w * 6, (1 - lx) * w * 6);
      if (gap && edge < 0.03) { o.r = base[0] * 0.25; o.g = base[1] * 0.25; o.b = base[2] * 0.25; o.h = 0; o.ro = 1; return; }
      const tone = 0.8 + (t - 0.5) * 0.3 + grain * 0.1 + pores * 0.06;
      o.r = base[0] * tone; o.g = base[1] * tone; o.b = base[2] * tone;
      o.h = 0.5 + grain * 0.05 + pores * 0.06; o.ro = 0.55 + grain * 0.15 + pores * 0.15;
    }, { normalStrength: 0.7 });
  },

  // Revoco de cal: variación suave de baja frecuencia y poro fino.
  plaster(size) {
    const N = new TileNoise(31);
    return makeMaps(size, (u, v, o) => {
      const n = N.fbm(u, v, 3, 6), f = N.fbm(u, v, 48, 3);
      const tone = 0.9 + (n - 0.5) * 0.12 + (f - 0.5) * 0.05;
      o.r = 0.86 * tone; o.g = 0.80 * tone; o.b = 0.71 * tone;
      o.h = n * 0.6 + f * 0.4; o.ro = 0.9;
    }, { normalStrength: 1.1 });
  },

  // Tejido: trama y urdimbre con irregularidad (lino / lana).
  weave(size, { color = '#e8e0d2', freq = 96, slub = 0.12, seed = 41, rough = 0.95 } = {}) {
    const N = new TileNoise(seed), base = hex(color);
    return makeMaps(size, (u, v, o) => {
      const a = Math.sin(u * freq * Math.PI * 2), b = Math.sin(v * freq * Math.PI * 2);
      const over = ((Math.floor(u * freq) + Math.floor(v * freq)) & 1) ? a : b;
      const sl = N.fbm(u, v * 0.1, 32, 3);
      const n = N.fbm(u, v, 4, 4);
      const tone = 0.86 + over * 0.06 + (sl - 0.5) * slub * 2 + (n - 0.5) * 0.08;
      o.r = base[0] * tone; o.g = base[1] * tone; o.b = base[2] * tone;
      o.h = 0.5 + over * 0.3 + sl * 0.2; o.ro = rough;
    }, { normalStrength: 1.2 });
  },

  // Suelo de bosque: musgo, tierra y agujas.
  forestFloor(size) {
    const N = new TileNoise(51);
    const moss = hex('#56603a'), soil = hex('#6a5640'), needle = hex('#9a7449');
    return makeMaps(size, (u, v, o) => {
      const m = N.fbm(u, v, 4, 6), d = N.fbm(u + 0.37, v, 32, 3), s = N.fbm(u, v, 128, 2);
      const t = clamp01((m - 0.42) * 3);
      let c = [mix(soil[0], moss[0], t), mix(soil[1], moss[1], t), mix(soil[2], moss[2], t)];
      const nd = clamp01((d - 0.6) * 5) * (1 - t);
      c = c.map((x, i) => mix(x, needle[i], nd * 0.6));
      const tone = 0.8 + s * 0.35;
      o.r = c[0] * tone; o.g = c[1] * tone; o.b = c[2] * tone;
      o.h = m * 0.5 + s * 0.5; o.ro = 0.95;
    }, { normalStrength: 2.4 });
  },

  // Grava fina para el parterre del patio.
  gravel(size) {
    const N = new TileNoise(61);
    return makeMaps(size, (u, v, o) => {
      // pseudo-voronoi barato con ruido de alta frecuencia
      const a = N.fbm(u, v, 64, 2), b = N.fbm(u + 0.5, v + 0.5, 128, 2);
      const peb = Math.pow(clamp01((a - 0.35) * 2.2), 0.6);
      const tone = 0.55 + peb * 0.4 + (b - 0.5) * 0.2;
      o.r = 0.72 * tone; o.g = 0.68 * tone; o.b = 0.62 * tone;
      o.h = peb; o.ro = 0.9;
    }, { normalStrength: 3 });
  },

  // Corteza: estrías verticales.
  bark(size) {
    const N = new TileNoise(71);
    return makeMaps(size, (u, v, o) => {
      const s = N.fbm(u * 1.0, v * 0.12, 16, 4);
      const ridge = 1 - Math.abs(Math.sin((u * 14 + s * 3) * Math.PI));
      const n = N.fbm(u, v, 32, 3);
      const tone = 0.45 + ridge * 0.4 + n * 0.2;
      o.r = 0.36 * tone; o.g = 0.29 * tone; o.b = 0.23 * tone;
      o.h = ridge * 0.8 + n * 0.2; o.ro = 0.95;
    }, { normalStrength: 3.5 });
  },

  // Normales de agua para el lago (solo se usa normalMap).
  water(size) {
    const N = new TileNoise(81);
    return makeMaps(size, (u, v, o) => {
      const h = N.fbm(u, v, 8, 6, 0.55);
      o.r = o.g = o.b = 0.5; o.h = h; o.ro = 0.1;
    }, { normalStrength: 6 });
  },
};

// Lista ordenada para la carga progresiva: [id, generador, opciones de material].
export function textureJobs(q) {
  const s = q.textureSize, S = Math.max(256, s / 2);
  return [
    ['stone', () => G.stone(s)],
    ['paving', () => G.paving(s)],
    ['oakFloor', () => G.planks(s, { color: '#a07a56', seed: 5 })],
    ['deck', () => G.planks(S, { color: '#6e5843', seed: 8 })],
    ['oak', () => G.planks(S, { color: '#4a3323', gap: false, seed: 13 })],
    ['plaster', () => G.plaster(S)],
    ['linen', () => G.weave(S, { color: '#ece5d8', freq: 110, seed: 41 })],
    ['wool', () => G.weave(S, { color: '#b9865a', freq: 48, slub: 0.2, seed: 43 })],
    ['boucle', () => G.weave(S, { color: '#ddd3c2', freq: 64, slub: 0.3, seed: 47 })],
    ['forestFloor', () => G.forestFloor(s)],
    ['gravel', () => G.gravel(S)],
    ['bark', () => G.bark(S)],
    ['water', () => G.water(S)],
  ];
}

export const textureLabels = {
  stone: 'Piedra caliza', paving: 'Losas del patio', oakFloor: 'Tarima de roble', deck: 'Tarima exterior',
  oak: 'Roble ahumado', plaster: 'Revoco de cal', linen: 'Lino', wool: 'Lana', boucle: 'Bouclé',
  forestFloor: 'Suelo de bosque', gravel: 'Grava', bark: 'Corteza', water: 'Agua',
};
