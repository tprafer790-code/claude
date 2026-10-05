"""Vista de control del modelo: varias cámaras, luz de estudio neutra. Uso:
/opt/bvenv/bin/python scripts/preview_shoe.py out_prefix [res_x] [samples]"""
import sys, os, math
import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT, "project/shoe.blend"))
sc = bpy.context.scene
out = sys.argv[1] if len(sys.argv) > 1 else "/tmp/prev"
rx = int(sys.argv[2]) if len(sys.argv) > 2 else 960
spp = int(sys.argv[3]) if len(sys.argv) > 3 else 24
sc.render.engine = "CYCLES"
sc.cycles.samples = spp
sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = rx, int(rx * 9 / 16)
sc.view_settings.view_transform = "AgX"
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.02, 0.02, 0.022, 1)
for name, loc, e, s in (("key", (0.3, 0.5, 0.6), 25, 0.5), ("rim", (-0.4, -0.3, 0.3), 15, 0.3), ("fill", (0.4, -0.5, 0.2), 5, 0.6)):
    ld = bpy.data.lights.new(name, "AREA"); ld.energy = e; ld.size = s
    ob = bpy.data.objects.new(name, ld); sc.collection.objects.link(ob); ob.location = loc
    ob.rotation_euler = (Vector((0.145, 0, 0.03)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
views = {"lat": ((0.145, 0.62, 0.06), 50), "q34": ((0.42, 0.42, 0.22), 50), "top": ((0.145, 0.0001, 0.6), 50),
         "med": ((0.145, -0.62, 0.06), 50), "back": ((-0.5, 0.15, 0.15), 50), "bot": ((0.145, 0.05, -0.55), 50)}
only = os.environ.get("VIEWS")
for vn, (loc, lens) in views.items():
    if only and vn not in only.split(","):
        continue
    cd = bpy.data.cameras.new(vn); cd.lens = lens
    cam = bpy.data.objects.new(vn, cd); sc.collection.objects.link(cam)
    cam.location = loc
    cam.rotation_euler = (Vector((0.145, 0, 0.03)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    sc.camera = cam
    sc.render.filepath = f"{out}_{vn}.png"
    bpy.ops.render.render(write_still=True)
