import { FX } from './intensity';

/**
 * One full-screen canvas for every transient effect (particles, floating
 * numbers, shockwave rings, screen flashes). Pooled fixed-size arrays mean no
 * DOM nodes and no garbage per click, and the animation loop only runs while
 * something is on screen.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  color: string;
  glow: number;
  gravity: number;
  drag: number;
  star: boolean;
}

interface FloatText {
  x: number;
  y: number;
  age: number;
  life: number;
  text: string;
  size: number;
  color: string;
  shadow: string;
  rise: number;
  pop: number;
  key?: string;
}

/** A reward coin travelling along a curve to a counter (e.g. the money display). */
interface Flyer {
  sx: number;
  sy: number;
  cx: number;
  cy: number;
  tx: number;
  ty: number;
  age: number;
  life: number;
  color: string;
  size: number;
}

interface Ring {
  x: number;
  y: number;
  age: number;
  life: number;
  radius: number;
  width: number;
  color: string;
}

interface Flash {
  age: number;
  life: number;
  color: string;
  alpha: number;
}

export interface BurstOptions {
  count: number;
  colors: readonly string[];
  /** Initial speed range in px/s. */
  speed?: [number, number];
  /** Emission angle range in degrees (0 = right, -90 = up). */
  angle?: [number, number];
  size?: number;
  life?: number;
  gravity?: number;
  glow?: number;
  /** Fraction of particles drawn as 4-point pixel stars. */
  stars?: number;
  drag?: number;
}

export interface TextOptions {
  size?: number;
  color?: string;
  shadow?: string;
  life?: number;
  rise?: number;
  /** Starting scale of the pop-in (1 = none). */
  pop?: number;
  /** Texts with the same key merge when spawned in quick succession (keeps rapid crits readable). */
  key?: string;
}

const MAX_TEXTS = 28;
const MAX_RINGS = 20;
const MAX_FLYERS = 40;

