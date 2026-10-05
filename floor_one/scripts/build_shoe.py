"""FLOOR/ONE - construcción del modelo 3D editable de la zapatilla en Blender.

Ejecutar:  /opt/bvenv/bin/python scripts/build_shoe.py
Salida:    project/shoe.blend  (colección SHOE con piezas separadas y materiales)
"""
import os
import sys
import math
import numpy as np
import bpy
import bmesh
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from skimage.measure import marching_cubes
from scipy.ndimage import gaussian_filter, distance_transform_edt, map_coordinates

sys.path.insert(0, os.path.dirname(__file__))
import shoe_geo as G
import materials as M

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
rng = np.random.default_rng(42)


# ------------------------------------------------------------------ utilidades
def new_obj(name, verts, faces, coll, mat=None, smooth=True, uvs=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    if uvs is not None:
        uvl = me.uv_layers.new(name="UVMap")
        loop_vi = np.zeros(len(me.loops), int)
        me.loops.foreach_get("vertex_index", loop_vi)
        uvl.data.foreach_set("uv", np.asarray(uvs)[loop_vi].ravel())
    me.update()
    if smooth:
        me.shade_smooth()
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    if mat:
        me.materials.append(mat)
    return ob


def bm_to_obj(bm, name, coll, mats=()):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    me.shade_smooth()
    for m in mats:
        me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    return ob


def sdf_from_occ(occ, vox):
    inside = distance_transform_edt(occ)
    outside = distance_transform_edt(~occ)
    return (outside - inside) * vox


def mc_mesh(sd, origin, vox, sigma=1.0):
    sd = gaussian_filter(sd, sigma)
    v, f, n, _ = marching_cubes(sd, 0.0, spacing=(vox, vox, vox))
    v = v + np.asarray(origin)
    return v, f[:, ::-1]  # orientar normales hacia fuera


def add_mod(ob, kind, **kw):
    m = ob.modifiers.new(kind.lower(), kind)
    for k, val in kw.items():
        setattr(m, k, val)
    return m


def apply_mods(ob):
    bpy.context.view_layer.objects.active = ob
    for m in list(ob.modifiers):
        with bpy.context.temp_override(object=ob, active_object=ob):
            bpy.ops.object.modifier_apply(modifier=m.name)


# ------------------------------------------------------------------ cortes de patronaje
def cut_mesh(bm, fn):
    """Divide la malla exactamente a lo largo de la isolínea fn(p)=0."""
    bm.verts.ensure_lookup_table()
    co = np.array([v.co[:] for v in bm.verts])
    vals = fn(co)
    lay = bm.verts.layers.float.get("cutv") or bm.verts.layers.float.new("cutv")
    for v, val in zip(bm.verts, vals):
        v[lay] = float(val)
    new = set()
    for e in [e for e in bm.edges if e.verts[0][lay] * e.verts[1][lay] < 0]:
        v0, v1 = e.verts
        a, b = v0[lay], v1[lay]
        t = a / (a - b)
        _, nv = bmesh.utils.edge_split(e, v0, t)
        nv[lay] = 0.0
        new.add(nv)
    for f in list(bm.faces):
        vs = [v for v in f.verts if v in new]
        if len(vs) == 2:
            try:
                bmesh.utils.face_split(f, vs[0], vs[1])
            except Exception:
                pass


def face_centroids(bm):
    return np.array([f.calc_center_median()[:] for f in bm.faces])


# ------------------------------------------------------------------ upper
def build_upper_shell():
    """Carcasa del upper desde campos de distancia analíticos (sin binarizar: sin escalones de vóxel)."""
    vox = 0.0006
    origin = np.array([-0.006, -0.062, -0.004])
    nx, ny, nz = int(0.305 / vox), int(0.124 / vox), int(0.118 / vox)
    xs = origin[0] + np.arange(nx) * vox
    ys = origin[1] + np.arange(ny) * vox
    zs = origin[2] + np.arange(nz) * vox
    X, Y, Z = np.meshgrid(xs, ys, zs, indexing="ij")
    c, w = G.center_halfwidth(X)
    T = np.maximum(G.top_height(X), 1e-4)
    w = np.maximum(w, 1e-4)
    # implícita suave de la horma y su normalización por el gradiente => distancia aproximada
    f = (np.abs(Y - c) / w) ** G.P_EXP + (np.clip(Z, 0, None) / T) ** G.Q_EXP - 1
    gx, gy, gz = np.gradient(f, vox)
    d_o = f / np.maximum(np.sqrt(gx ** 2 + gy ** 2 + gz ** 2), 1e-6)
    del gx, gy, gz, f
    d_o = np.maximum(d_o, -Z)                       # base plana del upper en z = 0
    shell = np.maximum(d_o, -(d_o + G.TH))           # grosor constante hacia dentro
    tw = G.throat_hw(X)
    d_throat = np.maximum(np.abs(Y - c) - tw, 0.03 - Z)
    shell = np.maximum(shell, -d_throat)             # garganta (hueco de la lengüeta)
    shell = np.maximum(shell, Z - G.collar_h(X))     # plano del cuello
    v, f_ = mc_mesh(shell.astype(np.float32), origin, vox, sigma=0.6)
    del X, Y, Z
    return v, f_, (d_o.astype(np.float32), origin, vox)


def sample_grid(field, origin, vox, P):
    idx = ((P - origin) / vox).T
    return map_coordinates(field[0] if isinstance(field, tuple) else field, idx, order=1, mode="nearest")


def build_upper(coll, mats):
    v, f, (sdo, org, vox) = build_upper_shell()
    bm = bmesh.new()
    for p in v:
        bm.verts.new(p)
    bm.verts.ensure_lookup_table()
    for tri in f:
        try:
            bm.faces.new([bm.verts[i] for i in tri])
        except ValueError:
            pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    for _ in range(2):   # relajación ligera de la triangulación de marching cubes
        bmesh.ops.smooth_laplacian_vert(bm, verts=bm.verts, lambda_factor=0.6, lambda_border=0.0,
                                        use_x=True, use_y=True, use_z=True, preserve_volume=True)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # cortes por todas las curvas de patronaje
    panels = [("heel", G.f_heel_counter), ("mud", G.f_mudguard), ("eye", G.f_eyestay),
              ("stripe", G.f_stripe), ("collar", G.f_collar_band), ("vamp", G.f_vamp)]
    for _, fn in panels:
        cut_mesh(bm, fn)
    bm.faces.ensure_lookup_table()
    C = face_centroids(bm)
    outer_d = map_coordinates(sdo, ((C - org) / vox).T, order=1, mode="nearest")  # distancia a la horma exterior
    is_outer = outer_d > -G.TH * 0.55
    val = {k: fn(C) < 0 for k, fn in panels}
    # índices de material del upper base: 0 lona, 1 piel puntera, 2 forro negro
    labels = np.zeros(len(C), int)
    labels[val["vamp"]] = 1
    labels[val["collar"]] = 3
    labels[~is_outer] = 2
    cc, _ = G.center_halfwidth(C[:, 0])
    near_rim = (C[:, 2] > G.collar_h(C[:, 0]) - 0.0045) | \
               ((np.abs(C[:, 1] - cc) - G.throat_hw(C[:, 0]) < 0.0018) & (C[:, 2] > 0.04) & (C[:, 0] > 0.09) & (C[:, 0] < 0.19))
    for fa, lab in zip(bm.faces, labels):
        fa.material_index = int(lab)
    base = bm_to_obj(bm, "upper_base", coll, [mats["canvas"], mats["leather"], mats["lining"], mats["collar"]])

    # piezas superpuestas: orden de apilado (las de encima se desplazan más)
    overlays = []
    order = [("stripe", "suede_orange", 0.0005), ("heel", "suede_black", 0.0007),
             ("mud", "suede_black", 0.0007), ("eye", "suede_black", 0.0009)]
    for key, matname, off in order:
        sel = val[key] & is_outer & ~near_rim
        if key == "stripe":
            sel &= ~val["heel"] & ~val["eye"] & ~val["mud"]
        if key == "mud":
            sel &= ~val["eye"]
        ob = extract_overlay(bm, sel, f"panel_{key}", coll, mats[matname], off)
        overlays.append((key, ob, matname))
    bm.free()
    return base, overlays


def extract_overlay(bm_src, sel, name, coll, mat, offset):
    bm = bmesh.new()
    vmap = {}
    for fa, s in zip(bm_src.faces, sel):
        if not s:
            continue
        vs = []
        for v in fa.verts:
            if v.index not in vmap:
                vmap[v.index] = bm.verts.new(v.co)
            vs.append(vmap[v.index])
        try:
            bm.faces.new(vs)
        except ValueError:
            pass
    bmesh.ops.dissolve_degenerate(bm, dist=0.00012, edges=bm.edges)
    # retirar astillas de contorno (caras con un solo vecino o muy pequeñas)
    for _ in range(2):
        loose = [f for f in bm.faces if f.calc_area() < 2e-9 or sum(1 for e in f.edges if len(e.link_faces) == 1) >= 2]
        bmesh.ops.delete(bm, geom=loose, context="FACES")
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * offset
    # suavizar el borde (relajación de los vértices de contorno a lo largo del borde)
    ob = bm_to_obj(bm, name, coll, [mat])
    bm.free()
    add_mod(ob, "SOLIDIFY", thickness=0.0011, offset=1.0, use_even_offset=False, use_rim=True, use_quality_normals=True)
    ob["stitch_source"] = True
    return ob


# ------------------------------------------------------------------ costuras
def boundary_chains(ob):
    """Cadenas ordenadas de vértices de contorno (antes de solidify)."""
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    bedges = [e for e in bm.edges if len(e.link_faces) == 1]
    adj = {}
    for e in bedges:
        a, b = e.verts[0].index, e.verts[1].index
        adj.setdefault(a, []).append(b)
        adj.setdefault(b, []).append(a)
    co = {v.index: np.array(v.co[:]) for v in bm.verts}
    nrm = {v.index: np.array(v.normal[:]) for v in bm.verts}
    seen = set()
    chains = []
    for s in adj:
        if s in seen:
            continue
        chain = [s]
        seen.add(s)
        cur = s
        while True:
            nxt = [n for n in adj[cur] if n not in seen]
            if not nxt:
                break
            cur = nxt[0]
            seen.add(cur)
            chain.append(cur)
        if len(chain) > 8:
            chains.append((np.array([co[i] for i in chain]), np.array([nrm[i] for i in chain])))
    bm.free()
    return chains


def resample(pts, step):
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    n = max(2, int(s[-1] / step))
    t = np.linspace(0, s[-1], n)
    return np.stack([np.interp(t, s, pts[:, i]) for i in range(3)], 1)


def stitch_template():
    """Puntada: cápsula achatada (8 x 4 vértices)."""
    verts = []
    for i in range(9):
        u = i / 8.0
        r = math.sin(math.pi * u) ** 0.6
        for j in range(6):
            a = 2 * math.pi * j / 6
            verts.append((u - 0.5, math.cos(a) * r * 0.5, math.sin(a) * r * 0.5))
    faces = []
    for i in range(8):
        for j in range(6):
            a = i * 6 + j
            b = i * 6 + (j + 1) % 6
            faces.append((a, b, b + 6, a + 6))
    return np.array(verts), faces


def build_stitches(overlays, panel_fns, coll, thread_mats, bvh_base):
    tv, tf = stitch_template()
    for key, ob, matname in overlays:
        chains = boundary_chains(ob)
        V, F = [], []
        fn = panel_fns[key]
        for pts, nrms in chains:
            if len(pts) < 10:
                continue
            for inset in (0.0021, 0.0045):
                rs = resample(pts, 0.0012)
                if len(rs) < 6:
                    continue
                tang = np.gradient(rs, axis=0)
                tang /= np.linalg.norm(tang, axis=1, keepdims=True) + 1e-12
                out = []
                for p, t in zip(rs, tang):
                    loc, n, _, _ = bvh_base.find_nearest(Vector(p))
                    if loc is None:
                        continue
                    n = np.array(n[:])
                    side = np.cross(n, t)
                    side /= np.linalg.norm(side) + 1e-12
                    cand = p + side * inset
                    if fn(cand[None])[0] > 0:
                        cand = p - side * inset
                    if fn(cand[None])[0] > -inset * 0.5:
                        out.append(None)
                        continue
                    loc2, n2, _, _ = bvh_base.find_nearest(Vector(cand))
                    out.append((np.array(loc2[:]), np.array(n2[:])))
                # puntadas cada 3.2 mm con irregularidad controlada
                pos = [o for o in out]
                step = 0
                i = 0
                while i + 3 < len(pos):
                    a, b = pos[i], pos[min(i + 2, len(pos) - 1)]
                    if a is None or b is None or a[0][2] < 0.008 or b[0][2] < 0.008:
                        i += 1
                        continue
                    pa, na = a
                    pb, nb = b
                    d = pb - pa
                    ln = np.linalg.norm(d)
                    if ln < 1e-4 or ln > 0.004:
                        i += 1
                        continue
                    xax = d / ln
                    nn = (na + nb) / 2
                    nn /= np.linalg.norm(nn)
                    yax = np.cross(nn, xax)
                    zax = np.cross(xax, yax)
                    j = rng.normal(0, 0.03)
                    mid = (pa + pb) / 2 + nn * (0.0011 + 0.0011 - 0.00005) + yax * rng.normal(0, 0.00008)
                    sc = np.array([ln * (0.95 + j), 0.00068, 0.00030])
                    R = np.stack([xax, yax, zax], 1)
                    base_i = sum(len(x) for x in V)
                    V.append(mid + (tv * sc) @ R.T)
                    F.extend([tuple(k + base_i for k in fc) for fc in tf])
                    i += 3  # 2 segmentos de puntada + 1 hueco
        if V:
            V = np.concatenate(V)
            new_obj(f"stitch_{key}", V, F, coll, thread_mats[matname])


# ------------------------------------------------------------------ barrido (cordones, tirador)
def sweep(points, ups, width, thick, closed=False, nprof=10):
    pts = np.asarray(points)
    tang = np.gradient(pts, axis=0)
    tang /= np.linalg.norm(tang, axis=1, keepdims=True) + 1e-12
    prof = []
    for k in range(nprof):
        a = 2 * math.pi * k / nprof
        cx, cy = math.cos(a), math.sin(a)
        # rectángulo redondeado (superelipse)
        sx = math.copysign(abs(cx) ** 0.35, cx) * width / 2
        sy = math.copysign(abs(cy) ** 0.6, cy) * thick / 2
        prof.append((sx, sy))
    V = []
    for p, t, u in zip(pts, tang, ups):
        b = np.cross(t, u)
        b /= np.linalg.norm(b) + 1e-12
        n = np.cross(b, t)
        for sx, sy in prof:
            V.append(p + b * sx + n * sy)
    F = []
    N = len(pts)
    for i in range(N - 1 + (1 if closed else 0)):
        i2 = (i + 1) % N
        for k in range(nprof):
            k2 = (k + 1) % nprof
            F.append((i * nprof + k, i * nprof + k2, i2 * nprof + k2, i2 * nprof + k))
    if not closed:
        F.append(tuple(range(nprof))[::-1])
        F.append(tuple((N - 1) * nprof + k for k in range(nprof)))
    seg = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]
    uvs = []
    for i in range(N):
        for k in range(nprof):
            uvs.append((seg[i] / 0.012, k / nprof))
    return np.array(V), F, np.array(uvs)


