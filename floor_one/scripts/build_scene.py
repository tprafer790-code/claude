"""FLOOR/ONE - construye project/floor_one.blend: entorno, luces, bailarín, gráficos y animación horneada.

Uso: /opt/bvenv/bin/python scripts/build_scene.py [look]   (look = A|B|C, por defecto el elegido en LOOKDEV)
"""
import os
import sys
import math
import numpy as np
import bpy
from mathutils import Vector, Matrix, Quaternion

sys.path.insert(0, os.path.dirname(__file__))
import materials as M
import shoe_geo as G
import shots as SH

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
rng = np.random.default_rng(7)
LOOKS = {  # tres opciones de luz evaluadas en look-dev (ver QA.md)
    "A": dict(key=(45, (1.0, 0.93, 0.84)), rim=(55, (1.0, 0.40, 0.10)), fill=(5, (0.80, 0.86, 1.0)), spot=16, prac=1.0),
    "B": dict(key=(30, (1.0, 0.92, 0.82)), rim=(95, (1.0, 0.36, 0.08)), fill=(2.5, (0.80, 0.86, 1.0)), spot=18, prac=1.4),
    "C": dict(key=(60, (1.0, 0.95, 0.90)), rim=(30, (1.0, 0.45, 0.15)), fill=(9, (0.90, 0.92, 1.0)), spot=12, prac=0.7),
}
LOOK = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] in LOOKS else "B"


def link(ob, coll=None):
    (coll or bpy.context.scene.collection).objects.link(ob)
    return ob


def mat_simple(name, col, rough=0.8, sheen=0.0, emit=None, strength=0.0):
    m = bpy.data.materials.new(name)
    b = M.NB(m)
    b.set(Base_Color=col, Roughness=rough, Sheen_Weight=sheen, Sheen_Roughness=0.4)
    if emit is not None:
        b.set(Emission_Color=emit, Emission_Strength=strength)
    return m, b


# ------------------------------------------------------------------ entorno
def build_environment():
    sc = bpy.context.scene
    env = bpy.data.collections.new("ENV"); sc.collection.children.link(env)
    # pista de arce (12 x 12 m)
    me = bpy.data.meshes.new("floor")
    me.from_pydata([(-6, -6, 0), (6, -6, 0), (6, 6, 0), (-6, 6, 0)], [], [(0, 1, 2, 3)])
    fl = link(bpy.data.objects.new("floor", me), env)
    me.materials.append(M.make_floor_material(ROOT))
    # paredes: cilindro de 4.2 m con paneles de hormigón y juntas
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=4.2, depth=5.0, location=(0, 0, 2.5), end_fill_type="NOTHING")
    wall = bpy.context.active_object; wall.name = "studio_wall"
    for c in wall.users_collection:
        c.objects.unlink(wall)
    env.objects.link(wall)
    m = bpy.data.materials.new("concrete"); b = M.NB(m)
    obj = b.tc.outputs["Object"]
    nz = b.n("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 3.0; nz.inputs["Detail"].default_value = 3
    b.link(obj, nz.inputs[0])
    sep = b.n("ShaderNodeSeparateXYZ"); b.link(obj, sep.inputs[0])
    ang = b.math("ARCTAN2", sep.outputs[1], sep.outputs[0])
    seamv = b.math("LESS_THAN", b.math("ABSOLUTE", b.math("SUBTRACT", b.math("FRACT", b.math("MULTIPLY", ang, 24 / (2 * math.pi))), 0.5)), 0.49)
    seamh = b.math("LESS_THAN", b.math("ABSOLUTE", b.math("SUBTRACT", b.math("FRACT", b.math("DIVIDE", sep.outputs[2], 1.2)), 0.5)), 0.493)
    seam = b.math("MULTIPLY", seamv, seamh)
    col = b.mix(nz.outputs[0], (0.020, 0.019, 0.018, 1), (0.045, 0.042, 0.038, 1))
    col = b.mix(b.math("SUBTRACT", 1.0, seam), col, (0.006, 0.006, 0.006, 1))
    # sombreado no iluminado: textura de hormigón con degradado de luz rebotada cerca del suelo
    grad = b.math("POWER", b.math("SUBTRACT", 1.0, b.math("MINIMUM", b.math("DIVIDE", sep.outputs[2], 3.0), 1.0)), 2.0)
    em = b.n("ShaderNodeEmission")
    b.link(col, em.inputs[0])
    b.link(b.math("ADD", 0.03, b.math("MULTIPLY", grad, 0.10)), em.inputs[1])
    b.link(em.outputs[0], b.out.inputs["Surface"])
    m.cycles.emission_sampling = "NONE"
    wall.data.materials.append(m)   # sin bump: la pared siempre queda desenfocada y era el 35 % del coste
    # luces prácticas cálidas lejanas (dan detalle al fondo; quedan desenfocadas)
    prac_mat, pb = mat_simple("practical", (0, 0, 0, 1), emit=(1.0, 0.55, 0.22, 1), strength=1.2)
    prac_mat.cycles.emission_sampling = "NONE"
    pracs = []
    for i, a in enumerate([20, 110, 160, 205, 232, 320]):
        r = math.radians(a)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(4.05 * math.cos(r), 4.05 * math.sin(r), 0.75 + 0.2 * (i % 2)))
        ob = bpy.context.active_object; ob.name = f"practical_{i}"
        ob.scale = (0.12, 0.05, 0.7 + 0.2 * (i % 3))
        ob.rotation_euler = (0, 0, r)
        ob.data.materials.append(prac_mat)
        for c in ob.users_collection:
            c.objects.unlink(ob)
        env.objects.link(ob)
        ob.visible_diffuse = False  # no iluminan el producto, solo se ven al fondo
        ob.visible_glossy = True
        pracs.append(ob)
    w = bpy.data.worlds.new("world"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.0018, 0.0016, 0.0015, 1)
    return pb


