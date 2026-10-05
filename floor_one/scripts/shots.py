"""FLOOR/ONE - escena, iluminación, bailarín y animación de los 15 bloques (900 fotogramas, 30 fps).

Toda la animación se calcula aquí (funciones por plano) y se hornea con claves en f-0.25, f, f+0.25
para que el motion blur (obturador 180°) no mezcle planos en los cortes.

Uso: /opt/bvenv/bin/python scripts/scene.py [--look A|B|C]
Salida: project/floor_one.blend
"""
import os
import sys
import math
import numpy as np
import bpy
from mathutils import Vector, Matrix, Quaternion, Euler

sys.path.insert(0, os.path.dirname(__file__))
import materials as M
import shoe_geo as G

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FPS = 30
NF = 900

# ------------------------------------------------------------------ easing
def clamp01(t):
    return max(0.0, min(1.0, t))


def lin(a, b, t):
    return a + (b - a) * t


def seg(f, f0, f1):
    return clamp01((f - f0) / (f1 - f0)) if f1 != f0 else float(f >= f1)


def e_io(t):        # cúbica in-out
    t = clamp01(t)
    return 4 * t ** 3 if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2


def e_out(t, p=3):
    return 1 - (1 - clamp01(t)) ** p


def e_in(t, p=2):
    return clamp01(t) ** p


def e_sine(t):
    return 0.5 - 0.5 * math.cos(math.pi * clamp01(t))


def e_back(t, s=1.4):
    t = clamp01(t) - 1
    return t * t * ((s + 1) * t + s) + 1


def e_expo_out(t):
    t = clamp01(t)
    return 1 if t >= 1 else 1 - 2 ** (-10 * t)


def damp(t, freq=3.0, decay=6.0):
    return math.exp(-decay * t) * math.sin(2 * math.pi * freq * t) if t > 0 else 0.0


def v3(*a):
    return Vector(a if len(a) == 3 else a[0])


# ------------------------------------------------------------------ transformaciones del producto
PIVOT_C = Vector((0.145, 0.0, 0.03))       # centro visual de la zapatilla (local)
BALL = Vector((0.205, -0.008, -0.0265))    # centro del pivote del antepié (suela)
HEEL = Vector((0.045, 0.0, -0.0265))
SOLE_Z = 0.0265


def rot(yaw=0, pitch=0, roll=0):
    """yaw sobre Z, pitch sobre Y (positivo levanta talón), roll sobre X (grados)."""
    return (Matrix.Rotation(math.radians(yaw), 4, "Z") @ Matrix.Rotation(math.radians(pitch), 4, "Y")
            @ Matrix.Rotation(math.radians(roll), 4, "X"))


def place(world_pt, local_pt, R):
    return Matrix.Translation(world_pt) @ R @ Matrix.Translation(-local_pt)


def on_floor(x, y, yaw, lift=0.0):
    """Zapatilla apoyada: centro (x, y) en el suelo."""
    return place(Vector((x, y, SOLE_Z + lift)), Vector((0.145, 0, 0)), rot(yaw))


def float_at(c, yaw=0, pitch=0, roll=0):
    return place(Vector(c), PIVOT_C, rot(yaw, pitch, roll))


def outer_pt(x, z, side=1, off=0.0):
    """Punto de la superficie exterior del upper (local) y su normal aproximada."""
    c, w = G.center_halfwidth(np.array(x))
    T = G.top_height(np.array(x))
    r = np.clip(1 - (z / T) ** G.Q_EXP, 0, 1) ** (1 / G.P_EXP)
    y = float(c + side * w * r)
    n = Vector((0, side, 0.25 * z / float(T))).normalized()
    p = Vector((x, y, z)) + n * off
    return p, n


# ------------------------------------------------------------------ estado por fotograma
class S(dict):
    pass


LOOK = {"A": dict(key=1.0, rim=1.0, fill=1.0), "B": dict(key=0.8, rim=1.6, fill=0.6), "C": dict(key=1.25, rim=0.6, fill=1.5)}


