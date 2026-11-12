import { P } from './palette';
import { rect, rng, sidewalk, sky, stars, WORLD_H, WORLD_W, type StageScene } from './environments';

/**
 * Layered stages: the sky, a far skyline and the near rooftops are drawn into
 * separate tileable canvases so the street can scroll them at different speeds
 * (parallax) and light them live. Stages without a layered drawer keep the
 * single baked canvas from environments.ts.
 */

export type Flicker = 'lamp' | 'candle' | 'neon' | 'pulse';

export interface StageLight {
  x: number;
  y: number;
  /** Radius of the glow in world pixels. */
  r: number;
  color: number;
  alpha: number;
  /** Vertical squash, for light pools on the ground. */
  squash?: number;
  flicker?: Flicker;
}

export interface Reflection {
  x: number;
  y: number;
  color: number;
  alpha: number;
  flicker?: Flicker;
}

/** Live lighting and ambient traffic laid over a stage. */
export interface StageLife {
  lights: StageLight[];
  reflections: Reflection[];
  cone?: { x: number; y: number; alpha: number };
  steam: { x: number; y: number }[];
  moths?: { x: number; y: number };
  drip?: { x: number; y: number };
  rain: boolean;
  /** What passes by now and then: a car (headlights at night), a yacht at sea, a comet in space. */
  traffic?: 'car' | 'nightCar' | 'yacht' | 'comet';
  /** Pulsing halo around the sun / moon / Earth of a flat stage. */
  halo?: { r: number; color: number };
}

export interface LayeredStage extends StageLife {
  sky: HTMLCanvasElement;
  far: HTMLCanvasElement;
  mid: HTMLCanvasElement;
  base: HTMLCanvasElement;
  moon: HTMLCanvasElement;
  /** Windows of the far skyline that switch on and off over time. */
  farWindows: { x: number; y: number; lit: boolean }[];
  farWall: string;
  farLit: string;
  neon?: { x: number; y: number; canvas: HTMLCanvasElement };
  scene: StageScene;
}

const canvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
};

/** Draws `fn` at x, x − W and x + W so the layer tiles seamlessly. */
const wrap = (x: number, w: number, fn: (x: number) => void) => {
  fn(x);
  if (x < 0) fn(x + WORLD_W);
  if (x + w > WORLD_W) fn(x - WORLD_W);
};

const hex = (c: string) => parseInt(c.slice(1), 16);

/** 3×5 pixel glyphs for the neon sign. */
const GLYPHS: Record<string, string[]> = {
  B: ['110', '101', '110', '101', '110'],
  A: ['010', '101', '111', '101', '101'],
  R: ['110', '101', '110', '101', '101'],
};

function neonSign(): HTMLCanvasElement {
  const { c, ctx } = canvas(17, 10);
  'BAR'.split('').forEach((ch, i) => {
    GLYPHS[ch].forEach((row, y) => row.split('').forEach((bit, x) => bit === '1' && rect(ctx, '#ff4fa3', 2 + i * 4 + x, 1 + y, 1, 1)));
  });
  // Arrow pointing down the alley.
  rect(ctx, P.teal, 1, 8, 13, 1);
  rect(ctx, P.teal, 13, 7, 1, 3);
  rect(ctx, P.teal, 14, 8, 1, 1);
  return c;
}

function moon(): HTMLCanvasElement {
  const { c, ctx } = canvas(17, 17);
  const r = 7;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const d = dx * dx + dy * dy;
    if (d > r * r) continue;
    rect(ctx, dx + dy > 6 ? '#e8d6ae' : P.cream, 8 + dx, 8 + dy, 1, 1);
  }
  rect(ctx, '#cbb894', 5, 6, 2, 2);
  rect(ctx, '#cbb894', 10, 10, 3, 2);
  rect(ctx, '#cbb894', 9, 4, 1, 1);
  rect(ctx, '#cbb894', 4, 11, 1, 1);
  return c;
}

// ———————————————————————————————————— Survival

