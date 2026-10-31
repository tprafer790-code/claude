// Sonido sintetizado con WebAudio: sin archivos externos. Balbuceo de voces, golpes de interfaz y música breve.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let volume = 0.6;
let muted = false;
let suspendedByAd = false;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    apply();
  } catch { ctx = null; }
  return ctx;
}

function apply() { if (master) master.gain.value = muted || suspendedByAd ? 0 : volume; }

/** Debe llamarse tras un gesto del usuario (los navegadores bloquean el audio automático). */
export function unlockAudio(): void { const c = ensure(); if (c && c.state === 'suspended') c.resume().catch(() => {}); }
export function setVolume(v: number): void { volume = Math.max(0, Math.min(1, v)); apply(); }
export function setMuted(m: boolean): void { muted = m; apply(); }
export function isMuted(): boolean { return muted; }
export function adPause(on: boolean): void { suspendedByAd = on; apply(); }

function tone(freq: number, dur: number, type: OscillatorType = 'square', gain = 0.12, when = 0, slide = 0): void {
  const c = ensure(); if (!c || !master || muted || suspendedByAd) return;
  const t0 = c.currentTime + when;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t0 + dur);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
}

export const sfx = {
  click: () => tone(520, 0.06, 'square', 0.06),
  hover: () => tone(700, 0.03, 'sine', 0.03),
  good: () => { tone(523, 0.1, 'triangle', 0.1); tone(784, 0.16, 'triangle', 0.1, 0.08); },
  bad: () => { tone(220, 0.18, 'sawtooth', 0.07); tone(160, 0.25, 'sawtooth', 0.07, 0.1); },
  cheer: () => { for (let i = 0; i < 6; i++) tone(300 + Math.random() * 500, 0.08, 'triangle', 0.05, i * 0.05); },
  boo: () => tone(140, 0.5, 'sawtooth', 0.06, 0, -40),
  step: () => tone(90, 0.04, 'triangle', 0.05),
  phone: () => { for (let i = 0; i < 4; i++) tone(880, 0.05, 'square', 0.04, i * 0.09); },
  fanfare: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.1, i * 0.14)); },
  sad: () => { [392, 349, 311, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.08, i * 0.22)); },
  tick: () => tone(1200, 0.02, 'square', 0.03),
  stamp: () => { tone(120, 0.08, 'square', 0.12); tone(60, 0.12, 'triangle', 0.1, 0.02); },
};

/** Balbuceo de un personaje (sílabas aleatorias con el tono de su voz). */
export function babble(voice: number, text: string): void {
  const n = Math.min(14, Math.max(3, Math.round(text.length / 9)));
  for (let i = 0; i < n; i++) tone(voice * (0.85 + Math.random() * 0.4), 0.06, 'square', 0.035, i * 0.075);
}