def base_state():
    s = S()
    s["parts"] = {"UPPER": 0.0, "INSOLE": 0.0, "MIDSOLE": 0.0, "OUTSOLE": 0.0}
    s["lace"] = 0.0
    s["rootL"] = None
    s["dancer"] = None
    s["ring"] = (0.0, 0.0, 0.0)
    s["trail"] = (0.0, 0.0, 0.0)
    s["key"] = dict(loc=Vector((0.45, 0.9, 1.1)), tgt=Vector((0, 0, 0.05)), e=1.0, size=1.1)
    s["rim"] = dict(loc=Vector((-0.9, -0.7, 0.35)), tgt=Vector((0, 0, 0.06)), e=1.0, size=0.5)
    s["fill"] = dict(loc=Vector((0.9, 0.2, 0.25)), tgt=Vector((0, 0, 0.05)), e=1.0, size=1.6)
    s["spot"] = dict(loc=Vector((0.3, 0.6, 0.6)), tgt=Vector((0, 0, 0.05)), e=0.0, size=12.0)
    s["practical"] = 1.0
    s["dof"] = True
    return s


def cam(s, loc, tgt, lens, fstop=5.6, focus=None, roll=0.0):
    s["cam"] = dict(loc=Vector(loc), tgt=Vector(tgt), lens=lens, fstop=fstop,
                    focus=(Vector(loc) - Vector(tgt)).length if focus is None else focus, roll=roll)


def W(M_, p):
    return M_ @ Vector(p)


# ------------------------------------------------------------------ planos
def shot01(f):  # 00-02 CONTACTO
    s = base_state()
    fc = 15.0   # contacto en 0.5 s = pulso 2
    if f < fc:
        h = 0.11 * (1 - (f / fc) ** 2)
        pitch = 5 * (1 - f / fc)
    else:
        h = 0.0
        pitch = 0.0
    sq = 1.0 - 0.012 * damp((f - fc) / 30.0, 2.0, 5.0) if f >= fc else 1.0
    Mr = place(Vector((0, 0, SOLE_Z * sq + h)), Vector((0.145, 0, 0)), rot(-8, pitch)) @ Matrix.Diagonal((1, 1, sq, 1))
    s["root"] = Mr
    shake = 0.0016 * damp((f - fc) / 30.0, 4.0, 7.0) if f >= fc else 0.0
    dolly = e_sine(f / 60.0)
    cam(s, (0.02 + 0.02 * dolly, 0.62 - 0.11 * dolly, 0.028 + shake), (0.0, 0.0, 0.045 + shake * 0.5), 40, fstop=4.0)
    s["key"]["e"] = lin(0.12, 1.0, e_io(seg(f, 0, 20))) * (1 + 0.5 * math.exp(-max(0, f - fc) / 3.0) * (f >= fc))
    s["rim"]["e"] = 1.0 + 1.2 * math.exp(-max(0, f - fc) / 4.0) * (f >= fc)
    s["fill"]["e"] = lin(0.3, 1.0, seg(f, 10, 40))
    return s


def shot02(f):  # 02-04 TEJIDO (macro 100 mm)
    s = base_state()
    s["root"] = on_floor(0, 0, -8)
    t = e_io(f / 60.0)
    x = lin(0.078, 0.096, t)
    z = lin(0.050, 0.037, t)
    p, n = outer_pt(x, z, 1)
    tang = Vector((-1.0, 0, -0.45)).normalized()
    camp = p + n * 0.13 + Vector((0, 0, 0.05)) + tang * 0.02
    Mr = s["root"]
    tgt = W(Mr, p)
    # foco: hilo cercano -> costura de la franja (rack focus en 0.8-1.4 s)
    near = (W(Mr, camp) - tgt).length - 0.012
    far = (W(Mr, camp) - tgt).length
    focus = lin(near, far, e_io(seg(f, 22, 42)))
    cam(s, W(Mr, camp), tgt, 100, fstop=8.0, focus=focus)
    # haz estrecho rasante que barre el tejido
    sp = W(Mr, p + Vector((lin(0.25, -0.05, e_sine(f / 60)), 0.12, 0.30)))
    s["spot"] = dict(loc=sp, tgt=tgt, e=lin(0.0, 1.0, seg(f, 0, 8)), size=9.0)
    s["key"]["e"] = 0.35
    s["fill"]["e"] = 0.5
    return s


