# Manifiesto de recursos — FLOOR/ONE

Generado al cierre de la entrega. SHA-256 de los entregables para comprobar su integridad.

## Entregables

| Fichero | Tamaño | SHA-256 (16 primeros) |
|---|---|---|
| `deliver/FLOOR_ONE_30s_1080p_master.mp4` | 60M | `6365dd7280ba4842` |
| `deliver/FLOOR_ONE_30s_UHD_upscaled.mp4` | 21M | `7310ff8e0254db59` |
| `deliver/stills_4k/still4k_0095_tejido.jpg` | 1.1M | `6a41b059b04716ae` |
| `deliver/stills_4k/still4k_0145_puntera.jpg` | 712K | `1ff823a0ec8b7155` |
| `deliver/stills_4k/still4k_0275_suela.jpg` | 1.5M | `9e0a9df8d327cfde` |
| `deliver/stills_4k/still4k_0330_despiece.jpg` | 1016K | `62bf0dac758afc2c` |
| `deliver/stills_4k/still4k_0575_accion.jpg` | 880K | `dab5706f164aa0f4` |
| `deliver/stills_4k/still4k_0690_hero.jpg` | 956K | `a5e3833959d58b57` |
| `previews/FLOOR_ONE_30s_preview_720p.mp4` | 5.1M | `ff967f75a3a003dd` |
| `previews/FLOOR_ONE_animatic_v01.mp4` | 2.3M | `a778b14639606aa5` |
| `audio/mix.wav` | 8.3M | `6e920c7ff93fa6b1` |
| `audio/music.wav` | 8.3M | `2e14b1c0f99225d5` |
| `audio/sfx.wav` | 8.3M | `a654c1c8d68c62d7` |

## Proyecto, scripts y recursos

| Ruta | Contenido |
|---|---|
| `project/shoe.blend` | Modelo editable: 24 objetos en colección SHOE (UPPER/INSOLE/MIDSOLE/OUTSOLE) |
| `project/floor_one.blend` | Escena completa con animación horneada (900 fotogramas), look B |
| `scripts/assemble.sh` | usr/bin/env bash |
| `scripts/audio.py` | FLOOR/ONE - música original (breakbeat 120 BPM, 15 compases) y foley sintetizado. 100 % ge |
| `scripts/bench.py` | Benchmark de render 4K: escena mínima (suelo + 3 luces + zapatilla).""" |
| `scripts/build_scene.py` | FLOOR/ONE - construye project/floor_one.blend: entorno, luces, bailarín, gráficos y anima |
| `scripts/build_shoe.py` | FLOOR/ONE - construcción del modelo 3D editable de la zapatilla en Blender. |
| `scripts/comp.py` | FLOOR/ONE - composición: postproceso + tipografía animada sobre los fotogramas renderizad |
| `scripts/materials.py` | FLOOR/ONE - materiales físicos (Cycles, Principled BSDF v2). |
| `scripts/preview_shoe.py` | Vista de control del modelo: varias cámaras, luz de estudio neutra. Uso: |
| `scripts/render.py` | FLOOR/ONE - render por perfiles, reanudable (no sobrescribe fotogramas ya hechos). |
| `scripts/shoe_geo.py` | FLOOR/ONE - definición paramétrica de la horma y del patronaje (numpy puro). |
| `scripts/shots.py` | FLOOR/ONE - escena, iluminación, bailarín y animación de los 15 bloques (900 fotogramas, |
| `scripts/textures.py` | FLOOR/ONE - generación determinista de texturas tileables (numpy). |
| `assets/textures/` | 11 texturas generadas (PNG) |
| `assets/fonts/` | Archivo y Archivo Black + OFL.txt |
| `qa/` | Look development, animatic, hojas de revisión del render final, tipografía y stills |
