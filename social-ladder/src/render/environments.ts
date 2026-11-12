import { P } from './palette';

/**
 * Procedural 16-bit environments, one per social class, drawn at native
 * resolution (240×135) and scaled up with nearest-neighbour filtering.
 * Every environment tells a little story about where the hero is in life.
 */
export const WORLD_W = 240;
export const WORLD_H = 135;
export const GROUND_Y = 120; // hero's feet

type Ctx = CanvasRenderingContext2D;

export interface Hotspot {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StageScene {
  hotspots: Hotspot[];
  /** Where the sun/moon is (also a hotspot). */
  sky: { x: number; y: number; kind: 'sun' | 'moon' | 'earth' };
  pigeon?: { x: number; y: number };
  smoke?: { x: number; y: number }[];
  sparkles?: { x: number; y: number }[];
}

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export const rect = (ctx: Ctx, c: string, x: number, y: number, w: number, h: number) => {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

/** Banded sky with a 2-row checker dither between bands (classic 16-bit look). */
export function sky(ctx: Ctx, colors: string[], top = 0, bottom = WORLD_H) {
  const band = (bottom - top) / colors.length;
  colors.forEach((c, i) => rect(ctx, c, 0, top + i * band, WORLD_W, band + 1));
  for (let i = 1; i < colors.length; i++) {
    const y = Math.round(top + i * band);
    ctx.fillStyle = colors[i - 1];
    for (let x = 0; x < WORLD_W; x += 2) {
      ctx.fillRect(x + (0 % 2), y, 1, 1);
      ctx.fillRect(x + 1, y + 1, 1, 1);
    }
  }
}

export function stars(ctx: Ctx, r: () => number, n: number, maxY: number) {
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * WORLD_W);
    const y = Math.floor(r() * maxY);
    rect(ctx, r() > 0.8 ? P.sun : P.cream, x, y, 1, 1);
  }
}

function cloud(ctx: Ctx, x: number, y: number, s = 1, c: string = P.white) {
  rect(ctx, c, x, y + 3 * s, 22 * s, 4 * s);
  rect(ctx, c, x + 4 * s, y + 1 * s, 9 * s, 4 * s);
  rect(ctx, c, x + 11 * s, y, 7 * s, 4 * s);
}

function sunDisc(ctx: Ctx, x: number, y: number, r: number, c: string, glow: string) {
  ctx.fillStyle = glow;
  for (let dy = -r - 2; dy <= r + 2; dy++) for (let dx = -r - 2; dx <= r + 2; dx++) if (dx * dx + dy * dy <= (r + 2) * (r + 2) && (dx + dy) % 2 === 0) ctx.fillRect(x + dx, y + dy, 1, 1);
  ctx.fillStyle = c;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) ctx.fillRect(x + dx, y + dy, 1, 1);
}

function moonDisc(ctx: Ctx, x: number, y: number) {
  sunDisc(ctx, x, y, 7, P.cream, P.plum);
  rect(ctx, P.steel, x - 3, y - 2, 2, 2);
  rect(ctx, P.steel, x + 2, y + 2, 3, 2);
  rect(ctx, P.steel, x + 1, y - 4, 1, 1);
}

/** Generic building block with a window grid. */
export function building(ctx: Ctx, r: () => number, x: number, y: number, w: number, h: number, wall: string, win: string, lit: string, litChance: number, winW = 2, winH = 2, gapX = 2, gapY = 3) {
  rect(ctx, wall, x, y, w, h);
  rect(ctx, P.ink, x, y, w, 1);
  for (let wy = y + 3; wy < y + h - 3; wy += winH + gapY) {
    for (let wx = x + 2; wx < x + w - winW - 1; wx += winW + gapX) {
      rect(ctx, r() < litChance ? lit : win, wx, wy, winW, winH);
    }
  }
}