def shot03(f):  # 04-06 GAMUZA Y PIEL: 3 subplanos (cortes en 15 y 38 = caja/hi-hat)
    s = base_state()
    s["root"] = on_floor(0, 0, -8)
    Mr = s["root"]
    if f < 15:
        t = f / 15.0
        p, n = outer_pt(lin(0.150, 0.162, t), lin(0.030, 0.034, t), 1)
        camp = p + n * 0.15 + Vector((0.02, 0, 0.06))
        cam(s, W(Mr, camp), W(Mr, p), 85, fstop=8)
        s["spot"] = dict(loc=W(Mr, p + Vector((-0.05, 0.10, 0.35))), tgt=W(Mr, p), e=0.8, size=14.0)
        s["key"]["e"] = 0.4
    elif f < 38:
        t = (f - 15) / 23.0
        p = Vector((lin(0.235, 0.255, e_sine(t)), lin(0.012, 0.004, t), 0.039))
        camp = p + Vector((0.035, 0.15, 0.11))
        cam(s, W(Mr, camp), W(Mr, p), 85, fstop=8)
        s["spot"] = dict(loc=W(Mr, p + Vector((0.25, 0.2, 0.12))), tgt=W(Mr, p), e=1.0, size=16.0)
        s["key"]["e"] = 0.55
    else:
        t = (f - 38) / 22.0
        p = Vector((0.280, lin(0.0, 0.014, e_sine(t)), 0.022))
        camp = p + Vector((0.20, lin(0.09, 0.12, t), 0.055))   # más alta: la entresuela ya no tapa en primer término
        cam(s, W(Mr, camp), W(Mr, p), 85, fstop=8)
        s["spot"] = dict(loc=W(Mr, p + Vector((0.05, 0.25, 0.25))), tgt=W(Mr, p), e=0.9, size=18.0)
        s["key"]["e"] = 0.6
        s["rim"]["e"] = 1.4
    return s


def shot04(f):  # 06-08 CORDONES: órbita corta + tensión
    s = base_state()
    s["root"] = on_floor(0, 0, -8)
    Mr = s["root"]
    tgt = W(Mr, (0.140, 0.0, 0.088))
    az = math.radians(lin(60, 100, e_io(f / 60.0)))
    el = math.radians(lin(38, 30, f / 60.0))
    d = 0.33
    loc = tgt + Vector((math.cos(az) * math.cos(el), math.sin(az) * math.cos(el), math.sin(el))) * d
    cam(s, loc, tgt, 85, fstop=8)
    tl = seg(f, 12, 30)
    s["lace"] = e_back(tl, 2.2) if f >= 12 else 0.0
    s["rim"]["e"] = 1.0 + 1.0 * math.exp(-max(0, f - 30) / 5.0) * (f >= 30)
    s["key"]["e"] = 0.8
    return s


def shot05(f):  # 08-10 SUELA: rotación + giro breve con arco
    s = base_state()
    c = Vector((0.0, 0.0, 0.16))
    roll = 92 * e_io(seg(f, 0, 26))
    spin = 26 * e_back(seg(f, 24, 44), 1.2)
    R = rot(-10 + spin * 0.0, 0, 0) @ rot(0, 0, roll) @ Matrix.Rotation(math.radians(spin), 4, Vector((0, 0, 1)))
    s["root"] = place(c, PIVOT_C, R)
    pv = s["root"] @ BALL
    tgt = lin_v(c, pv, 0.35)
    cam(s, Vector((tgt.x - 0.05, 0.62, tgt.z - 0.03)), tgt, 60, fstop=8)
    s["ring"] = (e_io(seg(f, 40, 56)), e_out(seg(f, 22, 38)), 1.0 if 22 <= f < 57 else 0.0)
    s["key"]["e"] = 0.9
    s["fill"]["e"] = 1.4
    return s


