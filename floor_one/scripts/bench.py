"""Benchmark de render 4K: escena mínima (suelo + 3 luces + zapatilla)."""
import sys, os, time, math
import bpy
from mathutils import Vector
sys.path.insert(0, os.path.dirname(__file__))
import materials as M
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT, "project/shoe.blend"))
sc = bpy.context.scene
spp = int(sys.argv[1]); rx = int(sys.argv[2])
sc.render.engine = "CYCLES"; sc.cycles.samples = spp; sc.cycles.use_denoising = True
sc.cycles.adaptive_threshold = 0.04; sc.cycles.caustics_reflective = False; sc.cycles.caustics_refractive = False; sc.cycles.blur_glossy = 1.0
sc.cycles.max_bounces = 4; sc.cycles.diffuse_bounces = 1; sc.cycles.glossy_bounces = 1; sc.cycles.transmission_bounces = 2
sc.render.resolution_x, sc.render.resolution_y = rx, rx * 9 // 16
sc.view_settings.view_transform = "AgX"
bpy.data.objects["SHOE_ROOT"].location.z = 0.0265
bpy.ops.mesh.primitive_plane_add(size=6)
fl = bpy.context.active_object; fl.data.materials.append(M.make_floor_material(ROOT))
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.003, 0.003, 0.003, 1)
for name, loc, e, s, col in (("key", (0.2, 0.7, 0.9), 80, 0.8, (1, .95, .88)), ("rim", (-0.6, -0.4, 0.25), 60, 0.3, (1, .45, .12)), ("fill", (0.6, 0.5, 0.15), 6, 1.0, (1, 1, 1))):
    ld = bpy.data.lights.new(name, "AREA"); ld.energy = e; ld.size = s; ld.color = col
    ob = bpy.data.objects.new(name, ld); sc.collection.objects.link(ob); ob.location = loc
    ob.rotation_euler = (Vector((0.145, 0, 0.05)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
cd = bpy.data.cameras.new("c"); cd.lens = 45
cam = bpy.data.objects.new("c", cd); sc.collection.objects.link(cam); sc.camera = cam
cam.location = (0.42, 0.45, 0.11)
cam.rotation_euler = (Vector((0.14, 0, 0.05)) - cam.location).to_track_quat("-Z", "Y").to_euler()
sc.render.filepath = sys.argv[3]
t = time.time(); bpy.ops.render.render(write_still=True); print("RENDER_TIME", time.time() - t)
