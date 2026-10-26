"""Puente sobre el Cuerno de Oro (Leonardo, 1502) modelado por código y renderizado
con acabado de lámina: tiza marfil sobre papel azul lapislázuli.

Uso:
  python puente.py --prueba SALIDA.png            un fotograma de prueba
  python puente.py --secuencia CARPETA [N]         N fotogramas del giro de cámara (por defecto 72)
Requiere el módulo bpy (Blender como librería de Python). Se escribe un PNG transparente
por fotograma más un JSON con la proyección de las cotas; componer.py los monta sobre papel.
"""
import json
import math
import random
import sys

import bpy
import bmesh
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

rnd = random.Random(1502)
U = 10.0  # 1 unidad = 10 m

# ---------------------------------------------------------------- color

def lineal(hexa):
    """sRGB hexadecimal a color lineal para los nodos de Blender."""
    h = hexa.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1.0]


MARFIL = "#efe7d6"
LAPIS = "#1b2d9e"


# ---------------------------------------------------------------- escena

def limpiar():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = 12
    sc.cycles.use_denoising = False
    sc.cycles.max_bounces = 0
    sc.render.film_transparent = True
    sc.render.resolution_x, sc.render.resolution_y = 1600, 900
    sc.render.resolution_percentage = 100
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    return sc


def material_tiza(nombre, oscuro, medio, claro, grano=0.18, rayado=0.55):
    """Sombreado de lámina: la cara iluminada se aclara hacia el marfil, la sombra se queda
    en el azul del papel; un ruido fino imita el grano de la tiza. Solo emisión: no depende
    de luces ni rebotes, así el render es rápido y el color exacto."""
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    nt = m.node_tree
    n = nt.nodes
    n.clear()
    geo = n.new("ShaderNodeNewGeometry")
    luz = n.new("ShaderNodeCombineXYZ")
    d = Vector((-0.45, -0.55, 0.70)).normalized()
    luz.inputs[0].default_value, luz.inputs[1].default_value, luz.inputs[2].default_value = d
    dot = n.new("ShaderNodeVectorMath"); dot.operation = "DOT_PRODUCT"
    mapa = n.new("ShaderNodeMapRange")
    mapa.inputs["From Min"].default_value = -0.25
    mapa.inputs["From Max"].default_value = 1.0
    ruido = n.new("ShaderNodeTexNoise")
    ruido.inputs["Scale"].default_value = 260
    ruido.inputs["Detail"].default_value = 2
    mezcla = n.new("ShaderNodeMath"); mezcla.operation = "MULTIPLY_ADD"
    mezcla.inputs[2].default_value = -grano / 2
    mezcla.inputs[1].default_value = grano
    suma = n.new("ShaderNodeMath"); suma.operation = "ADD"; suma.use_clamp = True
    rampa = n.new("ShaderNodeValToRGB")
    e = rampa.color_ramp.elements
    e[0].position, e[0].color = 0.0, lineal(oscuro)
    e[1].position, e[1].color = 1.0, lineal(claro)
    mid = e.new(0.5); mid.color = lineal(medio)
    emi = n.new("ShaderNodeEmission")
    out = n.new("ShaderNodeOutputMaterial")
    L = nt.links
    L.new(geo.outputs["Normal"], dot.inputs[0])
    L.new(luz.outputs[0], dot.inputs[1])
    L.new(dot.outputs["Value"], mapa.inputs["Value"])
    L.new(ruido.outputs["Fac"], mezcla.inputs[0])
    L.new(mapa.outputs["Result"], suma.inputs[0])
    L.new(mezcla.outputs[0], suma.inputs[1])
    # Rayado: bandas finas en coordenadas de objeto que oscurecen solo donde falta luz
    coord = n.new("ShaderNodeTexCoord")
    onda = n.new("ShaderNodeTexWave")
    onda.wave_type = "BANDS"; onda.bands_direction = "DIAGONAL"
    onda.inputs["Scale"].default_value = 9.0
    onda.inputs["Distortion"].default_value = 1.2
    onda.inputs["Detail"].default_value = 1.0
    corte = n.new("ShaderNodeMath"); corte.operation = "GREATER_THAN"; corte.inputs[1].default_value = 0.82
    sombra = n.new("ShaderNodeMath"); sombra.operation = "SUBTRACT"; sombra.inputs[0].default_value = 1.0
    peso = n.new("ShaderNodeMath"); peso.operation = "MULTIPLY"
    fuerza = n.new("ShaderNodeMath"); fuerza.operation = "MULTIPLY"; fuerza.inputs[1].default_value = rayado
    resta = n.new("ShaderNodeMath"); resta.operation = "SUBTRACT"; resta.use_clamp = True
    L.new(coord.outputs["Object"], onda.inputs["Vector"])
    L.new(onda.outputs["Fac"], corte.inputs[0])
    L.new(mapa.outputs["Result"], sombra.inputs[1])
    L.new(corte.outputs[0], peso.inputs[0])
    L.new(sombra.outputs[0], peso.inputs[1])
    L.new(peso.outputs[0], fuerza.inputs[0])
    L.new(suma.outputs[0], resta.inputs[0])
    L.new(fuerza.outputs[0], resta.inputs[1])
    L.new(resta.outputs[0], rampa.inputs["Fac"])
    L.new(rampa.outputs["Color"], emi.inputs["Color"])
    L.new(emi.outputs[0], out.inputs["Surface"])
    return m