def lin_v(a, b, t):
    return a + (b - a) * t


EXP = {"UPPER": 0.075, "INSOLE": 0.038, "MIDSOLE": 0.0, "OUTSOLE": -0.040}


def shot06(f):  # 10-12 DESPIECE
    s = base_state()
    c = Vector((0, 0, 0.16))
    s["root"] = float_at(c, yaw=-25, pitch=0, roll=0)
    t = e_out(seg(f, 0, 32), 3)
    for k, v in EXP.items():
        s["parts"][k] = v * t + 0.002 * math.sin(f / 9.0 + len(k)) * t
    az = math.radians(lin(32, 58, e_io(f / 60.0)))
    loc = c + Vector((math.cos(az), math.sin(az), 0.0)) * 0.78 + Vector((0, 0, 0.05))
    cam(s, loc, c + Vector((0, 0, 0.008)), 50, fstop=11)
    s["key"]["e"] = 0.95
    return s


def shot07(f):  # 12-14 ENSAMBLAJE (+ corte al cierre en f=42)
    s = base_state()
    c = Vector((0, 0, 0.16))
    yaw = -25 + 6 * e_io(f / 45.0)
    timing = {"OUTSOLE": (0, 20, 3), "MIDSOLE": (4, 26, 3), "INSOLE": (8, 32, 2), "UPPER": (12, 45, 4)}
    for k, (a, b, p) in timing.items():
        tt = seg(f, a, b)
        e = e_io(tt) if k != "UPPER" else 1 - (1 - tt) ** p
        settle = -0.0012 * damp((f - b) / 30.0, 2.5, 8) if (k == "UPPER" and f >= b) else 0.0
        s["parts"][k] = EXP[k] * (1 - e) + settle
    if f < 45:   # corte en 13.5 s (pulso) cuando desaparece la última separación
        s["root"] = float_at(c, yaw=yaw)
        az = math.radians(58 + 6 * f / 45.0)
        loc = c + Vector((math.cos(az), math.sin(az), 0.0)) * lin(0.78, 0.66, e_io(f / 45.0)) + Vector((0, 0, 0.05))
        cam(s, loc, c, 50, fstop=11)
    else:
        t = (f - 45) / 15.0
        s["root"] = float_at(c, yaw=-19 + 4 * t)
        loc = c + Vector((0.12, 0.50, -0.035))
        cam(s, loc + Vector((-0.03 * t, -0.03 * t, 0)), c + Vector((0.0, 0, 0.0)), 45, fstop=8)
        s["rim"]["e"] = 1.6 * math.exp(-(f - 45) / 6.0) + 1.0
    s["key"]["e"] = 0.95
    return s


def shot08(f):  # 14-16 PIVOTE en el antepié
    s = base_state()
    land = 15.0   # aterrizaje en 14.5 s
    h = 0.035 * (1 - e_in(seg(f, 0, land), 2))
    yaw = -10 + 150 * e_io(seg(f, 17, 54))
    lift = 5.0 * math.sin(math.pi * seg(f, 16, 56))
    pv_world = Vector((0.06, 0.0, 0.0))
    R = rot(yaw, lift)
    s["root"] = Matrix.Translation(Vector((0, 0, h))) @ place(pv_world, BALL, R)
    az = math.radians(lin(80, 20, e_io(seg(f, 4, 56))))
    tgt = Vector((0.0, 0.0, 0.05))
    loc = tgt + Vector((math.cos(az), math.sin(az), 0.0)) * 0.62 + Vector((0, 0, 0.0))
    loc.z = 0.06
    cam(s, loc, tgt, 35, fstop=5.6)
    s["trail"] = (e_io(seg(f, 30, 59)), e_io(seg(f, 17, 54)), 1.0 if 17 <= f < 59.5 else 0.0)
    s["rim"]["e"] = 1.2
    return s