export function sidewalk(ctx: Ctx, top: string, line: string, road: string, lane: string | null) {
  rect(ctx, top, 0, 112, WORLD_W, 9);
  for (let x = 0; x < WORLD_W; x += 16) rect(ctx, line, x, 112, 1, 9);
  rect(ctx, line, 0, 120, WORLD_W, 1);
  rect(ctx, P.ink, 0, 121, WORLD_W, 1);
  rect(ctx, road, 0, 122, WORLD_W, 13);
  if (lane) for (let x = 6; x < WORLD_W; x += 24) rect(ctx, lane, x, 128, 10, 1);
}

function tree(ctx: Ctx, x: number, y: number, s = 1) {
  rect(ctx, P.wood, x + 5 * s, y + 10 * s, 3 * s, 10 * s);
  rect(ctx, P.grassDark, x, y + 2 * s, 14 * s, 10 * s);
  rect(ctx, P.grass, x + 2 * s, y, 10 * s, 9 * s);
  rect(ctx, P.leaf, x + 4 * s, y + 1 * s, 4 * s, 3 * s);
}

function palm(ctx: Ctx, x: number, y: number) {
  for (let i = 0; i < 26; i++) rect(ctx, i % 4 === 0 ? P.cardboardDark : P.wood, x + Math.round(Math.sin(i / 6) * 2), y + i, 3, 1);
  const fx = x + 1;
  rect(ctx, P.grassDark, fx - 10, y - 2, 22, 3);
  rect(ctx, P.grass, fx - 8, y - 4, 7, 2);
  rect(ctx, P.grass, fx + 2, y - 4, 7, 2);
  rect(ctx, P.grass, fx - 12, y + 1, 5, 2);
  rect(ctx, P.grass, fx + 8, y + 1, 5, 2);
  rect(ctx, P.cardboardDark, fx - 1, y + 1, 2, 2);
}

function house(ctx: Ctx, x: number, y: number, wall: string, roof: string) {
  rect(ctx, P.ink, x - 1, y + 8, 36, 1);
  for (let i = 0; i < 10; i++) rect(ctx, roof, x + 17 - i * 2 - 1, y + i, i * 4 + 2, 1);
  rect(ctx, wall, x, y + 10, 34, 18);
  rect(ctx, P.wood, x + 14, y + 17, 6, 11);
  rect(ctx, P.gold, x + 18, y + 22, 1, 1);
  rect(ctx, P.glass, x + 4, y + 14, 7, 6);
  rect(ctx, P.glass, x + 23, y + 14, 7, 6);
  rect(ctx, P.white, x + 7, y + 14, 1, 6);
  rect(ctx, P.white, x + 26, y + 14, 1, 6);
}

function fence(ctx: Ctx, y: number) {
  rect(ctx, P.white, 0, y + 3, WORLD_W, 1);
  for (let x = 0; x < WORLD_W; x += 4) {
    rect(ctx, P.white, x, y, 2, 8);
    rect(ctx, P.steel, x + 1, y + 1, 1, 7);
  }
}

// ———————————————————————————————————— stages

