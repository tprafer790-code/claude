"""FLOOR/ONE - música original (breakbeat 120 BPM, 15 compases) y foley sintetizado. 100 % generado aquí.

Salida (48 kHz, 24 bit): audio/music.wav, audio/sfx.wav, audio/mix.wav
Mezcla objetivo: -14 LUFS integrados, true peak <= -1 dBTP (verificado después con FFmpeg ebur128).
Uso: /opt/bvenv/bin/python scripts/audio.py
"""
import os
import numpy as np
import soundfile as sf
import pyloudnorm as pyln
from scipy import signal

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SR = 48000
DUR = 30.0
N = int(SR * DUR)
BPM = 120
BEAT = 60 / BPM          # 0.5 s
STEP = BEAT / 4          # semicorchea
SWING = 0.16             # retraso de las semicorcheas impares (fracción de STEP)
rng = np.random.default_rng(2024)


def buf():
    return np.zeros((N, 2))


def place(dst, x, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= N or i + len(x) <= 0:
        return
    if x.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        x = np.stack([x * l, x * r], 1) * np.sqrt(2)
    a, b = max(0, i), min(N, i + len(x))
    dst[a:b] += x[a - i:b - i] * gain


def env(n, a=0.002, d=0.2, curve=1.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-5)) * np.exp(-t / d) ** curve
    return e


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], "bandpass", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, "lowpass", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, "highpass", fs=SR, output="sos"), x)


def noise(sec):
    return rng.standard_normal(int(sec * SR))


# ------------------------------------------------------------------ instrumentos
def kick(vel=1.0):
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 46 + 95 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * env(n, 0.001, 0.22)
    click = hp(noise(0.01), 2000) * env(int(0.01 * SR), 0.0002, 0.002)
    out = body.copy(); out[:len(click)] += click * 0.35
    return np.tanh(out * 1.6) * vel


def snare(vel=1.0):
    n = int(0.3 * SR); t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 190 * t) * env(n, 0.0005, 0.05) * 0.6
    nz = bp(rng.standard_normal(n), 900, 7500) * env(n, 0.0005, 0.09)
    return np.tanh((tone + nz * 1.4) * 1.2) * vel


def hat(vel=1.0, open_=False):
    n = int((0.25 if open_ else 0.06) * SR)
    x = hp(rng.standard_normal(n), 7000, 3) * env(n, 0.0003, 0.09 if open_ else 0.018)
    return x * vel


def rim(vel=1.0):
    n = int(0.06 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1700 * t) * 0.5 + bp(rng.standard_normal(n), 2000, 6000)) * env(n, 0.0002, 0.012) * vel


def bass_note(freq, dur, vel=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * freq * t) + 0.25 * np.sin(2 * np.pi * 2 * freq * t) + 0.12 * signal.sawtooth(2 * np.pi * freq * t)
    e = np.minimum(1, t / 0.005) * np.exp(-t / (dur * 0.9)) * np.minimum(1, (dur - t) / 0.02).clip(0)
    return lp(np.tanh(x * 1.3), 380) * e * vel


def pad_chord(freqs, dur, cutoff=1200):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for f in freqs:
        for det in (-0.12, 0.0, 0.13):
            x += signal.sawtooth(2 * np.pi * f * (1 + det / 100) * t + rng.uniform(0, 6))
    x = lp(x / (len(freqs) * 3), cutoff, 2)
    e = np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.8).clip(0)
    return x * e


def reverb(x, sec=0.9, mix=0.25):
    n = int(sec * SR)
    ir = rng.standard_normal((n, 2)) * np.exp(-np.arange(n) / SR / (sec / 5))[:, None]
    ir = np.stack([lp(ir[:, 0], 6000), lp(ir[:, 1], 6000)], 1)
    ir /= np.sqrt((ir ** 2).sum(0))
    y = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[:N] for c in range(2)], 1)
    return x * (1 - mix) + y * mix


# ------------------------------------------------------------------ música
E1, G1, A1, B1, D2 = 41.20, 49.00, 55.00, 61.74, 73.42
PAT_A = dict(k=[0, 10], s=[4, 12], g=[9, 15], h=list(range(0, 16, 2)), h16=[3, 11], oh=[14])
PAT_B = dict(k=[0, 3, 10, 11], s=[4, 12], g=[7, 9, 14], h=list(range(0, 16, 2)), h16=[5, 13, 15], oh=[6])


def step_time(bar, st):
    t = bar * 2.0 + st * STEP
    if st % 2 == 1:
        t += SWING * STEP
    return t


