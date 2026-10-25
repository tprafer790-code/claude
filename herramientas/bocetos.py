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


def suave(pts, cerrado=False):
    """Catmull-Rom a curvas de Bézier cúbicas."""
    if len(pts) < 3:
        (x0, y0), (x1, y1) = pts[0], pts[-1]
        return f"M{x0:.1f} {y0:.1f}L{x1:.1f} {y1:.1f}"
    p = pts + pts[:2] if cerrado else [pts[0]] + pts + [pts[-1]]
    d = f"M{p[1][0]:.1f} {p[1][1]:.1f}"
    for i in range(1, len(p) - 2):
        a, b, c, e = p[i - 1], p[i], p[i + 1], p[i + 2]
        c1 = (b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6)
        c2 = (c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6)
        d += f"C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {c[0]:.1f} {c[1]:.1f}"
    return d


def linea(a, b, pasos=5, temblor=0.7, exceso=0.04):
    """Recta a mano: varios puntos con temblor y un ligero exceso en los extremos."""
    ax, ay = a[0] - (b[0] - a[0]) * exceso, a[1] - (b[1] - a[1]) * exceso
    bx, by = b[0] + (b[0] - a[0]) * exceso, b[1] + (b[1] - a[1]) * exceso
    pts = [_jit((ax + (bx - ax) * t / pasos, ay + (by - ay) * t / pasos), temblor) for t in range(pasos + 1)]
    return suave(pts)


def curva(fn, t0, t1, n=60, temblor=0.5):
    return suave([_jit(fn(t0 + (t1 - t0) * i / n), temblor) for i in range(n + 1)])


def elipse(cx, cy, rx, ry, a0=0.0, a1=2 * math.pi, n=64, temblor=0.5):
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
    return curva(f, 0, tmax, int(36 * vueltas), temblor)


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
    T.append((curva(borde, 0, 1, 140, 0.4), "tr"))
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
    # Paso 5 · la figura, en articulaciones
    A = dict(cab=(400, 137), cue=(400, 175), hi=(325, 212), hd=(475, 212), ci=(212, 212), cd=(588, 212),
             mi=(100, 212), md=(700, 212), ca=(380, 400), cb=(420, 400), ri=(386, 550), rd=(414, 550),
             pi=(392, 700), pd=(408, 700), pub=(400, 400))
    G.append((4, elipse(400, 137, 36, 38, -math.pi / 2, 1.5 * math.pi, 40, 0.4), "tr"))
    for a, b in [("cue", "pub"), ("hi", "hd"), ("hi", "ci"), ("ci", "mi"), ("hd", "cd"), ("cd", "md"),
                 ("pub", "ca"), ("pub", "cb"), ("ca", "ri"), ("ri", "pi"), ("cb", "rd"), ("rd", "pd")]:
        G.append((4, linea(A[a], A[b], 4, 0.4, 0), "tr"))
    # Segunda postura en sanguina: brazos alzados y piernas abiertas
    for a, b in [((325, 212), (198, 196)), ((198, 196), (69, 181)), ((475, 212), (602, 196)), ((602, 196), (731, 181)),
                 ((380, 400), (300, 525)), ((300, 525), (218, 651)), ((420, 400), (500, 525)), ((500, 525), (582, 651))]:
        G.append((4, linea(a, b, 4, 0.4, 0), "sn"))
    for p in [A["hi"], A["hd"], A["ci"], A["cd"], A["mi"], A["md"], A["ca"], A["cb"], A["ri"], A["rd"], A["pi"], A["pd"],
              (69, 181), (731, 181), (218, 651), (582, 651)]:
        G.append((4, elipse(p[0], p[1], 4.5, 4.5, 0, 2 * math.pi, 14, 0.1), "tr"))
    txt = [
        '<text class="anota" data-paso="2" x="62" y="141" text-anchor="end">1/8</text>',
        '<text class="anota" data-paso="3" x="726" y="255">1/4</text>',
        '<text class="anota" data-paso="3" x="726" y="405">1/2</text>',
        '<text class="anota" data-paso="3" x="726" y="555">3/4</text>',
        '<text class="anota" data-paso="1" x="580" y="327">ombligo</text>',
    ]
    return "-20 -60 840 840", G, txt


# ---------------------------------------------------------------- salida

def svg(nombre, etiqueta, clase="boceto"):
    vb, T, txt = {"tornillo": tornillo, "ornitoptero": ornitoptero, "puente": puente, "agua": agua}[nombre]()
    fantasma = "".join(f'<path class="{c}" d="{d}"/>' for d, c in T)
    tinta = "".join(f'<path class="{c}" d="{d}" pathLength="1"/>' for d, c in T)
    return (f'<svg class="{clase}" viewBox="{vb}" role="img" aria-label="{etiqueta}">'
            f'<g class="fantasma" aria-hidden="true">{fantasma}</g>'
            f'<g class="tinta" aria-hidden="true">{tinta}</g>{"".join(txt)}</svg>')


def svg_vitruvio(etiqueta):
    vb, G, txt = vitruvio()
    fantasma = "".join(f'<path class="{c}" d="{d}"/>' for _, d, c in G)
    tinta = "".join(f'<path class="{c}" data-paso="{p}" d="{d}" pathLength="1"/>' for p, d, c in G)
    return (f'<svg class="boceto vitruvio" viewBox="{vb}" role="img" aria-label="{etiqueta}">'
            f'<g class="fantasma" aria-hidden="true">{fantasma}</g>'
            f'<g class="tinta" aria-hidden="true">{tinta}</g>{"".join(txt)}</svg>')
