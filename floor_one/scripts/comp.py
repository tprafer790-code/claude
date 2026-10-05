"""FLOOR/ONE - composición: postproceso + tipografía animada sobre los fotogramas renderizados.

Uso: /opt/bvenv/bin/python scripts/comp.py SRC_DIR DST_DIR [--vertical] [--scale-from WxH] [--step N] [--range a,b]
- La tipografía se dibuja a la resolución de salida (vectorial, nítida); nunca procede de imágenes generadas.
- --scale-from: reescala el render antes de componer (versión UHD reescalada, NO nativa).
"""
import os
import sys
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from scipy.ndimage import gaussian_filter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FONT_BLACK = os.path.join(ROOT, "assets/fonts/ArchivoBlack-Regular.ttf")
FONT_VAR = os.path.join(ROOT, "assets/fonts/Archivo-VariableFont_wdth,wght.ttf")
IVORY = (233, 226, 213)
ORANGE = (233, 120, 37)


def clamp01(t):
    return max(0.0, min(1.0, t))


def e_out(t, p=4):
    return 1 - (1 - clamp01(t)) ** p


def e_expo(t):
    t = clamp01(t)
    return 1.0 if t >= 1 else 1 - 2 ** (-10 * t)


def font(path, size, weight=None):
    f = ImageFont.truetype(path, size)
    if weight is not None:
        try:
            f.set_variation_by_axes([100, weight])
        except Exception:
            pass
    return f


# ------------------------------------------------------------------ eventos tipográficos
# (inicio, fin, texto, estilo). Fotogramas globales 1..900.
TEXTS = [
    (259, 299, "ENCUENTRA TU EJE", "line"),
    (373, 419, "MARCA TU RITMO", "line"),
    (736, 779, "ROMPE EL RITMO", "line"),
    (784, 900, "EL SUELO ES TUYO", "headline"),
    (843, 900, "FLOOR/ONE", "logo"),
    (850, 900, "DESCUBRE FLOOR/ONE", "cta"),
]


def draw_reveal(canvas, text, fnt, xy, t_in, t_out, color=IVORY, tracking=0.0, anchor="ls", slash_color=None):
    """Entrada rápida con máscara desde abajo + asentamiento del tracking; salida por fundido."""
    W, H = canvas.size
    a_in = e_expo(t_in)
    a_out = 1 - clamp01(t_out)
    if a_in <= 0 or a_out <= 0:
        return
    size = fnt.size
    track = tracking + 0.10 * (1 - e_out(t_in, 3))
    # medir con tracking
    widths = [fnt.getlength(ch) for ch in text]
    total = sum(widths) + track * size * (len(text) - 1)
    x0, y0 = xy
    if anchor[0] == "m":
        x0 -= total / 2
    elif anchor[0] == "r":
        x0 -= total
    layer = Image.new("L", (W, H), 0)
    col_layer = Image.new("RGB", (W, H), color)
    d = ImageDraw.Draw(layer)
    dc = ImageDraw.Draw(col_layer)
    x = x0
    rise = (1 - a_in) * size * 0.9
    for ch, w in zip(text, widths):
        d.text((x, y0 + rise), ch, font=fnt, fill=255, anchor="ls")
        if slash_color and ch == "/":
            dc.text((x, y0 + rise), ch, font=fnt, fill=slash_color, anchor="ls")
        x += w + track * size
    # máscara de revelado: solo visible por encima de la línea base
    asc, desc = fnt.getmetrics()
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).rectangle([0, y0 - asc * 1.2, W, y0 + desc * 1.1], fill=255)
    from PIL import ImageChops
    layer = ImageChops.multiply(layer, mask)
    layer = layer.point(lambda v: int(v * a_out))
    canvas.paste(col_layer, (0, 0), layer)
    return total


def typography(img, frame, vertical=False):
    W, H = img.size
    s = H / 1080.0 if not vertical else W / 1080.0
    margin = int(96 * s)
    for (a, b, text, style) in TEXTS:
        if not (a <= frame <= b):
            continue
        t_in = (frame - a) / 9.0
        t_out = (frame - (b - 6)) / 6.0 if b < 900 else 0.0
        if style == "line":
            f = font(FONT_BLACK, int(58 * s))
            if vertical:
                draw_reveal(img, text, f, (W / 2, H - int(420 * s)), t_in, t_out, tracking=0.04, anchor="ms")
            else:
                y = H - margin - int(10 * s)
                tw = draw_reveal(img, text, f, (margin, y), t_in, t_out, tracking=0.04)
                if tw:
                    d = ImageDraw.Draw(img)
                    L = (tw * 0.18) * e_out(t_in, 3) * (1 - clamp01(t_out))
                    d.rectangle([margin, y + int(18 * s), margin + L, y + int(22 * s)], fill=ORANGE)
        elif style == "headline":
            in_close = frame >= 843
            if not vertical:
                if not in_close:
                    f = font(FONT_BLACK, int(150 * s))
                    draw_reveal(img, text, f, (margin, margin + int(150 * s)), t_in, 0, tracking=-0.01)
                else:
                    f = font(FONT_BLACK, int(64 * s))
                    tc = (frame - 843) / 9.0
                    draw_reveal(img, text, f, (margin, int(H * 0.50)), max(tc, 0.0001) * 0 + 1, 0, tracking=0.0)
            else:
                if not in_close:
                    f = font(FONT_BLACK, int(132 * s))
                    for i, word in enumerate(["EL SUELO", "ES TUYO"]):
                        draw_reveal(img, word, f, (W / 2, int(330 * s) + i * int(140 * s)), (frame - a - 3 * i) / 9.0, 0, anchor="ms")
                else:
                    f = font(FONT_BLACK, int(70 * s))
                    draw_reveal(img, text, f, (W / 2, int(H * 0.73)), 1, 0, anchor="ms")
        elif style == "logo":
            f = font(FONT_BLACK, int(132 * s))
            if not vertical:
                draw_reveal(img, text, f, (margin, int(H * 0.50) - int(96 * s)), t_in, 0, tracking=0.02, slash_color=ORANGE)
            else:
                draw_reveal(img, text, f, (W / 2, int(H * 0.73) - int(110 * s)), t_in, 0, tracking=0.02, slash_color=ORANGE, anchor="ms")
        elif style == "cta":
            f = font(FONT_VAR, int(40 * s), weight=700)
            if not vertical:
                y = int(H * 0.50) + int(96 * s)
                d = ImageDraw.Draw(img)
                L = int(46 * s) * e_out(t_in, 3)
                d.rectangle([margin, y - int(13 * s), margin + L, y - int(9 * s)], fill=ORANGE)
                draw_reveal(img, text, f, (margin + int(62 * s), y), t_in, 0, tracking=0.12)
            else:
                draw_reveal(img, text, f, (W / 2, int(H * 0.73) + int(90 * s)), t_in, 0, tracking=0.12, anchor="ms")


