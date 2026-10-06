class_name TerrainChunkBuilder
extends RefCounted
## Genera los DATOS de un chunk (no crea nodos), para poder ejecutarse en un
## hilo secundario con WorkerThreadPool. El hilo principal convierte después
## estos arrays en malla, colisión y árboles (ver TerrainChunk.apply_data).


## Construye vértices, normales, pesos de superficie, índices, faldones,
## datos de colisión y posiciones de árboles para un chunk.
static func build(sampler: TerrainSampler, coord: Vector2i, size: float, res: int,
		with_collision: bool, tree_density: float, tree_seed: int) -> Dictionary:
	var step: float = size / float(res)
	var origin_x: float = float(coord.x) * size
	var origin_z: float = float(coord.y) * size
	var side: int = res + 1
	var grid_w: int = res + 3

	# 1) Alturas con un borde extra de una muestra para calcular normales
	#    continuas entre chunks vecinos.
	var heights: PackedFloat32Array = PackedFloat32Array()
	heights.resize(grid_w * grid_w)
	for j in grid_w:
		var wz: float = origin_z + float(j - 1) * step
		for i in grid_w:
			heights[j * grid_w + i] = sampler.height_at(origin_x + float(i - 1) * step, wz)

	# 2) Vértices de la superficie.
	var vertices: PackedVector3Array = PackedVector3Array()
	var normals: PackedVector3Array = PackedVector3Array()
	var colors: PackedColorArray = PackedColorArray()
	var vertex_total: int = side * side + 4 * side
	vertices.resize(vertex_total)
	normals.resize(vertex_total)
	colors.resize(vertex_total)
	for j in side:
		for i in side:
			var gi: int = i + 1
			var gj: int = j + 1
			var h: float = heights[gj * grid_w + gi]
			var hl: float = heights[gj * grid_w + gi - 1]
			var hr: float = heights[gj * grid_w + gi + 1]
			var hd: float = heights[(gj - 1) * grid_w + gi]
			var hu: float = heights[(gj + 1) * grid_w + gi]
			var normal: Vector3 = Vector3(hl - hr, 2.0 * step, hd - hu).normalized()
			var slope: float = rad_to_deg(acos(clampf(normal.y, -1.0, 1.0)))
			var lx: float = float(i) * step
			var lz: float = float(j) * step
			var idx: int = j * side + i
			vertices[idx] = Vector3(lx, h, lz)
			normals[idx] = normal
			colors[idx] = sampler.surface_weights(h, slope, origin_x + lx, origin_z + lz)

	# 3) Índices de la cuadrícula (orden horario = cara frontal en Godot).
	var indices: PackedInt32Array = PackedInt32Array()
	for j in res:
		for i in res:
			var a: int = j * side + i
			var b: int = a + 1
			var c: int = a + side
			var d: int = c + 1
			indices.append_array([a, b, c, b, d, c])

	# 4) Faldones: una tira vertical bajo cada borde que tapa las grietas que
	#    aparecen entre chunks con distinto nivel de detalle (LOD).
	var skirt_depth: float = step * 2.0 + 6.0
	var edges: Array[PackedInt32Array] = [
		_edge_indices(side, 0, 0, 1, 0),           # borde norte (z = 0)
		_edge_indices(side, 0, side - 1, 1, 0),    # borde sur
		_edge_indices(side, 0, 0, 0, 1),           # borde oeste (x = 0)
		_edge_indices(side, side - 1, 0, 0, 1),    # borde este
	]
	var next_vertex: int = side * side
	for edge in edges:
		var first_skirt: int = next_vertex
		for k in edge.size():
			var src: int = edge[k]
			vertices[next_vertex] = vertices[src] - Vector3(0.0, skirt_depth, 0.0)
			normals[next_vertex] = normals[src]
			colors[next_vertex] = colors[src]
			next_vertex += 1
		for k in edge.size() - 1:
			var top_a: int = edge[k]
			var top_b: int = edge[k + 1]
			var bottom_a: int = first_skirt + k
			var bottom_b: int = first_skirt + k + 1
			# Ambas caras para que el faldón se vea desde cualquier lado.
			indices.append_array([top_a, top_b, bottom_a, top_b, bottom_b, bottom_a])
			indices.append_array([top_a, bottom_a, top_b, top_b, bottom_a, bottom_b])

	var result: Dictionary = {
		"coord": coord,
		"res": res,
		"step": step,
		"vertices": vertices,
		"normals": normals,
		"colors": colors,
		"indices": indices,
		"collision": PackedFloat32Array(),
		"collision_side": side,
		"trees": [],
	}

	# 5) Colisión: HeightMapShape3D. Se guarda la altura dividida por el paso
	#    porque el nodo de colisión se escala de forma uniforme por "step".
	if with_collision:
		var col: PackedFloat32Array = PackedFloat32Array()
		col.resize(side * side)
		for idx in side * side:
			col[idx] = vertices[idx].y / step
		result["collision"] = col

	# 6) Árboles: muestreo en rejilla con desplazamiento aleatorio determinista.
	if tree_density > 0.0:
		var trees: Array[Transform3D] = []
		var rng: RandomNumberGenerator = RandomNumberGenerator.new()
		rng.seed = hash(Vector3i(coord.x, coord.y, tree_seed))
		var cell: float = 8.0
		var cells: int = int(size / cell)
		for cj in cells:
			for ci in cells:
				var lx: float = (float(ci) + rng.randf()) * cell
				var lz: float = (float(cj) + rng.randf()) * cell
				var roll: float = rng.randf()
				var scale_roll: float = rng.randf()
				var yaw_roll: float = rng.randf()
				var wx: float = origin_x + lx
				var wz: float = origin_z + lz
				var h: float = sampler.height_at(wx, wz)
				if h > TerrainSampler.TREELINE:
					continue
				var slope: float = sampler.slope_at(wx, wz, 2.0)
				var p: float = sampler.tree_probability(h, slope, wx, wz) * tree_density
				if roll >= p:
					continue
				var s: float = lerpf(0.65, 1.35, scale_roll)
				var basis: Basis = Basis(Vector3.UP, yaw_roll * TAU).scaled(Vector3(s, s * lerpf(0.9, 1.25, roll), s))
				trees.append(Transform3D(basis, Vector3(lx, h - 0.4, lz)))
		result["trees"] = trees

	return result