def catmull(ctrl, n=60):
    ctrl = np.asarray(ctrl, float)
    P = np.vstack([ctrl[0], ctrl, ctrl[-1]])
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for t in np.linspace(0, 1, n, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(ctrl[-1])
    return np.array(out)


# ------------------------------------------------------------------ lengüeta
def tongue_surface(x, y):
    c, _ = G.center_halfwidth(x)
    tw = np.maximum(G.throat_hw(np.clip(x, 0.1, 0.18)), 0.004)
    zt = G.ztop(np.maximum(x, 0.112), y)
    r = np.clip(np.abs(y - c) / (tw + 0.002), 0, 1)
    bulge = 0.0085 * (1 - r ** 2) ** 1.5
    z = zt - 0.0032 + bulge
    # parte alta libre por encima del cuello (x < 0.112): sube y se inclina hacia atrás
    k = np.clip((0.112 - x) / 0.018, 0, 1)
    z = z + k * 0.006 + k ** 2 * 0.002
    # se esconde bajo la pala en la parte delantera
    z = z - 0.0055 * G.smooth(0.168, 0.188, x)
    return z


def build_tongue(coll, mat):
    nu, nv = 60, 24
    xs = np.linspace(0.194, 0.094, nu)
    V = []
    for x in xs:
        c, _ = G.center_halfwidth(np.array(x))
        hw = 0.0235 * (1.0 if x > 0.104 else np.sqrt(max(0.0, 1 - ((0.104 - x) / 0.0102) ** 2)) * 0.55 + 0.45)
        for v in np.linspace(-1, 1, nv):
            y = float(c) + v * hw
            z = float(tongue_surface(np.array(x), np.array(y)))
            xx = x - (0.0 if x > 0.112 else (0.112 - x) * 0.22)
            V.append((xx, y, z))
    F = [(i * nv + j, i * nv + j + 1, (i + 1) * nv + j + 1, (i + 1) * nv + j) for i in range(nu - 1) for j in range(nv - 1)]
    ob = new_obj("tongue", V, F, coll, mat)
    add_mod(ob, "SOLIDIFY", thickness=0.0068, offset=-1.0, use_even_offset=False)
    add_mod(ob, "SUBSURF", levels=1, render_levels=2)
    return ob


# ------------------------------------------------------------------ ojales y cordones
def surface_point(bvh, x, y):
    loc, n, _, _ = bvh.ray_cast(Vector((x, y, 0.2)), Vector((0, 0, -1)))
    return (np.array(loc[:]), np.array(n[:])) if loc else (None, None)


def build_eyelets_laces(coll, mats, bvh_eye, bvh_tongue):
    xs = [0.118, 0.1288, 0.1396, 0.1504, 0.1612, 0.172]
    ey = {}
    torus_V, torus_F = [], []
    for side in (-1, 1):
        for i, x in enumerate(xs):
            c, _ = G.center_halfwidth(np.array(x))
            y = float(c) + side * (float(G.throat_hw(np.array(x))) + 0.0068)
            p, n = surface_point(bvh_eye, x, y)
            if p is None:
                print("WARN eyelet miss", side, i, x, y)
                continue
            ey[(side, i)] = (p, n)
            # toro: radio 2.6 mm, tubo 0.75 mm
            zax = n / np.linalg.norm(n)
            xax = np.cross(zax, [1, 0, 0]); xax /= np.linalg.norm(xax)
            yax = np.cross(zax, xax)
            base = sum(len(a) for a in torus_V)
            vv = []
            R, r = 0.0026, 0.00075
            for a in range(24):
                A = 2 * math.pi * a / 24
                for b in range(10):
                    B = 2 * math.pi * b / 10
                    q = (R + r * math.cos(B))
                    vv.append(p + xax * q * math.cos(A) + yax * q * math.sin(A) + zax * (r * math.sin(B) + 0.0004))
            torus_V.append(np.array(vv))
            for a in range(24):
                for b in range(10):
                    a2, b2 = (a + 1) % 24, (b + 1) % 10
                    torus_F.append((base + a * 10 + b, base + a2 * 10 + b, base + a2 * 10 + b2, base + a * 10 + b2))
    new_obj("eyelets", np.concatenate(torus_V), torus_F, coll, mats["metal"])

    # orificios: discos negros ligeramente hundidos
    hole_V, hole_F = [], []
    for (side, i), (p, n) in ey.items():
        base = len(hole_V)
        zax = n / np.linalg.norm(n)
        xax = np.cross(zax, [1, 0, 0]); xax /= np.linalg.norm(xax)
        yax = np.cross(zax, xax)
        hole_V.append(p + zax * 0.0002)
        for a in range(16):
            A = 2 * math.pi * a / 16
            hole_V.append(p + (xax * math.cos(A) + yax * math.sin(A)) * 0.0021 + zax * 0.0003)
        for a in range(16):
            hole_F.append((base, base + 1 + a, base + 1 + (a + 1) % 16))
    new_obj("eyelet_holes", hole_V, hole_F, coll, mats["hole"])

    # cordones en cruz: lado -1 i  -> lado +1 i+1 ; lado +1 i -> lado -1 i+1
    lace_V, lace_F, lace_UV, tight_V = [], [], [], []

    def lace_path(pa, pb, lift):
        ctrl = []
        for t in np.linspace(0, 1, 9):
            q = pa[0] * (1 - t) + pb[0] * t
            ts, _ = surface_point(bvh_tongue, q[0], q[1])
            zs = ts[2] + 0.0011 if ts is not None else q[2]
            z = max(zs, q[2]) + lift * math.sin(math.pi * t) ** 2
            ctrl.append((q[0], q[1], z))
        # entrada/salida por el ojal
        ctrl = [tuple(pa[0] - pa[1] * 0.0035)] + ctrl + [tuple(pb[0] - pb[1] * 0.0035)]
        return catmull(ctrl, 8)

    def add_lace(path, tpath):
        ups = np.tile([0, 0, 1.0], (len(path), 1))
        V, F, UV = sweep(path, ups, 0.0068, 0.0015)
        Vt, _, _ = sweep(tpath, ups, 0.0068, 0.0015)
        base = sum(len(a) for a in lace_V)
        lace_V.append(V); tight_V.append(Vt); lace_UV.append(UV)
        lace_F.extend([tuple(k + base for k in f) for f in F])

    for i in range(len(xs) - 1):
        for sa in (-1, 1):
            a, b = ey.get((sa, i + 1)), ey.get((-sa, i))
            if a is None or b is None:
                continue
            lift = 0.0016 + 0.0004 * (sa > 0)
            add_lace(lace_path(a, b, lift), lace_path(a, b, 0.0003))
    # cierre superior recto entre el primer par de ojales (sin lazada)
    first = min(i for (sd, i) in ey if (-sd, i) in ey)
    a, b = ey[(-1, first)], ey[(1, first)]
    p = lace_path(a, b, 0.0012)
    add_lace(p, lace_path(a, b, 0.0002))
    V = np.concatenate(lace_V)
    ob = new_obj("laces", V, lace_F, coll, mats["lace"], uvs=np.concatenate(lace_UV))
    ob.shape_key_add(name="Basis")
    sk = ob.shape_key_add(name="tight")
    sk.data.foreach_set("co", np.concatenate(tight_V).ravel())
    return ob


# ------------------------------------------------------------------ tirador
def build_pull_tab(coll, mat):
    ctrl = [(-0.0012, 0, 0.050), (-0.0016, 0, 0.072), (-0.004, 0, 0.090), (0.000, 0, 0.101),
            (0.007, 0, 0.096), (0.0075, 0, 0.082), (0.0055, 0, 0.068)]
    path = catmull(ctrl, 10)
    # normal del plano de la cinta: perpendicular a la tangente dentro del plano XZ
    t = np.gradient(path, axis=0)
    ups = np.cross(t, np.array([0, 1.0, 0]))
    ups /= np.linalg.norm(ups, axis=1, keepdims=True)
    V, F, UV = sweep(path, -ups, 0.016, 0.0022, nprof=12)
    ob = new_obj("pull_tab", V, F, coll, mat, uvs=UV)
    add_mod(ob, "SUBSURF", levels=1, render_levels=2)
    return ob


# ------------------------------------------------------------------ ribete acolchado del cuello
def outer_y(x, z, side):
    c, w = G.center_halfwidth(x)
    T = G.top_height(x)
    r = np.clip(1 - (z / T) ** G.Q_EXP, 0, 1) ** (1 / G.P_EXP)
    return c + side * w * r


def build_collar_roll(coll, mat):
    pts = []
    u = np.linspace(1, 0, 90)
    xs_l = 0.121 * (1 - np.cos(u * np.pi / 2))      # denso cerca del talón
    for x in xs_l:                       # lateral, de delante hacia el talón
        z = float(G.collar_h(x)) - 0.0008
        pts.append((x - 0.0016 * (x < 0.02), float(outer_y(x, z, 1)) - 0.0016, z))
    for x in xs_l[::-1][1:]:             # medial, del talón hacia delante
        z = float(G.collar_h(x)) - 0.0008
        pts.append((x - 0.0016 * (x < 0.02), float(outer_y(x, z, -1)) + 0.0016, z))
    pts = np.array(pts)
    path = catmull(pts, 3)
    ups = np.tile([0, 0, 1.0], (len(path), 1))
    V, F, UV = sweep(path, ups, 0.0062, 0.0085, nprof=14)
    ob = new_obj("collar_roll", V, F, coll, mat, uvs=UV)
    return ob


# ------------------------------------------------------------------ suela (3 piezas)
def outline_sd(vox=0.00025, pad=0.03):
    xs = np.arange(-pad, G.L + pad, vox)
    ys = np.arange(-0.08, 0.08, vox)
    X, Y = np.meshgrid(xs, ys, indexing="ij")
    c, w = G.center_halfwidth(X)
    inside = (np.abs(Y - c) < w) & (X >= 0) & (X <= G.L)
    sd = (distance_transform_edt(~inside) - distance_transform_edt(inside)) * vox
    return xs, ys, gaussian_filter(sd, 2.5)


def rounded_slab(sd2, Z, z0, z1, r):
    zc, hz = (z0 + z1) / 2, (z1 - z0) / 2
    q1 = sd2 + r
    q2 = np.abs(Z - zc) - hz + r
    out = np.sqrt(np.maximum(q1, 0) ** 2 + np.maximum(q2, 0) ** 2) + np.minimum(np.maximum(q1, q2), 0) - r
    return out


def build_sole(coll, mats):
    vox = 0.00045
    xs2, ys2, sd2f = outline_sd()
    xs, ys = np.arange(xs2[0], xs2[-1], vox), np.arange(ys2[0], ys2[-1], vox)
    sd2d = map_coordinates(sd2f, np.meshgrid((xs - xs2[0]) / 0.00025, (ys - ys2[0]) / 0.00025, indexing="ij"), order=1)
    zs = np.arange(-0.030, 0.012, vox)
    origin = np.array([xs[0], ys[0], zs[0]])
    Z = zs[None, None, :]
    S = sd2d[:, :, None]
    Xg = xs[:, None, None]
    parts = {}
    # suela de caucho (bandeja con pared, sube en la puntera)
    wall_top = -0.0135 + 0.0080 * G.smooth(0.235, 0.300, Xg) + 0.004 * G.smooth(0.03, -0.01, Xg)
    o = rounded_slab(S - 0.0042, Z, -0.026, 0.0, 0.0022)
    o = np.maximum(o, Z - wall_top)
    cav = np.maximum(S + 0.0008, -0.0215 - Z)
    parts["outsole"] = np.maximum(o, -cav)
    # entresuela marfil (entra en la bandeja) con copa para el upper
    m = rounded_slab(S - 0.0028, Z, -0.0225, 0.0050, 0.0018)
    cup = np.maximum(S + 0.0015, -Z + 0.0012)
    parts["midsole"] = np.maximum(m, -cup)
    # plantilla negra (pieza independiente)
    parts["insole"] = rounded_slab(S + 0.0040, Z, 0.0021, 0.0072, 0.0016)
    tread = np.asarray(__import__("PIL.Image", fromlist=["Image"]).open(
        os.path.join(ROOT, "assets/textures/tread_height.png")), float) / 65535.0
    objs = {}
    for name, field in parts.items():
        v, f = mc_mesh(field, origin, vox, sigma=0.7)
        if name == "outsole":
            # dibujo de suela en geometría: los surcos suben 1.7 mm en la cara inferior
            bot = v[:, 2] < -0.0252
            u = (v[bot, 0] + 0.004) / 0.30 * (tread.shape[1] - 1)
            w = (v[bot, 1] / 0.12 + 0.5) * (tread.shape[0] - 1)
            h = map_coordinates(tread, [w, u], order=1, mode="nearest")
            edge = np.clip(-map_coordinates(sd2d, [(v[bot, 0] - xs[0]) / vox, (v[bot, 1] - ys[0]) / vox], order=1) / 0.004, 0, 1)
            v[bot, 2] += 0.0017 * (1 - h) * edge
        mat = {"outsole": mats["rubber"], "midsole": mats["midsole"], "insole": mats["insole"]}[name]
        objs[name] = new_obj(name, v, f, coll, mat)
        if name != "outsole":   # superficies suaves: reducción de polígonos sin pérdida visible
            add_mod(objs[name], "DECIMATE", ratio=0.3)
            apply_mods(objs[name])
    return objs


# ------------------------------------------------------------------ logo
def build_logo(coll, mat, target):
    font = bpy.data.fonts.load(os.path.join(ROOT, "assets/fonts/Archivo-VariableFont_wdth,wght.ttf"))
    cu = bpy.data.curves.new("logo_txt", "FONT")
    cu.body = "FLOOR/ONE"
    cu.font = font
    cu.size = 0.0064
    cu.align_x = "CENTER"
    cu.align_y = "CENTER"
    cu.space_character = 1.06
    tob = bpy.data.objects.new("logo_tmp", cu)
    coll.objects.link(tob)
    c, w = G.center_halfwidth(np.array(0.036))
    tob.location = (0.036, float(c + w) + 0.004, 0.034)
    tob.rotation_euler = (math.pi / 2, 0, math.pi)
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(tob.evaluated_get(dg))
    me.transform(tob.matrix_world)
    bpy.data.objects.remove(tob)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.triangulate(bm, faces=bm.faces, quad_method="BEAUTY", ngon_method="BEAUTY")
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new("logo", me)
    coll.objects.link(ob)
    me.materials.append(mat)
    add_mod(ob, "SHRINKWRAP", target=target, wrap_method="NEAREST_SURFACEPOINT", wrap_mode="OUTSIDE_SURFACE", offset=0.00022)
    return ob


# ------------------------------------------------------------------ main
def main(out=os.path.join(ROOT, "project", "shoe.blend")):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    mats = M.make_materials(ROOT)
    coll = bpy.data.collections.new("SHOE")
    scene.collection.children.link(coll)

    print("upper..."); sys.stdout.flush()
    base, overlays = build_upper(coll, mats)
    dg = bpy.context.evaluated_depsgraph_get()
    bvh_base = BVHTree.FromObject(base, dg)
    panel_fns = {"heel": G.f_heel_counter, "mud": G.f_mudguard, "eye": G.f_eyestay,
                 "stripe": G.f_stripe, "collar": G.f_collar_band}
    print("stitches..."); sys.stdout.flush()
    build_stitches(overlays, panel_fns, coll,
                   {"suede_black": mats["thread_dark"], "suede_orange": mats["thread_orange"], "collar": mats["thread_dark"]},
                   bvh_base)
    for _, ob, _ in overlays:
        apply_mods(ob)
    print("tongue/laces..."); sys.stdout.flush()
    tongue = build_tongue(coll, mats["tongue"])
    dg = bpy.context.evaluated_depsgraph_get()
    eye_ob = [o for k, o, _ in overlays if k == "eye"][0]
    build_eyelets_laces(coll, mats, BVHTree.FromObject(eye_ob, dg), BVHTree.FromObject(tongue, dg))
    build_pull_tab(coll, mats["suede_orange"])
    build_collar_roll(coll, mats["collar"])
    heel_ob = [o for k, o, _ in overlays if k == "heel"][0]
    build_logo(coll, mats["print"], heel_ob)
    print("sole..."); sys.stdout.flush()
    sole = build_sole(coll, mats)

    # jerarquía para el despiece: UPPER / INSOLE / MIDSOLE / OUTSOLE bajo SHOE_ROOT
    root = bpy.data.objects.new("SHOE_ROOT", None)
    coll.objects.link(root)
    groups = {}
    for gname in ("UPPER", "INSOLE", "MIDSOLE", "OUTSOLE"):
        e = bpy.data.objects.new(gname, None)
        coll.objects.link(e)
        e.parent = root
        groups[gname] = e
    for ob in list(coll.objects):
        if ob.type != "MESH":
            continue
        if ob.name in ("insole", "midsole", "outsole"):
            ob.parent = groups[ob.name.upper()]
        else:
            ob.parent = groups["UPPER"]
    os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
    tot = sum(len(o.data.polygons) for o in coll.objects if o.type == "MESH")
    print("saved", out, "objects", len(coll.objects), "faces", tot)


if __name__ == "__main__":
    main()