def music():
    drums = buf(); bass = buf(); pads = buf(); perc = buf()
    plan = {0: "intro", 1: "A", 2: "A", 3: "A", 4: "A+", 5: "B", 6: "B", 7: "B", 8: "B", 9: "B+",
            10: "drop", 11: "B", 12: "B", 13: "B", 14: "end"}
    prog = [E1, E1, G1, G1, E1, A1, G1, E1, E1, A1, E1, E1, G1, A1, E1]
    for bar in range(15):
        mode = plan[bar]
        if mode == "intro":
            for st in (2, 6, 10, 14):
                place(drums, lp(hat(0.25), 5000), step_time(bar, st), pan=0.2)
            place(drums, kick(0.9), 0.5)                 # golpe grave con el contacto
            place(drums, kick(0.5), step_time(bar, 10))
            continue
        if mode == "drop":                               # 20-22 s: el beat se vacía
            continue
        if mode == "end":                                # 28-30 s: último golpe en 29.0 s y cola
            for st in (0, 4, 8):
                place(drums, kick(0.9), step_time(bar, st))
            place(drums, snare(0.8), step_time(bar, 4), pan=0.05)
            for st in range(0, 8, 2):
                place(drums, hat(0.4), step_time(bar, st), pan=0.25)
            place(drums, kick(1.15), 29.0); place(drums, snare(1.0), 29.0)
            place(bass, bass_note(E1, 0.9, 1.0), 29.0)
            continue
        P = PAT_A if mode.startswith("A") else PAT_B
        for st in P["k"]:
            place(drums, kick(1.0 if st == 0 else 0.85), step_time(bar, st))
        for st in P["s"]:
            place(drums, snare(1.0), step_time(bar, st), pan=0.05)
        for st in P["g"]:
            place(drums, snare(0.28), step_time(bar, st), pan=0.1)
        for st in P["h"]:
            place(drums, hat(0.55 if st % 4 == 0 else 0.4), step_time(bar, st), pan=0.25)
        for st in P["h16"]:
            place(drums, hat(0.22), step_time(bar, st), pan=0.3)
        for st in P["oh"]:
            place(drums, hat(0.35, True), step_time(bar, st), pan=0.3)
        if mode.endswith("+"):                           # relleno al final del compás
            for st in (13, 14, 15):
                place(drums, snare(0.5 + 0.15 * (st - 13)), step_time(bar, st), pan=-0.1)
        for st in (6, 13):
            place(perc, rim(0.35), step_time(bar, st), pan=-0.35)
        if bar >= 2:
            f = prog[bar]
            place(bass, bass_note(f, 0.85, 0.9), step_time(bar, 0))
            place(bass, bass_note(f, 0.2, 0.7), step_time(bar, 7))
            place(bass, bass_note(f * 1.5 if bar % 2 else f * 2, 0.25, 0.6), step_time(bar, 10))
    # pads: intro, caída (20-22) y cierre
    em9 = [164.81, 196.0, 246.94, 293.66, 369.99]
    place(pads, pad_chord(em9, 2.6, 900), 0.0, 0.18)
    place(pads, pad_chord(em9, 2.4, 700), 19.9, 0.30)
    place(pads, pad_chord(em9, 2.0, 1500), 28.0, 0.22)
    sub = np.sin(2 * np.pi * 41.2 * np.arange(int(2.0 * SR)) / SR) * np.minimum(1, np.arange(int(2.0 * SR)) / SR / 1.6)
    place(pads, sub * 0.35, 20.0)
    # platillo invertido que devuelve el beat en 22.0 s
    rev = hp(rng.standard_normal(int(1.2 * SR)), 4000) * np.linspace(0, 1, int(1.2 * SR)) ** 3
    place(perc, rev * 0.5, 22.0 - 1.2, pan=0.0)
    # crash en 10.0 (despiece) y 26.0 (titular)
    for t in (10.0, 22.0, 26.0):
        cr = hp(rng.standard_normal(int(1.8 * SR)), 3000) * env(int(1.8 * SR), 0.001, 0.6)
        place(perc, cr * 0.35, t, pan=-0.2)
    drums = reverb(drums, 0.5, 0.12)
    pads = reverb(pads, 1.6, 0.35)
    m = drums * 0.9 + bass * 0.75 + pads * 0.8 + reverb(perc, 0.9, 0.3) * 0.8
    tail = np.ones(N); i0 = int(29.6 * SR); tail[i0:] = np.linspace(1, 0, N - i0) ** 2
    return m * tail[:, None]


