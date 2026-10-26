"""Monta los renders transparentes de Blender sobre el papel azul de la portada y dibuja
las cotas en pan de oro, como en la lámina del tornillo aéreo.

Uso: python componer.py PAPEL.webp RENDER.png COTAS.json SALIDA.png
     python componer.py PAPEL.webp --secuencia CARPETA SALIDA_CARPETA
"""
import json
import math
import pathlib
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ORO = (214, 166, 64)


def papel(ruta, tam):
    """Zona vacía de la portada (mitad izquierda) ampliada al tamaño del fotograma."""
    im = Image.open(ruta).convert("RGB")
    w, h = im.size
    trozo = im.crop((0, 0, int(w * 0.5), h))
    return trozo.resize(tam, Image.LANCZOS)


def flecha(d, a, b, escala):
    """Línea de cota con puntas de flecha en ambos extremos y pequeños topes."""
    d.line([a, b], fill=ORO, width=max(2, int(2.6 * escala)))
    ang = math.atan2(b[1] - a[1], b[0] - a[0])
    for p, s in ((a, 1), (b, -1)):
        for da in (0.42, -0.42):
            q = (p[0] + s * 16 * escala * math.cos(ang + da), p[1] + s * 16 * escala * math.sin(ang + da))
            d.line([p, q], fill=ORO, width=max(2, int(2 * escala)))
        nx, ny = -math.sin(ang), math.cos(ang)
        d.line([(p[0] - nx * 12 * escala, p[1] - ny * 12 * escala), (p[0] + nx * 12 * escala, p[1] + ny * 12 * escala)], fill=ORO, width=max(1, int(1.5 * escala)))


def componer(fondo, render, cotas):
    W, H = fondo.size
    capa = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(capa)
    esc = W / 1600
    for k in ("luz", "galibo", "ancho"):
        (x0, y0), (x1, y1) = cotas[k]
        flecha(d, (x0 * W, y0 * H), (x1 * W, y1 * H), esc)
    capa = capa.filter(ImageFilter.GaussianBlur(0.4))
    out = fondo.convert("RGBA")
    out.alpha_composite(capa)
    out.alpha_composite(render.convert("RGBA"))
    # El grano del papel vuelve a asomar sobre la tiza: la lámina parece dibujada, no pegada
    grano = fondo.convert("L").filter(ImageFilter.GaussianBlur(0.6))
    media = sum(grano.resize((1, 1)).getdata()) / 1
    grano = grano.point(lambda v: max(0, min(255, 128 + (v - media) * 1.6)))
    return ImageChops.overlay(out.convert("RGB"), Image.merge("RGB", (grano, grano, grano)))


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[1] == "--secuencia":
        origen, destino = pathlib.Path(a[2]), pathlib.Path(a[3])
        destino.mkdir(parents=True, exist_ok=True)
        datos = json.load(open(origen / "cotas.json"))
        fondo = None
        for i, c in enumerate(datos):
            r = Image.open(origen / f"f{i:03d}.png")
            fondo = fondo or papel(a[0], r.size)
            componer(fondo, r, c).save(destino / f"f{i:03d}.png")
    else:
        r = Image.open(a[1])
        componer(papel(a[0], r.size), r, json.load(open(a[2]))).save(a[3])
