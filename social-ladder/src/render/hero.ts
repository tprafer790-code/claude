import { P } from './palette';

/**
 * The protagonist, drawn pixel by pixel (at 2× density) into a sprite sheet at boot. He is the
 * same person in every social class (same face, same hair), only his clothes,
 * posture details and accessories change.
 */
/** On-screen footprint in world pixels (the street is 240×135). */
export const HERO_W = 24;
export const HERO_H = 36;
/** He is drawn at twice the street's pixel density, so the sheet is 2× the footprint. */
export const HERO_RES = 2;
export const HERO_PX_W = HERO_W * HERO_RES;
export const HERO_PX_H = 86;
export const HERO_FRAMES = 10; // idle, idle2, work, work2, cheer, cheer2, walk×4
/** First of the four walk-cycle frames (contact, pass, contact, pass). */
export const HERO_WALK = 6;

export interface HeroLook {
  shirt: string;
  shirtShade: string;
  pants: string;
  pantsShade: string;
  shoes: string;
  hair: 'messy' | 'neat' | 'slick';
  hat?: 'beanie' | 'cap' | 'crown' | 'halo';
  hatColor?: string;
  jacket?: string;
  jacketShade?: string;
  tie?: string;
  vest?: string;
  patches?: boolean;
  stubble?: boolean;
  shades?: boolean;
  chain?: boolean;
  watch?: boolean;
  backpack?: boolean;
  glow?: string;
}

export const STAGE_LOOKS: HeroLook[] = [
  { shirt: P.cardboardDark, shirtShade: P.wood, pants: P.concrete, pantsShade: P.asphalt, shoes: P.wood, hair: 'messy', hat: 'beanie', hatColor: P.brick, patches: true, stubble: true },
  { shirt: P.concreteLight, shirtShade: P.concrete, pants: P.blue, pantsShade: P.navy, shoes: P.ink, hair: 'messy', hat: 'cap', hatColor: P.orange, vest: P.orange },
  { shirt: P.green, shirtShade: P.grassDark, pants: P.cardboard, pantsShade: P.cardboardDark, shoes: P.wood, hair: 'neat' },
  { shirt: P.white, shirtShade: P.steel, pants: P.navy, pantsShade: P.night, shoes: P.ink, hair: 'neat', tie: P.blue },
  { shirt: P.white, shirtShade: P.steel, pants: P.navy, pantsShade: P.night, shoes: P.ink, hair: 'slick', jacket: P.navy, jacketShade: P.night, tie: P.purple, watch: true },
  { shirt: P.white, shirtShade: P.steel, pants: P.ink, pantsShade: P.night, shoes: P.ink, hair: 'slick', jacket: P.ink, jacketShade: P.night, tie: P.gold, shades: true, watch: true },
  { shirt: P.gold, shirtShade: P.goldDark, pants: P.white, pantsShade: P.steel, shoes: P.gold, hair: 'slick', hat: 'crown', jacket: P.white, jacketShade: P.steel, tie: P.pink, shades: true, chain: true, watch: true },
  { shirt: P.teal, shirtShade: '#1f8f84', pants: P.night, pantsShade: P.ink, shoes: P.teal, hair: 'slick', jacket: P.night, jacketShade: P.ink, tie: P.teal, shades: true, glow: P.teal, hat: 'halo' },
];

/** Outfit-slot objects change his clothes so equipment is visible on screen. */
export function applyEquipment(base: HeroLook, equipped: Record<string, string | undefined>): HeroLook {
  const look = { ...base };
  switch (equipped.outfit) {
    case 'thrift_jacket': look.jacket = P.rust; look.jacketShade = P.brickDark; break;
    case 'work_uniform': look.vest = P.orange; look.shirt = P.concreteLight; look.shirtShade = P.concrete; look.patches = false; break;
    case 'business_suit': look.jacket = P.navy; look.jacketShade = P.night; look.shirt = P.white; look.shirtShade = P.steel; look.tie = look.tie ?? P.red; look.vest = undefined; look.patches = false; break;
    case 'designer_wardrobe': look.jacket = P.sand; look.jacketShade = P.cardboard; look.shirt = P.cream; look.shirtShade = P.sand; look.pants = P.sand; look.pantsShade = P.cardboard; look.tie = undefined; look.vest = undefined; look.patches = false; break;
    case 'self_awarded_crown': look.hat = 'crown'; look.chain = true; break;
  }
  if (equipped.accessory === 'luxury_watch' || equipped.accessory === 'diamond_phone') look.watch = true;
  if (equipped.accessory === 'delivery_backpack') look.backpack = true;
  if (look.hat === 'beanie' && equipped.outfit && equipped.outfit !== 'thrift_jacket') look.hat = undefined;
  return look;
}