# ------------------------------------------------------------------ postproceso
def scrim(arr, frame, vertical):
    """Oscurecido suave detrás del titular y del cierre para garantizar la lectura."""
    H, W, _ = arr.shape
    k = 0.0
    for (a, b, _, st) in TEXTS:               # banda inferior para las líneas de texto
        if st == "line" and a <= frame <= b and not vertical:
            y = np.linspace(0, 1, H)[:, None, None]
            m = np.clip((y - 0.70) / 0.30, 0, 1) ** 1.3
            arr = arr * (1 - 0.6 * m * e_out((frame - a) / 8.0, 3))
    if 784 <= frame <= 900:
        k = 0.55 * e_out((frame - 784) / 10.0, 3)
    if k <= 0:
        return arr
    if not vertical:
        x = np.linspace(0, 1, W)[None, :, None]
        m = np.clip(1 - x / 0.62, 0, 1) ** 1.6
    else:
        y = np.linspace(0, 1, H)[:, None, None]
        m = np.clip(1 - y / 0.42, 0, 1) ** 1.5 + np.clip((y - 0.62) / 0.38, 0, 1) ** 1.2
    return arr * (1 - k * m)


def post(arr, frame, vertical=False):
    H, W, _ = arr.shape
    s = H / 1080.0 if not vertical else W / 1080.0
    lum = arr.mean(2, keepdims=True)
    # bloom restringido a altas luces
    hi = np.clip((arr - 0.82) / 0.18, 0, 1) * arr
    small = hi[::4, ::4]
    bl = np.stack([gaussian_filter(small[..., c], 5 * s) for c in range(3)], -1)
    bl = np.kron(bl, np.ones((4, 4, 1)))[:H, :W]
    arr = arr + bl * 0.10
    # haz de luz atmosférico desde arriba-izquierda, solo sobre sombras
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    u = (xx / W * 0.8 + yy / H * 0.5)
    v = (xx / W * 0.5 - yy / H * 0.8)
    beam = np.exp(-((v + 0.12) / 0.22) ** 2) * np.clip(1.15 - u, 0, 1) ** 2
    rng = np.random.default_rng(frame)
    beam = beam[..., None] * np.array([1.0, 0.86, 0.68])[None, None] * 0.075
    arr = arr + beam * (1 - np.clip(lum * 2.2, 0, 1))
    # viñeta suave
    r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    arr = arr * (1 - 0.22 * np.clip(r - 0.55, 0, 1) ** 1.5)[..., None]
    arr = scrim(arr, frame, vertical)
    # grano fino casi imperceptible
    arr = arr + rng.normal(0, 0.006, (H, W, 1))
    return np.clip(arr, 0, 1)


def process(src, dst, frame, vertical=False, scale_to=None):
    im = Image.open(src).convert("RGB")
    if scale_to:
        im = im.resize(scale_to, Image.LANCZOS)
    arr = np.asarray(im).astype(np.float32) / 255.0
    arr = post(arr, frame, vertical)
    out = Image.fromarray((arr * 255 + 0.5).astype(np.uint8))
    typography(out, frame, vertical)
    out.save(dst, compress_level=1)


if __name__ == "__main__":
    a = sys.argv[1:]
    src_dir, dst_dir = a[0], a[1]
    vertical = "--vertical" in a
    scale_to = tuple(int(x) for x in a[a.index("--scale-to") + 1].split("x")) if "--scale-to" in a else None
    step = int(a[a.index("--step") + 1]) if "--step" in a else 1
    rng_ = [int(x) for x in a[a.index("--range") + 1].split(",")] if "--range" in a else [1, 900]
    os.makedirs(dst_dir, exist_ok=True)
    for f in range(rng_[0], rng_[1] + 1):
        src = os.path.join(src_dir, f"f_{f:04d}.png")
        if not os.path.exists(src):
            # animatic: fotogramas alternos -> repetir el anterior
            g = f - ((f - 1) % step)
            src = os.path.join(src_dir, f"f_{g:04d}.png")
            if not os.path.exists(src):
                continue
        dst = os.path.join(dst_dir, f"f_{f:04d}.png")
        if os.path.exists(dst):
            continue
        process(src, dst, f, vertical, scale_to)
    print("comp done", dst_dir)