function survival(ctx: Ctx, r: () => number): StageScene {
  sky(ctx, [P.night, P.plum, P.dusk, P.rose, P.coral], 0, 70);
  stars(ctx, r, 30, 30);
  moonDisc(ctx, 196, 18);
  // far skyline silhouettes
  for (let x = -4; x < WORLD_W; x += 18 + Math.floor(r() * 10)) building(ctx, r, x, 30 + r() * 20, 16 + r() * 10, 60, P.night, P.night, P.orange, 0.08);
  // brick wall
  rect(ctx, P.brickDark, 0, 62, WORLD_W, 50);
  for (let y = 62; y < 112; y += 4) {
    const off = (y / 4) % 2 ? 0 : 4;
    for (let x = -off; x < WORLD_W; x += 8) rect(ctx, P.brick, x + 1, y + 1, 6, 2);
  }
  // posters & graffiti
  rect(ctx, P.cream, 92, 72, 14, 18);
  rect(ctx, P.red, 94, 75, 10, 2);
  rect(ctx, P.ink, 94, 79, 8, 1);
  rect(ctx, P.ink, 94, 82, 6, 1);
  rect(ctx, P.cream, 108, 76, 10, 12);
  rect(ctx, P.blue, 110, 78, 6, 6);
  rect(ctx, P.teal, 130, 80, 18, 3);
  rect(ctx, P.pink, 134, 84, 12, 3);
  rect(ctx, P.teal, 146, 77, 3, 9);
  // cardboard box home
  rect(ctx, P.ink, 14, 93, 38, 20);
  rect(ctx, P.cardboard, 15, 94, 36, 18);
  rect(ctx, P.cardboardDark, 15, 94, 36, 3);
  rect(ctx, P.cardboardDark, 32, 97, 1, 15);
  rect(ctx, P.rose, 20, 104, 10, 8);
  rect(ctx, P.dusk, 20, 104, 10, 1);
  rect(ctx, P.ink, 38, 101, 9, 1);
  rect(ctx, P.ink, 38, 103, 6, 1);
  // dumpster
  rect(ctx, P.ink, 158, 90, 34, 23);
  rect(ctx, P.grassDark, 159, 93, 32, 19);
  rect(ctx, '#245a2c', 159, 91, 32, 3);
  rect(ctx, P.green, 162, 97, 26, 1);
  rect(ctx, P.ink, 160, 112, 3, 2);
  rect(ctx, P.ink, 187, 112, 3, 2);
  // trash bags
  rect(ctx, P.ink, 193, 102, 12, 11);
  rect(ctx, P.asphalt, 194, 103, 10, 9);
  rect(ctx, P.concrete, 196, 104, 3, 2);
  // bench
  rect(ctx, P.ink, 108, 99, 32, 4);
  rect(ctx, P.wood, 109, 100, 30, 2);
  rect(ctx, P.ink, 108, 104, 32, 3);
  rect(ctx, P.wood, 109, 105, 30, 1);
  rect(ctx, P.ink, 111, 107, 2, 6);
  rect(ctx, P.ink, 135, 107, 2, 6);
  // street lamp
  rect(ctx, P.ink, 214, 52, 3, 61);
  rect(ctx, P.ink, 208, 50, 12, 4);
  rect(ctx, P.sun, 210, 53, 8, 2);
  ctx.globalAlpha = 0.12;
  for (let i = 0; i < 58; i++) rect(ctx, P.sun, 214 - i * 0.35, 55 + i, 3 + i * 0.7, 1);
  ctx.globalAlpha = 1;
  sidewalk(ctx, P.concrete, P.asphalt, P.asphalt, null);
  // cracks & storm drain
  rect(ctx, P.ink, 44, 114, 4, 1);
  rect(ctx, P.ink, 47, 115, 1, 2);
  rect(ctx, P.ink, 184, 118, 14, 3);
  for (let x = 185; x < 197; x += 2) rect(ctx, P.concrete, x, 119, 1, 1);
  return {
    sky: { x: 196, y: 18, kind: 'moon' },
    pigeon: { x: 150, y: 112 },
    hotspots: [
      { id: 'bench', x: 106, y: 96, w: 36, h: 18 },
      { id: 'drain', x: 182, y: 115, w: 18, h: 8 },
    ],
  };
}