def material_trazo(nombre, color, alfa):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    n = m.node_tree.nodes
    n.clear()
    emi = n.new("ShaderNodeEmission"); emi.inputs["Color"].default_value = lineal(color)
    tr = n.new("ShaderNodeBsdfTransparent")
    mix = n.new("ShaderNodeMixShader"); mix.inputs[0].default_value = alfa
    out = n.new("ShaderNodeOutputMaterial")
    L = m.node_tree.links
    L.new(tr.outputs[0], mix.inputs[1]); L.new(emi.outputs[0], mix.inputs[2])
    L.new(mix.outputs[0], out.inputs["Surface"])
    return m


def objeto(nombre, bm, mat, coleccion):
    me = bpy.data.meshes.new(nombre)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(nombre, me)
    coleccion.objects.link(ob)
    me.materials.append(mat)
    return ob


# ---------------------------------------------------------------- geometría del puente

def perfil(s):
    """Medidas del arco en el punto s (−1 a 1 a lo largo de la luz)."""
    a = 1 - s * s
    z_sup = 1.6 + 2.9 * a
    z_inf = 4.0 * max(a, 0) ** 1.3
    ancho = 2.4 + 3.6 * abs(s) ** 6
    return z_inf, z_sup, ancho


def puente(col, mat_piedra):
    """Barrido de una sección de ocho vértices a lo largo del arco. Las aristas longitudinales
    intermedias son las hiladas de sillería; cada ocho anillos, una junta de dovela."""
    bm = bmesh.new()
    n = 161
    anillos = []
    for i in range(n):
        s = -1 + 2 * i / (n - 1)
        x = s * 12
        zi, zs, w = perfil(s)
        h = zs - zi
        y = w / 2
        sec = [(-y, zi), (y, zi), (y, zi + min(0.32, h * 0.3)), (y, zi + h * 0.62), (y, zs), (-y, zs), (-y, zi + h * 0.62), (-y, zi + min(0.32, h * 0.3))]
        anillos.append([bm.verts.new((x, py, pz)) for py, pz in sec])
    caras_lat = []
    for i in range(n - 1):
        a, b = anillos[i], anillos[i + 1]
        for k in range(8):
            f = bm.faces.new((a[k], a[(k + 1) % 8], b[(k + 1) % 8], b[k]))
            if k in (1, 2, 3, 5, 6, 7):
                caras_lat.append(f)
    bm.faces.new(list(reversed(anillos[0])))
    bm.faces.new(anillos[-1])
    bm.edges.ensure_lookup_table()
    ob = objeto("Puente", bm, mat_piedra, col)
    # Marcas de Freestyle (atributo «freestyle_edge»): hiladas en los costados y juntas de dovela
    me = ob.data
    marcas = me.attributes.get("freestyle_edge") or me.attributes.new("freestyle_edge", "BOOLEAN", "EDGE")
    valores = []
    for e in me.edges:
        v0, v1 = me.vertices[e.vertices[0]].co, me.vertices[e.vertices[1]].co
        zi, zs, w = perfil(max(-1, min(1, v0.x / 12)))
        en_costado = abs(abs(v0.y) - w / 2) < 0.02 and abs(abs(v1.y) - w / 2) < 0.2
        if abs(v0.x - v1.x) > 0.05:
            hilada = en_costado and abs(v0.z - zi) > 0.02 and abs(v0.z - zs) > 0.02
            valores.append(hilada)
        else:
            i0 = round((v0.x / 12 + 1) * (n - 1) / 2)
            junta = abs(v0.y - v1.y) < 0.01 and en_costado and i0 % 8 == 0 and abs(v0.x) < 10.4
            valores.append(junta)
    marcas.data.foreach_set("value", valores)
    # Pretiles
    bm = bmesh.new()
    for lado in (-1, 1):
        prev = None
        for i in range(0, n, 2):
            s = -1 + 2 * i / (n - 1)
            _, zs, w = perfil(s)
            y = lado * w / 2
            q = [bm.verts.new((s * 12, y - 0.04, zs)), bm.verts.new((s * 12, y + 0.04, zs)),
                 bm.verts.new((s * 12, y + 0.04, zs + 0.14)), bm.verts.new((s * 12, y - 0.04, zs + 0.14))]
            if prev:
                for k in range(4):
                    bm.faces.new((prev[k], prev[(k + 1) % 4], q[(k + 1) % 4], q[k]))
            prev = q
    objeto("Pretiles", bm, mat_piedra, col)
    return ob


