// Ambiente sonoro procedural (Web Audio, sin archivos): viento entre árboles,
// agua y pájaros ocasionales. Solo se crea tras una acción del usuario.
export function createAmbience() {
  let ctx = null, master, windGain, waterGain, birdsOn = true, birdTimer = 0, mix = 0;

  function noiseBuffer(type) {
    const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else { b0 = 0.997 * b0 + w * 0.029; b1 = 0.985 * b1 + w * 0.032; b2 = 0.95 * b2 + w * 0.048; d[i] = (b0 + b1 + b2 + w * 0.02) * 0.6; }
    }
    return buf;
  }
  function loop(buf) { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; }

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    // viento: ruido marrón filtrado con ráfagas lentas
    const w = loop(noiseBuffer('brown')), wf = ctx.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 500;
    windGain = ctx.createGain(); windGain.gain.value = 0.5;
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 0.07; lfoG.gain.value = 260; lfo.connect(lfoG).connect(wf.frequency); lfo.start();
    w.connect(wf).connect(windGain).connect(master);
    // agua: ruido rosa en banda con modulación de chapoteo
    const a = loop(noiseBuffer('pink')), af = ctx.createBiquadFilter(); af.type = 'bandpass'; af.frequency.value = 900; af.Q.value = 0.7;
    waterGain = ctx.createGain(); waterGain.gain.value = 0.1;
    const lap = ctx.createOscillator(), lapG = ctx.createGain(); lap.frequency.value = 0.35; lapG.gain.value = 0.06; lap.connect(lapG).connect(waterGain.gain); lap.start();
    a.connect(af).connect(waterGain).connect(master);
  }

  function chirp() {
    if (!ctx || !birdsOn) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), p = ctx.createStereoPanner();
    const f = 2600 + Math.random() * 1800;
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (0.6 + Math.random() * 0.8), t + 0.12);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.025 * (1 - mix), t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    p.pan.value = Math.random() * 2 - 1;
    o.connect(g).connect(p).connect(master); o.start(t); o.stop(t + 0.2);
  }

  return {
    get on() { return !!ctx && master.gain.value > 0.01; },
    async enable() {
      if (!ctx) init();
      await ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0.5, ctx.currentTime, 0.6);
      clearInterval(birdTimer);
      birdTimer = setInterval(() => { if (Math.random() < 0.45) { chirp(); if (Math.random() < 0.5) setTimeout(chirp, 140); } }, 1300);
    },
    disable() {
      if (!ctx) return;
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
      clearInterval(birdTimer);
    },
    // 0 = bosque, 1 = lago
    setMix(m) {
      mix = m;
      if (!ctx) return;
      windGain.gain.setTargetAtTime(0.55 - m * 0.3, ctx.currentTime, 0.5);
      waterGain.gain.setTargetAtTime(0.06 + m * 0.22, ctx.currentTime, 0.5);
      birdsOn = m < 0.8;
    },
  };
}
