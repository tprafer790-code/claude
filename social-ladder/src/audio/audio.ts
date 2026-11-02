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

  /** Must be called from a user gesture (browsers block autoplay). */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.master);
    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.master);
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

  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 1, t, 0.02);
    this.sfxGain.gain.setTargetAtTime(this.sfxVolume * 0.5, t, 0.02);
    this.musicGain.gain.setTargetAtTime(this.musicVolume * 0.22, t, 0.05);
  }

  setStage(stage: number) {
    this.stage = stage;
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

  // ——— Music: a small original chiptune loop that shifts key/tempo with the social class ———
  private startMusic() {
    if (!this.ctx || this.musicTimer !== null) return;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 50);
  }

  private scheduleMusic() {
    if (!this.ctx || this.musicVolume <= 0 || this.muted) {
      if (this.ctx) this.nextNoteTime = this.ctx.currentTime + 0.1;
      return;
    }
    const bpm = 92 + this.stage * 4;
    const stepDur = 60 / bpm / 2; // eighth notes
    const key = [0, 2, -3, 5, 3, 7, -1, 9][this.stage] ?? 0;
    // I – V – vi – IV, 8 steps per chord
    const chords = [[N.C4, N.E4, N.G4], [N.G4 - 12, N.B4 - 12, N.D4], [N.A4 - 12, N.C4, N.E4], [N.F4 - 12, N.A4 - 12, N.C4]];
    const melody = [0, 1, 2, 1, 2, 0, 1, -1];
    while (this.nextNoteTime < this.ctx.currentTime + 0.25) {
      const t = this.nextNoteTime;
      const chord = chords[Math.floor(this.step / 8) % 4];
      const s = this.step % 8;
      if (s % 4 === 0) this.tone(NOTE(chord[0] - 12 + key), t, stepDur * 1.8, 'triangle', 0.5, this.musicGain);
      if (s % 4 === 2) this.tone(NOTE(chord[0] + key), t, stepDur * 0.9, 'triangle', 0.3, this.musicGain);
      const m = melody[(s + Math.floor(this.step / 32)) % 8];
      if (m >= 0 && (this.step % 16 < 12 || s % 2 === 0)) this.tone(NOTE(chord[m] + 12 + key), t, stepDur * 0.8, 'square', 0.12, this.musicGain);
      if (s % 2 === 1) this.noise(t, 0.03, 0.15, 9000, this.musicGain);
      this.nextNoteTime += stepDur;
      this.step++;
    }
  }
}

export const audio = new AudioManager();
