import { useEffect, useMemo, useRef, useState } from 'react';
import { STAGES } from '../../data/stages';
import { buildLayeredStage } from '../../render/stageLayers';
import { drawLayeredWorld } from '../../render/layerDraw';
import { applyEquipment, buildHeroSheet, HERO_PX_H, HERO_PX_W, HERO_RES, HERO_WALK, STAGE_LOOKS } from '../../render/hero';
import { buildProp, GROUND_Y, WORLD_H, WORLD_W, type PropId } from '../../render/environments';
import { CLASS_CUTSCENES, GENERIC_CUTSCENE, type CustomProp, type Pose, type Shot } from '../../render/cineScripts';
import { audio } from '../../audio/audio';
import { t } from '../../i18n';
import { useEngine } from '../hooks';

/** The cutscene canvas renders at the hero's pixel density. */
const RES = HERO_RES;
const CW = WORLD_W * RES;
const CH = WORLD_H * RES;
const TRANS = 0.4;

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

interface Particle { x: number; y: number; vx: number; vy: number; c: string; s: number; life: number; g: number }

const CUSTOM: ReadonlySet<string> = new Set<CustomProp>(['bed', 'letter', 'coinstack', 'keys', 'box', 'sold', 'chart', 'champagne', 'crown', 'rocket']);
/** Props drawn behind the hero; everything else (held or falling items) goes in front. */
const BEHIND: ReadonlySet<string> = new Set(['used_car', 'sports_car', 'yacht', 'sold', 'chart', 'bed', 'rocket']);

/**
 * Full-screen cutscene played when the hero reaches a new social class. Each
 * class has its own short story (see cineScripts.ts): several shots with camera
 * moves, props, weather and captions, ending on a chapter title card.
 */
