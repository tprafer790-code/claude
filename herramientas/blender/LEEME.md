# Modelos 3D (Blender por código)

Requiere `bpy` (Blender como módulo de Python, `pip install bpy`) y Pillow.

```bash
python herramientas/blender/puente.py --prueba prueba.png               # un fotograma de prueba
python herramientas/blender/puente.py --secuencia carpeta 72             # 72 fotogramas del giro
python herramientas/blender/componer.py assets/img/portada.webp --secuencia carpeta salida
ffmpeg -framerate 24 -i salida/f%03d.png -c:v libx264 -crf 26 -g 1 -pix_fmt yuv420p -vf scale=1280:-2 -movflags +faststart assets/video/puente.mp4
```

`-g 1` (todos los fotogramas clave) es imprescindible para que el vídeo avance suave con el scroll.
