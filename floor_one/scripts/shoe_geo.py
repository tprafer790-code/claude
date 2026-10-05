"""FLOOR/ONE - definición paramétrica de la horma y del patronaje (numpy puro).

Sistema de coordenadas (zapatilla derecha, metros):
  x: talón (0) -> puntera (L)    y: +lateral / -medial    z: arriba, z=0 = base del upper
Todas las curvas de patronaje están aquí para que modelo, costuras y QA usen la misma fuente.
"""
import numpy as np

L = 0.290          # longitud del upper (EU 42 aprox.)
TH = 0.0025        # grosor de la carcasa del upper
P_EXP, Q_EXP = 3.0, 2.4   # superelipse de la sección transversal


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def _halfwidths(x):
    x = np.asarray(x, float)
    base = np.interp(x, [0, 0.03, 0.07, 0.12, 0.17, 0.20, 0.235, 0.29],
                     [0.031, 0.033, 0.034, 0.036, 0.0445, 0.0465, 0.044, 0.030])
    heel = np.where(x < 0.03, np.sqrt(np.clip(1 - ((0.03 - x) / 0.03) ** 2, 0, 1)), 1.0)
    t = np.clip((x - 0.215) / (L - 0.215), 0, 1)
    toe = np.where(x > 0.215, np.clip(1 - t ** 2.3, 0, 1) ** (1 / 2.3), 1.0)
    w = base * heel * toe
    wl = w * (1 - 0.10 * smooth(0.19, 0.29, x))   # lado lateral más recogido en la puntera
    wm = w * (1 + 0.04 * smooth(0.15, 0.25, x))   # lado medial (dedo gordo)
    return wl, wm


def center_halfwidth(x):
    wl, wm = _halfwidths(x)
    return (wl - wm) / 2.0, (wl + wm) / 2.0


def top_height(x):
    """Altura del volumen de la horma (perfil lateral)."""
    x = np.asarray(x, float)
    T = np.interp(x, [0, 0.04, 0.09, 0.125, 0.17, 0.21, 0.25, 0.275, 0.29],
                  [0.080, 0.087, 0.099, 0.095, 0.074, 0.054, 0.041, 0.032, 0.020])
    t = np.clip((x - 0.255) / (L - 0.255), 0, 1)
    T = T * np.where(x > 0.255, np.sqrt(np.clip(1 - t ** 2, 0, 1)) * 0.75 + 0.25 * (1 - t), 1.0)
    return T


def last_f(x, y, z):
    """<0 dentro de la horma exterior."""
    c, w = center_halfwidth(x)
    T = top_height(x)
    w = np.maximum(w, 1e-6)
    T = np.maximum(T, 1e-6)
    zz = np.clip(z, 0, None)
    f = (np.abs(y - c) / w) ** P_EXP + (zz / T) ** Q_EXP - 1
    return np.where(z < 0, 1.0, f)


def ztop(x, y):
    """Altura de la superficie superior de la horma en (x, y)."""
    c, w = center_halfwidth(x)
    T = top_height(x)
    r = np.clip(np.abs(y - c) / np.maximum(w, 1e-6), 0, 1)
    return T * np.clip(1 - r ** P_EXP, 0, 1) ** (1 / Q_EXP)


def collar_h(x):
    """Altura del borde del cuello (apertura del tobillo); > top => sin corte."""
    return np.interp(x, [-0.01, 0.006, 0.03, 0.06, 0.085, 0.105, 0.118, 0.13, 0.30],
                     [0.076, 0.0765, 0.073, 0.066, 0.068, 0.078, 0.093, 0.120, 0.120])


def throat_hw(x):
    """Semiancho de la garganta (hueco de la lengüeta)."""
    x = np.asarray(x, float)
    w = np.interp(x, [0.095, 0.12, 0.15, 0.172, 0.182], [0.017, 0.016, 0.0125, 0.0095, 0.0])
    w = np.where(x > 0.172, 0.0095 * np.sqrt(np.clip(1 - ((x - 0.172) / 0.0105) ** 2, 0, 1)), w)
    return np.where((x < 0.095) | (x > 0.1825), 0.0, w)


# ------------------------------------------------------------------ patronaje
# Convención: función < 0 => dentro de la pieza.
def f_heel_counter(P):
    x, z = P[:, 0], P[:, 2]
    edge = 0.064 - 0.36 * z - 1.5 * (z - 0.04) ** 2
    return x - edge


def f_mudguard(P):
    x, z = P[:, 0], P[:, 2]
    # borde superior: banda baja en la puntera que sube hacia el ojalillo
    top = 0.019 + 0.068 * smooth(0.222, 0.150, x) ** 1.8
    rear = 0.128 + 0.42 * z
    return np.maximum(z - top, rear - x)


def f_eyestay(P):
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    c, _ = center_halfwidth(x)
    tw = throat_hw(x)
    d = np.abs(y - c) - tw - 0.0135
    inx = np.maximum(0.096 - x, x - 0.192)
    return np.maximum(np.maximum(d, inx), 0.045 - z)


def stripe_center(x):
    """Curva central de la franja naranja (Bezier cuadrática en plano XZ)."""
    p0, p1, p2 = np.array([0.150, 0.036]), np.array([0.108, 0.010]), np.array([0.044, 0.056])
    t = np.linspace(0, 1, 400)[:, None]
    pts = (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t ** 2 * p2
    order = np.argsort(pts[:, 0])
    return np.interp(x, pts[order, 0], pts[order, 1])


def f_stripe(P):
    x, z = P[:, 0], P[:, 2]
    hw = 0.0068 + 0.0012 * smooth(0.15, 0.06, x)
    d = np.abs(z - stripe_center(x)) - hw
    return np.maximum(d, np.maximum(0.036 - x, x - 0.150))


def f_collar_band(P):
    x, z = P[:, 0], P[:, 2]
    return np.maximum((collar_h(x) - 0.011) - z, x - 0.112)


def f_vamp(P):
    return 0.163 - P[:, 0]
