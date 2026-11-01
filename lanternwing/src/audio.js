// Sonido sintetizado con Web Audio: sin archivos de audio, cero bytes de descarga.
(function () {
  "use strict";

  let ctx = null;
  let master = null;
  let sfxBus = null;
  let musicBus = null;
  let muted = false;
  let musicOff = false;
  let adMuted = false;
  let musicTimer = null;
  let musicStep = 0;
  const lastPlay = {};

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch (e) {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.8;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.55;
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = musicOff ? 0 : 0.16;
    musicBus.connect(master);
    return ctx;
  }

  // iOS exige reanudar el contexto dentro de un gesto del usuario.
  function unlock() {
    const c = ensure();
    if (c && c.state === "suspended") c.resume().catch(() => {});
  }
  ["touchend", "click", "keydown", "pointerdown"].forEach((ev) =>
    document.addEventListener(ev, unlock, { passive: true })
  );

  function applyGain() {
    if (!master) return;
    const v = muted || adMuted ? 0 : 0.8;
    master.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
  }

  function setMusic(on) {
    musicOff = !on;
    if (musicBus) musicBus.gain.setTargetAtTime(musicOff ? 0 : 0.16, ctx.currentTime, 0.05);
  }

  function setMuted(m) {
    muted = !!m;
    applyGain();
  }
  function setAdMuted(m) {
    adMuted = !!m;
    applyGain();
  }

  function tone(freq, dur, type, vol, slideTo, bus) {
    if (!ctx || ctx.state !== "running") return;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, now);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g);
    g.connect(bus || sfxBus);
    o.start(now);
    o.stop(now + dur + 0.02);
  }

  // Limita la repetición de un mismo efecto para no saturar el audio.
  function throttled(name, minGap, fn) {
    if (!ctx) return;
    const now = ctx.currentTime;
    if (lastPlay[name] && now - lastPlay[name] < minGap) return;
    lastPlay[name] = now;
    fn();
  }

  const sfx = {
    shoot: () => throttled("shoot", 0.07, () => tone(880, 0.08, "triangle", 0.05, 1320)),
    hit: () => throttled("hit", 0.05, () => tone(220, 0.07, "square", 0.035, 140)),
    kill: () => throttled("kill", 0.06, () => tone(520, 0.12, "sine", 0.06, 260)),
    pickup: () => throttled("pickup", 0.04, () => tone(1200 + Math.random() * 300, 0.06, "sine", 0.05, 1800)),
    hurt: () => throttled("hurt", 0.2, () => tone(160, 0.25, "sawtooth", 0.09, 80)),
    pulse: () => throttled("pulse", 0.2, () => tone(300, 0.35, "sine", 0.1, 900)),
    levelUp: () => {
      [523, 659, 784, 1047].forEach((f, i) =>
        setTimeout(() => tone(f, 0.18, "triangle", 0.09), i * 70)
      );
    },
    boss: () => tone(90, 1.2, "sawtooth", 0.12, 60),
    win: () => {
      [523, 659, 784, 1047, 1319].forEach((f, i) =>
        setTimeout(() => tone(f, 0.35, "sine", 0.1), i * 120)
      );
    },
    lose: () => {
      [392, 330, 262, 196].forEach((f, i) =>
        setTimeout(() => tone(f, 0.4, "triangle", 0.09), i * 160)
      );
    },
    click: () => tone(660, 0.05, "sine", 0.05),
  };

  // Música ambiental: arpegio suave en escala pentatónica.
  const SCALE = [220, 261.6, 293.7, 329.6, 392, 440, 523.3, 587.3];
  const PATTERN = [0, 2, 4, 5, 4, 2, 3, 1, 0, 2, 4, 6, 5, 4, 2, 3];

  function startMusic() {
    if (musicTimer) return;
    musicTimer = setInterval(() => {
      if (!ctx || ctx.state !== "running") return;
      const idx = PATTERN[musicStep % PATTERN.length];
      tone(SCALE[idx], 0.9, "sine", 0.25, null, musicBus);
      if (musicStep % 8 === 0) tone(SCALE[0] / 2, 2.4, "triangle", 0.3, null, musicBus);
      musicStep++;
    }, 330);
  }
  function stopMusic() {
    clearInterval(musicTimer);
    musicTimer = null;
  }

  window.LW = window.LW || {};
  window.LW.audio = { unlock, setMuted, setMusic, setAdMuted, sfx, startMusic, stopMusic, get muted() { return muted; } };
})();