function working(ctx: Ctx, r: () => number): StageScene {
  sky(ctx, [P.sky1, P.sky2, '#ffd9a8', P.cream], 0, 80); // morning shift: bright dawn instead of grey smog
  sunDisc(ctx, 34, 22, 6, P.cream, P.sky2);
  cloud(ctx, 70, 14, 1, P.white);
  cloud(ctx, 150, 26, 1, P.steel);
  // factory
  rect(ctx, P.concrete, 120, 52, 80, 40);
  for (let i = 0; i < 4; i++) {
    const cx = 128 + i * 18;
    rect(ctx, P.asphalt, cx, 52 - 8, 12, 8);
    for (let j = 0; j < 6; j++) rect(ctx, P.concreteLight, cx + 1 + j * 2, 45 + (j % 2), 1, 1);
  }
  rect(ctx, P.brickDark, 186, 18, 7, 34);
  rect(ctx, P.brick, 187, 18, 5, 34);
  rect(ctx, P.brickDark, 170, 28, 6, 24);
  rect(ctx, P.brick, 171, 28, 4, 24);
  // apartment blocks
  building(ctx, r, 0, 44, 40, 70, P.concrete, P.asphalt, P.sun, 0.25, 3, 3, 3, 4);
  building(ctx, r, 42, 56, 34, 58, P.rust, P.brickDark, P.sun, 0.2, 3, 3, 3, 4);
  building(ctx, r, 204, 40, 36, 74, P.concreteLight, P.concrete, P.sun, 0.2, 3, 3, 3, 4);
  // shop
  rect(ctx, P.ink, 84, 78, 36, 35);
  rect(ctx, P.cream, 85, 79, 34, 34);
  for (let x = 85; x < 119; x += 4) rect(ctx, P.red, x, 79, 2, 6);
  rect(ctx, P.glass, 88, 90, 14, 12);
  rect(ctx, P.wood, 106, 92, 9, 21);
  rect(ctx, P.green, 89, 87, 12, 2);
  // bus stop
  rect(ctx, P.ink, 150, 86, 34, 2);
  rect(ctx, P.steel, 150, 88, 1, 25);
  rect(ctx, P.steel, 183, 88, 1, 25);
  ctx.globalAlpha = 0.4;
  rect(ctx, P.glass, 151, 88, 32, 20);
  ctx.globalAlpha = 1;
  rect(ctx, P.blue, 152, 92, 10, 6);
  sidewalk(ctx, P.concreteLight, P.concrete, P.asphalt, P.cream);
  rect(ctx, P.ink, 184, 118, 14, 3);
  for (let x = 185; x < 197; x += 2) rect(ctx, P.concrete, x, 119, 1, 1);
  return {
    sky: { x: 34, y: 22, kind: 'sun' },
    pigeon: { x: 140, y: 112 },
    smoke: [{ x: 189, y: 16 }, { x: 173, y: 26 }],
    hotspots: [{ id: 'drain', x: 182, y: 115, w: 18, h: 8 }],
  };
}

function lowerMiddle(ctx: Ctx, r: () => number): StageScene {
  sky(ctx, [P.sky1, P.sky1, P.sky2], 0, 90);
  sunDisc(ctx, 206, 20, 8, P.sun, P.cream);
  cloud(ctx, 30, 16, 1);
  cloud(ctx, 120, 10, 1);
  const pastel = [P.coral, P.sand, P.teal, P.pink, P.steel];
  let x = -6;
  while (x < WORLD_W) {
    const w = 30 + Math.floor(r() * 14);
    const h = 40 + Math.floor(r() * 26);
    building(ctx, r, x, 112 - h, w, h, pastel[Math.floor(r() * pastel.length)], P.glassDark, P.glass, 0.4, 4, 4, 3, 5);
    // balconies
    for (let by = 112 - h + 10; by < 104; by += 9) rect(ctx, P.ink, x + 2, by, w - 4, 1);
    x += w + 2;
  }
  // shop awning
  rect(ctx, P.ink, 128, 86, 40, 3);
  for (let i = 0; i < 10; i++) rect(ctx, i % 2 ? P.white : P.green, 128 + i * 4, 89, 4, 5);
  tree(ctx, 30, 88, 1);
  tree(ctx, 196, 86, 1);
  sidewalk(ctx, P.concreteLight, P.concrete, P.asphalt, P.cream);
  return { sky: { x: 206, y: 20, kind: 'sun' }, hotspots: [] };
}