static func _edge_indices(side: int, start_i: int, start_j: int, di: int, dj: int) -> PackedInt32Array:
	var out: PackedInt32Array = PackedInt32Array()
	out.resize(side)
	for k in side:
		out[k] = (start_j + dj * k) * side + (start_i + di * k)
	return out


## Malla lejana de baja resolución para el horizonte (montañas distantes).
## Usa el mínimo de varias submuestras para quedar siempre por debajo del
## terreno detallado y no asomar a través de él.
static func build_backdrop(sampler: TerrainSampler, half_extent: float, res: int) -> Dictionary:
	var step: float = (half_extent * 2.0) / float(res)
	var side: int = res + 1
	var vertices: PackedVector3Array = PackedVector3Array()
	var normals: PackedVector3Array = PackedVector3Array()
	var colors: PackedColorArray = PackedColorArray()
	vertices.resize(side * side)
	normals.resize(side * side)
	colors.resize(side * side)
	var sub: float = step * 0.35
	for j in side:
		for i in side:
			var x: float = -half_extent + float(i) * step
			var z: float = -half_extent + float(j) * step
			var h: float = sampler.height_at(x, z)
			h = minf(h, sampler.height_at(x - sub, z))
			h = minf(h, sampler.height_at(x + sub, z))
			h = minf(h, sampler.height_at(x, z - sub))
			h = minf(h, sampler.height_at(x, z + sub))
			vertices[j * side + i] = Vector3(x, h - 12.0, z)
	for j in side:
		for i in side:
			var il: int = maxi(i - 1, 0)
			var ir: int = mini(i + 1, res)
			var jd: int = maxi(j - 1, 0)
			var ju: int = mini(j + 1, res)
			var hl: float = vertices[j * side + il].y
			var hr: float = vertices[j * side + ir].y
			var hd: float = vertices[jd * side + i].y
			var hu: float = vertices[ju * side + i].y
			var normal: Vector3 = Vector3(hl - hr, step * float(ir - il), hd - hu).normalized()
			normals[j * side + i] = normal
			var v: Vector3 = vertices[j * side + i]
			var slope: float = rad_to_deg(acos(clampf(normal.y, -1.0, 1.0)))
			colors[j * side + i] = sampler.surface_weights(v.y, slope, v.x, v.z)
	var indices: PackedInt32Array = PackedInt32Array()
	for j in res:
		for i in res:
			var a: int = j * side + i
			var b: int = a + 1
			var c: int = a + side
			var d: int = c + 1
			indices.append_array([a, b, c, b, d, c])
	return {
		"vertices": vertices,
		"normals": normals,
		"colors": colors,
		"indices": indices,
	}
