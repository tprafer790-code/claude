"""Construye index.html a partir de la plantilla, insertando los bocetos SVG.

Uso:  python3 herramientas/construir.py            -> escribe index.html
      python3 herramientas/construir.py --vista RUTA -> además, una versión de un solo
      archivo (CSS y JS en línea, sin <html>/<head>/<body>) para la vista previa publicada.
"""
import pathlib
import re
import sys

import bocetos

RAIZ = pathlib.Path(__file__).resolve().parent.parent

html = (RAIZ / "herramientas" / "plantilla.html").read_text(encoding="utf-8")
html = html.replace("{{tornillo}}", bocetos.svg("tornillo", "Boceto del tornillo aéreo: una vela helicoidal alrededor de un mástil sobre una plataforma"))
html = html.replace("{{ornitoptero}}", bocetos.svg("ornitoptero", "Boceto del ornitóptero: dos alas articuladas como las de un murciélago unidas a un armazón"))
html = html.replace("{{puente}}", bocetos.svg("puente", "Boceto del puente: un único arco rebajado sobre el agua, con un velero pasando por debajo"))
html = html.replace("{{agua}}", bocetos.svg("agua", "Boceto de un chorro de agua que cae en un estanque y forma remolinos en espiral"))
html = html.replace("{{vitruvio}}", bocetos.svg_vitruvio("Retícula del Hombre de Vitruvio: cuadrado, círculo con centro en el ombligo, divisiones en octavos y cuartos y la figura en dos posturas"))
html = html.replace("{{craneo}}", bocetos.svg("craneo", "Boceto de un cráneo de perfil con dos ejes que se cruzan en el centro del cerebro"))
assert "{{" not in html
(RAIZ / "index.html").write_text(html, encoding="utf-8")
print("index.html", len(html) // 1024, "KB")

if "--vista" in sys.argv:
    destino = pathlib.Path(sys.argv[sys.argv.index("--vista") + 1])
    css = (RAIZ / "assets/css/estilos.css").read_text(encoding="utf-8")
    js = (RAIZ / "assets/js/main.js").read_text(encoding="utf-8")
    head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
    body = re.search(r"<body>(.*?)</body>", html, re.S).group(1)
    head = re.sub(r'<meta (charset|name="viewport")[^>]*>\s*', "", head)
    head = head.replace('<link rel="stylesheet" href="assets/css/estilos.css">', f"<style>{css}</style>")
    body = body.replace('<script src="assets/js/main.js" defer></script>', f"<script>{js}</script>")
    destino.write_text(head.strip() + "\n" + body.strip() + "\n", encoding="utf-8")
    print("vista", destino)