def orillas(col, mat):
    """Dos riberas con talud hacia el agua."""
    for lado in (-1, 1):
        bm = bmesh.new()
        x0, x1 = 11.6 * lado, 15.5 * lado
        pts = []
        for (x, z) in ((x0, 1.6), (x1, 1.6), (x1, -0.2), (x0 - 1.4 * lado, -0.2)):
            pts.append((x, z))
        ys = (-6.5, 6.5)
        vs = [[bm.verts.new((x, y, z)) for (x, z) in pts] for y in ys]
        for k in range(4):
            a, b = vs[0], vs[1]
            bm.faces.new((a[k], a[(k + 1) % 4], b[(k + 1) % 4], b[k]))
        bm.faces.new(vs[0]); bm.faces.new(list(reversed(vs[1])))
        bmesh.ops.subdivide_edges(bm, edges=[e for e in bm.edges if abs(e.verts[0].co.y - e.verts[1].co.y) > 1], cuts=6)
        objeto(f"Orilla{lado}", bm, mat, col)


def velero(col, mat_madera, mat_vela):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=8, radius=1)
    for v in bm.verts:
        v.co.x *= 1.1; v.co.y *= 0.34; v.co.z = min(v.co.z, 0) * 0.32
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001)
    casco = objeto("Casco", bm, mat_madera, col)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.03, radius2=0.02, depth=2.6)
    for v in bm.verts:
        v.co.z += 1.3
    objeto("Mastil", bm, mat_madera, col)
    bm = bmesh.new()
    a, b, c = bm.verts.new((0.02, 0, 2.5)), bm.verts.new((0.02, 0, 0.35)), bm.verts.new((0.95, 0.05, 0.45))
    bm.faces.new((a, b, c))
    objeto("Vela", bm, mat_vela, col)
    for o in ("Casco", "Mastil", "Vela"):
        ob = bpy.data.objects[o]
        ob.location = (1.8, 3.2, 0.05)
        ob.rotation_euler = (0, 0, math.radians(-18))


def agua(col, mat):
    """Trazos de tiza horizontales sobre el agua: tiras finísimas, sin Freestyle."""
    bm = bmesh.new()
    for _ in range(170):
        x = rnd.uniform(-17, 17)
        y = rnd.uniform(-10, 10)
        if abs(x) > 11.6 and abs(y) < 9:
            continue
        l = rnd.uniform(0.5, 2.6) * (1.3 if abs(y) > 4 else 1)
        w = rnd.uniform(0.018, 0.035)
        v = [bm.verts.new((x, y - w, 0.01)), bm.verts.new((x + l, y - w, 0.01)),
             bm.verts.new((x + l, y + w, 0.01)), bm.verts.new((x, y + w, 0.01))]
        bm.faces.new(v)
    objeto("Agua", bm, mat, col)