function survival(): LayeredStage {
  const r = rng(4242);

  // Sky: deep night fading to a sodium-orange city glow at the horizon.
  const skyC = canvas(WORLD_W, WORLD_H);
  sky(skyC.ctx, ['#130d22', P.night, P.plum, P.dusk, P.rose, P.coral], 0, 84);
  rect(skyC.ctx, P.coral, 0, 84, WORLD_W, WORLD_H - 84);
  stars(skyC.ctx, r, 46, 40);
  for (const [x, y] of [[34, 9], [128, 6], [72, 22]]) {
    rect(skyC.ctx, P.cream, x - 1, y, 3, 1);
    rect(skyC.ctx, P.cream, x, y - 1, 1, 3);
    rect(skyC.ctx, P.white, x, y, 1, 1);
  }

  // Far skyline: hazy silhouettes, a few late-night windows.
  const farWall = '#4a2f55';
  const farLit = P.orange;
  const farC = canvas(WORLD_W, WORLD_H);
  const farWindows: LayeredStage['farWindows'] = [];
  for (let x = 0; x < WORLD_W;) {
    const w = 12 + Math.floor(r() * 16);
    const top = 30 + Math.floor(r() * 24);
    wrap(x, w, (bx) => {
      rect(farC.ctx, farWall, bx, top, w, 70);
      if (w > 20 && r() < 0.5) rect(farC.ctx, farWall, bx + 3, top - 4, w - 6, 4);
    });
    if (r() < 0.35) {
      const ax = (x + Math.floor(w / 2)) % WORLD_W;
      rect(farC.ctx, farWall, ax, top - 10, 1, 10);
      rect(farC.ctx, P.red, ax, top - 11, 1, 1);
    }
    for (let wy = top + 3; wy < 92; wy += 4) {
      for (let wx = x + 2; wx < x + w - 2; wx += 3) {
        const lit = r() < 0.12;
        const px = ((wx % WORLD_W) + WORLD_W) % WORLD_W;
        if (lit) rect(farC.ctx, r() < 0.3 ? P.sun : farLit, px, wy, 1, 1);
        if (farWindows.length < 400) farWindows.push({ x: px, y: wy, lit });
      }
    }
    x += w + Math.floor(r() * 3);
  }

  // Near rooftops behind the alley wall: water tank, AC boxes, a dead billboard.
  const midWall = '#2b2140';
  const midC = canvas(WORLD_W, WORLD_H);
  let tank = false;
  let board = false;
  for (let x = -6; x < WORLD_W;) {
    const w = 22 + Math.floor(r() * 20);
    const top = 40 + Math.floor(r() * 16);
    wrap(x, w, (bx) => {
      rect(midC.ctx, midWall, bx, top, w, 30);
      rect(midC.ctx, '#3a2c52', bx, top, w, 1);
      for (let wy = top + 4; wy < 60; wy += 5) {
        for (let wx = bx + 3; wx < bx + w - 3; wx += 5) {
          const roll = r();
          if (roll < 0.22) rect(midC.ctx, roll < 0.06 ? '#9fd0ff' : '#ffb85c', wx, wy, 2, 2);
        }
      }
    });
    const cx = x + Math.floor(w / 2);
    if (!tank && w > 30) {
      tank = true;
      wrap(cx - 6, 12, (bx) => {
        rect(midC.ctx, midWall, bx + 1, top - 4, 1, 4);
        rect(midC.ctx, midWall, bx + 10, top - 4, 1, 4);
        rect(midC.ctx, '#3a2c52', bx, top - 13, 12, 9);
        rect(midC.ctx, midWall, bx, top - 10, 12, 1);
        rect(midC.ctx, midWall, bx, top - 7, 12, 1);
        for (let i = 0; i < 6; i++) rect(midC.ctx, '#3a2c52', bx + 6 - i, top - 14 - Math.min(i, 5 - i), 1, 1);
      });
    } else if (!board && w > 26) {
      board = true;
      wrap(cx - 10, 20, (bx) => {
        rect(midC.ctx, midWall, bx + 4, top - 4, 1, 4);
        rect(midC.ctx, midWall, bx + 15, top - 4, 1, 4);
        rect(midC.ctx, '#1a1428', bx, top - 15, 20, 11);
        rect(midC.ctx, '#5a3a5e', bx + 1, top - 14, 18, 9);
        rect(midC.ctx, P.coral, bx + 3, top - 12, 8, 2);
        rect(midC.ctx, '#3a2c52', bx + 3, top - 9, 13, 1);
      });
    } else {
      wrap(cx - 3, 7, (bx) => {
        rect(midC.ctx, '#3a2c52', bx, top - 4, 7, 4);
        rect(midC.ctx, midWall, bx + 1, top - 3, 5, 1);
      });
    }
    x += w + 1;
  }

  // Base: the alley itself, transparent above the wall.
  const b = canvas(WORLD_W, WORLD_H);
  const ctx = b.ctx;
  // wall cap
  rect(ctx, P.ink, 0, 59, WORLD_W, 1);
  rect(ctx, P.concrete, 0, 60, WORLD_W, 2);
  rect(ctx, P.concreteLight, 0, 60, WORLD_W, 1);
  // bricks with a two-tone face and the odd discoloured one
  rect(ctx, '#4d1f1a', 0, 62, WORLD_W, 50);
  for (let y = 62; y < 112; y += 4) {
    const off = ((y - 62) / 4) % 2 ? 0 : 4;
    for (let x = -off; x < WORLD_W; x += 8) {
      const roll = r();
      const face = roll < 0.12 ? '#a5503b' : roll < 0.26 ? '#74302a' : P.brick;
      rect(ctx, face, x + 1, y + 1, 6, 2);
      rect(ctx, roll < 0.12 ? P.brick : P.brickDark, x + 1, y + 2, 6, 1);
      if (roll > 0.9) rect(ctx, '#c46a4c', x + 1, y + 1, 2, 1);
    }
  }
  // grime creeping up from the pavement
  ctx.fillStyle = 'rgba(20,16,28,0.45)';
  for (let y = 98; y < 112; y++) for (let x = 0; x < WORLD_W; x++) if ((x + y) % (y > 105 ? 1 : 2) === 0 && r() < (y - 96) / 16) ctx.fillRect(x, y, 1, 1);

  // lit window with fire escape and its hanging ladder
  rect(ctx, P.ink, 57, 64, 22, 17);
  rect(ctx, '#ffb85c', 58, 65, 20, 15);
  rect(ctx, '#ffd98a', 62, 67, 10, 6);
  rect(ctx, '#c4553f', 58, 65, 4, 15);
  rect(ctx, '#c4553f', 74, 65, 4, 15);
  rect(ctx, '#8d3a2e', 61, 65, 1, 15);
  rect(ctx, '#8d3a2e', 74, 65, 1, 15);
  rect(ctx, P.ink, 67, 65, 1, 15);
  rect(ctx, P.ink, 58, 72, 20, 1);
  rect(ctx, '#3b2a4d', 64, 75, 6, 5); // someone's silhouette
  rect(ctx, '#3b2a4d', 65, 73, 4, 2);
  rect(ctx, P.ink, 52, 81, 32, 2);
  rect(ctx, P.steel, 52, 81, 32, 1);
  rect(ctx, P.ink, 52, 76, 32, 1);
  for (let x = 52; x <= 83; x += 4) rect(ctx, P.ink, x, 76, 1, 5);
  for (const lx of [63, 69]) {
    rect(ctx, P.ink, lx, 83, 1, 18);
    rect(ctx, P.concrete, lx, 83, 1, 1);
  }
  for (let y = 85; y < 101; y += 3) rect(ctx, P.ink, 63, y, 7, 1);

  // posters, one half torn off
  rect(ctx, P.cream, 92, 74, 14, 18);
  rect(ctx, P.red, 94, 77, 10, 2);
  rect(ctx, P.ink, 94, 81, 8, 1);
  rect(ctx, P.ink, 94, 84, 6, 1);
  rect(ctx, P.ink, 94, 87, 9, 1);
  rect(ctx, P.cream, 108, 78, 10, 12);
  rect(ctx, P.blue, 110, 80, 6, 6);
  rect(ctx, '#d8cba6', 112, 86, 6, 4);
  rect(ctx, P.brick, 115, 87, 3, 3);
  // graffiti
  rect(ctx, P.teal, 128, 82, 20, 3);
  rect(ctx, P.pink, 132, 86, 14, 3);
  rect(ctx, P.teal, 146, 78, 3, 10);
  rect(ctx, P.teal, 126, 79, 2, 7);
  rect(ctx, P.white, 129, 83, 4, 1);
  rect(ctx, P.sun, 138, 77, 5, 2);
  rect(ctx, P.sun, 140, 75, 1, 6);

  // drainpipe
  rect(ctx, P.ink, 153, 60, 5, 52);
  rect(ctx, P.concrete, 154, 60, 3, 52);
  rect(ctx, P.steel, 154, 60, 1, 52);
  for (let y = 66; y < 112; y += 12) rect(ctx, P.ink, 152, y, 7, 1);
  rect(ctx, P.concrete, 154, 109, 6, 3);

  // AC unit
  rect(ctx, P.ink, 195, 66, 18, 12);
  rect(ctx, P.concreteLight, 196, 67, 16, 10);
  for (let x = 198; x < 211; x += 2) rect(ctx, P.concrete, x, 69, 1, 7);
  rect(ctx, P.ink, 194, 78, 20, 1);

  // cardboard box home, with a blanket and a candle inside
  rect(ctx, P.ink, 13, 92, 40, 21);
  rect(ctx, P.cardboard, 14, 93, 38, 19);
  rect(ctx, '#d6b07a', 14, 93, 38, 1);
  rect(ctx, P.cardboardDark, 14, 94, 38, 3);
  rect(ctx, P.cardboardDark, 33, 97, 1, 15);
  rect(ctx, '#c9b98f', 25, 93, 4, 19); // tape
  rect(ctx, P.ink, 18, 103, 13, 9);
  rect(ctx, '#3a1f2c', 19, 104, 11, 8);
  rect(ctx, P.blue, 19, 109, 11, 3);
  rect(ctx, P.navy, 19, 111, 11, 1);
  rect(ctx, P.cream, 23, 107, 1, 2);
  rect(ctx, P.sun, 23, 106, 1, 1);
  rect(ctx, P.ink, 37, 100, 10, 1);
  rect(ctx, P.ink, 37, 102, 7, 1);
  rect(ctx, P.red, 37, 105, 3, 1);
  rect(ctx, P.red, 38, 104, 1, 3); // "frágil"

  // dumpster with a lid left open
  rect(ctx, P.ink, 158, 90, 34, 23);
  rect(ctx, P.grassDark, 159, 93, 32, 19);
  rect(ctx, '#245a2c', 159, 91, 32, 3);
  rect(ctx, P.green, 162, 97, 26, 1);
  rect(ctx, '#245a2c', 162, 104, 26, 1);
  rect(ctx, P.ink, 158, 85, 30, 2);
  rect(ctx, '#245a2c', 159, 86, 28, 1);
  rect(ctx, P.ink, 160, 112, 3, 2);
  rect(ctx, P.ink, 187, 112, 3, 2);
  // trash bags
  rect(ctx, P.ink, 192, 101, 13, 12);
  rect(ctx, P.asphalt, 193, 102, 11, 10);
  rect(ctx, P.concrete, 195, 103, 3, 2);
  rect(ctx, P.ink, 203, 105, 9, 8);
  rect(ctx, '#2b2b38', 204, 106, 7, 6);
  rect(ctx, P.concrete, 205, 107, 2, 1);
  // bench
  rect(ctx, P.ink, 108, 99, 32, 4);
  rect(ctx, P.wood, 109, 100, 30, 2);
  rect(ctx, '#9a6a42', 109, 100, 30, 1);
  rect(ctx, P.ink, 108, 104, 32, 3);
  rect(ctx, P.wood, 109, 105, 30, 1);
  rect(ctx, P.ink, 111, 107, 2, 6);
  rect(ctx, P.ink, 135, 107, 2, 6);
  // street lamp
  rect(ctx, P.ink, 214, 50, 3, 63);
  rect(ctx, P.concrete, 215, 50, 1, 63);
  rect(ctx, P.ink, 212, 108, 7, 5);
  rect(ctx, P.ink, 207, 47, 14, 4);
  rect(ctx, P.concrete, 208, 47, 12, 1);
  rect(ctx, P.cream, 209, 51, 10, 1);
  rect(ctx, P.sun, 210, 52, 8, 1);

  // wet pavement and road
  sidewalk(ctx, '#5d5e6c', '#3a3a48', '#26252f', null);
  rect(ctx, P.concrete, 0, 112, WORLD_W, 1);
  for (let x = 0; x < WORLD_W; x += 3) if (r() < 0.5) rect(ctx, '#2f2e3a', x, 124 + Math.floor(r() * 10), 2, 1);
  const puddle = (x: number, y: number, w: number) => {
    rect(ctx, '#18151f', x + 2, y, w - 4, 1);
    rect(ctx, '#18151f', x, y + 1, w, 2);
    rect(ctx, '#18151f', x + 3, y + 3, w - 6, 1);
    rect(ctx, '#46425a', x + 4, y + 1, 3, 1);
  };
  puddle(56, 125, 30);
  puddle(140, 129, 36);
  puddle(200, 125, 26);
  puddle(201, 115, 20);
  rect(ctx, P.ink, 44, 114, 4, 1);
  rect(ctx, P.ink, 47, 115, 1, 2);
  rect(ctx, P.ink, 184, 118, 14, 3);
  for (let x = 185; x < 197; x += 2) rect(ctx, P.concrete, x, 119, 1, 1);

  return {
    sky: skyC.c,
    far: farC.c,
    mid: midC.c,
    base: b.c,
    moon: moon(),
    farWindows,
    farWall,
    farLit,
    lights: [
      { x: 215, y: 52, r: 12, color: hex(P.sun), alpha: 0.6, flicker: 'lamp' },
      { x: 215, y: 114, r: 30, color: hex(P.sun), alpha: 0.22, squash: 0.22, flicker: 'lamp' },
      { x: 23, y: 106, r: 10, color: hex(P.orange), alpha: 0.55, flicker: 'candle' },
      { x: 68, y: 72, r: 18, color: 0xffb85c, alpha: 0.2, flicker: 'pulse' },
      { x: 108, y: 67, r: 18, color: 0xff4fa3, alpha: 0.32, flicker: 'neon' },
    ],
    reflections: [
      { x: 215, y: 123, color: hex(P.sun), alpha: 0.4, flicker: 'lamp' },
      { x: 108, y: 123, color: 0xff4fa3, alpha: 0.3, flicker: 'neon' },
      { x: 68, y: 123, color: 0xffb85c, alpha: 0.16 },
    ],
    neon: { x: 108, y: 67, canvas: neonSign() },
    cone: { x: 215, y: 53, alpha: 0.16 },
    steam: [{ x: 191, y: 118 }],
    moths: { x: 214, y: 54 },
    drip: { x: 204, y: 79 },
    rain: true,
    traffic: 'nightCar',
    scene: {
      sky: { x: 196, y: 18, kind: 'moon' },
      pigeon: { x: 150, y: 112 },
      hotspots: [
        { id: 'bench', x: 106, y: 96, w: 36, h: 18 },
        { id: 'drain', x: 182, y: 115, w: 18, h: 8 },
      ],
    },
  };
}