# ------------------------------------------------------------------ luces y cámara
def build_lights():
    L = {}
    lk = LOOKS[LOOK]
    for name, kind in (("key", "AREA"), ("rim", "AREA"), ("fill", "AREA"), ("spot", "SPOT")):
        ld = bpy.data.lights.new(name, kind)
        if kind == "AREA":
            ld.shape = "RECTANGLE" if name != "rim" else "DISK"
        ob = link(bpy.data.objects.new(name, ld))
        ob.rotation_mode = "QUATERNION"
        L[name] = ob
    L["key"].data.color = lk["key"][1]
    L["rim"].data.color = lk["rim"][1]
    L["fill"].data.color = lk["fill"][1]
    L["spot"].data.color = (1.0, 0.93, 0.82)
    L["rim"].data.spread = math.radians(70)     # contraluz dirigido: no inunda la pista
    L["key"].data.spread = math.radians(70)
    L["spot"].data.spot_blend = 0.35
    L["spot"].data.shadow_soft_size = 0.01
    return L


def build_camera():
    cd = bpy.data.cameras.new("CAM")
    cd.sensor_width = 36
    cd.dof.use_dof = True
    cd.clip_start = 0.005
    ob = link(bpy.data.objects.new("CAM", cd))
    ob.rotation_mode = "QUATERNION"
    bpy.context.scene.camera = ob
    return ob


# ------------------------------------------------------------------ zapatilla izquierda (duplicado enlazado + espejo)
def build_left_shoe():
    src = bpy.data.objects["SHOE_ROOT"]
    coll = bpy.data.collections.new("SHOE_L"); bpy.context.scene.collection.children.link(coll)
    mapping = {}

    def dup(o, parent):
        n = o.copy()
        n.name = o.name + "_L"
        coll.objects.link(n)
        n.parent = parent
        n.matrix_parent_inverse = o.matrix_parent_inverse.copy()
        mapping[o.name] = n
        for ch in o.children:
            dup(ch, n)
        return n
    root = dup(src, None)
    root.rotation_mode = "QUATERNION"
    return root, mapping