export class FxLayer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private dpr = 1;
  private w = 0;
  private h = 0;
  private particles: Particle[] = [];
  private texts: FloatText[] = [];
  private rings: Ring[] = [];
  private flashes: Flash[] = [];
  private flyers: Flyer[] = [];
  /** Called when a flying coin reaches its target (used to pulse the counter). */
  onArrive: (() => void) | null = null;
  private raf = 0;
  private last = 0;
  private maxParticles = 700;
  /** Reduced-motion mode: fewer particles, no flashes, no rising motion. */
  reduced = false;
  /** Lower particle budget on small/touch screens. */
  private density = 1;

  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    this.density = coarse || window.innerWidth < 720 ? 0.6 : 1;
    this.maxParticles = coarse ? 350 : 700;
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  detach() {
    window.removeEventListener('resize', this.resize);
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.canvas = null;
    this.ctx = null;
    this.particles.length = 0;
    this.texts.length = 0;
    this.rings.length = 0;
    this.flashes.length = 0;
    this.flyers.length = 0;
  }

  private resize = () => {
    if (!this.canvas) return;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
  };

  burst(x: number, y: number, o: BurstOptions) {
    if (!this.ctx) return;
    const n = Math.max(1, Math.round(o.count * this.density * (this.reduced ? 0.35 : 1)));
    const [smin, smax] = o.speed ?? [80, 220];
    const [amin, amax] = o.angle ?? [0, 360];
    for (let i = 0; i < n && this.particles.length < this.maxParticles; i++) {
      const a = ((amin + Math.random() * (amax - amin)) * Math.PI) / 180;
      const sp = (smin + Math.random() * (smax - smin)) * (this.reduced ? 0.4 : 1);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        age: 0,
        life: (o.life ?? 0.7) * (0.7 + Math.random() * 0.6),
        size: Math.max(1, Math.round((o.size ?? 3) * (0.7 + Math.random() * 0.7))),
        color: o.colors[(Math.random() * o.colors.length) | 0],
        glow: o.glow ?? 0,
        gravity: o.gravity ?? 420,
        drag: o.drag ?? 1.5,
        star: Math.random() < (o.stars ?? 0),
      });
    }
    this.start();
  }

  /** Sends `count` coins from (x, y) to (tx, ty) along staggered arcs. */
  fly(x: number, y: number, tx: number, ty: number, count = 1, color = '#ffe44d', size = 5) {
    if (!this.ctx) return;
    for (let i = 0; i < count && this.flyers.length < MAX_FLYERS; i++) {
      const sx = x + (Math.random() - 0.5) * 30;
      const sy = y + (Math.random() - 0.5) * 20;
      this.flyers.push({
        sx,
        sy,
        // Control point bulges sideways so coins swoop rather than slide.
        cx: (sx + tx) / 2 + (Math.random() - 0.5) * 220,
        cy: Math.min(sy, ty) - 40 - Math.random() * 80,
        tx,
        ty,
        age: -i * 0.04,
        life: this.reduced ? 0.25 : 0.5 + Math.random() * 0.15,
        color,
        size,
      });
    }
    this.start();
  }

  ring(x: number, y: number, color: string, radius = 70, life = 0.35, width = 4) {
    if (!this.ctx || this.reduced) return;
    if (this.rings.length >= MAX_RINGS) this.rings.shift();
    this.rings.push({ x, y, age: 0, life, radius, width, color });
    this.start();
  }

  text(x: number, y: number, text: string, o: TextOptions = {}) {
    if (!this.ctx) return;
    if (o.key) {
      const prev = this.texts.find((t) => t.key === o.key && t.age < 0.25);
      if (prev) {
        prev.text = text;
        prev.age = 0;
        prev.x = x;
        prev.y = y;
        return;
      }
    }
    if (this.texts.length >= MAX_TEXTS) this.texts.shift();
    this.texts.push({
      x,
      y,
      age: 0,
      life: o.life ?? 0.9,
      text,
      size: o.size ?? 12,
      color: o.color ?? FX.gold,
      shadow: o.shadow ?? FX.ink,
      rise: this.reduced ? 10 : (o.rise ?? 60),
      pop: this.reduced ? 1 : (o.pop ?? 0.6),
      key: o.key,
    });
    this.start();
  }

  flash(color: string, alpha = 0.35, ms = 220) {
    if (!this.ctx || this.reduced) return;
    this.flashes.push({ age: 0, life: ms / 1000, color, alpha });
    this.start();
  }

  private start() {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    const ctx = this.ctx;
    if (!ctx) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.imageSmoothingEnabled = false;

    // Screen flashes (behind everything else on this layer).
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.age += dt;
      if (f.age >= f.life) {
        this.flashes.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = f.alpha * (1 - f.age / f.life);
      ctx.fillStyle = f.color;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    // Shockwave rings: stepped pixel squares-ish circles.
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.age += dt;
      const k = r.age / r.life;
      if (k >= 1) {
        this.rings.splice(i, 1);
        continue;
      }
      const ease = 1 - (1 - k) * (1 - k);
      const rad = 8 + ease * r.radius;
      const size = Math.max(2, Math.round(r.width * (1 - k * 0.5)));
      // Drawn as a ring of square "pixels" to match the art style.
      const dots = Math.max(16, Math.round((Math.PI * 2 * rad) / (size * 1.6)));
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = r.color;
      for (let d = 0; d < dots; d++) {
        const a = (d / dots) * Math.PI * 2;
        ctx.fillRect(Math.round(r.x + Math.cos(a) * rad - size / 2), Math.round(r.y + Math.sin(a) * rad - size / 2), size, size);
      }
    }

    // Particles: swap-remove dead ones to keep the array dense.
    const ps = this.particles;
    let n = ps.length;
    for (let i = 0; i < n; ) {
      const p = ps[i];
      p.age += dt;
      if (p.age >= p.life) {
        ps[i] = ps[n - 1];
        n--;
        continue;
      }
      const drag = Math.max(0, 1 - p.drag * dt);
      p.vx *= drag;
      p.vy = p.vy * drag + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = p.age / p.life;
      const alpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      const s = p.size;
      const x = Math.round(p.x - s / 2);
      const y = Math.round(p.y - s / 2);
      if (p.glow > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * p.glow * 0.4;
        ctx.fillStyle = p.color;
        ctx.fillRect(x - s, y - s, s * 3, s * 3);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.star) {
        ctx.fillRect(x - s, y, s * 3, s);
        ctx.fillRect(x, y - s, s, s * 3);
      } else ctx.fillRect(x, y, s, s);
      i++;
    }
    ps.length = n;

    // Coins flying to a counter.
    for (let i = this.flyers.length - 1; i >= 0; i--) {
      const f = this.flyers[i];
      f.age += dt;
      if (f.age < 0) continue;
      const k = f.age / f.life;
      if (k >= 1) {
        this.flyers.splice(i, 1);
        this.onArrive?.();
        continue;
      }
      const e = k * k * (3 - 2 * k);
      const u = 1 - e;
      const x = Math.round(u * u * f.sx + 2 * u * e * f.cx + e * e * f.tx);
      const y = Math.round(u * u * f.sy + 2 * u * e * f.cy + e * e * f.ty);
      const s = Math.max(2, Math.round(f.size * (1 - k * 0.4)));
      ctx.globalAlpha = 1;
      ctx.fillStyle = FX.goldDark;
      ctx.fillRect(x - s / 2 + 1, y - s / 2 + 1, s, s);
      ctx.fillStyle = f.color;
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
      ctx.fillStyle = FX.white;
      ctx.fillRect(x - s / 2, y - s / 2, Math.max(1, s / 3), Math.max(1, s / 3));
    }

    // Floating text.
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.age += dt;
      const k = t.age / t.life;
      if (k >= 1) {
        this.texts.splice(i, 1);
        continue;
      }
      const popK = Math.min(1, t.age / 0.12);
      const scale = t.pop + (1 - t.pop) * popK + (t.pop > 1 ? 0 : Math.sin(popK * Math.PI) * 0.15);
      let size = Math.round(t.size * scale);
      const y = Math.round(t.y - t.rise * (1 - (1 - k) * (1 - k)));
      ctx.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
      ctx.font = `${size}px "Press Start 2P", monospace`;
      // Keep every message fully on screen, shrinking it on narrow phones if needed.
      let width = ctx.measureText(t.text).width;
      if (width > this.w - 16) {
        size = Math.max(8, Math.floor((size * (this.w - 16)) / width));
        ctx.font = `${size}px "Press Start 2P", monospace`;
        width = ctx.measureText(t.text).width;
      }
      t.x = Math.min(Math.max(t.x, width / 2 + 8), this.w - width / 2 - 8);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const off = Math.max(2, Math.round(size / 8));
      ctx.fillStyle = t.shadow;
      for (const [dx, dy] of OUTLINE) ctx.fillText(t.text, Math.round(t.x) + dx * off * 0.5, y + dy * off * 0.5);
      ctx.fillText(t.text, Math.round(t.x) + off, y + off);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, Math.round(t.x), y);
    }
    ctx.globalAlpha = 1;

    if (ps.length || this.texts.length || this.rings.length || this.flashes.length || this.flyers.length) this.raf = requestAnimationFrame(this.frame);
    else {
      ctx.clearRect(0, 0, this.w, this.h);
      this.raf = 0;
    }
  };

  /** For tests and diagnostics. */
  stats() {
    return { particles: this.particles.length, texts: this.texts.length, rings: this.rings.length, flyers: this.flyers.length, running: this.raf !== 0 };
  }
}

const OUTLINE: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export const fx = new FxLayer();
