"""FLOOR/ONE - generación determinista de texturas tileables (numpy).

Salida en assets/textures/. Cada textura documenta su escala física:
  canvas_*      : tejido marfil, tile = 24 mm, hilo ~1.0 mm (ref. 2)
  suede_*       : gamuza negra, tile = 40 mm, fibras 0.1-0.3 mm
  floor_*       : arce oscuro, tile = 2.4 m x 2.4 m, tablas de 7 cm
  tread_height  : dibujo de suela (plano XY de la suela), 300 x 120 mm
  lace_height   : trenzado de cordón, tile = 12 x 12 mm
Uso: python3 scripts/textures.py
"""
import os
import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "textures")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(1977)


def save(name, arr, bits=8):
    arr = np.clip(arr, 0, 1)
    if bits == 16:
        Image.fromarray((arr * 65535).astype(np.uint16)).save(os.path.join(OUT, name))
    else:
        if arr.ndim == 2:
            Image.fromarray((arr * 255).astype(np.uint8), "L").save(os.path.join(OUT, name))
        else:
            Image.fromarray((arr * 255).astype(np.uint8), "RGB").save(os.path.join(OUT, name))
    print("saved", name, arr.shape)


def tile_noise(n, freq, octaves=4, seed=0, aniso=(1.0, 1.0)):
    """Ruido tileable por síntesis espectral (FFT) - periódico por construcción."""
    r = np.random.default_rng(seed)
    out = np.zeros((n, n))
    fy = np.fft.fftfreq(n)[:, None] * n / aniso[1]
    fx = np.fft.fftfreq(n)[None, :] * n / aniso[0]
    f = np.sqrt(fx ** 2 + fy ** 2) + 1e-6
    amp = 1.0
    for o in range(octaves):
        fr = freq * 2 ** o
        spec = np.exp(-((f - fr) ** 2) / (2 * (fr * 0.5) ** 2))
        ph = r.uniform(0, 2 * np.pi, (n, n))
        layer = np.real(np.fft.ifft2(spec * np.exp(1j * ph)))
        layer /= layer.std() + 1e-9
        out += layer * amp
        amp *= 0.5
    out = (out - out.min()) / (out.max() - out.min())
    return out


def norm(a):
    return (a - a.min()) / (a.max() - a.min() + 1e-9)


# ---------------------------------------------------------------- canvas weave
def canvas(n=2048, threads=24):
    """Tafetán (plain weave): urdimbre y trama alternas, hilos con torsión y grosor variable."""
    y, x = np.mgrid[0:n, 0:n] / n * threads
    # variación por hilo (grosor/tono), periódica
    wv = rng.uniform(0.85, 1.15, threads)
    wt = rng.uniform(0.85, 1.15, threads)
    ix = np.floor(x).astype(int) % threads
    iy = np.floor(y).astype(int) % threads
    fx, fy = x - np.floor(x), y - np.floor(y)
    # perfil del hilo (redondo) y ondulación sobre/bajo
    warp_prof = np.clip(1 - ((fx - 0.5) / (0.46 * wv[ix])) ** 2, 0, 1) ** 0.5
    weft_prof = np.clip(1 - ((fy - 0.5) / (0.46 * wt[iy])) ** 2, 0, 1) ** 0.5
    over = ((ix + iy) % 2 == 0)
    warp_h = warp_prof * (0.55 + 0.45 * np.where(over, np.cos((fy - 0.5) * np.pi), -np.cos((fy - 0.5) * np.pi) * 0.4))
    weft_h = weft_prof * (0.55 + 0.45 * np.where(~over, np.cos((fx - 0.5) * np.pi), -np.cos((fx - 0.5) * np.pi) * 0.4))
    h = np.maximum(warp_h, weft_h)
    # torsión: estrías diagonales finas a lo largo de cada hilo
    twist_w = 0.5 + 0.5 * np.sin((y * 9 + fx * 3) * 2 * np.pi)
    twist_t = 0.5 + 0.5 * np.sin((x * 9 + fy * 3) * 2 * np.pi)
    twist = np.where(warp_h >= weft_h, twist_w, twist_t)
    fibers = tile_noise(n, 180, 2, seed=3)
    h = h * (0.88 + 0.08 * twist + 0.06 * fibers)
    slub = tile_noise(n, 6, 2, seed=4, aniso=(1, 6))  # irregularidad de hilo
    h = norm(h)
    # albedo marfil #E9E2D5 con variación sutil por hilo y en huecos
    base = np.array([0xE9, 0xE2, 0xD5]) / 255.0
    tone = 1 + 0.05 * (np.where(warp_h >= weft_h, wv[ix], wt[iy]) - 1) * 2 + 0.03 * (slub - 0.5)
    cavity = 0.55 + 0.45 * h ** 0.6
    alb = base[None, None, :] * (tone * cavity)[..., None]
    alb = alb * (0.97 + 0.03 * fibers[..., None])
    rough = 0.78 + 0.12 * (1 - h)
    save("canvas_albedo.png", alb)
    save("canvas_height.png", h, 16)
    save("canvas_rough.png", rough)


