import Phaser from 'phaser';
import type { GameEngine, GameEvent } from '../game/engine';
import { STAGE_BY_ID } from '../data/stages';
import { applyEquipment, buildHeroSheet, HERO_FRAMES, HERO_H, HERO_W, HERO_WALK, STAGE_LOOKS } from './hero';
import { buildProp, buildStage, GROUND_Y, WORLD_H, WORLD_W, type PropId, type StageScene } from './environments';
import { P } from './palette';
import { FX, reducedMotion, shakeAllowed } from '../fx/intensity';
import { fx } from '../fx/FxLayer';
import { audio } from '../audio/audio';
import { money, type Decimal } from '../core/bignum';
import { STATUS_DANGER } from '../data/social';
import { flyToCash } from '../ui/components/FxOverlay';
import { heroAnchor, sceneSignal } from './sceneBus';
import { buildLayeredStage, coneTexture, glowTexture, hasLayeredStage, streakTexture, type Flicker, type LayeredStage, type StageLife, STAGE_LIFE } from './stageLayers';

interface Layers {
  sky: Phaser.GameObjects.TileSprite;
  far: Phaser.GameObjects.TileSprite;
  mid: Phaser.GameObjects.TileSprite;
  moon: Phaser.GameObjects.Image;
  moonHalo: Phaser.GameObjects.Image;
  topFill: Phaser.GameObjects.Rectangle;
  moonX: number;
}

const HERO_X = 84;
const GROUND_RIDES: PropId[] = ['chainless_bicycle', 'secondhand_bicycle', 'motorcycle', 'used_car', 'sports_car'];
const PED_VARIANTS = 6;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * The living pixel-art street. Purely presentational: it reads engine state,
 * reacts to engine events and forwards clicks on scene objects back to the
 * engine (for secrets and golden opportunities).
 */
export class StreetScene extends Phaser.Scene {
  private engine!: GameEngine;
  private reducedMotion = () => reducedMotion(this.engine.state.settings);
  private stageIndex = -1;
  private lookKey = '';
  private rideKey = '';
  private bg?: Phaser.GameObjects.Image;
  private hero!: Phaser.GameObjects.Sprite;
  private ride?: Phaser.GameObjects.Image;
  private jet?: Phaser.GameObjects.Image;
  private pigeon?: Phaser.GameObjects.Sprite;
  private cat?: Phaser.GameObjects.Image;
  private stageObjects: Phaser.GameObjects.GameObject[] = [];
  private coins!: Phaser.GameObjects.Particles.ParticleEmitter;
  private confetti!: Phaser.GameObjects.Particles.ParticleEmitter;
  private opportunities = new Map<number, Phaser.GameObjects.Image>();
  private unsub: (() => void)[] = [];
  private workTimer?: Phaser.Time.TimerEvent;
  private aura?: Phaser.GameObjects.Ellipse;
  /** Visible world rectangle (the view expands beyond the 240×135 stage on wide or tall screens). */
  private view = { left: 0, right: WORLD_W, top: 0, bottom: WORLD_H };
  private idleBusy = false;
  private idleObjs: Phaser.GameObjects.GameObject[] = [];
  private idleTimers: Phaser.Time.TimerEvent[] = [];
  private lastPoke = 0;
  private layers?: Layers;
  private stageTimers: Phaser.Time.TimerEvent[] = [];
  private shadow!: Phaser.GameObjects.Ellipse;
  private parallaxX = 0;
  private pointerAt = -1e9;
  private moths: { obj: Phaser.GameObjects.Rectangle; a: number; s: number; rx: number; ry: number }[] = [];
  private mothCenter = { x: 0, y: 0 };

  constructor() {
    super('street');
  }

  init(data: { engine: GameEngine }) {
    this.engine = data.engine;
  }