function middle(ctx: Ctx, r: () => number): StageScene {
  sky(ctx, [P.sky1, P.sky2, P.cream], 0, 92);
  sunDisc(ctx, 32, 20, 8, P.sun, P.cream);
  cloud(ctx, 90, 12, 1);
  cloud(ctx, 170, 20, 1);
  // downtown towers in the distance
  for (let i = 0; i < 6; i++) building(ctx, r, 120 + i * 20, 30 + (i % 3) * 8, 16, 60, P.glass, P.glassDark, P.sky2, 0.3, 2, 3, 2, 3);
  rect(ctx, P.grass, 0, 88, WORLD_W, 24);
  for (let gx = 0; gx < WORLD_W; gx += 3) rect(ctx, P.grassDark, gx, 88 + ((gx * 7) % 5), 1, 1);
  house(ctx, 8, 66, P.cream, P.red);
  house(ctx, 92, 64, P.sky2, P.navy);
  house(ctx, 176, 66, P.sand, P.grassDark);
  fence(ctx, 104);
  // mailbox
  rect(ctx, P.ink, 60, 98, 8, 6);
  rect(ctx, P.blue, 61, 99, 6, 4);
  rect(ctx, P.ink, 63, 104, 2, 8);
  rect(ctx, P.red, 67, 97, 1, 3);
  sidewalk(ctx, P.concreteLight, P.concrete, P.asphalt, P.white);
  return { sky: { x: 32, y: 20, kind: 'sun' }, hotspots: [] };
}

function wealth(ctx: Ctx, r: () => number): StageScene {
  sky(ctx, [P.dusk, P.rose, P.coral, P.orange, P.sun], 0, 96);
  sunDisc(ctx, 120, 70, 14, P.sun, P.orange);
  for (let i = 0; i < 8; i++) {
    const w = 22 + Math.floor(r() * 10);
    const h = 60 + Math.floor(r() * 40);
    const x = i * 31 - 6;
    building(ctx, r, x, 112 - h, w, h, i % 2 ? P.glassDark : P.navy, P.glass, P.sun, 0.35, 2, 4, 2, 2);
    rect(ctx, P.coral, x + 2, 112 - h + 4, 1, h - 8);
  }
  // restaurant
  rect(ctx, P.ink, 140, 82, 70, 31);
  rect(ctx, P.cream, 141, 83, 68, 30);
  rect(ctx, P.purple, 138, 80, 74, 5);
  for (let i = 0; i < 18; i++) rect(ctx, P.goldDark, 139 + i * 4, 85, 2, 2);
  rect(ctx, P.glass, 146, 92, 22, 14);
  rect(ctx, P.glass, 180, 92, 22, 14);
  rect(ctx, P.sun, 150, 96, 2, 2);
  rect(ctx, P.sun, 190, 97, 2, 2);
  // potted plants
  rect(ctx, P.ink, 122, 100, 10, 13);
  rect(ctx, P.goldDark, 123, 104, 8, 8);
  rect(ctx, P.grass, 121, 94, 12, 8);
  sidewalk(ctx, P.sand, P.cardboard, P.asphalt, P.gold);
  return { sky: { x: 120, y: 70, kind: 'sun' }, hotspots: [] };
}

function extreme(ctx: Ctx, r: () => number): StageScene {
  sky(ctx, [P.orange, P.sun, P.cream], 0, 96);
  sunDisc(ctx, 200, 24, 10, P.white, P.cream);
  for (let i = 0; i < 6; i++) {
    const x = i * 42 - 10;
    const h = 90 + Math.floor(r() * 30);
    building(ctx, r, x, 112 - h, 30, h, P.navy, P.glassDark, P.gold, 0.45, 3, 2, 2, 2);
    rect(ctx, P.gold, x + 13, 112 - h - 8, 4, 8);
  }
  // mansion gate
  rect(ctx, P.ink, 120, 72, 4, 41);
  rect(ctx, P.ink, 196, 72, 4, 41);
  rect(ctx, P.gold, 119, 70, 6, 3);
  rect(ctx, P.gold, 195, 70, 6, 3);
  for (let x = 126; x < 196; x += 5) {
    rect(ctx, P.ink, x, 80, 1, 33);
    rect(ctx, P.gold, x, 79, 1, 2);
  }
  rect(ctx, P.ink, 124, 84, 72, 1);
  rect(ctx, P.ink, 124, 104, 72, 1);
  rect(ctx, P.gold, 156, 88, 8, 8);
  // fountain
  rect(ctx, P.steel, 20, 104, 40, 8);
  rect(ctx, P.glass, 22, 105, 36, 3);
  rect(ctx, P.steel, 38, 92, 4, 12);
  rect(ctx, P.sky2, 36, 88, 8, 4);
  sidewalk(ctx, P.cream, P.sand, P.night, P.gold);
  return { sky: { x: 200, y: 24, kind: 'sun' }, hotspots: [], sparkles: [{ x: 40, y: 88 }, { x: 160, y: 92 }] };
}