# ---------- bailarín
FOOT_ANK = Vector((0.052, 0.0, 0.082))


def foot_M(ball_xy, yaw, pitch=0.0, h=0.0, pivot="ball", mirror=False):
    lp = BALL if pivot == "ball" else HEEL
    lp = Vector((lp.x, -lp.y if mirror else lp.y, lp.z))
    Mx = place(Vector((ball_xy[0], ball_xy[1], h)), lp, rot(yaw, pitch))
    if mirror:
        Mx = Mx @ Matrix.Diagonal((1, -1, 1, 1))
    return Mx


def keyed(f, keys):
    """Interpolación por tramos con easing in-out entre poses clave [(f, valor), ...]."""
    if f <= keys[0][0]:
        return keys[0][1]
    for (fa, va), (fb, vb) in zip(keys, keys[1:]):
        if f <= fb:
            t = e_io((f - fa) / (fb - fa))
            if isinstance(va, (tuple, list)):
                return tuple(lin(a, b, t) for a, b in zip(va, vb))
            return lin(va, vb, t)
    return keys[-1][1]


def shot09(f):  # 16-18 FOOTWORK: paso adelante del pie derecho, pivote, cruce del izquierdo
    s = base_state()
    # pie derecho (protagonista): ball (x,y), yaw, altura, pitch
    rx = keyed(f, [(0, -0.05), (2, -0.05), (15, 0.24), (60, 0.24)])
    ry = keyed(f, [(0, -0.11), (2, -0.11), (15, -0.09), (60, -0.09)])
    rh = 0.065 * math.sin(math.pi * seg(f, 2, 15)) ** 1.2
    ryaw = keyed(f, [(0, 8), (15, 0), (18, 0), (30, -32), (60, -28)])
    # talón primero: dedos arriba (pitch < 0) girando sobre la bola, elevada para que el talón toque
    if f < 15:
        rp = -10 * math.sin(math.pi * seg(f, 2, 15)) - 7 * seg(f, 10, 15)
    elif f < 19:
        rp = -7 * (1 - e_out(seg(f, 15, 19)))
    else:
        rp = 14 * math.sin(math.pi * seg(f, 19, 32))
    rh_eff = rh + (0.16 * math.sin(math.radians(-rp)) if rp < 0 else 0.0)
    MR = foot_M((rx, ry), ryaw, rp, rh_eff, "ball")
    # pie izquierdo: pivote sobre la bola y paso cruzado
    lx = keyed(f, [(0, -0.10), (30, -0.10), (45, 0.06), (60, 0.06)])
    ly = keyed(f, [(0, 0.15), (30, 0.15), (45, 0.07), (60, 0.07)])
    lh = 0.06 * math.sin(math.pi * seg(f, 30, 45))
    lyaw = keyed(f, [(0, 12), (18, 12), (30, -22), (45, -40), (60, -40)])
    lp = 16 * math.sin(math.pi * seg(f, 18, 34)) + 8 * math.sin(math.pi * seg(f, 30, 45))
    ML = foot_M((lx, ly), lyaw, lp, lh, "ball", mirror=True)
    s["root"] = MR
    s["rootL"] = ML
    bounce = -0.035 * (math.exp(-max(0, f - 15) / 5.0) * (f >= 15) * math.sin(min(1, (f - 15) / 3) * math.pi / 2) + math.exp(-max(0, f - 45) / 5.0) * (f >= 45) * math.sin(min(1, max(0, f - 45) / 3) * math.pi / 2))
    px = keyed(f, [(0, -0.20), (15, -0.05), (60, 0.02)])
    py = keyed(f, [(0, 0.02), (60, 0.0)])
    s["dancer"] = dict(pelvis=Vector((px, py, 0.66 + bounce + 0.012 * math.sin(f / 60 * 2 * math.pi * 2))),
                       pyaw=keyed(f, [(0, 5), (60, -20)]))
    # primer plano bajo del pie protagonista (ref. 4): cámara a ras, 28 mm
    tgt = Vector((rx * 0.6 + 0.05, ry * 0.6, 0.11))
    loc = Vector((0.72, -0.36, 0.055)) + Vector((-0.08, 0.03, 0)) * e_sine(f / 60)
    cam(s, loc, tgt, 28, fstop=4.0, focus=(loc - Vector((rx + 0.05, ry, 0.05))).length)
    s["key"]["loc"] = Vector((0.6, 0.9, 1.6)); s["key"]["size"] = 1.6; s["key"]["e"] = 1.7
    s["rim"]["loc"] = Vector((-1.4, 0.8, 0.9)); s["rim"]["e"] = 1.8
    s["fill"]["e"] = 1.2
    return s


