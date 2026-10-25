"""Genera los bocetos SVG de la Bottega como trazos sueltos con temblor de mano.

Cada boceto se escribe dos veces: una capa «fantasma» (el dibujo preparatorio,
siempre visible) y una capa de tinta cuyos trazos se dibujan con el scroll.
Uso: lo llama construir.py; no hace falta ejecutarlo a mano.
"""
import math
import random

rnd = random.Random(1452)


def _jit(p, a=0.7):
    return (p[0] + rnd.uniform(-a, a), p[1] + rnd.uniform(-a, a))


def _n(v):
    if v == int(v):
        return f"{v:.0f}"
    t = f"{v:.1f}"
    return t[1:] if t.startswith("0.") else "-" + t[2:] if t.startswith("-0.") else t


def suave(pts, cerrado=False):
    """Catmull-Rom a curvas de Bézier cúbicas, en coordenadas relativas redondeadas
    (medio píxel de precisión basta para un trazo a mano y reduce el peso a la mitad)."""
    r = lambda q: (round(q[0] * 2) / 2, round(q[1] * 2) / 2)
    if len(pts) < 3:
        (x0, y0), (x1, y1) = r(pts[0]), r(pts[-1])
        return f"M{_n(x0)} {_n(y0)}l{_n(x1 - x0)} {_n(y1 - y0)}"
    p = pts + pts[:2] if cerrado else [pts[0]] + pts + [pts[-1]]
    cx, cy = r(p[1])
    d = f"M{_n(cx)} {_n(cy)}c"
    seg = []
    for i in range(1, len(p) - 2):
        a, b, c, e = p[i - 1], p[i], p[i + 1], p[i + 2]
        c1 = r((b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6))
        c2 = r((c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6))
        fin = r(c)
        nums = [c1[0] - cx, c1[1] - cy, c2[0] - cx, c2[1] - cy, fin[0] - cx, fin[1] - cy]
        seg.append(" ".join(_n(v) for v in nums))
        cx, cy = fin
    return d + " ".join(seg).replace(" -", "-")

def linea(a, b, pasos=5, temblor=0.7, exceso=0.04):
    """Recta a mano: varios puntos con temblor y un ligero exceso en los extremos."""
    ax, ay = a[0] - (b[0] - a[0]) * exceso, a[1] - (b[1] - a[1]) * exceso
    bx, by = b[0] + (b[0] - a[0]) * exceso, b[1] + (b[1] - a[1]) * exceso
    pts = [_jit((ax + (bx - ax) * t / pasos, ay + (by - ay) * t / pasos), temblor) for t in range(pasos + 1)]
    return suave(pts)


def curva(fn, t0, t1, n=34, temblor=0.5):
    return suave([_jit(fn(t0 + (t1 - t0) * i / n), temblor) for i in range(n + 1)])


def elipse(cx, cy, rx, ry, a0=0.0, a1=2 * math.pi, n=64, temblor=0.5):
    n = max(8, min(n, int(abs(a1 - a0) * max(rx, ry) / 14) + 8))
    return curva(lambda t: (cx + rx * math.cos(t), cy + ry * math.sin(t)), a0, a1, n, temblor)


def cuad(a, c, b, n=24, temblor=0.5):
    def f(t):
        u = 1 - t
        return (u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1])
    return curva(f, 0, 1, n, temblor)


def cub(a, c1, c2, b, n=30, temblor=0.5):
    def f(t):
        u = 1 - t
        return (
            u**3 * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t**3 * b[0],
            u**3 * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t**3 * b[1],
        )
    return curva(f, 0, 1, n, temblor)


def espiral(cx, cy, r, vueltas=2.2, sentido=1, aplast=0.82, fase=0.0, temblor=0.35):
    tmax = vueltas * 2 * math.pi

    def f(t):
        rr = r * (0.06 + 0.94 * t / tmax)
        a = fase + sentido * t
        return (cx + rr * math.cos(a), cy + rr * math.sin(a) * aplast)
    return curva(f, 0, tmax, int((14 + r / 4) * vueltas), temblor)