type Ctx = CanvasRenderingContext2D;

// ——— Colour helpers: shading is derived from each base colour, with hue-shifted shadows ———
const rgb = (c: string) => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: string, b: string, t: number) => {
  const A = rgb(a);
  const B = rgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
const lite = (c: string) => mix(c, '#fff6e0', 0.3);
const dark = (c: string) => mix(c, '#2a1e48', 0.34);
const deep = (c: string) => mix(c, '#1a1030', 0.55);
const OUTLINE = '#1b1424';

/**
 * Draws one hi-res frame (HERO_PX_W × HERO_PX_H) with its top-left at (ox, oy).
 * Light comes from the upper left; every part gets a highlight and a shadow
 * side, and a 1px outline is traced automatically around the silhouette.
 */
export function drawHero(target: Ctx, ox: number, oy: number, look: HeroLook, frame: number) {
  const c = document.createElement('canvas');
  c.width = HERO_PX_W;
  c.height = HERO_PX_H;
  const g = c.getContext('2d')!;
  const r = (x: number, y: number, w: number, h: number, col: string) => {
    if (w <= 0 || h <= 0) return;
    g.fillStyle = col;
    g.fillRect(x, y, w, h);
  };

  const working = frame === 2 || frame === 3;
  const cheering = frame === 4 || frame === 5;
  const walk = frame >= HERO_WALK ? frame - HERO_WALK : -1;
  const stride = walk === 0 ? 1 : walk === 2 ? -1 : 0;
  const bob = frame === 1 ? 1 : frame === 5 ? -6 : walk === 1 || walk === 3 ? -2 : 0;
  const Y = 15 + bob; // feet outline lands on the last row (Y + 70)

  const sleeve = look.jacket ?? look.shirt;

  // ——— Backpack (behind everything) ———
  if (look.backpack) {
    r(8, Y + 30, 32, 20, OUTLINE);
    r(9, Y + 31, 30, 18, P.orange);
    r(9, Y + 31, 30, 2, lite(P.orange));
    r(9, Y + 45, 30, 4, dark(P.orange));
  }

  // ——— Legs: drawn row by row so a stride makes them lean ———
  const hipY = Y + 50;
  const leg = (x: number, dx: number, lift: number) => {
    for (let i = 0; i < 16 - lift; i++) {
      const sx = x + Math.round((dx * i) / 16);
      r(sx, hipY + i, 7, 1, look.pants);
      r(sx, hipY + i, 1, 1, lite(look.pants));
      r(sx + 5, hipY + i, 2, 1, dark(look.pants));
    }
    const fx = x + dx;
    const fy = hipY + 16 - lift;
    r(fx - 1, fy, 9, 4, look.shoes);
    r(fx, fy, 6, 1, lite(look.shoes));
    r(fx - 1, fy + 3, 9, 1, deep(look.shoes));
    if (look.patches && x < 24) r(fx + 1, hipY + 7, 3, 3, P.cardboard);
  };
  leg(16, -stride * 5, stride < 0 ? 2 : 0);
  leg(25, stride * 5, stride > 0 ? 2 : 0);
  // crotch shadow
  r(22, hipY, 4, 3, dark(look.pants));

  // ——— Torso ———
  const top = Y + 27;
  for (let y = top; y < hipY + 1; y++) {
    const k = y - top;
    const inset = k === 0 ? 2 : k < 2 ? 1 : k > 12 ? Math.min(3, Math.round((k - 12) / 3)) : 0;
    const x0 = 12 + inset;
    const x1 = 36 - inset;
    r(x0, y, x1 - x0, 1, look.shirt);
    r(x0, y, 2, 1, lite(look.shirt));
    r(x1 - 4, y, 4, 1, dark(look.shirt));
  }
  r(14, hipY - 3, 20, 3, dark(look.shirt));
  // collar: a V of skin
  for (let i = 0; i < 4; i++) r(22 - (3 - i) + 1, top + i, (3 - i) * 2, 1, P.skin);
  r(21, top, 6, 1, P.skinShade);

  if (look.vest) {
    r(12, top + 1, 8, hipY - top - 1, look.vest);
    r(28, top + 1, 8, hipY - top - 1, look.vest);
    r(12, top + 1, 2, hipY - top - 1, lite(look.vest));
    r(32, top + 1, 4, hipY - top - 1, dark(look.vest));
    r(12, top + 12, 8, 2, P.sun);
    r(28, top + 12, 8, 2, P.sun);
    r(12, top + 13, 8, 1, P.cream);
    r(28, top + 13, 8, 1, P.cream);
  }
  if (look.patches) {
    r(15, top + 6, 5, 5, P.cardboard);
    r(16, top + 7, 3, 3, mix(P.cardboard, '#ffffff', 0.2));
    r(30, top + 14, 3, 3, P.wood);
  }
  if (look.tie) {
    r(23, top + 1, 3, 2, deep(look.tie));
    r(23, top + 3, 3, 13, look.tie);
    r(23, top + 3, 1, 13, lite(look.tie));
    r(24, top + 16, 1, 1, look.tie);
  }
  if (look.jacket) {
    const jx = look.jacket;
    // left and right panels with lapels angling in to the chest
    for (let y = top; y < hipY + 1; y++) {
      const k = y - top;
      const lap = k < 12 ? Math.max(0, 6 - Math.floor(k / 2)) : 0;
      const l1 = 21 - lap;
      const r0 = 27 + lap;
      const inset = k === 0 ? 2 : k < 2 ? 1 : k > 12 ? Math.min(3, Math.round((k - 12) / 3)) : 0;
      r(12 + inset, y, l1 - 12 - inset, 1, jx);
      r(r0, y, 36 - inset - r0, 1, jx);
      r(12 + inset, y, 2, 1, lite(jx));
      r(32 - inset, y, 4, 1, dark(jx));
      if (k < 12) {
        r(l1 - 1, y, 1, 1, dark(jx));
        r(r0, y, 1, 1, lite(jx));
      }
    }
    r(13, top + 15, 5, 1, deep(jx)); // pocket
    r(23, top + 17, 2, 2, look.tie ? P.gold : deep(jx)); // button
  }
  if (look.chain) {
    for (let i = 0; i < 9; i++) r(19 + i, top + 3 + Math.round(Math.sin((i / 8) * Math.PI) * 5), 1, 1, i % 2 ? P.gold : lite(P.gold));
    r(23, top + 9, 2, 2, P.gold);
  }
  if (look.backpack) {
    r(15, top, 2, 14, deep(P.orange));
    r(31, top, 2, 14, deep(P.orange));
  }
  // belt
  r(14, hipY - 1, 20, 2, OUTLINE);
  if (look.jacket || look.tie) r(23, hipY - 1, 3, 2, P.gold);

  // ——— Arms ———
  const arm = (side: -1 | 1, pose: 'down' | 'up' | 'punch', swing: number) => {
    const sx = side < 0 ? 7 : 35; // left edge of a 6px-wide arm
    if (pose === 'down') {
      const x = sx + swing;
      r(x - 1, top, 8, 22, OUTLINE);
      r(x, top + 1, 6, 17, sleeve);
      r(x, top + 1, 2, 17, lite(sleeve));
      r(x + 4, top + 1, 2, 17, dark(sleeve));
      r(x, top + 17, 6, 1, deep(sleeve));
      r(x, top + 18, 6, 3, P.skin);
      r(x + 4, top + 18, 2, 3, P.skinShade);
      if (look.watch && side < 0) r(x, top + 16, 6, 2, P.gold);
    } else if (pose === 'up') {
      const x = sx + (side < 0 ? 1 : -1);
      r(x - 1, top - 20, 8, 22, OUTLINE);
      r(x, top - 15, 6, 16, sleeve);
      r(x, top - 15, 2, 16, lite(sleeve));
      r(x + 4, top - 15, 2, 16, dark(sleeve));
      r(x, top - 19, 6, 4, P.skin);
      r(x + 4, top - 19, 2, 4, P.skinShade);
      r(x, top - 16, 6, 1, deep(sleeve));
      if (look.watch && side < 0) r(x, top - 15, 6, 2, P.gold);
    } else {
      // forward punch: arm straight out to the right
      r(34, top + 3, 13, 8, OUTLINE);
      r(35, top + 4, 8, 6, sleeve);
      r(35, top + 4, 8, 2, lite(sleeve));
      r(35, top + 8, 8, 2, dark(sleeve));
      r(42, top + 3, 5, 8, OUTLINE);
      r(42, top + 4, 4, 6, P.skin);
      r(42, top + 8, 4, 2, P.skinShade);
    }
  };
  const swing = stride * 3;
  arm(-1, cheering ? 'up' : 'down', swing);
  arm(1, cheering || frame === 2 ? 'up' : frame === 3 ? 'punch' : 'down', -swing);

  // ——— Head ———
  const hy = Y + 4; // top of the skull
  r(20, hy + 20, 9, 4, P.skinShade); // neck
  for (let y = hy; y < hy + 22; y++) {
    const k = y - hy;
    const inset = k < 1 ? 3 : k < 2 ? 1 : k > 18 ? (k - 17) * 2 : 0;
    const x0 = 13 + inset;
    const x1 = 35 - inset;
    r(x0, y, x1 - x0, 1, P.skin);
    r(x1 - 3, y, 3, 1, P.skinShade);
    if (k > 4 && k < 14) r(x0, y, 1, 1, lite(P.skin));
  }
  r(17, hy + 20, 14, 1, P.skinShade); // jaw shadow
  // ears
  r(11, hy + 9, 3, 6, P.skin);
  r(12, hy + 10, 1, 4, P.skinShade);
  r(34, hy + 9, 3, 6, P.skinShade);
  r(35, hy + 10, 1, 4, dark(P.skin));

  const browY = hy + 8;
  const eyeY = hy + 10;
  if (look.shades) {
    r(15, eyeY - 1, 18, 5, OUTLINE);
    r(16, eyeY, 7, 3, P.glassDark);
    r(25, eyeY, 7, 3, P.glassDark);
    r(16, eyeY, 2, 1, '#9fd4ff');
    r(25, eyeY, 2, 1, '#9fd4ff');
  } else if (cheering) {
    // happy closed eyes ^ ^
    for (const ex of [17, 26]) {
      r(ex, eyeY + 1, 1, 1, OUTLINE);
      r(ex + 1, eyeY, 3, 1, OUTLINE);
      r(ex + 4, eyeY + 1, 1, 1, OUTLINE);
    }
  } else {
    for (const ex of [18, 26]) {
      r(ex, eyeY, 4, 4, '#2a1c2e');
      r(ex + 1, eyeY + 1, 2, 3, '#5a3a2a');
      r(ex, eyeY, 2, 1, '#2a1c2e');
      r(ex + 1, eyeY, 1, 1, P.white);
      r(ex, eyeY + 1, 1, 1, P.white);
    }
  }
  // eyebrows: angled down when working hard
  const hair = P.hair;
  if (!look.shades) {
    if (working) {
      r(17, browY - 1, 2, 1, hair); r(19, browY, 3, 1, hair);
      r(26, browY, 3, 1, hair); r(29, browY - 1, 2, 1, hair);
    } else {
      r(17, browY - (cheering ? 1 : 0), 5, 1, hair);
      r(26, browY - (cheering ? 1 : 0), 5, 1, hair);
    }
  }
  // nose
  r(24, hy + 13, 2, 2, P.skinShade);
  r(23, hy + 15, 3, 1, dark(P.skin));
  // cheeks
  g.globalAlpha = 0.45;
  r(15, hy + 15, 3, 2, P.coral);
  r(30, hy + 15, 3, 2, P.coral);
  g.globalAlpha = 1;
  // mouth
  const my = hy + 17;
  if (cheering) {
    r(20, my - 1, 8, 4, OUTLINE);
    r(21, my - 1, 6, 1, P.white);
    r(21, my + 1, 6, 2, P.coral);
  } else if (working) {
    r(21, my, 6, 1, OUTLINE);
  } else {
    r(21, my, 6, 1, OUTLINE);
    r(20, my - 1, 1, 1, OUTLINE);
    r(27, my - 1, 1, 1, OUTLINE);
  }
  if (look.stubble) {
    g.globalAlpha = 0.55;
    for (let y = hy + 16; y < hy + 21; y++) for (let x = 16 + (y % 2); x < 33; x += 2) if (y > my + 1 || x < 20 || x > 27) r(x, y, 1, 1, dark(P.skin));
    g.globalAlpha = 1;
  }

  // ——— Hair ———
  const hl = lite(hair);
  const hd = deep(hair);
  if (look.hair === 'messy') {
    r(13, hy - 2, 22, 7, hair);
    r(12, hy + 1, 3, 9, hair);
    r(33, hy + 1, 3, 8, hd);
    for (const [x, h] of [[14, 3], [18, 4], [22, 3], [27, 4], [31, 3]] as const) r(x, hy - 2 - h, 3, h, hair);
    for (const x of [15, 20, 25, 30]) r(x, hy + 5, 3, 2, hair); // jagged fringe
    r(15, hy - 3, 8, 2, hl);
    r(28, hy, 6, 4, hd);
  } else if (look.hair === 'neat') {
    r(13, hy - 3, 22, 8, hair);
    r(12, hy, 3, 10, hair);
    r(33, hy, 3, 9, hd);
    r(15, hy + 5, 8, 2, hair);
    r(20, hy - 3, 1, 6, hd); // side part
    r(15, hy - 2, 5, 2, hl);
    r(29, hy - 1, 5, 5, hd);
  } else {
    r(13, hy - 3, 22, 7, hair);
    r(12, hy, 3, 8, hair);
    r(33, hy, 3, 7, hd);
    // swept-back gloss streaks
    r(15, hy - 2, 12, 1, hl);
    r(17, hy, 10, 1, hl);
    r(28, hy - 2, 6, 5, hd);
  }

  // ——— Hats ———
  const hc = look.hatColor ?? P.red;
  if (look.hat === 'beanie') {
    r(12, hy - 7, 24, 11, hc);
    r(12, hy - 7, 3, 11, lite(hc));
    r(31, hy - 7, 5, 11, dark(hc));
    r(11, hy + 1, 26, 4, dark(hc));
    for (let x = 12; x < 36; x += 3) r(x, hy + 1, 1, 4, deep(hc));
    r(21, hy - 11, 6, 4, lite(hc));
  } else if (look.hat === 'cap') {
    r(13, hy - 6, 22, 9, hc);
    r(13, hy - 6, 3, 9, lite(hc));
    r(31, hy - 6, 4, 9, dark(hc));
    r(22, hy - 7, 4, 1, deep(hc));
    r(11, hy + 3, 27, 3, deep(hc)); // brim
    r(13, hy + 3, 22, 1, dark(hc));
    g.globalAlpha = 0.35;
    r(14, hy + 6, 20, 2, '#2a1e48'); // shadow on the forehead
    g.globalAlpha = 1;
  } else if (look.hat === 'crown') {
    r(14, hy - 8, 20, 7, P.gold);
    for (const x of [14, 22, 30]) r(x, hy - 13, 4, 5, P.gold);
    r(14, hy - 8, 20, 1, lite(P.gold));
    r(14, hy - 3, 20, 2, P.goldDark);
    r(22, hy - 6, 4, 3, P.red);
    r(22, hy - 6, 1, 1, lite(P.red));
  }

  // ——— Automatic outline around everything drawn so far ———
  const img = g.getImageData(0, 0, HERO_PX_W, HERO_PX_H);
  const d = img.data;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < HERO_PX_W && y < HERO_PX_H && d[(y * HERO_PX_W + x) * 4 + 3] > 200;
  const edge: number[] = [];
  for (let y = 0; y < HERO_PX_H; y++)
    for (let x = 0; x < HERO_PX_W; x++)
      if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) edge.push(x, y);
  const [orr, og, ob] = rgb(OUTLINE);
  for (let i = 0; i < edge.length; i += 2) {
    const p = (edge[i + 1] * HERO_PX_W + edge[i]) * 4;
    d[p] = orr;
    d[p + 1] = og;
    d[p + 2] = ob;
    d[p + 3] = 255;
  }
  g.putImageData(img, 0, 0);

  // ——— Effects that sit outside the outline ———
  if (look.hat === 'halo') {
    g.globalAlpha = 0.9;
    r(16, hy - 12, 16, 2, P.cream);
    r(14, hy - 11, 2, 2, P.cream);
    r(32, hy - 11, 2, 2, P.cream);
    r(16, hy - 10, 16, 1, P.sun);
    g.globalAlpha = 1;
  }
  if (frame === 3) {
    g.globalAlpha = 0.8;
    r(36, top - 1, 8, 1, P.cream);
    r(38, top + 13, 7, 1, P.cream);
    g.globalAlpha = 1;
  }

  if (look.glow) {
    target.save();
    target.globalAlpha = 0.22;
    target.fillStyle = look.glow;
    target.beginPath();
    target.ellipse(ox + HERO_PX_W / 2, oy + HERO_PX_H / 2 + 2, HERO_PX_W / 2 - 2, HERO_PX_H / 2 - 2, 0, 0, Math.PI * 2);
    target.fill();
    target.restore();
  }
  target.drawImage(c, ox, oy);
}

/** Builds a horizontal sprite sheet canvas: one row of HERO_FRAMES hi-res frames. */
export function buildHeroSheet(look: HeroLook): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = HERO_PX_W * HERO_FRAMES;
  c.height = HERO_PX_H;
  const ctx = c.getContext('2d')!;
  for (let f = 0; f < HERO_FRAMES; f++) drawHero(ctx, f * HERO_PX_W, 0, look, f);
  return c;
}