# ------------------------------------------------------------------ foley
def thud(vel=1.0, wood=True):
    n = int(0.35 * SR); t = np.arange(n) / SR
    low = np.sin(2 * np.pi * (70 + 40 * np.exp(-t / 0.02)) * t) * env(n, 0.0005, 0.07)
    knock = sum(np.sin(2 * np.pi * f * t) * env(n, 0.0003, d) for f, d in ((420, 0.05), (690, 0.03), (1130, 0.02))) * (0.4 if wood else 0)
    slap = bp(rng.standard_normal(n), 300, 2500) * env(n, 0.0003, 0.012)
    return np.tanh((low + knock + slap * 0.8) * 1.2) * vel


def scrape(sec, vel=1.0):
    n = int(sec * SR); t = np.arange(n) / SR
    x = bp(rng.standard_normal(n), 1500, 6000) * (0.6 + 0.4 * rng.random(n) ** 8)
    e = np.sin(np.pi * t / sec) ** 0.6
    return x * e * vel


def squeak(sec, f0, f1, vel=1.0):
    n = int(sec * SR); t = np.arange(n) / SR
    f = f0 + (f1 - f0) * (t / sec) + 40 * np.sin(2 * np.pi * 28 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)
    am = 0.6 + 0.4 * (signal.square(2 * np.pi * 55 * t) > 0)
    e = np.sin(np.pi * np.clip(t / sec, 0, 1)) ** 1.5
    return x * am * e * vel * 0.4


def fabric(sec, vel=1.0):
    n = int(sec * SR); t = np.arange(n) / SR
    x = bp(rng.standard_normal(n), 700, 4200)
    mod = 0.5 + 0.5 * np.sin(2 * np.pi * 1.7 * t + 1) * np.sin(2 * np.pi * 0.6 * t)
    return x * mod * np.sin(np.pi * t / sec) * vel


def creak(sec, vel=1.0):
    n = int(sec * SR); t = np.arange(n) / SR
    rate = 35 + 30 * t / sec
    pulses = (np.sin(2 * np.pi * np.cumsum(rate) / SR) > 0.85).astype(float)
    x = bp(pulses + 0.2 * rng.standard_normal(n), 1800, 4200)
    return x * np.sin(np.pi * t / sec) ** 0.5 * vel


def whoosh(sec, f_lo=250, f_hi=3200, vel=1.0):
    n = int(sec * SR); t = np.arange(n) / SR
    x = rng.standard_normal(n)
    out = np.zeros(n)
    blk = 1024
    zi = None
    for i in range(0, n, blk):
        u = (i + blk / 2) / n
        fc = f_lo * (f_hi / f_lo) ** np.sin(np.pi * u)
        sos = signal.butter(2, [fc * 0.6, min(fc * 1.6, 20000)], "bandpass", fs=SR, output="sos")
        if zi is None:
            zi = signal.sosfilt_zi(sos) * 0
        y, zi = signal.sosfilt(sos, x[i:i + blk], zi=zi)
        out[i:i + blk] = y
    e = np.sin(np.pi * t / sec) ** 2
    return out * e * vel


def snap(vel=1.0):
    n = int(0.08 * SR); t = np.arange(n) / SR
    return (bp(rng.standard_normal(n), 1500, 8000) * env(n, 0.0002, 0.008) + np.sin(2 * np.pi * 2300 * t) * env(n, 0.0002, 0.01) * 0.3) * vel


def shimmer(sec, vel=1.0):
    n = int(sec * SR); t = np.arange(n) / SR
    x = hp(rng.standard_normal(n), 6000) * 0.3
    for k in range(6):
        f = rng.uniform(3000, 7000); t0 = rng.uniform(0, sec * 0.8)
        x += np.sin(2 * np.pi * f * t) * np.exp(-np.clip(t - t0, 0, None) / 0.15) * (t > t0) * 0.15
    return x * np.sin(np.pi * t / sec) * vel


