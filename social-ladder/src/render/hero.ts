import { P } from './palette';

/**
 * The protagonist, drawn pixel by pixel into a sprite sheet at boot. He is the
 * same person in every social class (same face, same hair), only his clothes,
 * posture details and accessories change.
 */
export const HERO_W = 20;
export const HERO_H = 28;
export const HERO_FRAMES = 6; // idle, idle2, work, work2, cheer, cheer2

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
  { shirt: P.gold, shirtShade: P.goldDark, pants: P.white, pantsShade: P.steel, shoes: P.gold, hair: 'slick', jacket: P.white, jacketShade: P.steel, tie: P.pink, shades: true, chain: true, watch: true },
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

function px(ctx: Ctx, color: string, x: number, y: number, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Draws one frame at (ox, oy). */
export function drawHero(ctx: Ctx, ox: number, oy: number, look: HeroLook, frame: number) {
  const working = frame === 2 || frame === 3;
  const cheering = frame === 4 || frame === 5;
  const bob = frame === 1 ? 1 : frame === 5 ? -2 : 0;
  const o = (x: number, y: number, w = 1, h = 1, c: string = P.ink) => px(ctx, c, ox + x, oy + y + bob, w, h);

  // Glow aura (cosmic)
  if (look.glow) {
    ctx.globalAlpha = 0.25;
    o(2, 0, 16, 27, look.glow);
    ctx.globalAlpha = 1;
  }

  // Backpack behind the body
  if (look.backpack) {
    o(13, 11, 6, 9);
    o(14, 12, 4, 7, P.orange);
    o(14, 12, 4, 1, P.sun);
  }

  // ——— Legs ———
  const legY = 20;
  o(5, legY, 4, 7); // outlines
  o(11, legY, 4, 7);
  o(6, legY, 2, 5, look.pants);
  o(12, legY, 2, 5, look.pants);
  o(7, legY, 1, 5, look.pantsShade);
  o(13, legY, 1, 5, look.pantsShade);
  if (look.patches) o(6, legY + 2, 1, 1, P.cardboard);
  // shoes
  o(4, legY + 5, 5, 2);
  o(11, legY + 5, 5, 2);
  o(5, legY + 5, 3, 1, look.shoes);
  o(12, legY + 5, 3, 1, look.shoes);

  // ——— Torso ———
  o(4, 10, 12, 11);
  o(5, 11, 10, 9, look.shirt);
  o(5, 18, 10, 2, look.shirtShade);
  if (look.patches) {
    o(6, 13, 2, 2, P.cardboard);
    o(12, 16, 1, 1, P.wood);
  }
  if (look.vest) {
    o(5, 11, 3, 9, look.vest);
    o(12, 11, 3, 9, look.vest);
    o(5, 15, 3, 1, P.sun);
    o(12, 15, 3, 1, P.sun);
  }
  if (look.jacket) {
    o(5, 11, 3, 9, look.jacket);
    o(12, 11, 3, 9, look.jacket);
    o(7, 11, 1, 6, look.jacketShade ?? look.jacket);
    o(12, 11, 1, 6, look.jacketShade ?? look.jacket);
  }
  if (look.tie) {
    o(9, 11, 2, 1, look.tie);
    o(9, 12, 2, 5, look.tie);
    o(9, 17, 2, 1, P.ink);
  }
  if (look.chain) {
    o(8, 12, 1, 1, P.gold);
    o(11, 12, 1, 1, P.gold);
    o(9, 13, 2, 1, P.gold);
  }
  // belt
  o(5, 19, 10, 1, P.ink);
  if (look.jacket || look.tie) o(9, 19, 2, 1, P.gold);

  // ——— Arms ———
  const sleeve = look.jacket ?? look.shirt;
  const sleeveShade = look.jacketShade ?? look.shirtShade;
  const arm = (x: number, up: boolean, raised: number) => {
    if (up) {
      o(x - 1, 4 - raised, 4, 9);
      o(x, 5 - raised, 2, 6, sleeve);
      o(x, 5 - raised, 2, 2, P.skin);
      o(x + 1, 7 - raised, 1, 4, sleeveShade);
    } else {
      o(x - 1, 10, 4, 10);
      o(x, 11, 2, 7, sleeve);
      o(x + 1, 11, 1, 7, sleeveShade);
      o(x, 18, 2, 1, P.skin);
      o(x, 18, 1, 1, P.skinShade);
    }
  };
  arm(2, cheering, frame === 5 ? 1 : 0);
  arm(16, cheering || frame === 2, frame === 2 ? 1 : 0);
  if (working && frame === 3) {
    // follow-through: fist forward
    o(15, 15, 4, 4);
    o(16, 16, 2, 2, P.skin);
  }
  if (look.watch) {
    if (!cheering) o(2, 17, 2, 1, P.gold);
    else o(2, 9, 2, 1, P.gold);
  }

  // ——— Head ———
  o(5, 1, 10, 10); // outline
  o(6, 2, 8, 8, P.skin);
  o(6, 8, 8, 1, P.skinShade);
  o(5, 4, 1, 3); // ears outline
  o(14, 4, 1, 3);
  o(4, 5, 1, 2, P.skinShade);
  o(15, 5, 1, 2, P.skinShade);
  // neck
  o(8, 10, 4, 1, P.skinShade);
  // eyes (blink-free, expressive when cheering)
  if (look.shades) {
    o(6, 5, 8, 2, P.ink);
    o(7, 5, 2, 1, P.glassDark);
    o(11, 5, 2, 1, P.glassDark);
  } else if (cheering) {
    o(7, 5, 2, 1);
    o(11, 5, 2, 1);
  } else {
    o(8, 5, 1, 2);
    o(11, 5, 1, 2);
    o(8, 5, 1, 1, P.white);
    o(11, 5, 1, 1, P.white);
  }
  // mouth
  if (cheering) {
    o(8, 7, 4, 2, P.ink);
    o(9, 8, 2, 1, P.coral);
  } else o(9, 8, 3, 1, P.rose);
  if (look.stubble) {
    o(7, 8, 1, 1, P.skinShade);
    o(12, 8, 1, 1, P.skinShade);
    o(8, 9, 4, 1, P.skinShade);
  }

  // ——— Hair ———
  const hair = P.hair;
  const hairS = P.hairShade;
  if (look.hair === 'messy') {
    o(5, 0, 10, 3);
    o(6, 1, 8, 2, hair);
    o(6, 3, 2, 1, hair);
    o(12, 3, 2, 1, hair);
    o(7, 0, 1, 1, hair);
    o(11, 0, 2, 1, hair);
    o(9, 1, 1, 1, hairS);
  } else if (look.hair === 'neat') {
    o(5, 0, 10, 3);
    o(6, 1, 8, 2, hair);
    o(6, 3, 3, 1, hair);
    o(6, 1, 8, 1, hairS);
  } else {
    o(5, 0, 10, 3);
    o(6, 1, 8, 2, hair);
    o(6, 3, 8, 1, hair);
    o(7, 1, 6, 1, '#6b4636');
  }

  // ——— Hats ———
  const hc = look.hatColor ?? P.red;
  if (look.hat === 'beanie') {
    o(4, -1, 12, 5);
    o(5, 0, 10, 3, hc);
    o(5, 3, 10, 1, P.brickDark);
    o(9, -2, 2, 1, hc);
  } else if (look.hat === 'cap') {
    o(4, -1, 11, 4);
    o(5, 0, 9, 2, hc);
    o(13, 2, 4, 2);
    o(13, 2, 3, 1, hc);
  } else if (look.hat === 'crown') {
    o(5, -4, 10, 5);
    o(6, -2, 8, 2, P.gold);
    o(6, -3, 1, 1, P.gold);
    o(9, -3, 2, 1, P.gold);
    o(13, -3, 1, 1, P.gold);
    o(9, -2, 2, 1, P.red);
  } else if (look.hat === 'halo') {
    ctx.globalAlpha = 0.85;
    o(6, -3, 8, 1, P.cream);
    ctx.globalAlpha = 1;
  }
}

/** Builds a horizontal sprite sheet canvas: one row of HERO_FRAMES frames. */
export function buildHeroSheet(look: HeroLook): HTMLCanvasElement {
  const c = document.createElement('canvas');
  // 4px of headroom for hats/jumps.
  c.width = HERO_W * HERO_FRAMES;
  c.height = HERO_H + 4;
  const ctx = c.getContext('2d')!;
  for (let f = 0; f < HERO_FRAMES; f++) drawHero(ctx, f * HERO_W, 4, look, f);
  return c;
}