# ---------------------------------------------------------------- dibujos
# Cada dibujo devuelve (viewBox, [(d, clase)], [textos SVG]).
# Clases: tr = trazo principal · fn = trazo fino o sombreado · sn = sanguina


def tornillo():
    T = []
    cx = 210
    # Hélice: borde exterior de la vela de lino
    def borde(t):
        th = -math.pi / 2 + 2 * math.pi * 1.3 * t
        r = 165 - 45 * t
        return (cx + r * math.cos(th), 352 - 250 * t + r * 0.28 * math.sin(th))
    T.append((linea((cx, 54), (cx, 452), 8, 0.5), "tr"))
    T.append((curva(borde, 0, 1, 70, 0.4), "tr"))
    for k in range(0, 21):
        t = k / 20
        x, y = borde(t)
        T.append((linea((cx, 352 - 250 * t), (x, y), 4, 0.4, 0.0), "fn"))
    # Plataforma
    T.append((elipse(cx, 452, 122, 26), "tr"))
    T.append((elipse(cx, 468, 122, 26, 0, math.pi, 32), "tr"))
    T.append((linea((88, 452), (88, 468), 2, 0.3, 0), "tr"))
    T.append((linea((332, 452), (332, 468), 2, 0.3, 0), "tr"))
    for x in range(98, 326, 11):
        dx = (x - cx) / 122
        y0 = 452 + 26 * math.sqrt(max(0, 1 - dx * dx))
        T.append((linea((x, y0 + 1), (x, y0 + 15), 2, 0.3, 0), "fn"))
    T.append((linea((cx, 372), (118, 452), 5), "tr"))
    T.append((linea((cx, 372), (302, 452), 5), "tr"))
    T.append((linea((132, 444), (290, 461), 5), "fn"))
    T.append((linea((148, 463), (274, 441), 5), "fn"))
    # Sanguina: giro y radio
    T.append((elipse(cx, 44, 40, 9, -2.6, 2.2, 40, 0.3), "sn"))
    T.append((linea((cx + 31, 49), (cx + 41, 40), 2, 0.2, 0), "sn"))
    T.append((linea((cx + 31, 49), (cx + 44, 51), 2, 0.2, 0), "sn"))
    T.append((linea((cx, 500), (375, 500), 6, 0.4, 0), "sn"))
    T.append((linea((cx, 493), (cx, 507), 2, 0.2, 0), "sn"))
    T.append((linea((375, 493), (375, 507), 2, 0.2, 0), "sn"))
    txt = ['<text class="anota" x="292" y="522" text-anchor="middle">r = 8 braccia</text>']
    return "0 0 420 540", T, txt