# ------------------------------------------------------------------ bailarín
NAMES = ["pelvis", "waist"] + [f"{j}_{s}" for s in "LR" for j in ("hip", "thigh", "knee", "s1", "s2", "s3", "cuff")]
RADII = {"pelvis": (0.17, 0.13), "waist": (0.155, 0.115), "hip": (0.105, 0.105), "thigh": (0.097, 0.092),
         "knee": (0.082, 0.078), "s1": (0.078, 0.074), "s2": (0.069, 0.066), "s3": (0.074, 0.070), "cuff": (0.046, 0.044)}


def build_dancer():
    coll = bpy.data.collections.new("DANCER"); bpy.context.scene.collection.children.link(coll)
    rest = []
    for n in NAMES:
        rest.append(Vector((0, 0, 0.5 + 0.01 * len(rest))))
    idx = {n: i for i, n in enumerate(NAMES)}
    edges = [(idx["pelvis"], idx["waist"])]
    for s in "LR":
        chain = ["pelvis"] + [f"{j}_{s}" for j in ("hip", "thigh", "knee", "s1", "s2", "s3", "cuff")]
        edges += [(idx[a], idx[b]) for a, b in zip(chain, chain[1:])]
    me = bpy.data.meshes.new("pants")
    me.from_pydata([tuple(v) for v in rest], edges, [])
    ob = link(bpy.data.objects.new("pants", me), coll)
    empties = {}
    for i, n in enumerate(NAMES):
        e = link(bpy.data.objects.new("J_" + n, None), coll)
        e.location = rest[i]
        e.empty_display_size = 0.02
        empties[n] = e
        h = ob.modifiers.new("hook_" + n, "HOOK")
        h.object = e
        h.vertex_indices_set([i])
        h.center = rest[i]
        h.matrix_inverse = Matrix.Translation(rest[i]).inverted()
    sk = ob.modifiers.new("skin", "SKIN")
    sk.branch_smoothing = 0.6
    sk.use_smooth_shade = True
    if not me.skin_vertices:
        me.skin_vertices.new()
    for i, n in enumerate(NAMES):
        key = n.split("_")[0]
        me.skin_vertices[0].data[i].radius = RADII[key]
    me.skin_vertices[0].data[0].use_root = True
    sub = ob.modifiers.new("subsurf", "SUBSURF"); sub.levels = 1; sub.render_levels = 2
    pm = bpy.data.materials.new("pants_cotton"); b = M.NB(pm)
    nz = b.n("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 30; nz.inputs["Detail"].default_value = 6
    b.link(b.tc.outputs["Object"], nz.inputs[0])
    b.set(Base_Color=M.srgb("#0E0E0E"), Roughness=0.9, Sheen_Weight=0.25, Sheen_Roughness=0.5, Sheen_Tint=(0.35, 0.35, 0.35, 1))
    b.set(Normal=b.bump(nz.outputs[0], 0.25, 0.01))
    me.materials.append(pm)
    # torso (camiseta marfil) rígido sobre la pelvis; queda casi siempre fuera de cuadro
    tm = bpy.data.meshes.new("torso")
    tm.from_pydata([(0, 0, 0.05), (0, 0, 0.30), (0.02, 0, 0.55)], [(0, 1), (1, 2)], [])
    tor = link(bpy.data.objects.new("torso", tm), coll)
    tsk = tor.modifiers.new("skin", "SKIN")
    if not tm.skin_vertices:
        tm.skin_vertices.new()
    for i, r in enumerate([(0.17, 0.125), (0.19, 0.13), (0.21, 0.13)]):
        tm.skin_vertices[0].data[i].radius = r
    tm.skin_vertices[0].data[0].use_root = True
    s2 = tor.modifiers.new("subsurf", "SUBSURF"); s2.levels = 1; s2.render_levels = 2
    tmat, _ = mat_simple("tee", M.srgb("#E9E2D5"), rough=0.85, sheen=0.5)
    tm.materials.append(tmat)
    pel = link(bpy.data.objects.new("PELVIS", None), coll)
    pel.rotation_mode = "QUATERNION"
    tor.parent = pel
    return empties, pel


def ik_knee(H, A, pole, l1=0.44, l2=0.43):
    d = (A - H).length
    d = min(d, l1 + l2 - 0.004)
    u = (A - H).normalized()
    a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
    h = math.sqrt(max(0.0, l1 * l1 - a * a))
    v = pole - u * pole.dot(u)
    v = v.normalized() if v.length > 1e-6 else Vector((0, 0, 1))
    return H + u * a + v * h, H + u * min((A - H).length, l1 + l2 - 0.004)


def dancer_joints(st):
    d = st["dancer"]
    P = d["pelvis"]
    yaw = math.radians(d["pyaw"])
    fwd = Vector((math.cos(yaw), math.sin(yaw), 0))
    lat = Vector((-math.sin(yaw), math.cos(yaw), 0))
    J = {"pelvis": P + Vector((0, 0, 0.02)), "waist": P + Vector((0, 0, 0.17))}
    for s, Mf, sign in (("R", st["root"], -1), ("L", st["rootL"], 1)):
        mir = s == "L"
        ank_local = SH.FOOT_ANK
        A = Mf @ ank_local
        H = P + lat * (0.095 * sign) - Vector((0, 0, 0.04))
        toe = (Mf.to_3x3() @ Vector((1, 0, 0)))
        toe.z = 0
        pole = (toe.normalized() * 0.7 + fwd * 0.6 + lat * sign * 0.6 + Vector((0, 0, 0.25)))
        K, A2 = ik_knee(H, A, pole)
        J[f"hip_{s}"] = H
        J[f"thigh_{s}"] = H.lerp(K, 0.5) + fwd * 0.012
        J[f"knee_{s}"] = K
        J[f"s1_{s}"] = K.lerp(A2, 0.32)
        J[f"s2_{s}"] = K.lerp(A2, 0.62)
        J[f"s3_{s}"] = K.lerp(A2, 0.84) + Vector((0, 0, 0.004))
        J[f"cuff_{s}"] = A2 + Vector((0, 0, 0.012))
    return J


# ------------------------------------------------------------------ polvo (Geometry Nodes, determinista por tiempo)
def build_dust():
    n = 300
    pts = np.c_[rng.uniform(-1.4, 1.4, n), rng.uniform(-1.4, 1.4, n), rng.uniform(0.005, 0.9, n) ** 1.6]
    me = bpy.data.meshes.new("dust_pts"); me.from_pydata(pts.tolist(), [], [])
    ob = link(bpy.data.objects.new("dust", me))
    dm, _ = mat_simple("dust_mat", (0.9, 0.85, 0.75, 1), rough=0.6)
    ng = bpy.data.node_groups.new("dust_gn", "GeometryNodeTree")
    ng.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    N = ng.nodes; Lk = ng.links.new
    gi = N.new("NodeGroupInput"); go = N.new("NodeGroupOutput")
    pos = N.new("GeometryNodeInputPosition")
    tme = N.new("GeometryNodeInputSceneTime")
    comb = N.new("ShaderNodeCombineXYZ"); Lk(tme.outputs["Seconds"], comb.inputs[2])
    sc1 = N.new("ShaderNodeVectorMath"); sc1.operation = "SCALE"; sc1.inputs[3].default_value = 1.6
    Lk(pos.outputs[0], sc1.inputs[0])
    add = N.new("ShaderNodeVectorMath"); add.operation = "ADD"
    Lk(sc1.outputs[0], add.inputs[0]); Lk(comb.outputs[0], add.inputs[1])
    nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 0.6
    Lk(add.outputs[0], nz.inputs["Vector"])
    sub = N.new("ShaderNodeVectorMath"); sub.operation = "SUBTRACT"; sub.inputs[1].default_value = (0.5, 0.5, 0.5)
    Lk(nz.outputs["Color"], sub.inputs[0])
    amp = N.new("ShaderNodeVectorMath"); amp.operation = "SCALE"; amp.inputs[3].default_value = 0.22
    Lk(sub.outputs[0], amp.inputs[0])
    sp = N.new("GeometryNodeSetPosition")
    Lk(gi.outputs[0], sp.inputs["Geometry"]); Lk(amp.outputs[0], sp.inputs["Offset"])
    ico = N.new("GeometryNodeMeshIcoSphere"); ico.inputs["Radius"].default_value = 1.0; ico.inputs["Subdivisions"].default_value = 1
    smat = N.new("GeometryNodeSetMaterial"); smat.inputs["Material"].default_value = dm
    Lk(ico.outputs["Mesh"], smat.inputs["Geometry"])
    rnd = N.new("FunctionNodeRandomValue"); rnd.data_type = "FLOAT"
    rnd.inputs[2].default_value = 0.0002; rnd.inputs[3].default_value = 0.0006
    iop = N.new("GeometryNodeInstanceOnPoints")
    Lk(sp.outputs[0], iop.inputs["Points"]); Lk(smat.outputs[0], iop.inputs["Instance"])
    Lk(rnd.outputs[1], iop.inputs["Scale"])
    Lk(iop.outputs[0], go.inputs[0])
    mod = ob.modifiers.new("dust", "NODES"); mod.node_group = ng
    return ob


# ------------------------------------------------------------------ ráfagas de polvo en los contactos
BURSTS = [(16, 0, 36), (436, 7, 30), (496, 8, 26)]   # contactos en 0.5 s, 14.5 s, 16.5 s   # (fotograma de contacto, índice de plano, nº partículas)


def build_bursts():
    ico = bpy.data.meshes.new("burst_ico")
    import bmesh
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0); bm.to_mesh(ico); bm.free()
    dm = bpy.data.materials.get("dust_mat")
    ico.materials.append(dm)
    parts = []
    for bi, (f0, _, n) in enumerate(BURSTS):
        st = SH.state_at(f0)[1]
        Mr = st["root"]
        for k in range(n):
            x = rng.uniform(0.02, 0.28)
            side = rng.choice([-1, 1])
            c, w = G.center_halfwidth(np.array(x))
            p0 = Mr @ Vector((x, float(c + side * (w + 0.004)), -0.025))
            p0.z = 0.002
            out = (Mr.to_3x3() @ Vector((0, side, 0)))
            out.z = 0
            out = out.normalized()
            v = out * rng.uniform(0.12, 0.45) + Vector((0, 0, rng.uniform(0.08, 0.30))) + Vector(rng.normal(0, 0.05, 3))
            ob = link(bpy.data.objects.new(f"burst_{bi}_{k}", ico))
            parts.append(dict(ob=ob, f0=f0, p0=p0, v=v, life=rng.uniform(18, 34), r=rng.uniform(0.0003, 0.0009)))
    return parts