# ---------------------------------------------------------------- suede
def suede(n=2048):
    """Gamuza: fibras cortas con dirección dominante + parches de pelo cepillado."""
    fib = tile_noise(n, 300, 2, seed=11, aniso=(1, 3.5))
    fine = tile_noise(n, 600, 1, seed=12)
    nap = tile_noise(n, 5, 3, seed=13)  # zonas de pelo peinado en distinto sentido
    patch = tile_noise(n, 14, 2, seed=14)
    h = norm(0.55 * fib + 0.3 * fine + 0.15 * patch)
    save("suede_height.png", h, 16)
    save("suede_nap.png", nap)  # máscara de variación de sheen/tono
    rough = 0.82 + 0.1 * fine
    save("suede_rough.png", rough)


# ---------------------------------------------------------------- maple floor
def floor(n=4096, size_m=2.4):
    """Arce oscuro: tablas de 7 cm, longitudes variables, vetas finas, juntas y arañazos."""
    px_per_m = n / size_m
    board_w = 0.07 * px_per_m
    nboards = int(round(n / board_w))
    board_w = n / nboards
    y, x = np.mgrid[0:n, 0:n].astype(np.float32)
    row = np.floor(y / board_w).astype(int)
    fy = (y - row * board_w) / board_w
    # juntas transversales escalonadas (periódicas): cada fila un desfase
    seg_len = rng.uniform(0.6, 1.2, nboards) * px_per_m
    offs = rng.uniform(0, 1, nboards)
    # para tileable: usamos longitud n/k
    k = np.maximum(1, np.round(n / seg_len[row])).astype(int)
    L = n / k
    xs = (x + offs[row] * L)
    seg = np.floor(xs / L).astype(int)
    fx = (xs - seg * L) / L
    bid = (row * 131 + seg * 17) % 997
    r_tone = np.random.default_rng(5).uniform(-1, 1, 997)
    r_hue = np.random.default_rng(6).uniform(-1, 1, 997)
    # veta: ruido muy anisótropo a lo largo de X, distorsionado
    g1 = tile_noise(n, 30, 4, seed=21, aniso=(12, 1))
    g2 = tile_noise(n, 120, 2, seed=22, aniso=(20, 1))
    flame = tile_noise(n, 8, 2, seed=23)
    grain = norm(np.sin((g1 * 18 + flame * 3 + bid[..., ] * 0.37) * np.pi) * 0.5 + g2 * 0.8)
    # color base arce oscurecido (barniz satinado): marrones cálidos profundos
    c_dark = np.array([0.050, 0.030, 0.018])
    c_light = np.array([0.135, 0.085, 0.050])
    t = 0.42 + 0.16 * r_tone[bid] + 0.5 * (grain - 0.5) + 0.1 * (flame - 0.5)
    t = np.clip(t, 0, 1)
    alb = c_dark[None, None] * (1 - t[..., None]) + c_light[None, None] * t[..., None]
    alb *= (1 + 0.06 * r_hue[bid])[..., None]
    # juntas: hendidura fina oscura (0.6 mm)
    jw = 0.0007 * px_per_m
    edge_y = np.minimum(fy, 1 - fy) * board_w
    edge_x = np.minimum(fx, 1 - fx) * L
    joint = np.clip(1 - np.minimum(edge_y, edge_x) / max(jw, 1), 0, 1)
    bevel = np.clip(1 - np.minimum(edge_y, edge_x) / (jw * 3), 0, 1)
    # arañazos discretos (líneas finas aleatorias, tileables por wrap)
    scr = np.zeros((n, n), np.float32)
    rs = np.random.default_rng(31)
    for _ in range(260):
        x0, y0 = rs.uniform(0, n, 2)
        ang = rs.normal(0, 0.5) + (np.pi / 2 if rs.random() < 0.2 else 0)
        ln = rs.uniform(20, 260)
        tt = np.linspace(0, 1, int(ln))
        xx = ((x0 + np.cos(ang) * ln * tt + rs.normal(0, 0.3, tt.size).cumsum() * 0.2) % n).astype(int)
        yy = ((y0 + np.sin(ang) * ln * tt) % n).astype(int)
        scr[yy, xx] = np.maximum(scr[yy, xx], rs.uniform(0.3, 1.0))
    from scipy.ndimage import gaussian_filter
    scr = gaussian_filter(scr, 0.7, mode="wrap")
    scr = np.clip(scr * 3, 0, 1)
    alb = alb * (1 - 0.65 * joint[..., None]) + scr[..., None] * 0.012
    # roughness satinado (no espejo): 0.32-0.5
    wear = tile_noise(n, 3, 3, seed=41)
    rough = 0.34 + 0.12 * wear + 0.15 * scr + 0.2 * joint + 0.05 * (grain - 0.5)
    height = 0.5 + 0.08 * (grain - 0.5) - 0.45 * joint - 0.12 * bevel - 0.1 * scr
    save("floor_albedo.png", alb ** (1 / 2.2))  # sRGB
    save("floor_rough.png", rough)
    save("floor_height.png", norm(height), 16)