def ornitoptero():
    T = []
    W = 640

    def ala(sx):
        m = (lambda p: (p[0], p[1])) if sx > 0 else (lambda p: (W - p[0], p[1]))
        borde = [(352, 196), (420, 160), (480, 132), (548, 108), (612, 92), (628, 98)]
        T.append((suave([_jit(m(p), 0.4) for p in borde]), "tr"))
        T.append((suave([_jit(m(p), 0.4) for p in [(352, 204), (418, 170), (478, 140)]]), "tr"))
        muneca = (480, 136)
        fin = [(622, 104), (604, 156), (574, 202), (532, 238), (480, 258), (424, 262)]
        for p in fin:
            c = ((muneca[0] + p[0]) / 2 + 8, (muneca[1] + p[1]) / 2 - 6)
            T.append((cuad(m(muneca), m(c), m(p)), "tr"))
        T.append((cuad(m((356, 206)), m((380, 240)), m((424, 262))), "tr"))
        for a, b in zip(fin, fin[1:]):
            c = (a[0] + (b[0] - a[0]) * 0.5 + (muneca[0] - (a[0] + b[0]) / 2) * 0.22,
                 a[1] + (b[1] - a[1]) * 0.5 + (muneca[1] - (a[1] + b[1]) / 2) * 0.22)
            T.append((cuad(m(a), m(c), m(b), 16), "fn"))
        # Sombreado de membrana junto al borde de ataque
        for k in range(8):
            t = 0.12 + k * 0.1
            x = 360 + t * 250
            y = 196 - t * 98
            T.append((linea(m((x, y + 6)), m((x - 10, y + 26)), 2, 0.3, 0), "fn"))
        T.append((elipse(m((352, 200))[0], 200, 6, 6, 0, 2 * math.pi, 20, 0.2), "sn"))
        # Arco de batida
        tip = m((630, 96))
        T.append((cuad((tip[0], 40), (tip[0] + (14 if sx > 0 else -14), 96), (tip[0], 150), 20, 0.3), "sn"))
        T.append((linea((tip[0], 150), (tip[0] + (6 if sx > 0 else -6), 140), 2, 0.2, 0), "sn"))
        T.append((linea((tip[0], 150), (tip[0] - (5 if sx > 0 else -5), 141), 2, 0.2, 0), "sn"))

    T.append((elipse(320, 214, 48, 20), "tr"))
    T.append((linea((272, 214), (368, 214), 5), "fn"))
    T.append((linea((320, 150), (320, 286), 6), "tr"))
    T.append((elipse(320, 150, 9, 9, 0, 2 * math.pi, 20, 0.2), "tr"))
    T.append((elipse(320, 292, 13, 13, 0, 2 * math.pi, 24, 0.2), "tr"))
    for x in range(282, 362, 9):
        T.append((linea((x, 222), (x + 6, 232), 2, 0.2, 0), "fn"))
    ala(1)
    ala(-1)
    T.append((linea((320, 150), (352, 196), 3), "fn"))
    T.append((linea((320, 150), (288, 196), 3), "fn"))
    return "0 0 640 320", T, []


def puente():
    T = []
    T.append((cuad((26, 168), (360, 88), (694, 168), 60), "tr"))
    T.append((cuad((34, 180), (360, 102), (686, 180), 60), "tr"))
    arco = lambda t: (
        (1 - t) ** 3 * 74 + 3 * (1 - t) ** 2 * t * 196 + 3 * (1 - t) * t * t * 524 + t ** 3 * 646,
        (1 - t) ** 3 * 252 + 3 * (1 - t) ** 2 * t * 112 + 3 * (1 - t) * t * t * 112 + t ** 3 * 252,
    )
    T.append((curva(arco, 0, 1, 70, 0.4), "tr"))
    T.append((cub((26, 168), (40, 206), (50, 236), (66, 252)), "tr"))
    T.append((cub((694, 168), (680, 206), (670, 236), (654, 252)), "tr"))
    # Enjutas sombreadas entre tablero y arco
    for k in range(0, 27):
        t = 0.04 + k * 0.92 / 26
        x, y = arco(t)
        u = (x - 34) / 652
        yd = (1 - u) ** 2 * 180 + 2 * (1 - u) * u * 102 + u * u * 180
        if y - yd > 12:
            T.append((linea((x, yd + 3), (x, y - 3), 3, 0.3, 0), "fn"))
    # Orillas
    T.append((linea((8, 168), (26, 168), 2, 0.3, 0), "tr"))
    T.append((linea((694, 168), (712, 168), 2, 0.3, 0), "tr"))
    for k in range(6):
        T.append((linea((10 + k * 8, 252), (20 + k * 6, 178), 3, 0.4, 0), "fn"))
        T.append((linea((710 - k * 8, 252), (700 - k * 6, 178), 3, 0.4, 0), "fn"))
    # Agua
    T.append((curva(lambda x: (x, 252 + 1.6 * math.sin(x / 9)), 8, 712, 90, 0.3), "tr"))
    for fila, (y, x0, x1) in enumerate([(264, 60, 300), (264, 420, 660), (276, 120, 260), (276, 470, 600), (288, 200, 330)]):
        T.append((curva(lambda x, y=y: (x, y + 1.4 * math.sin(x / 7 + fila)), x0, x1, 30, 0.3), "fn"))
    # Nave que pasa bajo el arco
    T.append((cub((300, 246), (320, 262), (384, 262), (408, 244)), "tr"))
    T.append((linea((300, 246), (408, 244), 4), "fn"))
    T.append((linea((352, 245), (352, 150), 6), "tr"))
    T.append((cuad((354, 158), (392, 196), (356, 236)), "tr"))
    T.append((linea((354, 158), (354, 236), 4, 0.3, 0), "fn"))
    # Sanguina: luz del puente
    T.append((linea((74, 300), (646, 300), 10, 0.4, 0), "sn"))
    T.append((linea((74, 292), (74, 308), 2, 0.2, 0), "sn"))
    T.append((linea((646, 292), (646, 308), 2, 0.2, 0), "sn"))
    txt = ['<text class="anota" x="360" y="330" text-anchor="middle">≈ 240 m · un solo arco</text>']
    return "0 0 720 342", T, txt