def burst_state(p, fr):
    t = (fr - p["f0"]) / 30.0
    if t < 0 or t > p["life"] / 30.0:
        return Vector((0, 0, -50)), 0.0001
    drag = (1 - math.exp(-3.0 * t)) / 3.0
    pos = p["p0"] + p["v"] * drag + Vector((0, 0, -0.25 * t * t))
    pos.z = max(pos.z, 0.0008)
    life = t / (p["life"] / 30.0)
    return pos, p["r"] * (1 - life ** 2)


# ------------------------------------------------------------------ gráficos: arco del pivote y rastro del giro
def emissive(name, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    o = nt.nodes.new("ShaderNodeOutputMaterial")
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs[0].default_value = M.srgb("#E97825")
    e.inputs[1].default_value = strength
    nt.links.new(e.outputs[0], o.inputs[0])
    return m, e


def build_graphics():
    # anillo en la suela (hijo de OUTSOLE)
    cu = bpy.data.curves.new("ring", "CURVE"); cu.dimensions = "3D"
    sp = cu.splines.new("POLY"); n = 96
    sp.points.add(n)
    for i in range(n + 1):
        a = 2 * math.pi * i / n + 1.2
        sp.points[i].co = (SH.BALL.x + 0.047 * math.cos(a), SH.BALL.y + 0.047 * math.sin(a), -0.0275, 1)
    cu.bevel_depth = 0.00065
    ring = link(bpy.data.objects.new("ring_arc", cu))
    ring.parent = bpy.data.objects["OUTSOLE"]
    rm, _ = emissive("arc_emit", 6.0)
    cu.materials.append(rm)
    ring.visible_diffuse = False
    # rastro del pivote: trayectoria real del talón en el plano 8
    pts = []
    for fl in np.linspace(10, 50, 80):
        st = SH.SHOTS[7](float(fl))
        p = st["root"] @ Vector((0.02, 0.0, -0.02))
        pts.append((p.x, p.y, 0.0012))
    cu2 = bpy.data.curves.new("trail", "CURVE"); cu2.dimensions = "3D"
    sp2 = cu2.splines.new("POLY"); sp2.points.add(len(pts) - 1)
    for i, p in enumerate(pts):
        sp2.points[i].co = (*p, 1)
    cu2.bevel_depth = 0.0011
    trail = link(bpy.data.objects.new("trail_arc", cu2))
    tm, _ = emissive("trail_emit", 4.0)
    cu2.materials.append(tm)
    trail.visible_diffuse = False
    return ring, trail


# ------------------------------------------------------------------ horneado por lotes
class Baker:
    def __init__(self):
        self.ch = {}

    def rec(self, idb, path, idx, fr, val):
        self.ch.setdefault((idb.as_pointer(), path, idx), [idb, path, idx, []])[3].append((fr, float(val)))

    def vec(self, idb, path, fr, v):
        for i, x in enumerate(v):
            self.rec(idb, path, i, fr, x)

    def flush(self):
        for _, (idb, path, idx, keys) in self.ch.items():
            if idb.animation_data is None:
                idb.animation_data_create()
            if idb.animation_data.action is None:
                idb.animation_data.action = bpy.data.actions.new(idb.name + "_act")
            act = idb.animation_data.action
            fc = act.fcurves.find(path, index=idx) or act.fcurves.new(path, index=idx)
            keys.sort()
            arr = np.array(keys, dtype=np.float32)
            fc.keyframe_points.add(len(arr))
            fc.keyframe_points.foreach_set("co", arr.ravel())
            fc.keyframe_points.foreach_set("interpolation", np.ones(len(arr), dtype=np.int32))  # LINEAR
            fc.update()


def look_quat(loc, tgt, roll=0.0):
    q = (tgt - loc).to_track_quat("-Z", "Y")
    if roll:
        q = q @ Quaternion((0, 0, 1), math.radians(roll))
    return q


def main():
    bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT, "project", "shoe.blend"))
    sc = bpy.context.scene
    sc.render.fps = 30
    sc.frame_start, sc.frame_end = 1, 900
    prac_b = build_environment()
    L = build_lights()
    camo = build_camera()
    root = bpy.data.objects["SHOE_ROOT"]; root.rotation_mode = "QUATERNION"
    rootL, mapL = build_left_shoe()
    joints, pelvis = build_dancer()
    build_dust()
    bursts = build_bursts()
    ring, trail = build_graphics()
    groups = {k: bpy.data.objects[k] for k in ("UPPER", "INSOLE", "MIDSOLE", "OUTSOLE")}
    laces = bpy.data.objects["laces"]
    kb = laces.data.shape_keys.key_blocks["tight"]; kb.slider_max = 1.5
    lk = LOOKS[LOOK]
    bk = Baker()
    prevq = {}

    def qcont(name, q):
        if name in prevq and prevq[name].dot(q) < 0:
            q = -q
        prevq[name] = q
        return q

    FAR = Matrix.Translation(Vector((0, 0, -50)))
    for f in range(1, 901):
        for sub in (-0.25, 0.0, 0.25):
            fr = f + sub
            _, st = SH.state_at(f, sub)
            # producto
            loc, q, scl = st["root"].decompose()
            bk.vec(root, "location", fr, loc); bk.vec(root, "rotation_quaternion", fr, qcont("root", q)); bk.vec(root, "scale", fr, scl)
            ML = st["rootL"] if st["rootL"] is not None else FAR
            M0 = ML @ Matrix.Diagonal((1, -1, 1, 1)) if st["rootL"] is not None else FAR
            l2, q2, _ = M0.decompose()
            bk.vec(rootL, "location", fr, l2); bk.vec(rootL, "rotation_quaternion", fr, qcont("rootL", q2))
            bk.vec(rootL, "scale", fr, (1, -1, 1))
            for k, g in groups.items():
                bk.rec(g, "location", 2, fr, st["parts"][k])
            bk.rec(laces.data.shape_keys, 'key_blocks["tight"].value', 0, fr, st["lace"])
            # cámara
            c = st["cam"]
            bk.vec(camo, "location", fr, c["loc"])
            bk.vec(camo, "rotation_quaternion", fr, qcont("cam", look_quat(c["loc"], c["tgt"], c["roll"])))
            bk.rec(camo.data, "lens", 0, fr, c["lens"])
            bk.rec(camo.data, "dof.focus_distance", 0, fr, c["focus"])
            bk.rec(camo.data, "dof.aperture_fstop", 0, fr, c["fstop"])
            # luces
            for name in ("key", "rim", "fill", "spot"):
                d = st[name]
                bk.vec(L[name], "location", fr, d["loc"])
                bk.vec(L[name], "rotation_quaternion", fr, qcont(name, look_quat(d["loc"], d["tgt"])))
                base = lk[name][0] if name != "spot" else lk["spot"]
                bk.rec(L[name].data, "energy", 0, fr, base * d["e"])
                if name == "spot":
                    bk.rec(L[name].data, "spot_size", 0, fr, math.radians(d["size"]))
                else:
                    bk.rec(L[name].data, "size", 0, fr, d["size"])
            # gráficos (factor inicio = fin => invisible)
            for ob, key in ((ring, "ring"), (trail, "trail")):
                a, b, on = st[key]
                bk.rec(ob.data, "bevel_factor_start", 0, fr, a if on else 0.0)
                bk.rec(ob.data, "bevel_factor_end", 0, fr, max(a, b) if on else 0.0)
            # bailarín
            if st["dancer"] is not None:
                J = dancer_joints(st)
                d = st["dancer"]
                bk.vec(pelvis, "location", fr, d["pelvis"] + Vector((0, 0, 0.14)))
                bk.vec(pelvis, "rotation_quaternion", fr, qcont("pel", Quaternion((0, 0, 1), math.radians(d["pyaw"])) @ Quaternion((0, 1, 0), math.radians(12))))
            else:
                J = {n: Vector((0, 0, -50)) + Vector((0, 0, 0.01 * i)) for i, n in enumerate(NAMES)}
                bk.vec(pelvis, "location", fr, (0, 0, -50))
                bk.vec(pelvis, "rotation_quaternion", fr, qcont("pel", Quaternion()))
            for n, e in joints.items():
                bk.vec(e, "location", fr, J[n])
            for p in bursts:
                pos, r = burst_state(p, fr)
                bk.vec(p["ob"], "location", fr, pos)
                bk.vec(p["ob"], "scale", fr, (r, r, r))
    bk.flush()
    prac_b.nt.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 1.2 * lk["prac"]

    # ---------------- render
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    cy.device = "CPU"
    cy.samples = 8
    cy.adaptive_threshold = 0.06
    cy.use_denoising = True
    cy.denoiser = "OPENIMAGEDENOISE"
    cy.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    cy.denoising_prefilter = "ACCURATE"
    cy.max_bounces = 3; cy.diffuse_bounces = 1; cy.glossy_bounces = 1; cy.transmission_bounces = 1
    cy.light_sampling_threshold = 0.05
    cy.sample_clamp_indirect = 4.0
    cy.caustics_reflective = False; cy.caustics_refractive = False; cy.blur_glossy = 1.0
    cy.seed = 0
    cy.use_animated_seed = True
    sc.render.use_motion_blur = True
    sc.render.motion_blur_shutter = 0.5
    sc.render.use_persistent_data = True
    sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
    sc.render.film_transparent = False
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
    sc.view_settings.exposure = 0.0
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGB"
    sc.render.image_settings.color_depth = "8"
    sc.frame_set(1)
    out = os.path.join(ROOT, "project", "floor_one.blend")
    sc["look"] = LOOK
    bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
    print("saved", out, "look", LOOK)


if __name__ == "__main__":
    main()