def shot10(f):  # 18-20 SWEEP: el pie barre delante de la cámara y la cruza
    s = base_state()
    t = e_io(seg(f, 4, 54))
    # trayectoria del pie derecho (bola) en arco, de izquierda a derecha de cámara y hacia el objetivo
    P0, P1, P2, P3 = Vector((-0.60, -0.10)), Vector((-0.30, 0.18)), Vector((0.18, 0.20)), Vector((0.38, 0.40))
    u = t
    B = ((1 - u) ** 3) * P0 + 3 * (1 - u) ** 2 * u * P1 + 3 * (1 - u) * u ** 2 * P2 + u ** 3 * P3
    dB = (3 * (1 - u) ** 2 * (P1 - P0) + 6 * (1 - u) * u * (P2 - P1) + 3 * u ** 2 * (P3 - P2))
    yaw = math.degrees(math.atan2(dB.y, dB.x))
    h = 0.012 + 0.02 * math.sin(math.pi * t)
    MR = foot_M((B.x, B.y), yaw, -6, h, "ball")
    ML = foot_M((-0.12, -0.30), 70, 22, 0.0, "ball", mirror=True)
    s["root"] = MR
    s["rootL"] = ML
    pel = Vector((lin(-0.20, 0.05, t), lin(-0.55, -0.32, t), 0.44 - 0.03 * math.sin(math.pi * t)))
    s["dancer"] = dict(pelvis=pel, pyaw=lin(-30, 40, t) + 90)
    loc = Vector((0.0, 0.62, 0.055))
    cam(s, loc, Vector((0.0, -0.1, 0.13)), 24, fstop=4.0, focus=max(0.25, (loc - Vector((B.x, B.y, 0.05))).length))
    s["key"]["loc"] = Vector((0.5, 1.0, 1.5)); s["key"]["size"] = 1.6; s["key"]["e"] = 1.6
    s["rim"]["loc"] = Vector((-0.4, -1.6, 0.7)); s["rim"]["e"] = 2.0
    s["fill"]["e"] = 1.2
    return s


def shot11(f):  # 20-22 FREEZE: suspensión, giro parcial
    s = base_state()
    t = f / 60.0
    c = Vector((0, 0, 0.17 + 0.006 * math.sin(math.pi * t)))
    yaw = lin(-14, 12, e_out(t, 2))
    s["root"] = float_at(c, yaw=yaw, pitch=lin(-8, -3, t), roll=lin(14, 4, e_out(t, 2)))
    loc = c + Vector((0.06, 0.60, -0.02))
    cam(s, loc, c, 50, fstop=8)
    breath = 0.85 + 0.15 * math.sin(math.pi * t)
    s["key"]["e"] = breath
    s["rim"]["e"] = 1.3
    return s


def shot12(f):  # 22-24 HERO: órbita de tres cuartos, luz que recorre lateral -> puntera -> talón
    s = base_state()
    s["root"] = on_floor(0, 0, -8)
    t = e_io(f / 60.0)
    az = math.radians(lin(28, 62, t))
    tgt = Vector((0.0, 0.0, 0.05))
    loc = tgt + Vector((math.cos(az), math.sin(az), 0)) * 0.72 + Vector((0, 0, 0.13))
    cam(s, loc, tgt + Vector((0, 0, 0.0)), 45, fstop=8)
    # luz de barrido: viaja de la puntera al talón por el lateral
    sx = lin(0.55, -0.55, e_sine(f / 60.0))
    s["spot"] = dict(loc=Vector((sx, 0.55, 0.45)), tgt=Vector((sx * 0.25, 0, 0.04)), e=1.4, size=22.0)
    s["key"]["e"] = 0.75
    return s