def agua():
    T = []
    for k in range(7):
        x0 = 222 + k * 6
        T.append((curva(lambda y, x0=x0, k=k: (x0 + 4 * math.sin(y / 30 + k * 0.6) + (y - 20) * 0.03 * (k - 3), y), 16, 236, 40, 0.3), "tr" if k in (0, 6) else "fn"))
    T.append((curva(lambda x: (x, 250 + 3 * math.sin(x / 14)), 30, 470, 80, 0.3), "tr"))
    # Rizos de la salpicadura
    for cx, s in [(196, -1), (286, 1), (168, -1), (312, 1)]:
        T.append((espiral(cx, 238, 16 if abs(cx - 240) < 60 else 11, 1.2, s, 0.9, math.pi, 0.25), "fn"))
    vortices = [
        (240, 312, 64, 1, "sn"), (150, 338, 44, -1, "tr"), (334, 340, 48, 1, "tr"),
        (92, 410, 32, 1, "tr"), (208, 418, 40, -1, "tr"), (318, 428, 36, 1, "tr"),
        (412, 396, 30, -1, "tr"), (150, 478, 24, 1, "fn"), (264, 484, 26, -1, "fn"),
        (372, 478, 22, 1, "fn"), (60, 470, 18, -1, "fn"), (440, 460, 18, 1, "fn"),
    ]
    for cx, cy, r, s, c in vortices:
        T.append((espiral(cx, cy, r, 2.4 if r > 30 else 1.8, s, 0.8, rnd.uniform(0, 6)), c))
    return "0 0 500 520", T, []


def vitruvio():
    """Grupos por paso: devuelve lista de (paso, d, clase)."""
    G = []
    # Paso 1 · el cuadrado
    G.append((0, suave([_jit(p, 0.6) for p in [(100, 100), (400, 99), (700, 100)]]) , "tr"))
    G.append((0, linea((700, 100), (700, 700), 8, 0.6, 0.01), "tr"))
    G.append((0, linea((700, 700), (100, 700), 8, 0.6, 0.01), "tr"))
    G.append((0, linea((100, 700), (100, 100), 8, 0.6, 0.01), "tr"))
    G.append((0, linea((100, 212), (700, 212), 8, 0.5, 0), "fn"))
    G.append((0, linea((400, 100), (400, 700), 8, 0.5, 0), "fn"))
    # Paso 2 · el círculo con centro en el ombligo
    G.append((1, elipse(400, 335, 365, 365, -math.pi / 2, 1.5 * math.pi, 120, 0.6), "tr"))
    G.append((1, linea((388, 335), (412, 335), 2, 0.2, 0), "sn"))
    G.append((1, linea((400, 323), (400, 347), 2, 0.2, 0), "sn"))
    G.append((1, linea((400, 335), (765, 335), 8, 0.4, 0), "sn"))
    # Paso 3 · ocho cabezas
    for k in range(9):
        y = 100 + 75 * k
        G.append((2, linea((76, y), (100, y), 2, 0.2, 0), "sn"))
        if 0 < k < 8:
            G.append((2, linea((100, y), (700, y), 10, 0.4, 0), "fn"))
    # Paso 4 · los cuartos
    for y in (250, 400, 550):
        G.append((3, linea((100, y), (712, y), 10, 0.5, 0), "sn"))
    # Paso 5 · la figura con contorno: postura del cuadrado en trazo y del círculo en acento
    for d in figura_cuadrado():
        G.append((4, d, "tr"))
    for d in figura_circulo():
        G.append((4, d, "sn"))
    txt = [
        '<text class="anota" data-paso="2" x="62" y="141" text-anchor="end">1/8</text>',
        '<text class="anota" data-paso="3" x="768" y="255">1/4</text>',
        '<text class="anota" data-paso="3" x="768" y="405">1/2</text>',
        '<text class="anota" data-paso="3" x="768" y="555">3/4</text>',
        '<text class="anota" data-paso="1" x="580" y="327">ombligo</text>',
    ]
    return "-20 -60 840 840", G, txt


