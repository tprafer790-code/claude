/**
 * Original chiptune sound effects and music, synthesized at runtime with the
 * Web Audio API (no audio files, no licensing concerns).
 */
type Wave = OscillatorType;

const NOTE = (semitonesFromA4: number) => 440 * Math.pow(2, semitonesFromA4 / 12);
/** Small random pitch drift (±3%) so repeated effects never sound identical. */
const vary = () => 1 + (Math.random() - 0.5) * 0.06;
// Semitone offsets from A4
const N: Record<string, number> = { C4: -9, D4: -7, E4: -5, F4: -4, G4: -2, A4: 0, B4: 2, C5: 3, D5: 5, E5: 7, F5: 8, G5: 10, A5: 12, B5: 14, C6: 15, E6: 19, G6: 22 };

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxGain!: GainNode;
  private musicGain!: GainNode;
  /** Lead melody bus: feeds the music mix plus a filtered echo. */
  private leadBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private lastClick = 0;
  private lastCrit = 0;
  private musicTimer: number | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private stage = 0;
  sfxVolume = 0.7;
  musicVolume = 0.35;
  muted = false;
  /** Muted from outside the game: while an ad plays, or by the portal's setting. */
  private silenced = new Set<string>();

  /** Must be called from a user gesture (browsers block autoplay). */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const ctx = this.ctx;
    this.master = ctx.createGain();
    // Gentle bus compression glues music and effects together and stops peaks clipping.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 12;
    comp.ratio.value = 3;
    comp.attack.value = 0.008;
    comp.release.value = 0.2;
    this.master.connect(comp);
    comp.connect(ctx.destination);
    this.sfxGain = ctx.createGain();
    this.sfxGain.connect(this.master);
    this.musicGain = ctx.createGain();
    // Music: a warm low-pass so square waves are less harsh, plus a short room reverb.
    const warm = ctx.createBiquadFilter();
    warm.type = 'lowpass';
    warm.frequency.value = 5200;
    warm.Q.value = 0.4;
    this.musicGain.connect(warm);
    warm.connect(this.master);
    const verb = ctx.createConvolver();
    verb.buffer = this.impulse(1.8, 2.6);
    const verbGain = ctx.createGain();
    verbGain.gain.value = 0.32;
    warm.connect(verb);
    verb.connect(verbGain);
    verbGain.connect(this.master);
    // Lead echo (filtered feedback delay).
    this.leadBus = ctx.createGain();
    this.leadBus.connect(this.musicGain);
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.36;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const dl = ctx.createBiquadFilter();
    dl.type = 'lowpass';
    dl.frequency.value = 2200;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    this.leadBus.connect(delay);
    delay.connect(dl);
    dl.connect(fb);
    fb.connect(delay);
    dl.connect(wet);
    wet.connect(this.musicGain);
    this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolumes();
    this.startMusic();
  }

  setVolumes(sfx: number, music: number, muted: boolean) {
    this.sfxVolume = sfx;
    this.musicVolume = music;
    this.muted = muted;
    this.applyVolumes();
  }

  /** Silences all audio for a reason (e.g. 'ad'), until released. */
  silence(reason: string, on: boolean) {
    if (on) this.silenced.add(reason);
    else this.silenced.delete(reason);
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted || this.silenced.size ? 0 : 1, t, 0.02);
    this.sfxGain.gain.setTargetAtTime(this.sfxVolume * 0.5, t, 0.02);
    this.musicGain.gain.setTargetAtTime(this.musicVolume * 0.22, t, 0.05);
  }

  setStage(stage: number) {
    if (stage === this.stage) return;
    this.stage = stage;
    // Each neighbourhood has its own theme: dip the music and restart it on bar one.
    this.step = 0;
    if (this.ctx) {
      const t = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(t);
      this.musicGain.gain.setTargetAtTime(0, t, 0.05);
      this.musicGain.gain.setTargetAtTime(this.musicVolume * 0.22, t + 0.6, 0.4);
    }
  }

  /** Decaying stereo noise impulse for the convolver reverb. */
  private impulse(seconds: number, decay: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  /** Melody voice: two slightly detuned oscillators with a soft attack and a touch of vibrato. */
  private lead(freq: number, start: number, dur: number, wave: Wave, vol: number) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const g = ctx.createGain();
    const attack = Math.min(0.03, dur * 0.2);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + attack);
    g.gain.setValueAtTime(vol, start + Math.max(attack, dur * 0.5));
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    g.connect(this.leadBus);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, start);
    depth.gain.linearRampToValueAtTime(dur > 0.4 ? 9 : 0, start + Math.min(dur, 0.35));
    lfo.connect(depth);
    for (const detune of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = wave;
      o.frequency.setValueAtTime(freq, start);
      o.detune.value = detune;
      depth.connect(o.detune);
      o.connect(g);
      o.start(start);
      o.stop(start + dur + 0.02);
    }
    lfo.start(start);
    lfo.stop(start + dur + 0.02);
  }

  private tone(freq: number, start: number, dur: number, wave: Wave = 'square', vol = 0.3, dest?: AudioNode, slideTo?: number) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(freq, start);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g);
    g.connect(dest ?? this.sfxGain);
    o.start(start);
    o.stop(start + dur + 0.02);
  }

  private noise(start: number, dur: number, vol = 0.2, filterFreq = 6000, dest?: AudioNode) {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest ?? this.sfxGain);
    src.start(start);
    src.stop(start + dur + 0.02);
  }

  private get now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  // ——— Effects ———
  click(combo: number, crit: boolean, power = 1) {
    if (!this.ctx) return;
    const t = this.now;
    if (crit) {
      this.critHit(power);
      return;
    }
    if (t - this.lastClick < 0.03) return;
    this.lastClick = t;
    const semis = Math.min(combo, 48) / 4; // rises with the combo
    const v = vary();
    this.tone(NOTE(N.C5 + semis) * v, t, 0.05, 'square', 0.12);
    this.tone(NOTE(N.C5 + semis + 12) * v, t + 0.01, 0.03, 'triangle', 0.08);
  }

  /**
   * Critical hit: a low punch, a noise crack and a bright stab. Back-to-back
   * crits get quieter and drop the bass so repeated hits never become grating.
   */
  critHit(power = 1) {
    if (!this.ctx) return;
    const t = this.now;
    const since = t - this.lastCrit;
    this.lastCrit = t;
    this.lastClick = t;
    const soft = since < 0.25 ? 0.5 : 1;
    const p = Math.min(1.5, power);
    const v = vary();
    if (soft === 1) this.tone(160 * p * v, t, 0.14, 'sine', 0.35, undefined, 45);
    this.noise(t, 0.07, 0.22 * soft * p, 1800);
    this.tone(NOTE(N.E6) * v, t + 0.005, 0.06, 'square', 0.12 * soft);
    this.tone(NOTE(N.B5) * v, t + 0.04, 0.09, 'square', 0.1 * soft, undefined, NOTE(N.E6 + 5) * v);
    if (p > 1 && soft === 1) [0, 7, 12].forEach((s, i) => this.tone(NOTE(N.E5 + s + 12), t + 0.07 + i * 0.03, 0.07, 'triangle', 0.1));
  }

  /** Combo milestone: quick rising arpeggio, higher for bigger milestones. */
  comboMilestone(level: number) {
    if (!this.ctx) return;
    const t = this.now;
    if (level === 0) {
      this.tone(NOTE(N.G5), t, 0.05, 'triangle', 0.1);
      return;
    }
    [0, 4, 7, 12].forEach((s, i) => this.tone(NOTE(N.C5 + level * 2 + s), t + i * 0.04, 0.08, 'square', 0.1));
    if (level >= 3) {
      [12, 16, 19, 24].forEach((s, i) => this.tone(NOTE(N.C5 + level * 2 + s), t + 0.16 + i * 0.04, 0.1, 'triangle', 0.1));
      this.noise(t + 0.16, 0.25, 0.05, 8000);
    }
    if (level >= 4) this.fanfare();
  }

  /** Major achievement fanfare. */
  fanfare() {
    if (!this.ctx) return;
    const t = this.now;
    const seq = [N.G4, N.C5, N.E5, N.G5, N.E5, N.G5, N.C6];
    seq.forEach((n, i) => {
      this.tone(NOTE(n), t + i * 0.09, 0.16, 'square', 0.12);
      this.tone(NOTE(n - 12), t + i * 0.09, 0.16, 'triangle', 0.14);
    });
    this.tone(NOTE(N.C6), t + seq.length * 0.09, 0.7, 'square', 0.1);
    this.tone(NOTE(N.E6), t + seq.length * 0.09, 0.7, 'triangle', 0.08);
    this.noise(t + seq.length * 0.09, 0.5, 0.06, 7000);
  }

  /** Cinematic transition: a rushing sweep that resolves into a rising chord. */
  whoosh() {
    if (!this.ctx) return;
    const t = this.now;
    this.noise(t, 0.7, 0.08, 1200);
    this.noise(t + 0.18, 0.55, 0.06, 4200);
    [N.C4, N.G4, N.C5, N.E5].forEach((n, i) => this.tone(NOTE(n), t + 0.35 + i * 0.07, 0.4, 'triangle', 0.08));
  }

  coin() {
    const t = this.now;
    this.tone(NOTE(N.B5), t, 0.07, 'square', 0.15);
    this.tone(NOTE(N.E6), t + 0.07, 0.18, 'square', 0.15);
  }

  purchase(tier = 0) {
    if (!this.ctx) return;
    const t = this.now;
    const v = vary();
    this.noise(t, 0.05, 0.15, 4000);
    this.tone(NOTE(N.G5) * v, t + 0.02, 0.06, 'square', 0.13);
    this.tone(NOTE(N.C6) * v, t + 0.08, 0.14, 'square', 0.13);
    if (tier >= 2) this.tone(NOTE(N.G6), t + 0.14, 0.12, 'triangle', 0.1);
    if (tier >= 3) this.tone(NOTE(N.C6 + 12), t + 0.2, 0.16, 'triangle', 0.08);
  }

  denied() {
    const t = this.now;
    this.tone(NOTE(N.C4 - 5), t, 0.12, 'square', 0.1);
    this.tone(NOTE(N.C4 - 7), t + 0.1, 0.14, 'square', 0.1);
  }

  promotion(major: boolean) {
    const t = this.now;
    const seq = major ? [N.C5, N.E5, N.G5, N.C6, N.G5, N.C6, N.E6] : [N.C5, N.E5, N.G5, N.C6];
    const step = major ? 0.11 : 0.08;
    seq.forEach((n, i) => {
      this.tone(NOTE(n), t + i * step, step * 1.6, 'square', 0.14);
      this.tone(NOTE(n - 12), t + i * step, step * 1.6, 'triangle', 0.16);
    });
    if (major) {
      this.tone(NOTE(N.C6), t + seq.length * step, 0.6, 'square', 0.12);
      this.tone(NOTE(N.G5), t + seq.length * step, 0.6, 'triangle', 0.14);
      this.noise(t + seq.length * step, 0.4, 0.08, 8000);
    }
  }

  achievement() {
    const t = this.now;
    [N.G5, N.B5, N.D5 + 12, N.G6].forEach((n, i) => this.tone(NOTE(n), t + i * 0.06, 0.12, 'triangle', 0.16));
  }

  event() {
    const t = this.now;
    this.tone(NOTE(N.A4), t, 0.25, 'sine', 0.18);
    this.tone(NOTE(N.E5), t + 0.12, 0.3, 'sine', 0.15);
    this.tone(NOTE(N.A5), t + 0.24, 0.4, 'triangle', 0.1);
  }

  rare() {
    const t = this.now;
    [0, 7, 12, 19, 24].forEach((s, i) => this.tone(NOTE(N.A4 + s), t + i * 0.07, 0.35, 'sine', 0.12));
    this.noise(t + 0.3, 0.5, 0.05, 9000);
  }

  secret() {
    const t = this.now;
    [N.E5, N.D5, N.C5, N.G5, N.C6].forEach((n, i) => this.tone(NOTE(n), t + i * 0.09, 0.2, i < 3 ? 'triangle' : 'square', 0.12));
  }

  opportunity() {
    const t = this.now;
    this.tone(NOTE(N.E6), t, 0.08, 'square', 0.1);
    this.tone(NOTE(N.G6), t + 0.08, 0.12, 'square', 0.1);
  }

  prestige() {
    const t = this.now;
    this.tone(110, t, 1.4, 'sawtooth', 0.1, undefined, 1760);
    this.noise(t, 1.4, 0.06, 2000);
    [N.C5, N.G5, N.C6, N.E6, N.G6].forEach((n, i) => this.tone(NOTE(n), t + 1.2 + i * 0.1, 0.5, 'square', 0.12));
  }

  // ——— Music: an original chiptune theme for each neighbourhood ———
  private startMusic() {
    if (!this.ctx || this.musicTimer !== null) return;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 50);
  }

  private drum(kind: string, t: number) {
    if (kind === 'k') this.tone(150, t, 0.16, 'sine', 0.9, this.musicGain, 42);
    else if (kind === 's') {
      this.noise(t, 0.12, 0.35, 3500, this.musicGain);
      this.tone(190, t, 0.06, 'triangle', 0.25, this.musicGain, 120);
    } else if (kind === 'h') this.noise(t, 0.03, 0.14, 9500, this.musicGain);
    else if (kind === 'o') this.noise(t, 0.14, 0.1, 8000, this.musicGain);
  }

  private scheduleMusic() {
    if (!this.ctx || this.musicVolume <= 0 || this.muted) {
      if (this.ctx) this.nextNoteTime = this.ctx.currentTime + 0.1;
      return;
    }
    const th = THEMES[this.stage] ?? THEMES[0];
    const sixteenth = 60 / th.bpm / 4;
    while (this.nextNoteTime < this.ctx.currentTime + 0.25) {
      const s = this.step % 16;
      // Swing: off-beat sixteenths land a little late.
      const t = this.nextNoteTime + (s % 2 ? sixteenth * th.swing : 0);
      const bar = Math.floor(this.step / 16);
      const [deg, quality] = th.chords[bar % th.chords.length];
      const tones = quality === 'm' ? [0, 3, 7, 10] : quality === 'M7' ? [0, 4, 7, 11] : [0, 4, 7, 12];
      const root = th.root + deg;
      const b = th.bass[s];
      if (b !== '.') this.tone(NOTE(root - 24 + (b === '5' ? 7 : b === '8' ? 12 : 0)), t, sixteenth * 1.7, th.bassWave, 0.5, this.musicGain);
      if (th.pad && s === 0) for (const iv of tones.slice(0, 3)) this.tone(NOTE(root + iv - 12), t, sixteenth * 15, 'sine', 0.09, this.musicGain);
      if (th.arp && s % 2 === 0) this.tone(NOTE(root + tones[(s / 2) % 4]), t, sixteenth * 0.9, 'square', 0.05, this.musicGain);
      // Lead: an answering phrase every fourth bar so the loop breathes.
      const phrase = bar % 4 === 3 ? th.answer : th.lead;
      const m = phrase[s];
      if (m !== '.') {
        const n = Number(m);
        this.lead(NOTE(root + 12 + tones[n % 4] + (n >= 4 ? 12 : 0)), t, sixteenth * th.legato, th.leadWave, th.leadVol * 0.7);
      }
      // Drums drop out on the first bar of every eight, like an intro.
      const d = th.drums[s];
      if (d !== '.' && bar % 8 !== 0) for (const k of d) this.drum(k, t);
      this.nextNoteTime += sixteenth;
      this.step++;
    }
  }
}