def shot13(f):  # 24-26 IDENTIDAD: macro del talón y tirador -> silueta lateral
    s = base_state()
    s["root"] = on_floor(0, 0, -8)
    Mr = s["root"]
    if f < 30:
        t = f / 30.0
        p, n = outer_pt(0.034, 0.040, 1)
        tgt = W(Mr, p + Vector((0, 0, lin(0.0, 0.025, e_io(t)))))
        camp = p + n * 0.22 + Vector((lin(-0.05, -0.08, t), 0.0, lin(0.03, 0.06, t)))
        cam(s, W(Mr, camp), tgt, 100, fstop=11)
        s["spot"] = dict(loc=W(Mr, p + Vector((0.2, 0.25, 0.2))), tgt=tgt, e=1.0, size=18.0)
        s["key"]["e"] = 0.5
    else:
        t = (f - 30) / 30.0
        tgt = Vector((0, 0, 0.05))
        loc = Vector((lin(0.02, -0.02, t), 0.75, 0.05))
        cam(s, loc, tgt, 50, fstop=8)
        s["key"]["e"] = lin(0.5, 0.0, e_io(seg(f, 30, 38)))
        s["fill"]["e"] = 0.15
        s["rim"]["e"] = 2.2
        s["rim"]["loc"] = Vector((0.05, -0.85, 0.30))
        s["rim"]["tgt"] = Vector((0.0, 0.0, 0.06))
    return s


def shot14(f):  # 26-28 CAMPAÑA
    s = base_state()
    t = f / 60.0
    s["root"] = on_floor(0.0, 0.0, lin(-40, -30, e_out(t, 2)))
    tgt = Vector((0.0, 0.0, 0.05))
    az = math.radians(48)
    loc = tgt + Vector((math.cos(az), math.sin(az), 0)) * lin(0.62, 0.58, t) + Vector((0, 0, -0.012))
    side = Vector((math.sin(az), -math.cos(az), 0)) * 0.08
    cam(s, loc + side, tgt + side + Vector((0, 0, 0.055)), 35, fstop=8)
    s["rim"]["e"] = 1.4
    s["key"]["e"] = 1.0
    return s


def shot15(f):  # 28-30 CIERRE
    s = base_state()
    t = f / 60.0
    s["root"] = on_floor(0.0, 0.0, -18 + 4 * e_out(t, 2))
    tgt = Vector((0.0, 0.0, 0.06))
    az = math.radians(70)
    loc = tgt + Vector((math.cos(az), math.sin(az), 0)) * lin(0.84, 0.90, e_out(t, 2)) + Vector((0, 0, 0.11))
    # producto en el tercio derecho: desplazamos el objetivo a la izquierda del producto
    off = Vector((-math.sin(az), math.cos(az), 0)) * -0.0
    side = Vector((math.sin(az), -math.cos(az), 0)) * 0.13
    cam(s, loc + side, tgt + side + Vector((0, 0, 0.05)), 42, fstop=8)
    s["key"]["e"] = lin(1.0, 0.9, t)
    return s


SHOTS = [shot01, shot02, shot03, shot04, shot05, shot06, shot07, shot08, shot09, shot10,
         shot11, shot12, shot13, shot14, shot15]


def state_at(frame, sub=0.0):
    """frame: fotograma entero 1..900; sub: desplazamiento de subfotograma (motion blur).
    El plano lo decide el fotograma entero, así el desenfoque nunca cruza un corte."""
    i = (frame - 1) // 60
    local = (frame - 1) - 60 * i + sub
    return i, SHOTS[i](local)