# ---------------------------------------------------------------- figura humana

def _cr(pts, n=5):
    """Muestras de una Catmull-Rom que pasa por pts, con el parámetro de tramo."""
    p = [pts[0]] + pts + [pts[-1]]
    out = []
    for i in range(1, len(p) - 2):
        a, b, c, d = p[i - 1], p[i], p[i + 1], p[i + 2]
        for k in range(n):
            t = k / n
            t2, t3 = t * t, t * t * t
            x = 0.5 * ((2 * b[0]) + (-a[0] + c[0]) * t + (2 * a[0] - 5 * b[0] + 4 * c[0] - d[0]) * t2 + (-a[0] + 3 * b[0] - 3 * c[0] + d[0]) * t3)
            y = 0.5 * ((2 * b[1]) + (-a[1] + c[1]) * t + (2 * a[1] - 5 * b[1] + 4 * c[1] - d[1]) * t2 + (-a[1] + 3 * b[1] - 3 * c[1] + d[1]) * t3)
            out.append((x, y, i - 1 + t))
    out.append((pts[-1][0], pts[-1][1], len(pts) - 1))
    return out


def miembro(eje, anchos, cerrar=True):
    """Contorno de un miembro a partir de su eje y del ancho en cada punto del eje."""
    m = _cr(eje)
    izq, der = [], []
    for j, (x, y, u) in enumerate(m):
        a = m[max(0, j - 1)]
        b = m[min(len(m) - 1, j + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L, dx / L
        i0 = min(int(u), len(anchos) - 2)
        w = (anchos[i0] + (anchos[i0 + 1] - anchos[i0]) * (u - i0)) / 2
        izq.append(_jit((x + nx * w, y + ny * w), 0.35))
        der.append(_jit((x - nx * w, y - ny * w), 0.35))
    trazos = [suave(izq), suave(der)]
    if cerrar:
        fx, fy = eje[-1]
        trazos.append(suave([izq[-1], _jit((fx + (eje[-1][0] - eje[-2][0]) * 0.12, fy + (eje[-1][1] - eje[-2][1]) * 0.12), 0.2), der[-1]]))
    return trazos


def _espejo(pts):
    return [(800 - x, y) for x, y in pts]


def mano(muneca, angulo, lado, k=1.15):
    """Mano extendida con la palma al frente: silueta de los dedos juntos, separaciones
    entre dedos y pulgar hacia arriba. Coordenadas locales (x a lo largo del brazo),
    giradas al ángulo del antebrazo; lado = 1 o -1 mantiene el pulgar arriba al reflejar."""
    ca, sa = math.cos(angulo), math.sin(angulo)
    def g(q):
        x, y = q[0] * k, q[1] * k * lado
        return (muneca[0] + x * ca - y * sa, muneca[1] + x * sa + y * ca)
    L = lambda pts, t=0.12: suave([_jit(g(q), t) for q in pts])
    return [
        L([(0, -6.5), (14, -8.8), (27, -9.6), (42, -9.8), (51, -8.4), (54.5, -4.6), (55, -.5), (53.5, 3.6), (48.5, 7.6), (39, 9.8), (27, 9.6), (13, 8.6), (0, 6.5)]),
        L([(29, -4.8), (41, -5.1), (52.5, -4.8)], 0.08),
        L([(30, -.2), (43, -.1), (54.5, .2)], 0.08),
        L([(29, 4.6), (40, 5.2), (51, 5)], 0.08),
        L([(5, -6.4), (13, -11.5), (22, -15.6), (28, -16.4), (30, -14.2), (25, -11.6), (18, -8.6)]),
        L([(24, -9.4), (25, -8), (26.5, -7.2)], 0.05),
    ]


def brazo_con_mano(eje, lado):
    """Brazo con contorno por tramos y la mano al final, orientada según el antebrazo."""
    T = miembro(eje, [30, 31, 24, 19, 21, 13], cerrar=False)
    (x0, y0), (x1, y1) = eje[-2], eje[-1]
    ang = math.atan2(y1 - y0, x1 - x0)
    T += mano(eje[-1], ang, lado)
    return T


def figura_cuadrado():
    T = []
    # Cabeza, cabello en rizos y rasgos mínimos
    T.append(elipse(400, 138, 30, 38, -math.pi / 2, 1.5 * math.pi, 48, 0.3))
    for cx, cy, r, s in [(378, 108, 9, 1), (396, 100, 10, -1), (416, 104, 9, 1), (428, 120, 7, -1), (372, 126, 7, -1)]:
        T.append(espiral(cx, cy, r, 1.3, s, 0.9, 0, 0.2))
    T.append(linea((390, 136), (397, 136), 1, 0.2, 0))
    T.append(linea((403, 136), (410, 136), 1, 0.2, 0))
    T.append(linea((400, 140), (398, 152), 1, 0.2, 0))
    T.append(linea((394, 160), (406, 160), 1, 0.2, 0))
    # Cuello
    T.append(linea((390, 172), (388, 194), 2, 0.2, 0))
    T.append(linea((410, 172), (412, 194), 2, 0.2, 0))
    # Tronco: contorno derecho y su espejo
    tronco = [(412, 194), (446, 203), (472, 214)]
    costado = [(462, 230), (456, 262), (452, 300), (442, 336), (448, 368), (452, 396)]
    for lado in (tronco, costado):
        T.append(suave([_jit(q, 0.3) for q in lado]))
        T.append(suave([_jit(q, 0.3) for q in _espejo(lado)]))
    # Pecho, ombligo, ingle
    T.append(cuad((404, 252), (432, 272), (454, 250)))
    T.append(cuad((396, 252), (368, 272), (346, 250)))
    T.append(elipse(400, 335, 3, 3, 0, 2 * math.pi, 10, 0.1))
    T.append(cuad((352, 396), (380, 408), (400, 418)))
    T.append(cuad((448, 396), (420, 408), (400, 418)))
    # Brazos horizontales
    # Brazos horizontales: deltoides, bíceps, codo a media longitud, antebrazo y muñeca
    T += brazo_con_mano([(470, 222), (500, 216), (545, 213), (588, 212), (616, 212), (638, 212)], 1)
    T += brazo_con_mano(_espejo([(470, 222), (500, 216), (545, 213), (588, 212), (616, 212), (638, 212)]), -1)
    # Piernas juntas
    pierna = [(428, 408), (424, 478), (418, 550), (416, 610), (410, 682), (420, 700)]
    anchp = [46, 38, 24, 28, 14, 12]
    T += miembro(pierna, anchp)
    T += miembro(_espejo(pierna), anchp)
    T.append(cuad((410, 548), (418, 560), (426, 548)))
    T.append(cuad((390, 548), (382, 560), (374, 548)))
    return T


def figura_circulo():
    T = []
    alzado = [(470, 218), (502, 210), (548, 203), (594, 197), (626, 193), (668, 188)]
    T += brazo_con_mano(alzado, 1)
    T += brazo_con_mano(_espejo(alzado), -1)
    pierna = [(432, 410), (466, 468), (500, 525), (536, 584), (574, 640), (590, 654)]
    anchp = [44, 36, 24, 27, 14, 11]
    T += miembro(pierna, anchp)
    T += miembro(_espejo(pierna), anchp)
    return T


def craneo():
    """Cráneo de perfil, con la bóveda en sección para mostrar su grosor, en el espíritu de las láminas de 1489."""
    T = []
    P = lambda pts, c="tr", t=0.35, cerrado=False: T.append((suave([_jit(q, t) for q in pts], cerrado), c))
    boveda = [(154, 250), (146, 220), (148, 180), (164, 140), (196, 104), (244, 82), (300, 76), (354, 88),
              (394, 118), (418, 162), (426, 214), (418, 262), (400, 296), (376, 316), (350, 328), (330, 334)]
    P(boveda)
    # Tabla interna: la sección deja ver el grosor del hueso
    cx, cy = 292, 218
    interna = [(cx + (x - cx) * 0.92, cy + (y - cy) * 0.92) for x, y in boveda[1:13]]
    P(interna)
    for (x0, y0), (x1, y1) in list(zip(boveda[1:13], interna))[::1]:
        for f in (0.3, 0.7):
            a = (x0 + (x1 - x0) * 0.15, y0 + (y1 - y0) * 0.15)
            P([(a[0] + (x1 - x0) * f * 0.2, a[1]), (x0 + (x1 - x0) * 0.85, y0 + (y1 - y0) * 0.85 + f * 2)], "fn", 0.2)
    # Seno frontal tras la ceja
    P([(160, 228), (170, 218), (180, 224), (176, 238), (164, 240)], "fn", 0.2, True)
    # Órbita: reborde, profundidad y sombreado
    P([(160, 240), (182, 231), (206, 235), (216, 255), (208, 278), (184, 284), (163, 274), (157, 255)], "tr", 0.3, True)
    P([(170, 246), (190, 241), (204, 249), (204, 268), (186, 274), (170, 266)], "fn", 0.25, True)
    for k in range(6):
        x = 168 + k * 6
        P([(x, 244 - k * 0.6), (x + 4, 258)], "fn", 0.2)
    # Hueso nasal y abertura piriforme
    P([(154, 250), (148, 262), (140, 282), (138, 300), (134, 318), (140, 324)])
    P([(146, 288), (158, 294), (162, 308), (154, 318), (144, 318)], "tr", 0.25)
    P([(152, 298), (150, 312)], "fn", 0.2)
    # Pómulo y arco cigomático
    P([(208, 278), (222, 290), (226, 304), (214, 316), (196, 318)])
    P([(226, 292), (262, 290), (300, 298)])
    P([(226, 304), (264, 304), (302, 312)])
    for k in range(7):
        x = 238 + k * 9
        P([(x, 312), (x - 8, 330)], "fn", 0.2)
    # Fosa temporal y línea temporal
    P([(206, 150), (262, 128), (330, 134), (376, 168), (392, 228), (372, 276)], "fn", 0.4)
    # Conducto auditivo, apófisis mastoides y estiloides
    P([(308, 312), (318, 302), (330, 310), (326, 322), (312, 322)], "tr", 0.2, True)
    P([(314, 311), (322, 308), (324, 316)], "fn", 0.15)
    P([(350, 328), (346, 346), (336, 356), (326, 344), (324, 330)])
    # Maxilar y dientes superiores
    P([(140, 324), (143, 334), (152, 338), (210, 340), (230, 336)])
    dientes = [(146, 6, 15), (153, 6, 15), (160, 6, 15), (167, 7, 16), (175, 8, 14), (184, 9, 13), (194, 11, 13), (206, 12, 12), (219, 12, 11)]
    for x, w, h in dientes:
        P([(x, 339), (x + 1, 339 + h * 0.8), (x + w / 2, 339 + h), (x + w - 1, 339 + h * 0.8), (x + w, 339)], "fn", 0.15)
    # Mandíbula: cuerpo, ángulo, rama, apófisis coronoides y cóndilo
    P([(150, 370), (152, 390), (170, 404), (220, 404), (268, 396), (292, 386), (300, 362), (306, 340), (310, 326)])
    P([(146, 356), (148, 370)])
    P([(246, 394), (258, 360), (266, 330), (272, 318)])
    P([(272, 318), (286, 336), (302, 332)], "tr", 0.2)
    P([(258, 372), (268, 340)], "fn", 0.2)
    P([(304, 330), (314, 324), (318, 330)], "tr", 0.15)
    for x, w, h in dientes:
        P([(x, 369), (x + 1, 369 - h * 0.8), (x + w / 2, 369 - h), (x + w - 1, 369 - h * 0.8), (x + w, 369)], "fn", 0.15)
    P([(146, 368), (232, 370)], "fn", 0.3)
    P(list(map(lambda a: (176 + 3 * math.cos(a), 386 + 2.4 * math.sin(a)), [i * 0.8 for i in range(9)])), "fn", 0.1)
    for k in range(6):
        P([(186 + k * 14, 398), (196 + k * 14, 384)], "fn", 0.2)
    # Suturas: coronal, escamosa y lambdoidea
    P([(252 - k * 2.6 + (5 if k % 2 else -5), 84 + k * 11) for k in range(11)], "fn", 0.2)
    P([(246, 284), (270, 266), (304, 260), (338, 270), (356, 290)], "fn", 0.3)
    P([(386 + k * 3 + (4 if k % 2 else -4), 112 + k * 13) for k in range(10)], "fn", 0.2)
    # Sombreado de la nuca
    for k in range(10):
        a = -0.75 + k * 0.16
        P([(292 + 124 * math.cos(a), 214 + 128 * math.sin(a)), (292 + 106 * math.cos(a + 0.07), 214 + 110 * math.sin(a + 0.07))], "fn", 0.25)
    # Ejes que se cruzan en el «senso comune»
    T.append((linea((60, 214), (460, 214), 10, 0.4, 0), "sn"))
    T.append((linea((290, 40), (290, 440), 10, 0.4, 0), "sn"))
    T.append((elipse(290, 214, 14, 14, 0, 2 * math.pi, 24, 0.2), "sn"))
    T.append((elipse(290, 214, 3, 3, 0, 2 * math.pi, 10, 0.1), "sn"))
    txt = ['<text class="anota" x="306" y="196">senso comune</text>']
    return "40 20 440 440", T, txt


# ---------------------------------------------------------------- salida

def svg(nombre, etiqueta, clase="boceto"):
    vb, T, txt = {"tornillo": tornillo, "ornitoptero": ornitoptero, "puente": puente, "agua": agua, "craneo": craneo}[nombre]()
    fantasma = "".join(f'<path d="{d}"/>' for d, c in T if c != "fn")
    tinta = "".join(f'<path class="{c}" d="{d}" pathLength="1"/>' for d, c in T)
    return (f'<svg class="{clase}" viewBox="{vb}" role="img" aria-label="{etiqueta}">'
            f'<g class="fantasma" aria-hidden="true">{fantasma}</g>'
            f'<g class="tinta" aria-hidden="true">{tinta}</g>{"".join(txt)}</svg>')


def svg_vitruvio(etiqueta):
    vb, G, txt = vitruvio()
    fantasma = "".join(f'<path d="{d}"/>' for _, d, c in G if c != "fn")
    tinta = "".join(f'<path class="{c}" data-paso="{p}" d="{d}" pathLength="1"/>' for p, d, c in G)
    return (f'<svg class="boceto vitruvio" viewBox="{vb}" role="img" aria-label="{etiqueta}">'
            f'<g class="fantasma" aria-hidden="true">{fantasma}</g>'
            f'<g class="tinta" aria-hidden="true">{tinta}</g>{"".join(txt)}</svg>')
