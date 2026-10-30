import Phaser from 'phaser';
import type { GameEngine, GameEvent } from '../game/engine';
import { STAGE_BY_ID } from '../data/stages';
import { applyEquipment, buildHeroSheet, HERO_FRAMES, HERO_H, HERO_W, STAGE_LOOKS } from './hero';
import { buildProp, buildStage, GROUND_Y, WORLD_H, WORLD_W, type PropId, type StageScene } from './environments';
import { P } from './palette';
import { reducedMotion, shakeAllowed } from '../fx/intensity';

const HERO_X = 84;
const GROUND_RIDES: PropId[] = ['chainless_bicycle', 'secondhand_bicycle', 'motorcycle', 'used_car', 'sports_car'];

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

  constructor() {
    super('street');
  }

  init(data: { engine: GameEngine }) {
    this.engine = data.engine;
  }

  create() {
    this.makeStaticTextures();
    this.hero = this.add.sprite(HERO_X, GROUND_Y + 1, 'hero_0', 0).setOrigin(0.5, 1).setDepth(10);
    this.hero.setInteractive({ useHandCursor: true, pixelPerfect: false });
    this.hero.on('pointerdown', () => {
      this.engine.interact('hero');
      this.hop(this.hero);
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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsub.forEach((u) => u()));
    this.syncWorld(true);

    // Ambient life
    this.time.addEvent({ delay: 2200, loop: true, callback: () => this.ambient() });
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
    let layout: StageScene;
    if (!this.textures.exists(key)) {
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
    this.pigeon = undefined;

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
        const cl = this.add.image(Math.random() * WORLD_W, 3 + i * 7 + Math.random() * 4, 'drift_cloud').setOrigin(0, 0).setScale(scale).setDepth(1)
          .setAlpha(night ? 0.22 : 0.75 - i * 0.12).setTint(night ? 0xa855f7 : index >= 5 ? 0xfff6c8 : 0xffffff);
        const speed = 3 + i * 2 + Math.random() * 2;
        const travel = () => {
          const dist = WORLD_W + 60 - cl.x;
          this.tweens.add({ targets: cl, x: WORLD_W + 10, duration: (dist / speed) * 1000, onComplete: () => { if (!cl.active) return; cl.x = -24 * scale - 10; travel(); } });
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
        const b = this.add.image(dir > 0 ? -12 - i * 9 : WORLD_W + 12 + i * 9, y + (i % 2) * 4, 'bird').setDepth(4).setFlipX(dir < 0);
        this.tweens.add({ targets: b, x: b.x + dir * (WORLD_W + 60), duration: 6000, onComplete: () => { this.tweens.killTweensOf(b); b.destroy(); } });
        this.tweens.add({ targets: b, scaleY: 0.4, duration: 180, yoyo: true, repeat: -1 });
      }
    }
    if (this.pigeon && Math.random() < 0.5) {
      this.pigeon.setTexture(this.pigeon.texture.key === 'pigeon' ? 'pigeon2' : 'pigeon');
      if (Math.random() < 0.3) this.pigeon.setFlipX(!this.pigeon.flipX);
    }
    if (this.engine.state.equipped.ride === 'private_jet' && !this.jet && !this.reducedMotion()) {
      this.jet = this.add.image(-50, 18 + Math.random() * 20, 'private_jet').setDepth(4);
      this.tweens.add({ targets: this.jet, x: WORLD_W + 50, duration: 7000, onComplete: () => { this.jet?.destroy(); this.jet = undefined; } });
    }
    // idle breathing
    if (!this.workTimer || this.workTimer.getProgress() >= 1) this.hero.setFrame(this.hero.frame.name === '1' ? 0 : 1);
  }

  private onGameEvent(e: GameEvent) {
    switch (e.type) {
      case 'click': {
        this.hero.setFrame(2);
        this.workTimer?.remove();
        this.workTimer = this.time.delayedCall(70, () => {
          this.hero.setFrame(3);
          this.workTimer = this.time.delayedCall(110, () => this.hero.setFrame(0));
        });
        const stageIdx = STAGE_BY_ID[this.engine.rank.stage].index;
        const n = (e.crit ? 10 + stageIdx * 2 : 1 + Math.min(3, Math.floor(e.combo / 15))) + (stageIdx >= 4 ? 1 : 0);
        this.coins.explode(n, HERO_X + 6, GROUND_Y - 22);
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

  update() {
    // Cheap per-frame check for state changes made outside events (load, import, reset).
    const stage = STAGE_BY_ID[this.engine.rank.stage].index;
    if (stage !== this.stageIndex || (this.engine.state.equipped.ride ?? '') !== this.rideKey) this.syncWorld();
  }
}

function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

export function createGame(parent: HTMLElement, engine: GameEngine): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: WORLD_W,
    height: WORLD_H,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: '#14101c',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    banner: false,
    audio: { noAudio: true },
    scene: [],
    callbacks: {
      postBoot: (game) => {
        game.scene.add('street', StreetScene, true, { engine });
      },
    },
  });
}