const LAYERED: Partial<Record<number, () => LayeredStage>> = { 0: survival };

const SUN = hex(P.sun);
const CREAM = hex(P.cream);
const WARM = 0xffb85c;

/** Lighting and traffic for the stages that still use a single baked canvas. */
export const STAGE_LIFE: Partial<Record<number, StageLife>> = {
  1: {
    halo: { r: 20, color: CREAM },
    lights: [
      { x: 95, y: 96, r: 14, color: WARM, alpha: 0.18, flicker: 'pulse' },
      { x: 167, y: 98, r: 16, color: 0x9fe8ff, alpha: 0.14, flicker: 'pulse' },
    ],
    reflections: [],
    steam: [{ x: 191, y: 118 }],
    rain: false,
    traffic: 'car',
  },
  2: {
    halo: { r: 24, color: SUN },
    lights: [{ x: 148, y: 96, r: 18, color: WARM, alpha: 0.14, flicker: 'pulse' }],
    reflections: [],
    steam: [],
    rain: false,
    traffic: 'car',
  },
  3: {
    halo: { r: 24, color: SUN },
    lights: [
      { x: 15, y: 83, r: 8, color: WARM, alpha: 0.2, flicker: 'pulse' },
      { x: 192, y: 83, r: 8, color: WARM, alpha: 0.2, flicker: 'pulse' },
    ],
    reflections: [],
    steam: [],
    rain: false,
    traffic: 'car',
  },
  4: {
    halo: { r: 40, color: hex(P.orange) },
    lights: [
      { x: 157, y: 99, r: 16, color: WARM, alpha: 0.32, flicker: 'candle' },
      { x: 191, y: 99, r: 16, color: WARM, alpha: 0.32, flicker: 'candle' },
      { x: 175, y: 82, r: 26, color: hex(P.purple), alpha: 0.18, squash: 0.35, flicker: 'neon' },
    ],
    reflections: [
      { x: 157, y: 123, color: WARM, alpha: 0.18 },
      { x: 191, y: 123, color: WARM, alpha: 0.18 },
    ],
    steam: [],
    rain: false,
    traffic: 'car',
  },
  5: {
    halo: { r: 30, color: 0xffffff },
    lights: [
      { x: 160, y: 92, r: 14, color: hex(P.gold), alpha: 0.35, flicker: 'pulse' },
      { x: 122, y: 70, r: 8, color: hex(P.gold), alpha: 0.4, flicker: 'pulse' },
      { x: 198, y: 70, r: 8, color: hex(P.gold), alpha: 0.4, flicker: 'pulse' },
      { x: 40, y: 92, r: 16, color: 0x9fe8ff, alpha: 0.22, flicker: 'pulse' },
    ],
    reflections: [{ x: 160, y: 123, color: hex(P.gold), alpha: 0.25 }],
    steam: [],
    rain: false,
    traffic: 'car',
  },
  6: {
    halo: { r: 26, color: SUN },
    lights: [{ x: 23, y: 12, r: 12, color: hex(P.gold), alpha: 0.4, flicker: 'pulse' }, { x: 178, y: 72, r: 6, color: SUN, alpha: 0.5, flicker: 'neon' }],
    reflections: [{ x: 40, y: 82, color: SUN, alpha: 0.5 }, { x: 46, y: 95, color: SUN, alpha: 0.3 }],
    steam: [],
    rain: false,
    traffic: 'yacht',
  },
  7: {
    halo: { r: 30, color: hex(P.sea) },
    lights: [
      { x: 60, y: 99, r: 22, color: hex(P.teal), alpha: 0.25, flicker: 'pulse' },
      { x: 64, y: 101, r: 6, color: SUN, alpha: 0.5, flicker: 'candle' },
      { x: 157, y: 91, r: 9, color: hex(P.gold), alpha: 0.3, flicker: 'pulse' },
    ],
    reflections: [],
    steam: [],
    rain: false,
    traffic: 'comet',
  },
};