interface Theme {
  bpm: number;
  /** Semitones from A4 for the tonic. */
  root: number;
  swing: number;
  chords: [number, 'M' | 'm' | 'M7'][];
  /** 16 steps: '0'..'7' chord tone (4+ = octave up), '.' rest. */
  lead: string[];
  answer: string[];
  /** 16 steps: '1' root, '5' fifth, '8' octave, '.' rest. */
  bass: string[];
  /** 16 steps of drum letters (k kick, s snare, h hat, o open hat) or '.'. */
  drums: string[];
  leadWave: Wave;
  bassWave: Wave;
  leadVol: number;
  legato: number;
  pad: boolean;
  arp: boolean;
}

const steps = (p: string) => p.replace(/ /g, '').split('');
const beats = (p: string) => p.split(' ');

/** One theme per social class, same order as STAGES. */
const THEMES: Theme[] = [
  // Supervivencia: slow minor lo-fi, sparse and rainy.
  { bpm: 76, root: -3, swing: 0.18, chords: [[0, 'm'], [-4, 'M'], [-7, 'M'], [-5, 'M']],
    lead: steps('2... .1.. 0... ....'), answer: steps('.... 2.3. 1... ....'), bass: steps('1... .... 5... ....'),
    drums: beats('k . h . s . h . . k h . s . h .'), leadWave: 'triangle', bassWave: 'triangle', leadVol: 0.16, legato: 3.5, pad: true, arp: false },
  // Clase trabajadora: urban funk, punchy bass.
  { bpm: 98, root: -5, swing: 0.1, chords: [[0, 'm'], [0, 'm'], [3, 'M'], [5, 'M']],
    lead: steps('0.2. 1.0. ..2. 3...'), answer: steps('4.3. 2.1. 0... ....'), bass: steps('1.18 ..1. 1.5. .8..'),
    drums: beats('k h s h k k s h k h s h k h so h'), leadWave: 'square', bassWave: 'square', leadVol: 0.1, legato: 1.2, pad: false, arp: false },
  // Clase media-baja: hopeful pop.
  { bpm: 106, root: -2, swing: 0, chords: [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']],
    lead: steps('0.1. 2... 1.2. 4...'), answer: steps('4.2. 1... 2.1. 0...'), bass: steps('1.1. 1.1. 5.5. 8.5.'),
    drums: beats('k h s h k h s h k h s h k k s o'), leadWave: 'square', bassWave: 'triangle', leadVol: 0.1, legato: 1.6, pad: false, arp: true },
  // Clase media: bright suburban, major sevenths.
  { bpm: 112, root: 3, swing: 0, chords: [[0, 'M7'], [5, 'M7'], [9, 'm'], [7, 'M']],
    lead: steps('2.3. 4.3. 2... 1...'), answer: steps('0.1. 2.4. 5... ....'), bass: steps('1..1 ..5. 1..1 ..8.'),
    drums: beats('k h s h k h s h k h s h k h s h'), leadWave: 'triangle', bassWave: 'triangle', leadVol: 0.15, legato: 1.8, pad: true, arp: true },
  // Riqueza: swung lounge jazz.
  { bpm: 92, root: 1, swing: 0.33, chords: [[0, 'M7'], [9, 'm'], [2, 'm'], [7, 'M']],
    lead: steps('3..2 .1.. 3..4 ....'), answer: steps('2..1 .0.. .... ....'), bass: steps('1.5. 8.5. 1.5. 8.5.'),
    drums: beats('h . . h s . . h h . . h s . h h'), leadWave: 'sine', bassWave: 'triangle', leadVol: 0.2, legato: 2.6, pad: true, arp: false },
  // Riqueza extrema: grand and brassy.
  { bpm: 120, root: -4, swing: 0, chords: [[0, 'M'], [5, 'M'], [7, 'M'], [0, 'M']],
    lead: steps('0..0 1.2. 4... 2...'), answer: steps('4..4 5.4. 2... 0...'), bass: steps('1.1. 1.1. 1.1. 5.8.'),
    drums: beats('k h s h k h s h k h s h k s s s'), leadWave: 'sawtooth', bassWave: 'square', leadVol: 0.07, legato: 1.4, pad: true, arp: false },
  // Absurdo: glitter disco.
  { bpm: 124, root: 0, swing: 0, chords: [[0, 'm'], [5, 'm'], [-2, 'M'], [3, 'M']],
    lead: steps('4.4. 3.2. 4... 5.4.'), answer: steps('2.2. 1.0. 1... 2...'), bass: steps('1818 1818 1818 1818'),
    drums: beats('k o ks o k o ks o k o ks o k o ks o'), leadWave: 'square', bassWave: 'square', leadVol: 0.09, legato: 1, pad: false, arp: true },
  // Cósmico: slow ambient.
  { bpm: 66, root: 2, swing: 0, chords: [[0, 'M7'], [-3, 'm'], [5, 'M7'], [2, 'm']],
    lead: steps('4... .... 5... ....'), answer: steps('.... 2... .... 1...'), bass: steps('1... .... .... ....'),
    drums: beats('. . . . . . . . . . . . . . . h'), leadWave: 'sine', bassWave: 'sine', leadVol: 0.18, legato: 6, pad: true, arp: true },
];

export const audio = new AudioManager();