# ---------------------------------------------------------------- líneas a mano (Freestyle)

def lineas(sc, col_lineas):
    sc.render.use_freestyle = True
    sc.render.line_thickness_mode = "ABSOLUTE"
    sc.render.line_thickness = 1.6
    vl = sc.view_layers[0]
    fs = vl.freestyle_settings
    fs.crease_angle = math.radians(150)
    fs.use_smoothness = True
    for ls in list(fs.linesets):
        fs.linesets.remove(ls)
    ls = fs.linesets.new("Tiza")
    ls.select_by_collection = True
    ls.collection = col_lineas
    ls.select_silhouette = ls.select_border = ls.select_crease = ls.select_edge_mark = True
    ls.select_external_contour = True
    st = ls.linestyle
    st.color = lineal(MARFIL)[:3]
    st.alpha = 0.92
    st.thickness = 1.7
    st.chaining = "PLAIN"
    ruido = st.geometry_modifiers.new("Temblor", "PERLIN_NOISE_1D")
    ruido.frequency, ruido.amplitude = 14, 0.9
    st.thickness_modifiers.new("Presion", "ALONG_STROKE")
    st.caps = "ROUND"


# ---------------------------------------------------------------- cámara

def camara(sc):
    cam = bpy.data.objects.new("Camara", bpy.data.cameras.new("Camara"))
    sc.collection.objects.link(cam)
    sc.camera = cam
    cam.data.lens = 40
    return cam


def colocar(cam, t):
    """t de 0 a 1: la cámara recorre un arco de 70° alrededor del puente y baja un poco."""
    az = math.radians(-58 + 70 * t)
    el = math.radians(13 - 5 * t)
    r = 35
    obj = Vector((0, 0, 2.1))
    cam.location = obj + Vector((r * math.cos(el) * math.sin(az), -r * math.cos(el) * math.cos(az), r * math.sin(el)))
    cam.rotation_euler = (obj - cam.location).to_track_quat("-Z", "Y").to_euler()


def cotas(sc, cam):
    """Puntos de las cotas en coordenadas de imagen (0–1, origen arriba a la izquierda)."""
    _, _, w_fin = perfil(1)
    y = -w_fin / 2 - 1.4
    pares = {
        "luz": [(-12, y, 0.02), (12, y, 0.02)],
        "galibo": [(0, -1.2, 0.02), (0, -1.2, perfil(0)[0] - 0.05)],
        "ancho": [(-14.5, -w_fin / 2, 1.62), (-14.5, w_fin / 2, 1.62)],
    }
    out = {}
    for k, pts in pares.items():
        out[k] = []
        for p in pts:
            v = world_to_camera_view(sc, cam, Vector(p))
            out[k].append([v.x, 1 - v.y])
    return out


def construir():
    sc = limpiar()
    col = bpy.data.collections.new("Lineas"); sc.collection.children.link(col)
    col2 = bpy.data.collections.new("SinLineas"); sc.collection.children.link(col2)
    piedra = material_tiza("Piedra", "#1d2f96", "#5160b4", "#efe7d6")
    tierra = material_tiza("Tierra", "#1a2c96", "#24369f", "#4656b2", 0.25, 0.8)
    madera = material_tiza("Madera", "#1d2f96", "#6270ba", "#e6dcc6")
    vela = material_tiza("Vela", "#4757ae", "#a9aed3", "#f3ecdc")
    puente(col, piedra)
    orillas(col, tierra)
    velero(col, madera, vela)
    agua(col2, material_trazo("Agua", MARFIL, 0.42))
    lineas(sc, col)
    return sc, camara(sc)


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    sc, cam = construir()
    if args[0] == "--prueba":
        colocar(cam, 0.35)
        sc.render.filepath = args[1]
        bpy.ops.render.render(write_still=True)
        json.dump(cotas(sc, cam), open(args[1] + ".json", "w"))
    else:
        carpeta, n = args[1], int(args[2]) if len(args) > 2 else 72
        datos = []
        for i in range(n):
            colocar(cam, i / (n - 1))
            sc.render.filepath = f"{carpeta}/f{i:03d}.png"
            bpy.ops.render.render(write_still=True)
            datos.append(cotas(sc, cam))
        json.dump(datos, open(f"{carpeta}/cotas.json", "w"))