# ---------------------------------------------------------------- tread
def tread(w=3000, h=1200, size=(0.30, 0.12)):
    """Dibujo de suela en coordenadas de la planta (x: talón->puntera, y: ancho).
    Zona de giro: anillos concéntricos bajo el antepié (pivote) y en el talón;
    resto: patrón de espiga (herringbone) diagonal. Diseño conceptual, no de prestaciones."""
    px = w / size[0]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    X = xx / px
    Y = (yy - h / 2) / px
    out = np.zeros((h, w), np.float32)
    # herringbone base
    pitch = 0.0062
    u = X / pitch
    sgn = np.where((np.floor(Y / 0.012).astype(int) % 2) == 0, 1, -1)
    hb = np.abs(((X + sgn * Y * 0.9) / pitch) % 1 - 0.5) * 2
    out = (hb > 0.62).astype(np.float32)  # surcos (~38 % del paso)
    # pivotes concéntricos
    def rings(cx, cy, r0, r1, step):
        r = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2)
        m = (r > r0) & (r < r1)
        grooves = (np.abs((r % step) / step - 0.5) * 2 > 0.62).astype(np.float32)
        return m, grooves, r
    m1, g1, r1 = rings(0.205, -0.008, 0.0, 0.040, 0.0045)
    m2, g2, r2 = rings(0.050, 0.0, 0.0, 0.026, 0.0045)
    for m, g, r, R in ((m1, g1, r1, 0.040), (m2, g2, r2, 0.026)):
        out = np.where(m, g, out)
        ring_edge = (np.abs(r - R) < 0.0016)
        out = np.where(ring_edge, 1.0, out)
    # hueco central del pivote: disco liso con estrella sutil
    out = np.where(r1 < 0.0055, 0.0, out)
    out = np.where(r2 < 0.0045, 0.0, out)
    # canal de flexión transversal
    flex = np.abs(X - 0.148) < 0.0012
    out = np.where(flex, 1.0, out)
    from scipy.ndimage import gaussian_filter
    hgt = 1 - gaussian_filter(out, 1.3)  # 1 = taco, 0 = surco
    save("tread_height.png", hgt, 16)


# ---------------------------------------------------------------- lace braid
def lace(n=512):
    y, x = np.mgrid[0:n, 0:n] / n
    a = np.abs(((x * 8 + y * 8) % 1) - 0.5) * 2
    b = np.abs(((x * 8 - y * 8) % 1) - 0.5) * 2
    chk = ((np.floor(x * 8 + y * 8) + np.floor(x * 8 - y * 8)) % 2 == 0)
    h = np.where(chk, 1 - a, 1 - b) ** 0.7
    h = norm(h + 0.15 * tile_noise(n, 60, 1, seed=51))
    save("lace_height.png", h, 16)


if __name__ == "__main__":
    canvas()
    suede()
    lace()
    tread()
    floor()