function absurd(ctx: Ctx, r: () => number): StageScene {
  sky(ctx, [P.sky1, P.sky1, P.sky2], 0, 80);
  sunDisc(ctx, 40, 22, 9, P.sun, P.cream);
  cloud(ctx, 120, 14, 1);
  // sea
  rect(ctx, P.sea, 0, 80, WORLD_W, 32);
  for (let i = 0; i < 40; i++) rect(ctx, P.sky2, Math.floor(r() * WORLD_W), 82 + Math.floor(r() * 28), 3, 1);
  rect(ctx, P.seaDark, 0, 80, WORLD_W, 1);
  // distant island with volcano lair
  rect(ctx, P.sand, 150, 76, 70, 5);
  for (let i = 0; i < 16; i++) rect(ctx, P.grassDark, 168 + i, 76 - i, 34 - i * 2, 1);
  rect(ctx, P.coral, 182, 60, 6, 2);
  rect(ctx, P.glassDark, 176, 70, 4, 3);
  rect(ctx, P.sun, 177, 71, 2, 1);
  // tower with your name on it
  building(ctx, r, 10, 18, 26, 62, P.white, P.glass, P.gold, 0.5, 3, 3, 2, 3);
  rect(ctx, P.gold, 20, 8, 6, 10);
  rect(ctx, P.gold, 14, 22, 18, 2);
  // sand & boardwalk
  rect(ctx, P.sand, 0, 108, WORLD_W, 13);
  for (let x = 0; x < WORLD_W; x += 5) rect(ctx, P.cardboard, x, 110 + (x % 3), 1, 1);
  rect(ctx, P.ink, 0, 121, WORLD_W, 1);
  rect(ctx, P.wood, 0, 122, WORLD_W, 13);
  for (let x = 0; x < WORLD_W; x += 8) rect(ctx, P.cardboardDark, x, 122, 1, 13);
  palm(ctx, 108, 82);
  palm(ctx, 222, 84);
  return { sky: { x: 40, y: 22, kind: 'sun' }, hotspots: [], sparkles: [{ x: 60, y: 90 }, { x: 130, y: 96 }, { x: 200, y: 88 }] };
}

function cosmic(ctx: Ctx, r: () => number): StageScene {
  rect(ctx, P.ink, 0, 0, WORLD_W, WORLD_H);
  sky(ctx, [P.ink, P.night, P.plum], 0, 100);
  stars(ctx, r, 120, 100);
  // Earth
  sunDisc(ctx, 180, 30, 14, P.sea, P.night);
  rect(ctx, P.grass, 172, 22, 8, 5);
  rect(ctx, P.grass, 184, 32, 6, 6);
  rect(ctx, P.white, 176, 18, 10, 2);
  // dome habitat
  for (let i = 0; i < 18; i++) {
    const w = Math.round(Math.sqrt(18 * 18 - i * i)) * 2;
    ctx.globalAlpha = 0.5;
    rect(ctx, P.teal, 60 - w / 2, 108 - i, w, 1);
    ctx.globalAlpha = 1;
  }
  rect(ctx, P.cream, 52, 98, 6, 10);
  rect(ctx, P.sun, 62, 100, 4, 3);
  // regolith ground
  rect(ctx, P.concrete, 0, 108, WORLD_W, 27);
  rect(ctx, P.concreteLight, 0, 108, WORLD_W, 2);
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(r() * WORLD_W);
    const y = 112 + Math.floor(r() * 20);
    rect(ctx, P.asphalt, x, y, 6, 2);
    rect(ctx, P.steel, x + 1, y - 1, 4, 1);
  }
  // flag
  rect(ctx, P.steel, 150, 88, 1, 22);
  rect(ctx, P.gold, 151, 88, 12, 7);
  rect(ctx, P.ink, 155, 90, 3, 3);
  return { sky: { x: 180, y: 30, kind: 'earth' }, hotspots: [], sparkles: [{ x: 100, y: 40 }, { x: 30, y: 20 }] };
}