  create() {
    this.makeStaticTextures();
    this.shadow = this.add.ellipse(HERO_X, GROUND_Y + 1, 16, 3, 0x000000, 0.35).setDepth(9.5);
    this.hero = this.add.sprite(HERO_X, GROUND_Y + 1, 'hero_0', 0).setOrigin(0.5, 1).setDepth(10);
    this.input.on('pointermove', () => (this.pointerAt = this.time.now));
    // Soft vignette pulls the eye to the middle of the street (WebGL only).
    if (this.game.renderer.type === Phaser.WEBGL) this.cameras.main.postFX?.addVignette(0.5, 0.5, 0.95, 0.28);
    this.hero.setInteractive({ useHandCursor: true, pixelPerfect: false });
    this.hero.on('pointerdown', () => {
      this.engine.interact('hero');
      this.cancelIdle();
      this.hop(this.hero);
      if (Date.now() - this.lastPoke > 2500) {
        this.lastPoke = Date.now();
        sceneSignal('poke');
      }
    });

    this.coins = this.add.particles(0, 0, 'coin', {
      speed: { min: 40, max: 90 },
      angle: { min: 230, max: 310 },
      gravityY: 220,
      lifespan: 700,
      scale: 1,
      emitting: false,
    }).setDepth(20);
    this.confetti = this.add.particles(0, 0, 'confetti', {
      speed: { min: 30, max: 120 },
      angle: { min: 200, max: 340 },
      gravityY: 120,
      lifespan: 1600,
      tint: [0xffd166, 0xff7aa8, 0x3fcfbd, 0x7d55c7, 0xf29b4b, 0xfdfbf7],
      rotate: { min: 0, max: 360 },
      emitting: false,
    }).setDepth(30);

    this.unsub.push(this.engine.onEvent((e) => this.onGameEvent(e)));
    const unsubscribe = () => {
      this.unsub.forEach((u) => u());
      this.unsub = [];
    };
    // A destroyed game (remount, hot reload) never shuts its scenes down, so listen for both.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsubscribe);
    this.events.once(Phaser.Scenes.Events.DESTROY, unsubscribe);
    this.syncWorld(true);

    // Ambient life
    this.time.addEvent({ delay: 2200, loop: true, callback: () => this.ambient() });
    this.time.addEvent({ delay: 1800, loop: true, callback: () => this.idleBehaviour() });
    const pedLoop = () => this.time.delayedCall(rand(4000, 9000), () => { this.spawnPedestrian(); pedLoop(); });
    pedLoop();
    const billLoop = () => this.time.delayedCall(rand(16000, 32000), () => { this.spawnBill(); billLoop(); });
    billLoop();

    // Any tap on the street leaves a ripple.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length || this.reducedMotion()) return;
      this.ripple(p.worldX, p.worldY);
    });
    this.scale.on('resize', () => this.layoutView());
    this.layoutView();
  }

  private makeStaticTextures() {
    const props: PropId[] = ['chainless_bicycle', 'secondhand_bicycle', 'motorcycle', 'used_car', 'sports_car', 'private_jet', 'pigeon', 'pigeon2', 'cat', 'briefcase', 'coin', 'yacht'];
    for (const id of props) if (!this.textures.exists(id)) this.textures.addCanvas(id, buildProp(id));
    if (!this.textures.exists('confetti')) {
      const c = document.createElement('canvas');
      c.width = 2;
      c.height = 2;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 2, 2);
      this.textures.addCanvas('confetti', c);
    }
    if (!this.textures.exists('drift_cloud')) {
      // Same stepped cloud silhouette as the baked skies, as a sprite that can drift.
      const c = document.createElement('canvas');
      c.width = 24;
      c.height = 8;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 3, 22, 4);
      ctx.fillRect(4, 1, 9, 4);
      ctx.fillRect(11, 0, 7, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, 6, 22, 1);
      this.textures.addCanvas('drift_cloud', c);
    }
    if (!this.textures.exists('bird')) {
      const c = document.createElement('canvas');
      c.width = 10;
      c.height = 3;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#10152e';
      for (const [x, y] of [[0, 0], [1, 1], [2, 2], [3, 1], [4, 2], [5, 2], [6, 1], [7, 2], [8, 1], [9, 0]]) ctx.fillRect(x, y, 1, 1);
      this.textures.addCanvas('bird', c);
    }
    if (!this.textures.exists('bill')) {
      const c = document.createElement('canvas');
      c.width = 9;
      c.height = 5;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#2f8f4e';
      ctx.fillRect(0, 0, 9, 5);
      ctx.fillStyle = '#7fd68f';
      ctx.fillRect(1, 1, 7, 3);
      ctx.fillStyle = '#2f8f4e';
      ctx.fillRect(4, 1, 1, 3);
      this.textures.addCanvas('bill', c);
    }
    for (let i = 0; i < PED_VARIANTS; i++) {
      const key = `ped_${i}`;
      if (this.textures.exists(key)) continue;
      const tex = this.textures.addCanvas(key, buildPedestrian(i))!;
      tex.add(0, 0, 0, 0, 9, 18);
      tex.add(1, 0, 9, 0, 9, 18);
    }
    const canvases: [string, () => HTMLCanvasElement][] = [
      ['glow', glowTexture],
      ['cone', coneTexture],
      ['streak', streakTexture],
      ['drop', () => solid(1, 3, '#a9bde8')],
      ['splash', () => solid(3, 1, '#c8d6f2')],
    ];
    for (const [k, make] of canvases) if (!this.textures.exists(k)) this.textures.addCanvas(k, make());
    if (!this.textures.exists('puff')) {
      const c = document.createElement('canvas');
      c.width = 4;
      c.height = 4;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = P.concreteLight;
      ctx.fillRect(1, 0, 2, 4);
      ctx.fillRect(0, 1, 4, 2);
      this.textures.addCanvas('puff', c);
    }
  }

  private heroTexture(): string {
    const s = this.engine.state;
    const stage = STAGE_BY_ID[this.engine.rank.stage].index;
    const look = applyEquipment(STAGE_LOOKS[stage], s.equipped);
    const key = 'hero_' + hash(JSON.stringify(look));
    if (!this.textures.exists(key)) {
      const sheet = buildHeroSheet(look);
      const tex = this.textures.addCanvas(key, sheet)!;
      for (let f = 0; f < HERO_FRAMES; f++) tex.add(f, 0, f * HERO_W, 0, HERO_W, HERO_H + 4);
    }
    return key;
  }

  /** Rebuilds the environment/character when stage or equipment changed. */
  private syncWorld(force = false) {
    const s = this.engine.state;
    const stage = STAGE_BY_ID[this.engine.rank.stage].index;
    if (force || stage !== this.stageIndex) this.buildStage(stage, !force);

    const key = this.heroTexture();
    if (key !== this.lookKey) {
      this.lookKey = key;
      this.hero.setTexture(key, 0);
    }

    const rideId = s.equipped.ride ?? '';
    if (rideId !== this.rideKey) {
      this.rideKey = rideId;
      this.ride?.destroy();
      this.ride = undefined;
      if (GROUND_RIDES.includes(rideId as PropId)) {
        this.ride = this.add.image(HERO_X - 26, GROUND_Y + 1, rideId).setOrigin(0.5, 1).setDepth(9);
      }
    }

    const hasCat = !!s.items.street_cat;
    if (hasCat && !this.cat) {
      this.cat = this.add.image(HERO_X + 22, GROUND_Y + 1, 'cat').setOrigin(0.5, 1).setDepth(11).setInteractive({ useHandCursor: true });
      this.cat.on('pointerdown', () => {
        this.engine.interact('cat');
        this.hop(this.cat!);
        this.burstHearts(this.cat!.x, this.cat!.y - 10);
      });
    } else if (!hasCat && this.cat) {
      this.cat.destroy();
      this.cat = undefined;
    }
  }

  private buildStage(index: number, animate: boolean) {
    this.stageIndex = index;
    const key = `stage_${index}`;
    const layeredKey = `${key}_layered`;
    let layout: StageScene;
    let layered: LayeredStage | undefined;
    if (hasLayeredStage(index)) {
      layered = this.registry.get(layeredKey) as LayeredStage | undefined;
      if (!layered) {
        layered = buildLayeredStage(index)!;
        this.textures.addCanvas(key, layered.base);
        for (const part of ['sky', 'far', 'mid', 'moon'] as const) this.textures.addCanvas(`${key}_${part}`, layered[part]);
        if (layered.neon) this.textures.addCanvas(`${key}_neon`, layered.neon.canvas);
        this.registry.set(layeredKey, layered);
      }
      layout = layered.scene;
    } else if (!this.textures.exists(key)) {
      const built = buildStage(index);
      this.textures.addCanvas(key, built.canvas);
      this.registry.set(key, built.scene);
      layout = built.scene;
    } else layout = this.registry.get(key) as StageScene;

    const old = this.bg;
    this.bg = this.add.image(0, 0, key).setOrigin(0, 0).setDepth(0);
    if (old) {
      if (animate && !this.reducedMotion()) {
        this.bg.setAlpha(0);
        this.tweens.add({ targets: this.bg, alpha: 1, duration: 900, onComplete: () => old.destroy() });
      } else old.destroy();
    }

    this.stageObjects.forEach((o) => {
      this.tweens.killTweensOf(o);
      o.destroy();
    });
    this.stageObjects = [];
    this.stageTimers.forEach((t) => t.remove());
    this.stageTimers = [];
    this.moths = [];
    this.layers = undefined;
    this.pigeon = undefined;
    this.aura = undefined;
    this.extendBackground(key, layout, !!layered);
    if (layered) this.addLayers(key, layered);
    else if (STAGE_LIFE[index]) this.addLife(key, STAGE_LIFE[index]!, layout.sky);

    // Sky object (sun / moon / earth) — a secret hotspot.
    const skyZone = this.add.zone(layout.sky.x, layout.sky.y, 22, 22).setInteractive({ useHandCursor: true }).setDepth(5);
    skyZone.on('pointerdown', () => {
      this.engine.interact('sky');
      this.sparkle(layout.sky.x, layout.sky.y);
    });
    this.stageObjects.push(skyZone);

    for (const h of layout.hotspots) {
      const z = this.add.zone(h.x + h.w / 2, h.y + h.h / 2, h.w, h.h).setInteractive({ useHandCursor: true }).setDepth(5);
      z.on('pointerdown', () => {
        this.engine.interact(h.id);
        this.sparkle(h.x + h.w / 2, h.y + h.h / 2);
      });
      this.stageObjects.push(z);
    }

    if (layout.pigeon) {
      const pg = this.add.sprite(layout.pigeon.x, layout.pigeon.y, 'pigeon').setOrigin(0.5, 1).setDepth(8).setInteractive({ useHandCursor: true });
      pg.on('pointerdown', () => {
        this.engine.interact('pigeon');
        this.hop(pg, 6);
        pg.setFlipX(!pg.flipX);
      });
      this.pigeon = pg;
      this.stageObjects.push(pg);
    }

    for (const sm of layout.smoke ?? []) {
      const em = this.add.particles(sm.x, sm.y, 'puff', {
        speedY: { min: -10, max: -6 },
        speedX: { min: 2, max: 6 },
        lifespan: 3000,
        alpha: { start: 0.7, end: 0 },
        scale: { start: 1, end: 2.2 },
        frequency: 500,
      }).setDepth(2);
      this.stageObjects.push(em);
    }
    for (const sp of layout.sparkles ?? []) {
      const star = this.add.rectangle(sp.x, sp.y, 1, 1, 0xffffff).setDepth(3);
      this.tweens.add({ targets: star, alpha: { from: 0, to: 1 }, duration: 600, yoyo: true, repeat: -1, delay: Math.random() * 1500, repeatDelay: 1200 });
      this.stageObjects.push(star);
    }
    this.addStageAtmosphere(index);
  }

  /**
   * Richer classes get richer air: drifting motes, falling gold glints, cosmic
   * dust, and a glowing aura behind the hero from Wealth upwards.
   */
  private addStageAtmosphere(index: number) {
    const rm = this.reducedMotion();
    // Drifting clouds keep the sky from being a still picture.
    // Only where the sky is open: in the tower stages a cloud would pass in front of the buildings.
    if ([0, 1, 3, 6].includes(index) && !rm) {
      const night = index === 0;
      for (let i = 0; i < 3; i++) {
        const scale = i === 0 ? 2 : 1;
        const cl = this.add.image(rand(this.view.left, this.view.right), 3 + i * 7 + Math.random() * 4, 'drift_cloud').setOrigin(0, 0).setScale(scale).setDepth(this.layers ? -2.5 : 1)
          .setAlpha(night ? 0.22 : 0.75 - i * 0.12).setTint(night ? 0xa855f7 : index >= 5 ? 0xfff6c8 : 0xffffff);
        const speed = 3 + i * 2 + Math.random() * 2;
        const travel = () => {
          const end = this.view.right + 10;
          this.tweens.add({ targets: cl, x: end, duration: (Math.max(10, end - cl.x) / speed) * 1000, onComplete: () => { if (!cl.active) return; cl.x = this.view.left - 24 * scale - 10; travel(); } });
        };
        travel();
        this.stageObjects.push(cl);
      }
    }
    const looks: Record<number, { tint: number[]; up: boolean; freq: number; speed: number } | undefined> = {
      3: { tint: [0xffffff, 0x9fe8ff], up: true, freq: 900, speed: 6 },
      4: { tint: [0xc59bff, 0xffd23f], up: true, freq: 420, speed: 8 },
      5: { tint: [0xffd23f, 0xfff3a3, 0xffffff], up: false, freq: 260, speed: 22 },
      6: { tint: [0xff4fa3, 0xffd23f, 0xa259ff], up: true, freq: 220, speed: 14 },
      7: { tint: [0x29f0ff, 0xffffff, 0xa259ff], up: false, freq: 160, speed: 10 },
    };
    const look = looks[index];
    if (look && !rm) {
      const em = this.add.particles(0, 0, 'confetti', {
        x: { min: 0, max: WORLD_W },
        y: look.up ? { min: GROUND_Y - 10, max: GROUND_Y } : { min: -4, max: 0 },
        speedY: look.up ? { min: -look.speed * 1.5, max: -look.speed } : { min: look.speed, max: look.speed * 1.6 },
        speedX: { min: -4, max: 4 },
        lifespan: look.up ? 5000 : 7000,
        alpha: { start: 0.9, end: 0 },
        scale: { min: 0.5, max: 1 },
        tint: look.tint,
        frequency: look.freq,
        blendMode: Phaser.BlendModes.ADD,
      }).setDepth(6);
      this.stageObjects.push(em);
    }
    if (index >= 4) {
      const stage = STAGE_BY_ID[this.engine.rank.stage];
      const color = Phaser.Display.Color.HexStringToColor(stage.accent).color;
      const aura = this.add.ellipse(HERO_X, GROUND_Y - 16, 34 + (index - 4) * 6, 46 + (index - 4) * 6, color, 0.22).setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
      this.aura = aura;
      if (!rm) this.tweens.add({ targets: aura, alpha: { from: 0.12, to: 0.32 }, scale: { from: 0.95, to: 1.08 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.stageObjects.push(aura);
    }
  }

  private ambient() {
    // A small flock now and then in the daytime classes.
    const st = this.stageIndex;
    if (st >= 1 && st <= 6 && !this.reducedMotion() && Math.random() < 0.18) {
      const y = 10 + Math.random() * 30;
      const dir = Math.random() < 0.5 ? 1 : -1;
      for (let i = 0; i < 3; i++) {
        const span = this.view.right - this.view.left;
        const b = this.add.image(dir > 0 ? this.view.left - 12 - i * 9 : this.view.right + 12 + i * 9, y + (i % 2) * 4, 'bird').setDepth(4).setFlipX(dir < 0);
        this.tweens.add({ targets: b, x: b.x + dir * (span + 60), duration: 6000 * (span / WORLD_W), onComplete: () => { this.tweens.killTweensOf(b); b.destroy(); } });
        this.tweens.add({ targets: b, scaleY: 0.4, duration: 180, yoyo: true, repeat: -1 });
      }
    }
    if (this.pigeon && Math.random() < 0.5) {
      this.pigeon.setTexture(this.pigeon.texture.key === 'pigeon' ? 'pigeon2' : 'pigeon');
      if (Math.random() < 0.3) this.pigeon.setFlipX(!this.pigeon.flipX);
    }
    if (this.engine.state.equipped.ride === 'private_jet' && !this.jet && !this.reducedMotion()) {
      this.jet = this.add.image(this.view.left - 50, 18 + Math.random() * 20, 'private_jet').setDepth(4);
      this.tweens.add({ targets: this.jet, x: this.view.right + 50, duration: 7000, onComplete: () => { this.jet?.destroy(); this.jet = undefined; } });
    }
    // idle breathing
    if (!this.idleBusy && (!this.workTimer || this.workTimer.getProgress() >= 1)) this.hero.setFrame(this.hero.frame.name === '1' ? 0 : 1);
  }

  private onGameEvent(e: GameEvent) {
    switch (e.type) {
      case 'click': {
        this.cancelIdle();
        this.hero.setFrame(2);
        this.workTimer?.remove();
        this.workTimer = this.time.delayedCall(70, () => {
          this.hero.setFrame(3);
          this.workTimer = this.time.delayedCall(110, () => this.hero.setFrame(0));
        });
        const stageIdx = STAGE_BY_ID[this.engine.rank.stage].index;
        const n = (e.crit ? 10 + stageIdx * 2 : 1 + Math.min(3, Math.floor(e.combo / 15))) + (stageIdx >= 4 ? 1 : 0);
        this.coins.explode(n, this.hero.x + 6, GROUND_Y - 22);
        break;
      }
      case 'promotion':
        this.syncWorld();
        this.cheer(e.stageChanged ? 2400 : 1000);
        this.confetti.explode(e.stageChanged ? 90 : 30, HERO_X, GROUND_Y - 30);
        if (e.stageChanged && !this.reducedMotion()) {
          this.cameras.main.flash(500, 255, 241, 201);
          if (shakeAllowed(this.engine.state.settings)) this.cameras.main.shake(300, 0.01);
        }
        break;
      case 'purchase':
      case 'combo':
      case 'secret':
        this.syncWorld();
        if (e.type !== 'purchase') this.confetti.explode(25, HERO_X, GROUND_Y - 30);
        break;
      case 'prestige':
        this.syncWorld(true);
        if (!this.reducedMotion()) this.cameras.main.flash(1200, 255, 255, 255);
        this.cheer(2000);
        break;
      case 'opportunitySpawn':
        this.spawnOpportunity(e.id, e.x * WORLD_W, e.y * WORLD_H, e.lifetime);
        break;
      case 'opportunityExpire': {
        const o = this.opportunities.get(e.id);
        if (o) {
          this.opportunities.delete(e.id);
          this.tweens.add({ targets: o, alpha: 0, duration: 400, onComplete: () => o.destroy() });
        }
        break;
      }
      case 'opportunityCollect': {
        const o = this.opportunities.get(e.id);
        if (o) {
          this.opportunities.delete(e.id);
          this.coins.explode(16, o.x, o.y);
          this.confetti.explode(20, o.x, o.y);
          o.destroy();
        }
        break;
      }
      case 'ability':
        this.cheer(600);
        break;
    }
  }

  private spawnOpportunity(id: number, x: number, y: number, lifetime: number) {
    const img = this.add.image(Math.round(x), Math.round(y), 'briefcase').setDepth(25).setInteractive({ useHandCursor: true });
    img.setAlpha(0);
    this.tweens.add({ targets: img, alpha: 1, duration: 300 });
    this.tweens.add({ targets: img, y: img.y - 4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    // blink before it disappears
    this.time.delayedCall(Math.max(0, lifetime * 1000 - 3000), () => {
      if (img.active) this.tweens.add({ targets: img, alpha: 0.3, duration: 150, yoyo: true, repeat: 9 });
    });
    img.on('pointerdown', () => this.engine.collectOpportunity(id));
    this.opportunities.set(id, img);
  }

  private cheer(ms: number) {
    this.cancelIdle();
    this.workTimer?.remove();
    this.hero.setFrame(4);
    let toggle = false;
    const ev = this.time.addEvent({ delay: 160, repeat: Math.floor(ms / 160), callback: () => { toggle = !toggle; this.hero.setFrame(toggle ? 5 : 4); } });
    this.workTimer = this.time.delayedCall(ms, () => { ev.remove(); this.hero.setFrame(0); });
  }

  private hop(obj: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject, h = 3) {
    if (this.reducedMotion()) return;
    const baseY = (obj as unknown as { y: number }).y;
    this.tweens.add({ targets: obj, y: baseY - h, duration: 90, yoyo: true, onComplete: () => ((obj as unknown as { y: number }).y = baseY) });
  }

  private sparkle(x: number, y: number) {
    this.confetti.explode(6, x, y);
  }

  private burstHearts(x: number, y: number) {
    const heart = this.add.text(x, y, '♥', { fontFamily: 'monospace', fontSize: '8px', color: '#ff7aa8' }).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: heart, y: y - 12, alpha: 0, duration: 900, onComplete: () => heart.destroy() });
  }

  // ——— View ———

  /**
   * Fits the camera to the frame. Wide screens see more street to the sides,
   * tall (phone) screens get a gentle zoom on the hero's corner of the street.
   */
  private layoutView() {
    const { width: w, height: h } = this.scale.gameSize;
    const cam = this.cameras.main;
    const zoom = h > WORLD_H * 1.15 ? Phaser.Math.Clamp((h / WORLD_H) * 0.72, 1, 1.45) : 1;
    cam.setZoom(zoom);
    const visW = w / zoom;
    const visH = h / zoom;
    const cx = visW >= WORLD_W ? WORLD_W / 2 : Phaser.Math.Clamp(105, visW / 2, WORLD_W - visW / 2);
    const cy = WORLD_H / 2 - Math.max(0, visH - WORLD_H) * 0.2;
    cam.centerOn(cx, cy);
    this.view = { left: cx - visW / 2, right: cx + visW / 2, top: cy - visH / 2, bottom: cy + visH / 2 };
    this.layoutLayers();
  }

  /** Stretches the parallax strips across whatever part of the world is visible. */
  private layoutLayers() {
    const L = this.layers;
    if (!L) return;
    const x = Math.floor(this.view.left) - 16;
    const w = Math.ceil(this.view.right - this.view.left) + 32;
    for (const t of [L.sky, L.far, L.mid]) {
      t.setPosition(x, 0);
      t.setSize(w, WORLD_H);
    }
    L.topFill.setPosition(x, Math.min(0, Math.floor(this.view.top) - 2)).setSize(w, Math.max(0, -Math.floor(this.view.top) + 2));
    this.applyParallax();
  }

  /** Offsets the far layers against the street; nearer layers move less. */
  private applyParallax() {
    const L = this.layers;
    if (!L) return;
    const d = this.parallaxX * 5;
    L.sky.tilePositionX = L.sky.x - Math.round(d * 0.95);
    L.far.tilePositionX = L.far.x - Math.round(d * 0.7);
    L.mid.tilePositionX = L.mid.x - Math.round(d * 0.4);
    L.moon.x = L.moonX + Math.round(d * 0.9);
    L.moonHalo.x = L.moon.x;
  }

  /** Sky, skyline and rooftops behind the alley, plus its live lights and weather. */
  private addLayers(key: string, st: LayeredStage) {
    const rm = this.reducedMotion();
    const skyTop = (st.sky.getContext('2d')!.getImageData(0, 0, 1, 1).data);
    const haloScale = st.halo ? (st.halo.r * 2) / 32 : 1.6;
    const L: Layers = {
      topFill: this.add.rectangle(0, 0, 1, 1, (skyTop[0] << 16) | (skyTop[1] << 8) | skyTop[2]).setOrigin(0, 0).setDepth(-4),
      sky: this.add.tileSprite(0, 0, WORLD_W, WORLD_H, `${key}_sky`).setOrigin(0, 0).setDepth(-4),
      moonHalo: this.add.image(st.scene.sky.x, st.scene.sky.y, 'glow').setScale(haloScale).setTint(st.halo?.color ?? 0xfff1c9).setAlpha(0.2).setBlendMode(Phaser.BlendModes.ADD).setDepth(-3.5),
      moon: this.add.image(st.scene.sky.x, st.scene.sky.y, `${key}_moon`).setDepth(-3.4),
      far: this.add.tileSprite(0, 0, WORLD_W, WORLD_H, `${key}_far`).setOrigin(0, 0).setDepth(-2),
      mid: this.add.tileSprite(0, 0, WORLD_W, WORLD_H, `${key}_mid`).setOrigin(0, 0).setDepth(-1),
      moonX: st.scene.sky.x,
    };
    this.layers = L;
    this.stageObjects.push(L.topFill, L.sky, L.moonHalo, L.moon, L.far, L.mid);
    const glowA = st.halo ? [0.22, 0.38] : [0.14, 0.26];
    if (!rm) this.tweens.add({ targets: L.moonHalo, alpha: { from: glowA[0], to: glowA[1] }, scale: { from: haloScale * 0.94, to: haloScale * 1.07 }, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.layoutLayers();

    // Far windows switch on and off: the city is awake.
    const farTex = this.textures.get(`${key}_far`) as Phaser.Textures.CanvasTexture;
    const fctx = st.far.getContext('2d')!;
    if (!rm && st.farWindows.length) this.stageTimers.push(this.time.addEvent({ delay: 900, loop: true, callback: () => {
      const w = st.farWindows[Math.floor(Math.random() * st.farWindows.length)];
      w.lit = !w.lit && Math.random() < 0.6;
      fctx.fillStyle = w.lit ? st.farLit : st.farWall;
      fctx.fillRect(w.x, w.y, 1, 1);
      farTex.refresh();
    } }));

    this.addLife(key, st, st.scene.sky);
  }

  /** Live lights, steam, weather and passing traffic for any stage. */
  private addLife(key: string, st: StageLife & { neon?: LayeredStage['neon'] }, skyPos: { x: number; y: number }) {
    const rm = this.reducedMotion();
    // Layered stages put the halo on their sun/moon sprite instead (addLayers).
    if (st.halo && !this.layers) {
      const h = this.add.image(skyPos.x, skyPos.y, 'glow').setTint(st.halo.color).setAlpha(0.3).setScale((st.halo.r * 2) / 32).setBlendMode(Phaser.BlendModes.ADD).setDepth(0.5);
      this.stageObjects.push(h);
      if (!rm) this.tweens.add({ targets: h, alpha: { from: 0.22, to: 0.38 }, scale: { from: (st.halo.r * 1.9) / 32, to: (st.halo.r * 2.2) / 32 }, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    // Lights grouped by flicker style, so a lamp's bulb, pool and reflection flicker together.
    const groups = new Map<Flicker, { obj: Phaser.GameObjects.Image; a: number }[]>();
    const join = (f: Flicker | undefined, obj: Phaser.GameObjects.Image, a: number) => {
      this.stageObjects.push(obj);
      if (!f) return;
      if (!groups.has(f)) groups.set(f, []);
      groups.get(f)!.push({ obj, a });
    };
    // The mirrored side copies of a layered stage carry the same lamps, so they get the same lights.
    const xs = (x: number, f?: Flicker) => (this.layers && f !== 'neon' ? [x, -x, 2 * WORLD_W - x] : [x]);
    for (const l of st.lights) for (const x of xs(l.x, l.flicker)) {
      const g = this.add.image(x, l.y, 'glow').setTint(l.color).setAlpha(l.alpha).setBlendMode(Phaser.BlendModes.ADD).setDepth(8)
        .setScale((l.r * 2) / 32, ((l.r * 2) / 32) * (l.squash ?? 1));
      join(l.flicker, g, l.alpha);
    }
    for (const rf of st.reflections) for (const x of xs(rf.x, rf.flicker)) {
      const s = this.add.image(x, rf.y, 'streak').setOrigin(0.5, 0).setTint(rf.color).setAlpha(rf.alpha).setBlendMode(Phaser.BlendModes.ADD).setDepth(1);
      if (!rm) this.tweens.add({ targets: s, scaleX: { from: 0.8, to: 1.5 }, duration: 700 + Math.random() * 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      join(rf.flicker, s, rf.alpha);
    }
    if (st.cone) for (const x of xs(st.cone.x)) {
      const c = this.add.image(x, st.cone.y, 'cone').setOrigin(0.5, 0).setTint(0xffd166).setAlpha(st.cone.alpha).setBlendMode(Phaser.BlendModes.ADD).setDepth(8);
      join('lamp', c, st.cone.alpha);
    }
    if (st.neon) {
      const n = this.add.image(st.neon.x, st.neon.y, `${key}_neon`).setDepth(1);
      if (this.game.renderer.type === Phaser.WEBGL) n.preFX?.addGlow(0xff4fa3, 2, 0, false, 0.1, 6);
      join('neon', n, 1);
    }
    this.runFlickers(groups, rm);

    for (const sm of st.steam) {
      const em = this.add.particles(sm.x, sm.y, 'puff', {
        x: { min: -6, max: 6 },
        speedY: { min: -9, max: -5 },
        speedX: { min: -2, max: 3 },
        lifespan: 2600,
        alpha: { start: 0.28, end: 0 },
        scale: { start: 1, end: 2.6 },
        tint: 0xc9bfe0,
        frequency: rm ? -1 : 700,
      }).setDepth(9);
      this.stageObjects.push(em);
    }
    if (st.moths && !rm) {
      this.mothCenter = st.moths;
      for (let i = 0; i < 3; i++) {
        const m = this.add.rectangle(st.moths.x, st.moths.y, 1, 1, 0xfff1c9).setDepth(9);
        this.moths.push({ obj: m, a: Math.random() * 6.28, s: 0.004 + Math.random() * 0.004, rx: 5 + Math.random() * 5, ry: 2 + Math.random() * 3 });
        this.stageObjects.push(m);
      }
    }
    if (st.drip && !rm) {
      const d = st.drip;
      this.stageTimers.push(this.time.addEvent({ delay: 2600, loop: true, callback: () => {
        const drop = this.add.image(d.x, d.y, 'drop').setDepth(2).setTint(0x9fb8e8);
        this.stageObjects.push(drop);
        this.tweens.add({ targets: drop, y: GROUND_Y - 6, duration: 520, ease: 'Quad.in', onComplete: () => {
          drop.destroy();
          this.splashAt(d.x, GROUND_Y - 6);
        } });
      } }));
    }
    if (st.rain && !rm) this.startWeather();
    if (st.traffic && !rm) {
      const kind = st.traffic;
      const carLoop = () => this.stageTimers.push(this.time.delayedCall(rand(9000, 22000), () => { this.passingCar(kind); carLoop(); }));
      carLoop();
    }
  }

  private runFlickers(groups: Map<Flicker, { obj: Phaser.GameObjects.Image; a: number }[]>, rm: boolean) {
    const set = (list: { obj: Phaser.GameObjects.Image; a: number }[], k: number) => list.forEach(({ obj, a }) => obj.active && obj.setAlpha(a * k));
    if (rm) return;
    const candle = groups.get('candle');
    if (candle) this.stageTimers.push(this.time.addEvent({ delay: 110, loop: true, callback: () => set(candle, 0.7 + Math.random() * 0.4) }));
    const pulse = groups.get('pulse');
    if (pulse) pulse.forEach(({ obj, a }) => this.tweens.add({ targets: obj, alpha: { from: a * 0.75, to: a }, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.inOut' }));
    // Lamp: steady, with the odd stutter of a tired bulb.
    const lamp = groups.get('lamp');
    if (lamp) {
      const stutter = () => this.stageTimers.push(this.time.delayedCall(rand(4000, 11000), () => {
        const seq = [0.25, 1, 0.4, 1, 0.15, 1];
        seq.forEach((k, i) => this.stageTimers.push(this.time.delayedCall(i * 70, () => set(lamp, k))));
        stutter();
      }));
      stutter();
    }
    // Neon: a buzzing sign that drops out now and then.
    const neon = groups.get('neon');
    if (neon) {
      const buzz = () => this.stageTimers.push(this.time.delayedCall(rand(3000, 9000), () => {
        const seq = Math.random() < 0.3 ? [0.1, 1, 0.1, 0.1, 0.1, 1] : [0.2, 1, 0.5, 1];
        seq.forEach((k, i) => this.stageTimers.push(this.time.delayedCall(i * 90, () => set(neon, k))));
        buzz();
      }));
      buzz();
    }
  }

  private splashAt(x: number, y: number) {
    const s = this.add.image(x, y, 'splash').setDepth(13).setAlpha(0.8);
    this.tweens.add({ targets: s, scaleX: 2.5, alpha: 0, y: y - 1, duration: 260, onComplete: () => s.destroy() });
  }

  /** Drizzle that comes and goes, with splashes on the pavement. */
  private startWeather() {
    const span = () => ({ min: this.view.left - 20, max: this.view.right + 30 });
    const rain = this.add.particles(0, 0, 'drop', {
      x: { onEmit: () => rand(span().min, span().max) },
      y: { onEmit: () => this.view.top - 6 },
      speedY: { min: 170, max: 210 },
      speedX: { min: -34, max: -26 },
      lifespan: { min: 650, max: 1000 },
      alpha: { min: 0.35, max: 0.7 },
      frequency: 14,
      emitting: false,
    }).setDepth(26);
    const splash = this.add.particles(0, 0, 'splash', {
      x: { onEmit: () => rand(span().min, span().max) },
      y: { min: GROUND_Y - 6, max: WORLD_H - 2 },
      lifespan: 220,
      alpha: { start: 0.7, end: 0 },
      scaleX: { start: 0.6, end: 2.2 },
      frequency: 45,
      emitting: false,
    }).setDepth(13);
    this.stageObjects.push(rain, splash);
    let raining = Math.random() < 0.6;
    const apply = () => {
      if (raining) {
        rain.start();
        splash.start();
      } else {
        rain.stop();
        splash.stop();
      }
    };
    apply();
    const cycle = () => this.stageTimers.push(this.time.delayedCall(raining ? rand(30000, 50000) : rand(25000, 45000), () => {
      raining = !raining;
      apply();
      cycle();
    }));
    cycle();
  }

  /** A car rolls past with its headlights on, washing light along the road. */
  private passingCar(kind: NonNullable<StageLife['traffic']>) {
    const dir = Math.random() < 0.5 ? 1 : -1;
    if (kind === 'yacht' || kind === 'comet') return this.passingFar(kind, dir);
    const night = kind === 'nightCar';
    const from = dir > 0 ? this.view.left - 50 : this.view.right + 50;
    const to = dir > 0 ? this.view.right + 50 : this.view.left - 50;
    const model = this.stageIndex >= 4 ? 'sports_car' : 'used_car';
    const car = this.add.image(from, WORLD_H + 1, model).setOrigin(0.5, 1).setFlipX(dir < 0).setDepth(12);
    if (night) car.setTint(0x6a5a80);
    const beam = this.add.image(from, WORLD_H - 8, 'glow').setScale(2.2, 0.5).setTint(0xfff1c9).setAlpha(night ? 0.5 : 0).setBlendMode(Phaser.BlendModes.ADD).setDepth(12);
    const tail = this.add.image(from, WORLD_H - 8, 'glow').setScale(0.35).setTint(0xff3b3b).setAlpha(night ? 0.8 : 0).setBlendMode(Phaser.BlendModes.ADD).setDepth(12);
    this.stageObjects.push(car, beam, tail);
    this.tweens.add({
      targets: car,
      x: to,
      duration: rand(3200, 4400),
      onUpdate: () => {
        beam.x = car.x + dir * 34;
        tail.x = car.x - dir * 19;
      },
      onComplete: () => [car, beam, tail].forEach((o) => o.destroy()),
    });
  }

  /** Traffic on the horizon: a yacht crossing the sea, or a comet across space. */
  private passingFar(kind: 'yacht' | 'comet', dir: number) {
    const from = dir > 0 ? this.view.left - 50 : this.view.right + 50;
    const to = dir > 0 ? this.view.right + 50 : this.view.left - 50;
    if (kind === 'yacht') {
      const y = rand(92, 104);
      const boat = this.add.image(from, y, 'yacht').setOrigin(0.5, 1).setFlipX(dir < 0).setDepth(1);
      const wake = this.add.particles(0, 0, 'splash', { follow: boat, followOffset: { x: -dir * 22, y: -1 }, lifespan: 900, speedX: { min: -dir * 6, max: -dir * 2 }, alpha: { start: 0.8, end: 0 }, scaleX: { start: 1, end: 3 }, frequency: 120 }).setDepth(1);
      this.stageObjects.push(boat, wake);
      this.tweens.add({ targets: boat, y: y - 1, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: boat, x: to, duration: rand(14000, 20000), onComplete: () => { this.tweens.killTweensOf(boat); boat.destroy(); wake.destroy(); } });
      return;
    }
    const y0 = rand(4, 30);
    const head = this.add.image(from, y0, 'glow').setScale(0.4).setTint(0xfff6b0).setBlendMode(Phaser.BlendModes.ADD).setDepth(0.6);
    const trail = this.add.particles(0, 0, 'confetti', { follow: head, lifespan: 700, alpha: { start: 0.8, end: 0 }, scale: { start: 1, end: 0.3 }, tint: [0x29f0ff, 0xffffff, 0xa259ff], frequency: 25, blendMode: Phaser.BlendModes.ADD }).setDepth(0.6);
    this.stageObjects.push(head, trail);
    this.tweens.add({ targets: head, x: to, y: y0 + rand(20, 40), duration: rand(1800, 2600), ease: 'Sine.in', onComplete: () => { head.destroy(); this.time.delayedCall(800, () => trail.destroy()); } });
  }

  /** Mirrored copies of the stage to the sides and sky/road colour above and below. */
  private extendBackground(key: string, layout: StageScene, layered = false) {
    const extKey = `${key}_ext`;
    const src = this.textures.get(key).getSourceImage() as HTMLCanvasElement;
    if (layered && !this.textures.exists(extKey)) {
      const c = document.createElement('canvas');
      c.width = WORLD_W;
      c.height = WORLD_H;
      const ctx = c.getContext('2d')!;
      ctx.translate(WORLD_W, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(src, 0, 0);
      this.textures.addCanvas(extKey, c);
    }
    if (!this.textures.exists(extKey)) {
      const c = document.createElement('canvas');
      c.width = WORLD_W;
      c.height = WORLD_H;
      const ctx = c.getContext('2d')!;
      ctx.translate(WORLD_W, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(src, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // Paint the sun/moon out of the copies, row by row, with the sky colour beside it.
      const r = 15;
      const sx = Math.round(WORLD_W - layout.sky.x);
      const x0 = Math.max(0, sx - r);
      const x1 = Math.min(WORLD_W, sx + r);
      const side = x0 > 0 ? x0 - 1 : Math.min(WORLD_W - 1, x1);
      for (let y = Math.max(0, Math.round(layout.sky.y) - r); y < Math.min(WORLD_H, layout.sky.y + r); y++) {
        const d = ctx.getImageData(side, y, 1, 1).data;
        ctx.fillStyle = `rgb(${d[0]},${d[1]},${d[2]})`;
        ctx.fillRect(x0, y, x1 - x0, 1);
      }
      this.textures.addCanvas(extKey, c);
    }
    const sctx = src.getContext('2d')!;
    const color = (y: number) => {
      const d = sctx.getImageData(2, y, 1, 1).data;
      return (d[0] << 16) | (d[1] << 8) | d[2];
    };
    this.stageObjects.push(
      this.add.image(0, 0, extKey).setOrigin(1, 0).setDepth(0),
      this.add.image(WORLD_W, 0, extKey).setOrigin(0, 0).setDepth(0),
      this.add.image(-WORLD_W, 0, key).setOrigin(1, 0).setDepth(0),
      this.add.image(WORLD_W * 2, 0, key).setOrigin(0, 0).setDepth(0),
      this.add.rectangle(-WORLD_W * 2, WORLD_H, WORLD_W * 5, 400, color(WORLD_H - 1)).setOrigin(0, 0).setDepth(0),
    );
    // Layered stages bring their own sky; flat ones extend their top row upwards.
    if (!layered) this.stageObjects.push(this.add.rectangle(-WORLD_W * 2, -400, WORLD_W * 5, 400, color(0)).setOrigin(0, 0).setDepth(0));
  }

  /** World point → page coordinates, for the DOM effects layer. */
  private toScreen(wx: number, wy: number): [number, number] {
    const rect = this.game.canvas.getBoundingClientRect();
    const v = this.cameras.main.worldView;
    return [rect.left + ((wx - v.x) / v.width) * rect.width, rect.top + ((wy - v.y) / v.height) * rect.height];
  }

  private payFx(wx: number, wy: number, amount: Decimal) {
    const [x, y] = this.toScreen(wx, wy);
    fx.text(x, y, `+${money(amount)}`, { size: 13, color: FX.gold, life: 1, rise: 40 });
    fx.burst(x, y, { count: 14, colors: [FX.gold, FX.green, FX.white], speed: [60, 160], size: 3, glow: 0.5, life: 0.7, gravity: 200 });
    flyToCash(x, y, 4);
    audio.coin();
  }

  private ripple(x: number, y: number) {
    const c = this.add.circle(x, y, 3).setDepth(35);
    c.setFillStyle();
    c.setStrokeStyle(1, 0xffe08a);
    this.tweens.add({ targets: c, scale: 4, alpha: 0, duration: 420, onComplete: () => c.destroy() });
    this.confetti.explode(3, x, y);
  }

  private emote(x: number, y: number, text: string, color = '#ffffff') {
    const t = this.add.text(x, y, text, { fontFamily: 'monospace', fontSize: '8px', color, stroke: '#14101c', strokeThickness: 2 }).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: t, y: y - 10, alpha: 0, duration: 1000, delay: 300, onComplete: () => t.destroy() });
  }

  // ——— Hero idle life ———

  private idleBehaviour() {
    if (this.idleBusy || this.reducedMotion()) return;
    if (this.workTimer && this.workTimer.getProgress() < 1) return;
    const idle = this.engine.idleMs();
    if (idle < 3500 || Math.random() < 0.55) return;
    if (idle > 25000 && Math.random() < 0.5) return this.snore();
    const r = Math.random();
    if (r < 0.4) this.wander();
    else if (r < 0.6) this.lookAround();
    else if (r < 0.8) this.checkPhone();
    else this.stretch();
  }

  private later(ms: number, fn: () => void) {
    this.idleTimers.push(this.time.delayedCall(ms, fn));
  }

  /** Any real action snaps the hero back to its post. */
  private cancelIdle() {
    if (!this.idleBusy) return;
    this.idleBusy = false;
    this.idleTimers.forEach((t) => t.remove());
    this.idleTimers = [];
    this.idleObjs.forEach((o) => o.destroy());
    this.idleObjs = [];
    this.tweens.killTweensOf(this.hero);
    this.hero.y = GROUND_Y + 1;
    this.hero.setFlipX(false);
    if (this.hero.x !== HERO_X) this.tweens.add({ targets: this.hero, x: HERO_X, duration: 140 });
  }

  private walkTo(x: number, done: () => void) {
    const dist = Math.abs(x - this.hero.x);
    this.hero.setFlipX(x < this.hero.x);
    let w = 0;
    this.hero.setFrame(HERO_WALK);
    const steps = this.time.addEvent({ delay: 110, loop: true, callback: () => {
      w = (w + 1) % 4;
      this.hero.setFrame(HERO_WALK + w);
    } });
    this.idleTimers.push(steps);
    this.tweens.add({ targets: this.hero, x, duration: (dist / 22) * 1000, onComplete: () => {
      steps.remove();
      this.hero.y = GROUND_Y + 1;
      this.hero.setFrame(0);
      done();
    } });
  }

  private wander() {
    this.idleBusy = true;
    const dir = Math.random() < 0.5 ? -1 : 1;
    const lo = Math.max(14, this.view.left + 12);
    const hi = Math.min(WORLD_W - 14, this.view.right - 12);
    const target = Phaser.Math.Clamp(HERO_X + dir * rand(18, 40), lo, hi);
    sceneSignal('walkOut');
    this.walkTo(target, () => this.later(1400, () => {
      this.hero.setFlipX(!this.hero.flipX);
      this.later(600, () => {
        sceneSignal('walkBack');
        this.walkTo(HERO_X, () => {
          this.hero.setFlipX(false);
          this.idleBusy = false;
        });
      });
    }));
  }

  private lookAround() {
    this.idleBusy = true;
    this.hero.setFlipX(true);
    this.emote(this.hero.x, this.hero.y - HERO_H - 2, '?');
    this.later(600, () => this.hero.setFlipX(false));
    this.later(1200, () => this.hero.setFlipX(true));
    this.later(1800, () => { this.hero.setFlipX(false); this.idleBusy = false; });
  }

  private checkPhone() {
    this.idleBusy = true;
    const phone = this.add.rectangle(this.hero.x + 5, this.hero.y - 13, 2, 3, 0x9fe8ff).setDepth(11);
    const glow = this.add.rectangle(this.hero.x + 5, this.hero.y - 13, 6, 6, 0x9fe8ff, 0.25).setDepth(11).setBlendMode(Phaser.BlendModes.ADD);
    this.idleObjs.push(phone, glow);
    this.tweens.add({ targets: glow, alpha: 0.05, duration: 300, yoyo: true, repeat: -1 });
    this.later(900, () => this.emote(this.hero.x + 6, this.hero.y - HERO_H - 2, Math.random() < 0.5 ? '♥' : '$', Math.random() < 0.5 ? '#ff7aa8' : '#ffd166'));
    this.later(2200, () => {
      this.idleObjs.forEach((o) => o.destroy());
      this.idleObjs = [];
      this.idleBusy = false;
    });
  }

  private stretch() {
    this.cheer(900);
    this.emote(this.hero.x, this.hero.y - HERO_H - 2, '!');
  }

  private snore() {
    this.idleBusy = true;
    for (let i = 0; i < 3; i++) {
      this.later(i * 500, () => {
        const z = this.add.text(this.hero.x + 4 + i * 2, this.hero.y - HERO_H, 'z', { fontFamily: 'monospace', fontSize: `${6 + i * 2}px`, color: '#bcd3ff' }).setDepth(40);
        this.idleObjs.push(z);
        this.tweens.add({ targets: z, x: z.x + 6, y: z.y - 12, alpha: 0, duration: 1600, onComplete: () => z.destroy() });
      });
    }
    this.later(2300, () => { this.idleObjs = []; this.idleBusy = false; });
  }

  // ——— Street extras ———

  /** Passers-by cross the street; tap one and they may tip you (unless your status scares them). */
  private spawnPedestrian() {
    if (this.reducedMotion() || this.stageIndex >= 7) return;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const from = dir > 0 ? this.view.left - 10 : this.view.right + 10;
    const to = dir > 0 ? this.view.right + 10 : this.view.left - 10;
    const p = this.add.sprite(from, GROUND_Y - 1, `ped_${Math.floor(Math.random() * PED_VARIANTS)}`, 0).setOrigin(0.5, 1).setDepth(7).setFlipX(dir < 0);
    p.setInteractive({ useHandCursor: true });
    const walk = this.time.addEvent({ delay: 200, loop: true, callback: () => p.setFrame(p.frame.name === '0' ? 1 : 0) });
    const shadow = this.add.ellipse(from, GROUND_Y - 1, 9, 2, 0x000000, 0.3).setDepth(6.9);
    const tween = this.tweens.add({ targets: p, x: to, duration: (Math.abs(to - from) / rand(14, 22)) * 1000, onUpdate: () => (shadow.x = p.x), onComplete: () => { walk.remove(); p.destroy(); shadow.destroy(); } });
    let tapped = false;
    p.on('pointerdown', () => {
      if (tapped) return;
      tapped = true;
      const status = this.engine.state.status;
      const tipChance = status <= STATUS_DANGER ? 0.1 : Math.min(0.75, 0.45 + Math.max(0, status) * 0.01);
      if (Math.random() < tipChance) {
        this.payFx(p.x, p.y - 18, this.engine.streetCash('tip'));
        this.emote(p.x, p.y - 20, '♥', '#ff7aa8');
      } else {
        this.emote(p.x, p.y - 20, status <= STATUS_DANGER ? '!!' : '?!', status <= STATUS_DANGER ? '#ff5d5d' : '#ffffff');
        tween.timeScale = 2.5;
        walk.timeScale = 2;
      }
    });
  }

  /** A banknote flutters down now and then: catch it before it lands. */
  private spawnBill() {
    if (this.reducedMotion()) return;
    const lo = Math.max(this.view.left, 0) + 16;
    const hi = Math.min(this.view.right, WORLD_W) - 16;
    const b = this.add.image(rand(lo, hi), this.view.top - 6, 'bill').setDepth(24);
    b.setInteractive(new Phaser.Geom.Rectangle(-5, -5, 19, 15), Phaser.Geom.Rectangle.Contains);
    b.input!.cursor = 'pointer';
    this.tweens.add({ targets: b, x: b.x + rand(8, 14) * (Math.random() < 0.5 ? -1 : 1), angle: { from: -25, to: 25 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: b, y: GROUND_Y - 2, duration: 7500, ease: 'Sine.in', onComplete: () => {
      if (!b.active) return;
      this.tweens.killTweensOf(b);
      b.setAngle(0);
      this.tweens.add({ targets: b, alpha: 0, delay: 2500, duration: 500, onComplete: () => b.destroy() });
    } });
    b.on('pointerdown', () => {
      this.payFx(b.x, b.y, this.engine.streetCash('bill'));
      this.confetti.explode(10, b.x, b.y);
      this.tweens.killTweensOf(b);
      b.destroy();
    });
  }

  update() {
    // Cheap per-frame check for state changes made outside events (load, import, reset).
    const stage = STAGE_BY_ID[this.engine.rank.stage].index;
    if (stage !== this.stageIndex || (this.engine.state.equipped.ride ?? '') !== this.rideKey) this.syncWorld();
    if (this.aura) this.aura.x = this.hero.x;
    this.shadow.x = this.hero.x;
    this.shadow.scaleX = 1 - Math.min(0.4, (GROUND_Y + 1 - this.hero.y) * 0.08);
    if (this.layers && !this.reducedMotion()) {
      const now = this.time.now;
      const target = now - this.pointerAt < 4000
        ? Phaser.Math.Clamp((this.input.activePointer.x / this.scale.gameSize.width - 0.5) * 2, -1, 1)
        : Math.sin(now / 9000) * 0.6 + (this.hero.x - HERO_X) / 60;
      this.parallaxX += (target - this.parallaxX) * 0.04;
      this.applyParallax();
    }
    for (const m of this.moths) {
      m.a += m.s * this.game.loop.delta;
      m.obj.setPosition(Math.round(this.mothCenter.x + Math.cos(m.a) * m.rx), Math.round(this.mothCenter.y + Math.sin(m.a * 1.7) * m.ry));
    }
    const v = this.cameras.main.worldView;
    if (v.width > 0) {
      heroAnchor.x = (this.hero.x - v.x) / v.width;
      heroAnchor.y = (this.hero.y - HERO_H - 3 - v.y) / v.height;
      heroAnchor.ready = true;
    }
  }
}

const SKINS = ['#f2c9a0', '#d9a273', '#a86b45', '#6e4529'];
const SHIRTS = ['#e3262f', '#3f8fd8', '#f2b233', '#3fcfbd', '#a259ff', '#ff7aa8'];
const HAIR = ['#2a1c14', '#6b3f1f', '#d9b25a', '#9a9aa8'];

/** A 2-frame walking passer-by, 9×18 per frame. */
function buildPedestrian(i: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 18;
  c.height = 18;
  const ctx = c.getContext('2d')!;
  const skin = SKINS[i % SKINS.length];
  const shirt = SHIRTS[i % SHIRTS.length];
  const hair = HAIR[(i * 3) % HAIR.length];
  for (let f = 0; f < 2; f++) {
    const o = f * 9;
    const px = (x: number, y: number, w: number, h: number, col: string) => {
      ctx.fillStyle = col;
      ctx.fillRect(o + x, y, w, h);
    };
    px(3, 0, 3, 1, hair);
    px(2, 1, 5, 4, skin);
    px(2, 1, 5, 1, hair);
    px(6, 2, 1, 1, '#14101c');
    px(2, 5, 5, 6, shirt);
    px(1, 6, 1, 4, skin);
    px(7, 6, 1, 4, skin);
    px(2, 11, 5, 2, '#2d3250');
    if (f === 0) {
      px(2, 13, 2, 4, '#2d3250');
      px(5, 13, 2, 4, '#2d3250');
      px(2, 17, 2, 1, '#14101c');
      px(5, 17, 2, 1, '#14101c');
    } else {
      px(3, 13, 3, 4, '#2d3250');
      px(3, 17, 3, 1, '#14101c');
    }
    if (i % 3 === 1) px(7, 9, 2, 3, '#7a4a2a'); // shopping bag
  }
  return c;
}

function solid(w: number, h: number, color: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  return c;
}

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

export function createGame(parent: HTMLElement, engine: GameEngine): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: WORLD_W,
    height: WORLD_H,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: '#14101c',
    scale: { mode: Phaser.Scale.EXPAND, autoCenter: Phaser.Scale.CENTER_BOTH },
    banner: false,
    audio: { noAudio: true },
    scene: [],
    callbacks: {
      postBoot: (game) => {
        game.scene.add('street', StreetScene, true, { engine });
      },
    },
  });
  // Dev builds expose the game so each class's street can be previewed from the console.
  if (import.meta.env.DEV) (window as unknown as { __street?: Phaser.Game }).__street = game;
  return game;
}
