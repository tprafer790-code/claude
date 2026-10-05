"""FLOOR/ONE - materiales físicos (Cycles, Principled BSDF v2).

Escalas físicas: coordenadas de objeto en metros. Cada material tiene una respuesta propia:
gamuza = sheen microfibra; lona = relieve de trama; piel = brillo ancho + perforaciones;
caucho = mate con subsurface leve; ojales = metal oscuro.
"""
import os
import bpy


def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c) + (1.0,)


class NB:
    """Constructor compacto de árboles de nodos."""

    def __init__(self, mat):
        mat.use_nodes = True
        self.nt = mat.node_tree
        self.nt.nodes.clear()
        self.out = self.n("ShaderNodeOutputMaterial")
        self.bsdf = self.n("ShaderNodeBsdfPrincipled")
        self.link(self.bsdf.outputs[0], self.out.inputs["Surface"])
        self.tc = self.n("ShaderNodeTexCoord")

    def n(self, kind, **kw):
        node = self.nt.nodes.new(kind)
        for k, v in kw.items():
            setattr(node, k, v)
        return node

    def link(self, a, b):
        self.nt.links.new(a, b)

    def set(self, **inputs):
        for k, v in inputs.items():
            k = k.replace("_", " ")
            if hasattr(v, "is_output") or isinstance(v, bpy.types.NodeSocket):
                self.link(v, self.bsdf.inputs[k])
            else:
                self.bsdf.inputs[k].default_value = v

    def math(self, op, a, b=None, clamp=False):
        m = self.n("ShaderNodeMath", operation=op, use_clamp=clamp)
        for i, x in enumerate((a, b)):
            if x is None:
                continue
            if isinstance(x, (int, float)):
                m.inputs[i].default_value = x
            else:
                self.link(x, m.inputs[i])
        return m.outputs[0]

    def img(self, path, scale, colorspace="Non-Color", coord=None, box=True):
        mp = self.n("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (scale, scale, scale)
        self.link(coord if coord is not None else self.tc.outputs["Object"], mp.inputs["Vector"])
        tex = self.n("ShaderNodeTexImage")
        im = bpy.data.images.load(path, check_existing=True)
        im.colorspace_settings.name = colorspace
        tex.image = im
        if box:
            tex.projection = "BOX"
            tex.projection_blend = 0.3
        self.link(mp.outputs[0], tex.inputs["Vector"])
        return tex

    def bump(self, height, strength, distance, normal=None):
        b = self.n("ShaderNodeBump")
        b.inputs["Strength"].default_value = strength
        b.inputs["Distance"].default_value = distance
        self.link(height, b.inputs["Height"])
        if normal is not None:
            self.link(normal, b.inputs["Normal"])
        return b.outputs[0]

    def mix(self, fac, a, b):
        m = self.n("ShaderNodeMix", data_type="RGBA")
        for sock, val in ((m.inputs[0], fac), (m.inputs[6], a), (m.inputs[7], b)):
            if isinstance(val, (tuple, list, float, int)):
                sock.default_value = val
            else:
                self.link(val, sock)
        return m.outputs[2]


def make_materials(root):
    T = lambda f: os.path.join(root, "assets", "textures", f)
    mats = {}

    def new(name):
        m = bpy.data.materials.new(name)
        mats[name] = m
        return m, NB(m)

    # ---- lona marfil (trama de 1 mm)
    m, b = new("canvas")
    s = 1 / 0.024
    alb = b.img(T("canvas_albedo.png"), s, "sRGB")
    hgt = b.img(T("canvas_height.png"), s)
    rgh = b.img(T("canvas_rough.png"), s)
    b.set(Base_Color=alb.outputs[0], Roughness=rgh.outputs[0], Sheen_Weight=0.35, Sheen_Roughness=0.5)
    b.set(Normal=b.bump(hgt.outputs[0], 0.9, 0.0005))

    # ---- piel marfil perforada
    m, b = new("leather")
    obj = b.tc.outputs["Object"]
    nrm = b.tc.outputs["Normal"]
    sep = b.n("ShaderNodeSeparateXYZ"); b.link(obj, sep.inputs[0])
    sepn = b.n("ShaderNodeSeparateXYZ"); b.link(nrm, sepn.inputs[0])
    pitch = 0.0052
    side = b.math("LESS_THAN", b.math("ABSOLUTE", sepn.outputs[2]), 0.55)
    second = b.math("ADD", b.math("MULTIPLY", sep.outputs[1], b.math("SUBTRACT", 1.0, side)),
                    b.math("MULTIPLY", sep.outputs[2], side))
    u = b.math("SUBTRACT", b.math("FRACT", b.math("DIVIDE", sep.outputs[0], pitch)), 0.5)
    v = b.math("SUBTRACT", b.math("FRACT", b.math("DIVIDE", second, pitch)), 0.5)
    d = b.math("SQRT", b.math("ADD", b.math("MULTIPLY", u, u), b.math("MULTIPLY", v, v)))
    mr = b.n("ShaderNodeMapRange")  # orificio de 0.9 mm de radio con borde suavizado
    hole = b.math("SUBTRACT", 1.0, mr.outputs[0])
    mr.inputs["From Min"].default_value = 0.15
    mr.inputs["From Max"].default_value = 0.185
    b.link(d, mr.inputs["Value"])
    lip = b.math("MULTIPLY", b.math("EXPONENT", b.math("MULTIPLY", b.math("POWER", b.math("SUBTRACT", d, 0.215), 2.0), -900.0)), 0.18)
    mask = b.math("MULTIPLY", b.math("GREATER_THAN", sep.outputs[0], 0.188), b.math("GREATER_THAN", sep.outputs[2], 0.025))
    mask = b.math("MULTIPLY", mask, b.math("LESS_THAN", b.math("ABSOLUTE", sep.outputs[1]), 0.06))
    holem = b.math("MULTIPLY", hole, mask)
    vor = b.n("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 1400
    b.link(obj, vor.inputs["Vector"])
    nz = b.n("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 60; b.link(obj, nz.inputs["Vector"])
    grain = b.math("MULTIPLY", vor.outputs["Distance"], 0.12)
    height = b.math("SUBTRACT", b.math("ADD", grain, b.math("MULTIPLY", lip, mask)), holem)
    base = b.mix(b.math("MULTIPLY", nz.outputs[0], 0.25), srgb("#ECE5D8"), srgb("#DDD3C2"))
    col = b.mix(holem, base, (0.018, 0.016, 0.014, 1))
    b.set(Base_Color=col, Roughness=b.math("ADD", 0.40, b.math("MULTIPLY", holem, 0.5)), Coat_Weight=0.08, Coat_Roughness=0.35)
    b.set(Normal=b.bump(height, 0.55, 0.0009))

    # ---- gamuzas
    for name, base, tint in (("suede_black", srgb("#141312"), (0.30, 0.29, 0.28, 1)),
                             ("suede_orange", srgb("#E97825"), (1.0, 0.72, 0.5, 1))):
        m, b = new(name)
        hgt = b.img(T("suede_height.png"), 1 / 0.04)
        nap = b.img(T("suede_nap.png"), 1 / 0.07)
        col = b.mix(nap.outputs[0], tuple(c * 0.78 for c in base[:3]) + (1,), tuple(min(1, c * 1.18) for c in base[:3]) + (1,))
        b.set(Base_Color=col, Roughness=0.93, Sheen_Weight=0.55 if "black" in name else 0.4,
              Sheen_Roughness=b.math("ADD", 0.32, b.math("MULTIPLY", nap.outputs[0], 0.25)), Sheen_Tint=tint,
              Specular_IOR_Level=0.25)
        b.set(Normal=b.bump(hgt.outputs[0], 0.45, 0.00035))

    # ---- cuello acolchado (nylon/piel negra suave)
    m, b = new("collar")
    hgt = b.img(T("canvas_height.png"), 1 / 0.012)
    b.set(Base_Color=srgb("#121212"), Roughness=0.55, Sheen_Weight=0.5, Sheen_Roughness=0.4,
          Sheen_Tint=(0.5, 0.5, 0.5, 1))
    b.set(Normal=b.bump(hgt.outputs[0], 0.25, 0.0003))

    for name, col, sw in (("lining", srgb("#0D0D0D"), 0.6), ("tongue", srgb("#101010"), 0.3), ("insole", srgb("#111111"), 0.4)):
        m, b = new(name)
        hgt = b.img(T("canvas_height.png"), 1 / 0.016)
        b.set(Base_Color=col, Roughness=0.8, Sheen_Weight=sw, Sheen_Roughness=0.45, Sheen_Tint=(0.5, 0.5, 0.5, 1))
        b.set(Normal=b.bump(hgt.outputs[0], 0.4, 0.0004))

    # ---- cordón plano trenzado (UV a lo largo)
    m, b = new("lace")
    mp = b.n("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1.6, 1.0, 1)
    b.link(b.tc.outputs["UV"], mp.inputs[0])
    tex = b.n("ShaderNodeTexImage"); tex.image = bpy.data.images.load(T("lace_height.png"), check_existing=True)
    tex.image.colorspace_settings.name = "Non-Color"
    b.link(mp.outputs[0], tex.inputs[0])
    b.set(Base_Color=srgb("#0E0E0E"), Roughness=0.62, Sheen_Weight=0.35, Sheen_Roughness=0.4, Sheen_Tint=(0.4, 0.4, 0.4, 1))
    b.set(Normal=b.bump(tex.outputs[0], 0.7, 0.0003))

    m, b = new("metal")
    b.set(Base_Color=(0.055, 0.055, 0.06, 1), Metallic=1.0, Roughness=0.3)
    m, b = new("hole")
    b.set(Base_Color=(0.004, 0.004, 0.004, 1), Roughness=1.0)
    for name, col in (("thread_dark", srgb("#3A3836")), ("thread_orange", srgb("#E0701E"))):
        m, b = new(name)
        b.set(Base_Color=col, Roughness=0.6, Sheen_Weight=0.6, Sheen_Roughness=0.3)
    m, b = new("print")
    b.set(Base_Color=srgb("#E9E2D5"), Roughness=0.5)

    # ---- caucho ámbar
    m, b = new("rubber")
    obj = b.tc.outputs["Object"]
    sep = b.n("ShaderNodeSeparateXYZ"); b.link(obj, sep.inputs[0])
    nz = b.n("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 900; nz.inputs["Detail"].default_value = 4
    b.link(obj, nz.inputs[0])
    big = b.n("ShaderNodeTexNoise"); big.inputs["Scale"].default_value = 25; b.link(obj, big.inputs[0])
    # nervios verticales en la pared y cuadrícula en la puntera
    ribs = b.math("ABSOLUTE", b.math("SUBTRACT", b.math("FRACT", b.math("DIVIDE", sep.outputs[0], 0.0042)), 0.5))
    d1 = b.math("ABSOLUTE", b.math("SUBTRACT", b.math("FRACT", b.math("DIVIDE", b.math("ADD", sep.outputs[1], sep.outputs[2]), 0.0035)), 0.5))
    d2 = b.math("ABSOLUTE", b.math("SUBTRACT", b.math("FRACT", b.math("DIVIDE", b.math("SUBTRACT", sep.outputs[1], sep.outputs[2]), 0.0035)), 0.5))
    hatch = b.math("MINIMUM", d1, d2)
    toe = b.math("GREATER_THAN", sep.outputs[0], 0.245)
    wall = b.math("MULTIPLY", b.math("GREATER_THAN", sep.outputs[2], -0.029), b.math("LESS_THAN", sep.outputs[2], -0.0215))
    pat = b.math("ADD", b.math("MULTIPLY", hatch, toe), b.math("MULTIPLY", b.math("MULTIPLY", ribs, wall), b.math("SUBTRACT", 1.0, toe)))
    height = b.math("ADD", b.math("MULTIPLY", pat, 0.6), b.math("MULTIPLY", nz.outputs[0], 0.08))
    col = b.mix(b.math("MULTIPLY", big.outputs[0], 0.5), srgb("#8E4A12"), srgb("#A65C1C"))
    b.set(Base_Color=col, Roughness=b.math("ADD", 0.5, b.math("MULTIPLY", nz.outputs[0], 0.15)),
          Subsurface_Weight=0.25, Subsurface_Scale=0.002, Subsurface_Radius=(1.0, 0.45, 0.15))
    b.set(Normal=b.bump(height, 0.5, 0.0006))

    # ---- entresuela marfil con estrías horizontales
    m, b = new("midsole")
    obj = b.tc.outputs["Object"]
    sep = b.n("ShaderNodeSeparateXYZ"); b.link(obj, sep.inputs[0])
    gro = b.math("ABSOLUTE", b.math("SUBTRACT", b.math("FRACT", b.math("DIVIDE", sep.outputs[2], 0.0022)), 0.5))
    nz = b.n("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 500; b.link(obj, nz.inputs[0])
    b.set(Base_Color=srgb("#E3DACB"), Roughness=0.6, Subsurface_Weight=0.1, Subsurface_Scale=0.002)
    b.set(Normal=b.bump(b.math("ADD", b.math("MULTIPLY", gro, 0.4), b.math("MULTIPLY", nz.outputs[0], 0.05)), 0.25, 0.0004))
    return mats


def make_floor_material(root, scale_m=2.4):
    T = lambda f: os.path.join(root, "assets", "textures", f)
    m = bpy.data.materials.new("maple_floor")
    b = NB(m)
    s = 1 / scale_m
    alb = b.img(T("floor_albedo.png"), s, "sRGB", box=False)
    rgh = b.img(T("floor_rough.png"), s, box=False)
    hgt = b.img(T("floor_height.png"), s, box=False)
    for t in (alb, rgh, hgt):
        t.interpolation = "Linear"
    dark = b.mix(1.0, alb.outputs[0], (0.0, 0.0, 0.0, 1))   # arce oscurecido: albedo x0.5, menos saturado
    mx = b.nt.nodes[-1]; mx.blend_type = "MULTIPLY"; mx.inputs[7].default_value = (0.24, 0.22, 0.215, 1)
    b.set(Base_Color=dark, Roughness=b.math("ADD", rgh.outputs[0], 0.16), Specular_IOR_Level=0.22)
    b.set(Normal=b.bump(hgt.outputs[0], 0.6, 0.0008))
    return m
