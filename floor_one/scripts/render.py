"""FLOOR/ONE - render por perfiles, reanudable (no sobrescribe fotogramas ya hechos).

Uso: /opt/bvenv/bin/python scripts/render.py PERFIL INICIO FIN [STEP] [--frames 23,95,...]
Perfiles:
  animatic : 640x360, 3 muestras, sin motion blur  -> renders/animatic/
  final    : 1920x1080 nativo, 12 muestras + OIDN, motion blur 180° -> renders/final/
  still4k  : 3840x2160 nativo, 32 muestras (fotogramas críticos de QA) -> renders/still4k/
  look     : 1920x1080, 16 muestras (look-dev) -> renders/look/
"""
import os
import sys
import time
import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PROFILES = {
    "animatic": dict(res=(480, 270), spp=2, mb=False, dir="renders/animatic"),
    "final": dict(res=(1920, 1080), spp=8, mb=True, dir="renders/final"),
    "still4k": dict(res=(3840, 2160), spp=32, mb=True, dir="renders/still4k"),
    "look": dict(res=(1920, 1080), spp=16, mb=True, dir="renders/look"),
}
argv = sys.argv[1:]
prof = PROFILES[argv[0]]
blend = os.environ.get("BLEND", os.path.join(ROOT, "project", "floor_one.blend"))
bpy.ops.wm.open_mainfile(filepath=blend)
sc = bpy.context.scene
sc.render.resolution_x, sc.render.resolution_y = prof["res"]
if os.environ.get("VERTICAL"):
    sc.render.resolution_x, sc.render.resolution_y = prof["res"][1], prof["res"][0]
sc.render.resolution_percentage = 100
sc.cycles.samples = prof["spp"]
sc.render.use_motion_blur = prof["mb"]
outdir = os.path.join(ROOT, os.environ.get("OUTDIR", prof["dir"]))
os.makedirs(outdir, exist_ok=True)
if "--frames" in argv:
    frames = [int(x) for x in argv[argv.index("--frames") + 1].split(",")]
else:
    a, b = int(argv[1]), int(argv[2])
    step = int(argv[3]) if len(argv) > 3 else 1
    frames = list(range(a, b + 1, step))
t0 = time.time()
done = 0
for f in frames:
    path = os.path.join(outdir, f"f_{f:04d}.png")
    if os.path.exists(path) and os.path.getsize(path) > 0:
        continue
    sc.frame_set(f)
    sc.render.filepath = path
    t = time.time()
    bpy.ops.render.render(write_still=True)
    done += 1
    print(f"FRAME {f} {time.time() - t:.1f}s total {time.time() - t0:.0f}s", flush=True)
print("DONE", done, "frames", f"{time.time() - t0:.0f}s")