const DRAWERS = [survival, working, lowerMiddle, middle, wealth, extreme, absurd, cosmic];

/** Draws stage `index` into a new canvas and returns the canvas and its interactive layout. */
export function buildStage(index: number): { canvas: HTMLCanvasElement; scene: StageScene } {
  const canvas = document.createElement('canvas');
  canvas.width = WORLD_W;
  canvas.height = WORLD_H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const scene = DRAWERS[Math.max(0, Math.min(DRAWERS.length - 1, index))](ctx, rng(1000 + index * 77));
  return { canvas, scene };
}

// ———————————————————————————————————— props (rides, pigeon, cat, opportunity)

export type PropId = 'chainless_bicycle' | 'secondhand_bicycle' | 'motorcycle' | 'used_car' | 'sports_car' | 'private_jet' | 'pigeon' | 'pigeon2' | 'cat' | 'briefcase' | 'coin' | 'yacht';

export function buildProp(id: PropId): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  const sz: Record<PropId, [number, number]> = {
    chainless_bicycle: [22, 14], secondhand_bicycle: [22, 14], motorcycle: [26, 15], used_car: [40, 18], sports_car: [42, 14],
    private_jet: [44, 14], pigeon: [8, 7], pigeon2: [8, 7], cat: [12, 9], briefcase: [14, 12], coin: [5, 5], yacht: [46, 18],
  };
  [c.width, c.height] = sz[id];
  const wheel = (x: number, y: number, rr: number) => {
    for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) {
      const d = dx * dx + dy * dy;
      if (d <= rr * rr && d >= (rr - 1) * (rr - 1)) rect(ctx, P.ink, x + dx, y + dy, 1, 1);
    }
    rect(ctx, P.steel, x, y, 1, 1);
  };
  switch (id) {
    case 'chainless_bicycle':
    case 'secondhand_bicycle': {
      wheel(5, 9, 4);
      wheel(16, 9, 4);
      const frame = id === 'chainless_bicycle' ? P.rust : P.blue;
      for (let i = 0; i < 7; i++) rect(ctx, frame, 6 + i, 8 - (i >> 1), 1, 1);
      rect(ctx, frame, 9, 5, 6, 1);
      rect(ctx, frame, 14, 5, 1, 4);
      rect(ctx, P.ink, 8, 3, 4, 1);
      rect(ctx, P.ink, 15, 2, 3, 1);
      if (id === 'secondhand_bicycle') rect(ctx, P.concrete, 6, 9, 10, 1);
      break;
    }
    case 'motorcycle':
      wheel(5, 10, 4);
      wheel(20, 10, 4);
      rect(ctx, P.ink, 6, 5, 14, 5);
      rect(ctx, P.red, 7, 6, 12, 3);
      rect(ctx, P.steel, 9, 9, 6, 1);
      rect(ctx, P.ink, 18, 2, 4, 1);
      rect(ctx, P.ink, 4, 5, 6, 1);
      break;
    case 'used_car':
      rect(ctx, P.ink, 1, 6, 38, 8);
      rect(ctx, P.ink, 9, 1, 20, 6);
      rect(ctx, P.coral, 2, 7, 36, 6);
      rect(ctx, P.rust, 22, 7, 8, 6);
      rect(ctx, P.coral, 10, 2, 18, 5);
      rect(ctx, P.glass, 12, 3, 6, 3);
      rect(ctx, P.glass, 20, 3, 6, 3);
      rect(ctx, P.sun, 36, 8, 2, 2);
      wheel(9, 14, 3);
      wheel(30, 14, 3);
      break;
    case 'sports_car':
      rect(ctx, P.ink, 1, 5, 40, 6);
      rect(ctx, P.ink, 12, 1, 16, 5);
      rect(ctx, P.red, 2, 6, 38, 4);
      rect(ctx, P.red, 13, 2, 14, 4);
      rect(ctx, P.glassDark, 15, 2, 10, 3);
      rect(ctx, P.white, 2, 7, 38, 1);
      rect(ctx, P.sun, 38, 6, 2, 1);
      wheel(9, 10, 3);
      wheel(33, 10, 3);
      break;
    case 'private_jet':
      rect(ctx, P.ink, 2, 5, 40, 5);
      rect(ctx, P.white, 3, 6, 38, 3);
      rect(ctx, P.gold, 3, 8, 38, 1);
      for (let i = 0; i < 6; i++) rect(ctx, P.glass, 14 + i * 4, 6, 2, 1);
      rect(ctx, P.glassDark, 38, 6, 3, 2);
      rect(ctx, P.ink, 4, 0, 6, 6);
      rect(ctx, P.white, 5, 1, 4, 5);
      rect(ctx, P.ink, 16, 9, 12, 4);
      rect(ctx, P.steel, 17, 10, 10, 2);
      break;
    case 'yacht':
      rect(ctx, P.ink, 2, 10, 42, 6);
      rect(ctx, P.white, 3, 11, 40, 4);
      rect(ctx, P.navy, 3, 14, 40, 1);
      rect(ctx, P.ink, 12, 4, 24, 7);
      rect(ctx, P.white, 13, 5, 22, 6);
      rect(ctx, P.glassDark, 15, 6, 18, 2);
      rect(ctx, P.ink, 20, 0, 2, 4);
      break;
    case 'pigeon':
    case 'pigeon2':
      rect(ctx, P.ink, 1, 1, 6, 5);
      rect(ctx, P.concrete, 2, 2, 4, 3);
      rect(ctx, P.concreteLight, 2, 2, 2, 2);
      rect(ctx, P.teal, 5, 3, 1, 1);
      rect(ctx, P.ink, id === 'pigeon' ? 6 : 7, id === 'pigeon' ? 1 : 2, 2, 2);
      rect(ctx, P.coral, id === 'pigeon' ? 7 : 7, id === 'pigeon' ? 2 : 3, 1, 1);
      rect(ctx, P.coral, 3, 6, 1, 1);
      rect(ctx, P.coral, 5, 6, 1, 1);
      break;
    case 'cat':
      rect(ctx, P.ink, 1, 3, 10, 5);
      rect(ctx, P.orange, 2, 4, 8, 3);
      rect(ctx, P.ink, 7, 0, 5, 5);
      rect(ctx, P.orange, 8, 1, 3, 3);
      rect(ctx, P.ink, 8, 2, 1, 1);
      rect(ctx, P.ink, 10, 2, 1, 1);
      rect(ctx, P.ink, 0, 1, 1, 3);
      rect(ctx, P.ink, 2, 8, 1, 1);
      rect(ctx, P.ink, 8, 8, 1, 1);
      rect(ctx, P.cream, 3, 5, 3, 1);
      break;
    case 'briefcase':
      rect(ctx, P.ink, 4, 0, 6, 3);
      rect(ctx, P.gold, 5, 1, 4, 1);
      rect(ctx, P.ink, 0, 2, 14, 10);
      rect(ctx, P.gold, 1, 3, 12, 8);
      rect(ctx, P.sun, 1, 3, 12, 2);
      rect(ctx, P.goldDark, 1, 9, 12, 2);
      rect(ctx, P.ink, 6, 5, 2, 3);
      rect(ctx, P.white, 2, 4, 2, 1);
      break;
    case 'coin':
      rect(ctx, P.ink, 1, 0, 3, 5);
      rect(ctx, P.ink, 0, 1, 5, 3);
      rect(ctx, P.gold, 1, 1, 3, 3);
      rect(ctx, P.sun, 1, 1, 1, 1);
      break;
  }
  return c;
}