def sfx():
    s = buf()
    # 00-02 contacto: golpe grave + roce seco
    place(s, thud(1.0), 0.5, pan=0.0); place(s, scrape(0.35, 0.35), 0.52, pan=0.1)
    place(s, whoosh(0.5, 150, 900, 0.25), 0.0)
    # 02-04 tejido: fricción textil cercana
    place(s, fabric(1.9, 0.22), 2.05, pan=-0.2)
    # 04-06 gamuza y piel: cepillado + acentos en los cortes
    place(s, fabric(0.5, 0.18), 4.0, pan=0.3); place(s, snap(0.3), 4.5); place(s, snap(0.25), 5.267, pan=0.2)
    # 06-08 cordones: tensión (crujido) + chasquido
    place(s, creak(0.6, 0.35), 6.4, pan=-0.1); place(s, snap(0.45), 7.0)
    # 08-10 suela: rotación + arco
    place(s, whoosh(0.9, 200, 2200, 0.35), 8.0, pan=-0.3); place(s, shimmer(0.7, 0.35), 8.73, pan=0.3)
    # 10-12 despiece
    place(s, whoosh(1.1, 300, 4000, 0.45), 9.95)
    # 12-14 ensamblaje: piezas que encajan
    for t, v in ((12.667, 0.4), (12.867, 0.45), (13.067, 0.45)):
        place(s, snap(v), t)
    place(s, thud(0.75, wood=False), 13.5)
    # 14-16 pivote: aterrizaje + chirrido de caucho sobre madera
    place(s, thud(0.9), 14.5); place(s, squeak(0.9, 1500, 2300, 0.55), 14.6, pan=0.15)
    place(s, scrape(1.0, 0.18), 14.65)
    # 16-18 footwork
    place(s, thud(0.8), 16.5, pan=0.2); place(s, squeak(0.35, 1900, 2600, 0.45), 16.65)
    place(s, thud(0.7), 17.5, pan=-0.2); place(s, scrape(0.3, 0.2), 17.52)
    place(s, fabric(1.6, 0.12), 16.1, pan=0.0)
    # 18-20 sweep: barrido que cruza el estéreo de izquierda a derecha
    w = whoosh(1.75, 180, 2600, 0.8)
    pan = np.linspace(-0.8, 0.9, len(w))
    s2 = np.stack([w * np.cos((pan + 1) * np.pi / 4), w * np.sin((pan + 1) * np.pi / 4)], 1) * np.sqrt(2)
    place(s, s2, 18.1); place(s, scrape(1.2, 0.2), 18.3)
    # 20-22 freeze: respiración
    place(s, shimmer(1.8, 0.15), 20.1)
    # 22-24 hero: barrido de luz
    place(s, whoosh(1.6, 600, 5000, 0.18), 22.2, pan=0.3)
    # 24-26 identidad
    place(s, snap(0.25), 24.6); place(s, whoosh(0.6, 200, 1500, 0.25), 24.75)
    # 26-28 titular
    imp = np.sin(2 * np.pi * 45 * np.arange(int(0.9 * SR)) / SR) * env(int(0.9 * SR), 0.001, 0.25)
    place(s, imp * 0.6, 26.0); place(s, whoosh(0.5, 400, 5000, 0.3), 25.75)
    # 28-30 cierre
    place(s, imp * 0.5, 29.0)
    return reverb(s, 0.7, 0.12)


def true_peak(x):
    up = signal.resample_poly(x, 4, 1, axis=0)
    return 20 * np.log10(np.max(np.abs(up)) + 1e-12)


def limiter(x, ceiling_db=-1.3, look=0.004, rel=0.08):
    c = 10 ** (ceiling_db / 20)
    up = np.max(np.abs(signal.resample_poly(x, 4, 1, axis=0)), 1)
    pk = up.reshape(-1, 4).max(1)
    g = np.minimum(1, c / np.maximum(pk, 1e-9))
    la = int(look * SR)
    g = np.minimum.accumulate(np.r_[g[la:], np.ones(la)][::-1])[::-1] if False else g
    # mínimo en ventana de anticipación + relajación exponencial
    from scipy.ndimage import minimum_filter1d
    g = minimum_filter1d(g, size=2 * la + 1, mode="nearest")
    a = np.exp(-1 / (rel * SR))
    out = np.empty_like(g); cur = 1.0
    for i, v in enumerate(g):
        cur = v if v < cur else a * cur + (1 - a) * v
        out[i] = cur
    return x * out[:, None]


def main():
    os.makedirs(os.path.join(ROOT, "audio"), exist_ok=True)
    mus = music() * 0.5
    fx = sfx() * 0.55
    mix = mus + fx
    meter = pyln.Meter(SR)
    lufs = meter.integrated_loudness(mix)
    g = 10 ** ((-14.0 - lufs) / 20)
    mus, fx, mix = mus * g, fx * g, mix * g
    mix = limiter(mix, -1.3)
    lufs2 = meter.integrated_loudness(mix)
    g2 = 10 ** ((-14.0 - lufs2) / 20)
    mix = limiter(mix * g2, -1.3)
    print("LUFS", round(meter.integrated_loudness(mix), 2), "TP", round(true_peak(mix), 2))
    for name, x in (("music", mus * g2), ("sfx", fx * g2), ("mix", mix)):
        peak = np.max(np.abs(x))
        if name != "mix" and peak > 0.89:
            x = x * 0.89 / peak  # stems: solo evitar saturación del fichero
        sf.write(os.path.join(ROOT, "audio", f"{name}.wav"), x.astype(np.float32), SR, subtype="PCM_24")
    print("written")


if __name__ == "__main__":
    main()