export function hasLayeredStage(index: number): boolean {
  return !!LAYERED[index];
}

export function buildLayeredStage(index: number): LayeredStage | undefined {
  return LAYERED[index]?.();
}

// ———————————————————————————————————— shared light textures

/** A stepped (16-bit) radial glow, white, to be tinted and added. */
export function glowTexture(): HTMLCanvasElement {
  const { c, ctx } = canvas(32, 32);
  const steps: [number, number][] = [[0.3, 1], [0.55, 0.5], [0.8, 0.22], [1, 0.08]];
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const d = Math.hypot(x - 15.5, y - 15.5) / 16;
    const step = steps.find(([lim]) => d <= lim);
    if (!step) continue;
    ctx.fillStyle = `rgba(255,255,255,${step[1]})`;
    ctx.fillRect(x, y, 1, 1);
  }
  return c;
}

/** Light cone under a street lamp, dithered towards the ground. */
export function coneTexture(): HTMLCanvasElement {
  const H = 58;
  const { c, ctx } = canvas(36, H);
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const w = Math.round(6 + t * 30);
    const x0 = Math.round((36 - w) / 2);
    const a = 0.9 - Math.floor(t * 4) * 0.18;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    for (let x = x0; x < x0 + w; x++) if (t < 0.5 || (x + y) % 2 === 0) ctx.fillRect(x, y, 1, 1);
  }
  return c;
}

/** Broken vertical streak, for light reflected on a wet road. */
export function streakTexture(): HTMLCanvasElement {
  const { c, ctx } = canvas(5, 13);
  for (let y = 0; y < 13; y++) {
    ctx.fillStyle = `rgba(255,255,255,${1 - y / 13})`;
    if (y % 2 === 0) ctx.fillRect(0, y, 5, 1);
    else ctx.fillRect(1 + (y % 4 === 1 ? 1 : 0), y, 2, 1);
  }
  return c;
}