export function ClassCinematic({ fromStage, toStage, onDone }: { fromStage: number; toStage: number; onDone: () => void }) {
  const engine = useEngine();
  const ref = useRef<HTMLCanvasElement>(null);
  const shots = CLASS_CUTSCENES[toStage] ?? GENERIC_CUTSCENE;
  const [shotIdx, setShotIdx] = useState(0);
  const [out, setOut] = useState(false);
  const done = useRef(false);
  const from = STAGES[fromStage];
  const to = STAGES[toStage];

  const art = useMemo(() => {
    const sheet = (i: number) => buildHeroSheet(applyEquipment(STAGE_LOOKS[i], engine.state.equipped));
    return {
      from: { world: buildLayeredStage(fromStage)!, hero: sheet(fromStage) },
      to: { world: buildLayeredStage(toStage)!, hero: sheet(toStage) },
    };
  }, [fromStage, toStage, engine]);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  useEffect(() => {
    const outCanvas = ref.current!;
    const octx = outCanvas.getContext('2d')!;
    octx.imageSmoothingEnabled = false;
    const buf = document.createElement('canvas');
    buf.width = CW;
    buf.height = CH;
    const ctx = buf.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const props = new Map<string, HTMLCanvasElement>();
    const prop = (id: PropId) => {
      if (!props.has(id)) props.set(id, buildProp(id));
      return props.get(id)!;
    };
    const parts: Particle[] = [];
    const colors = [to.accent, '#ffe44d', '#ffffff', '#ff7aa8', '#3fcfbd'];
    const fired = new Set<string>();
    const starts: number[] = [];
    const total = shots.reduce((acc, s, i) => ((starts[i] = acc), acc + s.dur), 0);
    const rain = Array.from({ length: 70 }, () => ({ x: Math.random() * WORLD_W, y: Math.random() * WORLD_H, v: 140 + Math.random() * 80 }));
    const t0 = performance.now();
    let last = t0;
    let raf = 0;
    let shown = -1;

    const burst = (x: number, y: number, n: number, cols = colors, spread = 1) => {
      for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 90 * spread, vy: -50 - Math.random() * 90, c: cols[i % cols.length], s: Math.random() < 0.3 ? 2 : 1, life: 3, g: 120 });
    };

    /** Where the hero is and what he is doing at shot time `lt`. */
    const heroState = (sh: Shot, lt: number) => {
      const [a, b] = sh.hero.walk ?? [0, sh.dur];
      const p = clamp01((lt - a) / Math.max(0.01, b - a));
      const x = lerp(sh.hero.x[0], sh.hero.x[1], p);
      let pose: Pose = sh.hero.pose;
      for (const [at, ps] of sh.hero.at ?? []) if (lt >= at) pose = ps;
      const moving = sh.hero.x[0] !== sh.hero.x[1] && lt > a && lt < b;
      if (moving && pose !== 'hidden') pose = 'walk';
      return { x, pose, flip: sh.hero.x[1] < sh.hero.x[0] };
    };

    const frameFor = (pose: Pose, lt: number) => {
      switch (pose) {
        case 'walk': return HERO_WALK + (Math.floor(lt / 0.11) % 4);
        case 'cheer': return 4 + (Math.floor(lt / 0.18) % 2);
        case 'work': return 2 + (Math.floor(lt / 0.22) % 2);
        case 'idle': return Math.floor(lt / 0.5) % 2;
        default: return 0;
      }
    };

    /** The hero is drawn 1:1 from his hi-res sheet (context not scaled). */
    const drawHero = (sheet: HTMLCanvasElement, sx: number, pose: Pose, lt: number, flip: boolean) => {
      if (pose === 'hidden') return;
      const f = frameFor(pose, lt);
      const dx = Math.round(sx * RES - HERO_PX_W / 2);
      const foot = (GROUND_Y + 1) * RES;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(dx + 8, foot - 2, HERO_PX_W - 16, 3);
      ctx.save();
      if (pose === 'sleep') {
        // lying on his back on the cardboard, gently breathing
        ctx.translate(Math.round(sx * RES) - HERO_PX_H / 2 + 6, foot + 1 - (Math.floor(lt / 0.8) % 2));
        ctx.rotate(-Math.PI / 2);
        ctx.drawImage(sheet, 0, 0, HERO_PX_W, HERO_PX_H, 0, 0, HERO_PX_W, HERO_PX_H);
        ctx.restore();
        const z = Math.floor(lt / 0.6) % 3;
        ctx.fillStyle = '#bcd3ff';
        ctx.font = `bold ${12 + z * 4}px monospace`;
        ctx.fillText('z', Math.round(sx * RES) - 40 + z * 8, foot - 40 - z * 10);
        return;
      }
      if (flip) {
        ctx.translate(dx + HERO_PX_W, foot - HERO_PX_H);
        ctx.scale(-1, 1);
        ctx.drawImage(sheet, f * HERO_PX_W, 0, HERO_PX_W, HERO_PX_H, 0, 0, HERO_PX_W, HERO_PX_H);
      } else ctx.drawImage(sheet, f * HERO_PX_W, 0, HERO_PX_W, HERO_PX_H, dx, foot - HERO_PX_H, HERO_PX_W, HERO_PX_H);
      ctx.restore();
    };

    /** Small story props drawn in world pixels (the context is scaled ×RES). */
    const drawCustom = (kind: CustomProp, x: number, y: number, lt: number, sh: Shot) => {
      const r = (rx: number, ry: number, w: number, h: number, c: string) => {
        ctx.fillStyle = c;
        ctx.fillRect(Math.round(rx), Math.round(ry), w, h);
      };
      switch (kind) {
        case 'bed':
          r(x - 18, y - 3, 36, 3, '#14101c');
          r(x - 17, y - 3, 34, 2, '#c49a62');
          r(x - 17, y - 3, 34, 1, '#e0bd85');
          break;
        case 'letter':
          r(x - 5, y - 7, 10, 7, '#14101c');
          r(x - 4, y - 6, 8, 5, '#fdfbf7');
          r(x - 3, y - 6, 1, 1, '#c9c4d6');
          r(x - 2, y - 5, 1, 1, '#c9c4d6');
          r(x - 1, y - 4, 2, 1, '#c9c4d6');
          r(x + 1, y - 5, 1, 1, '#c9c4d6');
          r(x + 2, y - 6, 1, 1, '#c9c4d6');
          r(x - 1, y - 3, 2, 2, '#d6413b');
          break;
        case 'coinstack': {
          const n = Math.min(9, 1 + Math.floor(lt * 2.8));
          for (let i = 0; i < n; i++) {
            r(x - 4, y - 2 - i * 2, 8, 2, '#a37a1c');
            r(x - 3, y - 2 - i * 2, 6, 1, '#f2c84b');
          }
          break;
        }
        case 'keys':
          r(x - 2, y - 6, 4, 4, '#14101c');
          r(x - 1, y - 5, 2, 2, '#8a8fa6');
          r(x + 1, y - 4, 6, 2, '#14101c');
          r(x + 1, y - 4, 5, 1, '#f2c84b');
          r(x + 5, y - 3, 1, 1, '#f2c84b');
          break;
        case 'box':
          r(x - 8, y - 12, 16, 12, '#14101c');
          r(x - 7, y - 11, 14, 10, '#c49a62');
          r(x - 7, y - 11, 14, 2, '#e0bd85');
          r(x - 1, y - 11, 2, 10, '#e8d8b0');
          r(x + 3, y - 9, 3, 7, '#a3784a');
          break;
        case 'sold':
          r(x - 1, y - 22, 2, 22, '#5a3a2a');
          r(x - 15, y - 30, 30, 12, '#14101c');
          r(x - 14, y - 29, 28, 10, '#d6413b');
          r(x - 14, y - 29, 28, 1, '#ff6b6b');
          ctx.fillStyle = '#fdfbf7';
          ctx.font = 'bold 7px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(t('cineSold'), x, y - 21);
          ctx.textAlign = 'start';
          break;
        case 'chart': {
          const w = 46;
          const h = 30;
          r(x - 1, y, 2, GROUND_Y + 1 - y, '#5a3a2a');
          r(x - w / 2 - 1, y - h - 1, w + 2, h + 2, '#14101c');
          r(x - w / 2, y - h, w, h, '#1d2440');
          for (let gx = 0; gx < w; gx += 8) r(x - w / 2 + gx, y - h, 1, h, '#2a3458');
          for (let gy = 0; gy < h; gy += 8) r(x - w / 2, y - h + gy, w, 1, '#2a3458');
          const p = clamp01(lt / (sh.dur - 0.6));
          const pts = Math.floor(p * (w - 4));
          for (let i = 0; i < pts; i++) {
            const v = (i / (w - 4)) ** 2 * (h - 8) + Math.sin(i * 1.3) * 2;
            r(x - w / 2 + 2 + i, y - 4 - v, 1, 2, '#39f56a');
          }
          if (p >= 1 && Math.floor(lt * 4) % 2) {
            ctx.fillStyle = '#39f56a';
            ctx.font = 'bold 8px monospace';
            ctx.fillText('▲', x + w / 2 - 9, y - h + 9);
          }
          break;
        }
        case 'champagne':
          r(x - 2, y - 12, 4, 12, '#14101c');
          r(x - 1, y - 11, 2, 10, '#1f6b3a');
          r(x - 1, y - 14, 2, 3, '#f2c84b');
          if (lt < 1.6) r(x - 1, y - 16, 2, 2, '#c49a62');
          else if (!fired.has('cork')) {
            fired.add('cork');
            burst(x, y - 16, 40, ['#fff1c9', '#ffe44d', '#ffffff'], 0.6);
          }
          break;
        case 'crown':
          r(x - 6, y - 5, 12, 5, '#14101c');
          r(x - 5, y - 4, 10, 3, '#f2c84b');
          for (const cx of [-5, -1, 3]) r(x + cx, y - 7, 2, 3, '#f2c84b');
          r(x - 1, y - 3, 2, 2, '#d6413b');
          if (Math.floor(lt * 8) % 2) r(x + 4, y - 8, 1, 1, '#ffffff');
          break;
        case 'rocket':
          r(x - 9, y - 40, 18, 40, '#14101c');
          r(x - 8, y - 32, 16, 30, '#e8ecf5');
          r(x - 8, y - 32, 3, 30, '#ffffff');
          r(x + 4, y - 32, 4, 30, '#aab2c8');
          r(x - 6, y - 38, 12, 6, '#d6413b');
          r(x - 3, y - 41, 6, 3, '#d6413b');
          r(x - 3, y - 25, 6, 6, '#14101c');
          r(x - 2, y - 24, 4, 4, '#4ad8ff');
          r(x - 12, y - 10, 4, 10, '#d6413b');
          r(x + 8, y - 10, 4, 10, '#d6413b');
          if (sh.fx?.includes('smoke') && lt > 0.4) {
            const fl = Math.floor(lt * 12) % 2;
            r(x - 5, y, 10, 4 + fl * 3, '#ffd166');
            r(x - 3, y + 3, 6, 4 + fl * 2, '#ff6b3a');
          }
          break;
      }
    };

    const drawProps = (sh: Shot, lt: number, hero: { x: number; pose: Pose }, camX: number, behind: boolean) => {
      for (const pc of sh.props ?? []) {
        if (BEHIND.has(pc.kind) !== behind) continue;
        if (pc.show && (lt < pc.show[0] || lt > pc.show[1])) continue;
        let [x, y] = pc.from;
        if (pc.held) {
          // A box is hugged with both hands; anything else sits in his right hand.
          const twoHands = pc.kind === 'box';
          x = hero.x + (twoHands ? 1 : 7);
          y = hero.pose === 'cheer' ? GROUND_Y - (twoHands ? 34 : 27) : GROUND_Y - (twoHands ? 10 : 8);
          if (hero.pose === 'walk') y -= Math.floor(lt / 0.22) % 2;
        } else if (pc.to) {
          const [a, b] = pc.move ?? [0, sh.dur];
          const p = clamp01((lt - a) / Math.max(0.01, b - a));
          const falling = pc.kind === 'letter' || pc.kind === 'keys' || pc.kind === 'crown';
          const pe = falling ? p : ease(p);
          x = lerp(pc.from[0], pc.to[0], pe);
          y = lerp(pc.from[1], pc.to[1], pe);
          if (pc.kind === 'letter' && p < 1) x += Math.sin(lt * 5) * 6;
        }
        const sx = x - camX;
        if (CUSTOM.has(pc.kind)) drawCustom(pc.kind as CustomProp, sx, y, lt, sh);
        else {
          const img = prop(pc.kind as PropId);
          ctx.save();
          if (pc.flip || (pc.to && pc.to[0] < pc.from[0])) {
            ctx.translate(Math.round(sx), 0);
            ctx.scale(-1, 1);
            ctx.drawImage(img, -Math.round(img.width / 2), Math.round(y - img.height));
          } else ctx.drawImage(img, Math.round(sx - img.width / 2), Math.round(y - img.height));
          ctx.restore();
        }
      }
    };

    const drawFx = (sh: Shot, lt: number, dt: number, heroX: number) => {
      const fx = sh.fx ?? [];
      if (fx.includes('night')) {
        ctx.fillStyle = 'rgba(8,10,34,0.42)';
        ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      }
      if (fx.includes('sunrise')) {
        const g = ctx.createLinearGradient(0, 0, 0, WORLD_H);
        const a = 0.45 * (1 - clamp01(lt / sh.dur));
        g.addColorStop(0, `rgba(255,150,80,${a})`);
        g.addColorStop(1, 'rgba(255,150,80,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, WORLD_W, WORLD_H);
      }
      if (fx.includes('rain')) {
        ctx.fillStyle = 'rgba(169,189,232,0.55)';
        for (const d of rain) {
          d.y += d.v * dt;
          d.x -= d.v * dt * 0.15;
          if (d.y > WORLD_H) {
            d.y -= WORLD_H + 6;
            d.x = Math.random() * (WORLD_W + 30);
          }
          ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 3);
        }
      }
      if (fx.includes('disco')) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ['rgba(255,61,173,0.18)', 'rgba(41,240,255,0.18)', 'rgba(255,228,77,0.15)'].forEach((c, i) => {
          const ang = Math.sin(lt * 1.6 + i * 2.1) * 0.7 + Math.PI / 2;
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.moveTo(WORLD_W / 2, -5);
          ctx.lineTo(WORLD_W / 2 + Math.cos(ang - 0.12) * 200, -5 + Math.sin(ang - 0.12) * 200);
          ctx.lineTo(WORLD_W / 2 + Math.cos(ang + 0.12) * 200, -5 + Math.sin(ang + 0.12) * 200);
          ctx.fill();
        });
        ctx.restore();
      }
      if (fx.includes('coins') && Math.random() < 0.5) parts.push({ x: Math.random() * WORLD_W, y: -4, vx: 0, vy: 40 + Math.random() * 30, c: '#f2c84b', s: 2, life: 4, g: 30 });
      if (fx.includes('sparkle') && Math.random() < 0.3) parts.push({ x: heroX + (Math.random() - 0.5) * 50, y: GROUND_Y - 10 - Math.random() * 60, vx: 0, vy: -6, c: '#fff1c9', s: 1, life: 0.7, g: 0 });
      if (fx.includes('smoke') && lt > 0.3 && Math.random() < 0.8) {
        const rocket = sh.props?.find((p) => p.kind === 'rocket');
        const rx = (rocket?.from[0] ?? 156) - (sh.cam.x[0] ?? 0);
        parts.push({ x: rx - 20 + Math.random() * 40, y: GROUND_Y - 2, vx: (Math.random() - 0.5) * 60, vy: -10 - Math.random() * 15, c: Math.random() < 0.5 ? '#d8dbe6' : '#aab2c8', s: 3, life: 1.6, g: -4 });
      }
      for (const p of parts) {
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.99;
        p.life -= dt;
        if (p.life <= 0) continue;
        ctx.fillStyle = p.c;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
      }
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0 || parts[i].y > WORLD_H + 10) parts.splice(i, 1);
    };

    /** Shot changes: fade, iris on the hero, a diagonal wipe in the class colour, or a white flash. */
    const transition = (i: number, lt: number, heroOX: number, heroOY: number) => {
      const sh = shots[i];
      const next = shots[i + 1];
      const pin = lt / TRANS;
      const pout = (sh.dur - lt) / TRANS;
      const iris = (p: number) => {
        const rad = ease(clamp01(p)) * Math.hypot(CW, CH);
        octx.fillStyle = '#000';
        octx.beginPath();
        octx.rect(0, 0, CW, CH);
        octx.arc(heroOX, heroOY, Math.max(0.1, rad), 0, Math.PI * 2, true);
        octx.fill('evenodd');
      };
      const black = (p: number) => {
        octx.fillStyle = `rgba(0,0,0,${1 - clamp01(p)})`;
        octx.fillRect(0, 0, CW, CH);
      };
      const white = (p: number, max: number) => {
        octx.fillStyle = `rgba(255,255,255,${(1 - clamp01(p)) * max})`;
        octx.fillRect(0, 0, CW, CH);
      };
      const wipe = (p: number, covering: boolean) => {
        const edge = (covering ? p : 1 - p) * (CW + 120) - 60;
        octx.fillStyle = to.accent;
        octx.beginPath();
        if (covering) {
          octx.moveTo(-80, 0);
          octx.lineTo(edge + 60, 0);
          octx.lineTo(edge - 60, CH);
          octx.lineTo(-80, CH);
        } else {
          octx.moveTo(edge + 60, 0);
          octx.lineTo(CW + 80, 0);
          octx.lineTo(CW + 80, CH);
          octx.lineTo(edge - 60, CH);
        }
        octx.fill();
      };
      if (pin < 1) {
        if (i === 0 || sh.enter === 'fade') black(pin);
        else if (sh.enter === 'iris') iris(pin);
        else if (sh.enter === 'wipe') wipe(clamp01(pin), false);
        else if (sh.enter === 'flash') white(pin, 1);
      }
      if (next && pout < 1) {
        if (next.enter === 'fade') black(pout);
        else if (next.enter === 'iris') iris(pout);
        else if (next.enter === 'wipe') wipe(1 - clamp01(pout), true);
        else if (next.enter === 'flash') white(pout, 0.8);
      }
    };

    const frame = (now: number) => {
      const s = (now - t0) / 1000;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (s >= total) return finish();
      let i = 0;
      while (i < shots.length - 1 && s >= starts[i + 1]) i++;
      const sh = shots[i];
      const lt = s - starts[i];
      if (i !== shown) {
        shown = i;
        setShotIdx(i);
        if (i > 0 && (sh.enter === 'wipe' || sh.enter === 'iris')) audio.whoosh();
      }
      for (const [at, name] of sh.sfx ?? []) {
        const key = `${i}:${at}:${name}`;
        if (lt >= at && !fired.has(key)) {
          fired.add(key);
          if (name === 'promotion') audio.promotion(true);
          else audio[name]();
        }
      }
      if (!fired.has('out') && s > total - 0.6) {
        fired.add('out');
        setOut(true);
      }

      const set = sh.stage === 'from' ? art.from : art.to;
      const cp = ease(clamp01(lt / sh.dur));
      const camX = lerp(sh.cam.x[0], sh.cam.x[1], cp);
      const zoom = Math.max(1, lerp(sh.cam.zoom[0], sh.cam.zoom[1], cp));
      const hero = heroState(sh, lt);
      const heroSX = hero.x - camX;
      if (sh.fx?.includes('confetti') && lt > 0.9 && !fired.has(`conf${i}`)) {
        fired.add(`conf${i}`);
        burst(heroSX, GROUND_Y - 32, 110);
      }

      // World and big props at world density, the hero at his own, then held props and effects.
      ctx.setTransform(RES, 0, 0, RES, 0, 0);
      drawLayeredWorld(ctx, set.world, camX);
      drawProps(sh, lt, hero, camX, true);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      drawHero(set.hero, heroSX, hero.pose, lt, hero.flip);
      ctx.setTransform(RES, 0, 0, RES, 0, 0);
      drawProps(sh, lt, hero, camX, false);
      drawFx(sh, lt, dt, heroSX);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // Camera: crop around the hero and scale up, with an optional shake.
      const shake = sh.fx?.includes('shake') ? (Math.random() - 0.5) * 6 * (1 - clamp01(lt / sh.dur)) : 0;
      const w = CW / zoom;
      const h = CH / zoom;
      const cx = Math.min(CW - w / 2, Math.max(w / 2, heroSX * RES)) + shake;
      const cy = Math.min(CH - h / 2, Math.max(h / 2, (GROUND_Y - 30) * RES)) + shake;
      octx.clearRect(0, 0, CW, CH);
      octx.drawImage(buf, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h, 0, 0, CW, CH);
      transition(i, lt, (heroSX * RES - (cx - w / 2)) * zoom, ((GROUND_Y - 18) * RES - (cy - h / 2)) * zoom);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [art]);

  const shot = shots[shotIdx];
  const name = to.name.toUpperCase();
  return (
    <div className={`cine ${out ? 'cine-out' : ''}`} style={{ ['--accent' as string]: to.accent }} role="dialog" aria-label={`${t('newClass')}: ${to.name}`}>
      <canvas ref={ref} width={CW} height={CH} className="cine-canvas" />
      <div className="cine-grain" />
      <div className="cine-bar top" />
      <div className="cine-bar bottom" />
      {shotIdx === 0 && <div className="cine-chip">{t('leavingBehind', { stage: from.name })}</div>}
      {shot.caption && (
        <p className="cine-line" key={shotIdx}>
          {t(shot.caption)}
        </p>
      )}
      {shot.title && (
        <div className="cine-title">
          <small>{t('chapter', { n: toStage + 1 })} · {t('newClass')}</small>
          <h1 aria-label={name}>
            {name.split(' ').map((word, w, words) => {
              const offset = words.slice(0, w).join(' ').length + (w ? 1 : 0);
              return (
                <span className="cine-word" key={w}>
                  {[...word].map((ch, i) => (
                    <span className="cine-letter" key={i} style={{ animationDelay: `${0.5 + (offset + i) * 0.045}s` }}>{ch}</span>
                  ))}
                </span>
              );
            })}
          </h1>
          <p>“{to.tagline}”</p>
        </div>
      )}
      <button className="cine-skip" onClick={finish}>{t('skipCinematic')} ▸▸</button>
    </div>
  );
}
