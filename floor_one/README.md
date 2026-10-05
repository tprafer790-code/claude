# FLOOR/ONE — «EL SUELO ES TUYO» · anuncio de 30 s

Producción completa, reproducible desde scripts, de un anuncio de producto para la marca conceptual de zapatillas de breaking FLOOR/ONE.

## 1. Entregables

| Fichero | Descripción |
|---|---|
| `deliver/FLOOR_ONE_30s_1080p_master.mp4` | **Máster.** 1920×1080 **render nativo**, 30 fps CFR, 900 fotogramas, 30,000 s, H.264 High CRF 14 + AAC 320 kbps 48 kHz |
| `deliver/FLOOR_ONE_30s_UHD_upscaled.mp4` | 3840×2160 **reescalado** (Lanczos) del render 1080p con tipografía y grano compuestos a 4K. **No es 4K nativo** (ver §4) |
| `deliver/stills_4k/` | Seis fotogramas críticos renderizados **nativos a 3840×2160** (32 muestras) para QA de calidad final |
| `audio/mix.wav`, `audio/music.wav`, `audio/sfx.wav` | Mezcla y pistas separadas, 48 kHz / 24 bit |
| `previews/` | Animatic(s) a baja resolución con audio guía |
| `project/shoe.blend`, `project/floor_one.blend` | Proyecto editable de Blender 4.2 (modelo, materiales, luces, cámaras, animación horneada) |
| `scripts/` | Todo el pipeline (ver §3) |
| `assets/textures/`, `assets/fonts/` | Texturas generadas (tileables, escala física documentada) y tipografía Archivo (OFL) |
| `QA.md` · `CONSUMO.md` · `LICENSES.md` · `MANIFEST.md` | Revisión, registro de consumo, licencias e inventario |

## 2. Requisitos

- Python 3.11 con `bpy==4.2.0` (Blender como módulo, PyPI), `numpy scipy scikit-image pillow soundfile pyloudnorm`
- FFmpeg ≥ 6 con libx264
- Preparación usada: `python3 -m venv /opt/bvenv && /opt/bvenv/bin/pip install bpy==4.2.0 numpy scipy scikit-image pillow soundfile pyloudnorm`

## 3. Reproducir desde cero

```bash
PY=/opt/bvenv/bin/python
$PY scripts/textures.py                 # texturas (≈1,5 min)
$PY scripts/build_shoe.py               # modelo 3D -> project/shoe.blend (≈1 min)
$PY scripts/build_scene.py B            # escena + animación de 900 fotogramas (look B)
$PY scripts/render.py animatic 1 900 2  # animatic 480x270
$PY scripts/render.py final 1 900       # render final 1080p (≈31 s/fotograma en 4 CPU)
$PY scripts/audio.py                    # música + foley + mezcla (-14 LUFS, <= -1 dBTP)
$PY scripts/comp.py renders/final renders/final_comp
scripts/assemble.sh renders/final_comp deliver/FLOOR_ONE_30s_1080p_master 14
```
`render.py` es reanudable: no sobrescribe fotogramas existentes. `scripts/preview_shoe.py` genera vistas de control del modelo.

## 4. Decisiones técnicas y límites reales

| Tema | Decisión | Motivo |
|---|---|---|
| Motor | Blender 4.2 + Cycles CPU + OIDN | blender.org bloqueado (403); el módulo `bpy` de PyPI es el mismo motor. Sin GPU |
| Resolución del máster | **1080p nativo** | Medido: 6 min/fotograma a 3840×2160 → ≈90 h para 900 fotogramas en 4 CPU. Inviable. 1080p optimizado: 31 s/fotograma (≈7,8 h) |
| Versión UHD | Reescalado declarado + 6 stills 4K nativos | No se presenta el reescalado como 4K nativo |
| Versión vertical 2160×3840 | **No producida** | Requeriría otro render completo (≈8 h más con cámaras recompuestas). El compositor ya admite `--vertical` y `render.py` admite `VERTICAL=1` para producirla con más tiempo |
| Tipografía | Archivo / Archivo Black (SIL OFL) compuesta en post, vectorial | Texto exacto y estable, no sintetizado |
| Bailarín | Piernas y pelvis paramétricas (skin + IK analítica de 2 huesos), torso fuera de cuadro | Sin material licenciado ni generación de vídeo disponible. Acción simple: paso, pivote y barrido |
| Audio | Breakbeat 120 BPM y foley sintetizados en numpy | 100 % original, sin licencias de terceros |

## 5. Modelo del producto (resumen)

Horma paramétrica de pie derecho (contorno asimétrico, perfil lateral, sección superelíptica) → carcasa de 2,5 mm generada por *marching cubes* sobre un campo de distancia **analítico** → cortes exactos por curvas de patronaje (`scripts/shoe_geo.py`). Piezas separadas: carcasa base (lona, piel perforada, forro), refuerzo de puntera/gamuza, ojalillo, contrafuerte, franja naranja (cada una con grosor propio), costuras dobles en geometría, 12 ojales toroidales con orificio, cordones planos con trenzado y *shape key* de tensión, lengüeta acolchada, ribete del cuello, tirador, logo vectorial proyectado, plantilla, entresuela y suela con dibujo desplazado en geometría (anillos de pivote + espiga). Decisiones sobre zonas no visibles en las referencias: ver `QA.md §1`.
