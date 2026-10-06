class_name TerrainManager
extends Node3D
## Gestiona los chunks de terreno alrededor del jugador.
##
## - Divide el mundo en cuadrados de CHUNK_SIZE metros.
## - Elige la resolución (LOD) de cada chunk según su distancia al jugador.
## - Solo los chunks contiguos al jugador llevan colisión.
## - Genera los datos en hilos secundarios (WorkerThreadPool) y los aplica en
##   el hilo principal en pequeñas tandas para no provocar tirones.
## - Dibuja una malla lejana de baja resolución para el horizonte.

const CHUNK_SIZE: float = 128.0
const COLLISION_RADIUS: int = 1
const MAX_APPLY_PER_FRAME: int = 2
const REFRESH_INTERVAL: float = 0.2
const BACKDROP_HALF_EXTENT: float = 7000.0
const BACKDROP_RES: int = 140

var sampler: TerrainSampler
var focus_position: Vector3 = Vector3.ZERO

var _chunks: Dictionary = {}        # Vector2i -> TerrainChunk
var _pending: Dictionary = {}       # Vector2i -> int (id de tarea)
var _pending_spec: Dictionary = {}  # Vector2i -> int
var _results: Dictionary = {}       # Vector2i -> Dictionary (escrito por hilos)
var _queue: Array[Dictionary] = []
var _mutex: Mutex = Mutex.new()
var _refresh_timer: float = 0.0
var _center: Vector2i = Vector2i(999999, 999999)
var _material: ShaderMaterial
var _backdrop_material: ShaderMaterial
var _tree_mesh: ArrayMesh
var _backdrop: MeshInstance3D
var _backdrop_task: int = -1
var _backdrop_data: Dictionary = {}
var _shutting_down: bool = false


func _ready() -> void:
	sampler = TerrainSampler.new(GameState.WORLD_SEED)
	GameState.terrain = self
	var shader: Shader = load("res://world/shaders/terrain.gdshader") as Shader
	_material = ShaderMaterial.new()
	_material.shader = shader
	_backdrop_material = ShaderMaterial.new()
	_backdrop_material.shader = shader
	_backdrop_material.set_shader_parameter("use_clip", true)
	_backdrop_material.set_shader_parameter("clip_half_size", 0.0)
	_tree_mesh = VegetationFactory.build_fir_mesh()
	EventBus.quality_changed.connect(_on_quality_changed)
	_backdrop_task = WorkerThreadPool.add_task(_backdrop_task_body, false, "Terreno lejano")


func _exit_tree() -> void:
	_shutting_down = true
	for coord in _pending.keys():
		WorkerThreadPool.wait_for_task_completion(_pending[coord])
	_pending.clear()
	if _backdrop_task != -1:
		WorkerThreadPool.wait_for_task_completion(_backdrop_task)
		_backdrop_task = -1


func _process(delta: float) -> void:
	_collect_backdrop()
	_collect_results()
	_refresh_timer -= delta
	var center: Vector2i = world_to_chunk(focus_position)
	if _refresh_timer <= 0.0 or center != _center:
		_refresh_timer = REFRESH_INTERVAL
		_center = center
		_refresh_desired()
	_dispatch_tasks()


static func world_to_chunk(pos: Vector3) -> Vector2i:
	return Vector2i(floori(pos.x / CHUNK_SIZE), floori(pos.z / CHUNK_SIZE))


## Resolución (cuadros por lado) en función de la distancia en chunks.
static func resolution_for_distance(dist: int) -> int:
	if dist <= 1:
		return 64
	if dist <= 2:
		return 32
	if dist <= 4:
		return 16
	return 8


func has_collision_at(pos: Vector3) -> bool:
	var chunk: TerrainChunk = _chunks.get(world_to_chunk(pos)) as TerrainChunk
	return chunk != null and chunk.has_collision


## Fracción (0..1) de chunks deseados que ya están generados.
func loaded_ratio() -> float:
	var radius: int = GameState.get_preset()["view_radius"]
	var total: int = (radius * 2 + 1) * (radius * 2 + 1)
	return clampf(float(_chunks.size()) / float(total), 0.0, 1.0)


## Punto de salida: localiza la cumbre cercana al centro del macizo y desciende
## por la línea de máxima pendiente hasta encontrar una ladera esquiable
## (en la cima exacta la pendiente es nula y el esquiador no se movería).
func find_spawn_point() -> Dictionary:
	var best_h: float = -INF
	var best: Vector3 = Vector3.ZERO
	for i in range(-25, 26):
		for j in range(-25, 26):
			var x: float = float(i) * 16.0
			var z: float = float(j) * 16.0
			var h: float = sampler.height_at(x, z)
			if h > best_h:
				best_h = h
				best = Vector3(x, h, z)
	var pos: Vector3 = best
	var downhill: Vector3 = sampler.downhill_at(pos.x, pos.z, 6.0)
	for k in 80:
		if sampler.slope_at(pos.x, pos.z, 3.0) >= 14.0 and k >= 4:
			break
		downhill = sampler.downhill_at(pos.x, pos.z, 6.0)
		pos += downhill * 5.0
		pos.y = sampler.height_at(pos.x, pos.z)
	downhill = sampler.downhill_at(pos.x, pos.z, 10.0)
	var yaw: float = atan2(-downhill.x, -downhill.z)
	return {"position": pos + Vector3(0.0, 1.0, 0.0), "yaw": yaw, "summit": best}


func _refresh_desired() -> void:
	var preset: Dictionary = GameState.get_preset()
	var radius: int = preset["view_radius"]
	var tree_radius: int = preset["tree_radius"]
	var density: float = preset["tree_density"]
	_queue.clear()
	var wanted: Dictionary = {}
	for dz in range(-radius, radius + 1):
		for dx in range(-radius, radius + 1):
			var coord: Vector2i = _center + Vector2i(dx, dz)
			var dist: int = maxi(absi(dx), absi(dz))
			var res: int = resolution_for_distance(dist)
			var collision: bool = dist <= COLLISION_RADIUS
			var trees: float = density if dist <= tree_radius else 0.0
			var spec: int = res * 1000 + (100 if collision else 0) + int(trees * 99.0)
			wanted[coord] = true
			var chunk: TerrainChunk = _chunks.get(coord) as TerrainChunk
			if chunk != null and chunk.spec == spec:
				continue
			if _pending.has(coord):
				continue
			_queue.append({
				"coord": coord, "dist": dist, "res": res, "collision": collision,
				"trees": trees, "spec": spec,
			})
	_queue.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return a["dist"] < b["dist"])
	# Elimina los chunks que quedan fuera del radio (con un anillo de margen).
	for coord in _chunks.keys():
		var c: Vector2i = coord
		var dist: int = maxi(absi(c.x - _center.x), absi(c.y - _center.y))
		if dist > radius + 1:
			var chunk: TerrainChunk = _chunks[c]
			_chunks.erase(c)
			chunk.queue_free()
	_update_backdrop_clip(radius)


func _dispatch_tasks() -> void:
	var max_tasks: int = GameState.get_preset()["max_tasks"]
	while _pending.size() < max_tasks and not _queue.is_empty():
		var job: Dictionary = _queue.pop_front()
		var coord: Vector2i = job["coord"]
		if _pending.has(coord):
			continue
		var task: Callable = _generate_chunk_task.bind(coord, job["res"], job["collision"], job["trees"], job["spec"])
		_pending[coord] = WorkerThreadPool.add_task(task, false, "Chunk de terreno")
		_pending_spec[coord] = job["spec"]


## Se ejecuta en un hilo secundario: NO debe tocar nodos de la escena.
func _generate_chunk_task(coord: Vector2i, res: int, collision: bool, trees: float, spec: int) -> void:
	if _shutting_down:
		return
	var local_sampler: TerrainSampler = TerrainSampler.new(GameState.WORLD_SEED)
	var data: Dictionary = TerrainChunkBuilder.build(local_sampler, coord, CHUNK_SIZE, res, collision, trees, GameState.WORLD_SEED)
	data["spec"] = spec
	_mutex.lock()
	_results[coord] = data
	_mutex.unlock()


func _collect_results() -> void:
	var finished: Array = []
	_mutex.lock()
	finished = _results.keys()
	_mutex.unlock()
	var applied: int = 0
	var preset: Dictionary = GameState.get_preset()
	var radius: int = preset["view_radius"]
	for coord_variant in finished:
		if applied >= MAX_APPLY_PER_FRAME:
			break
		var coord: Vector2i = coord_variant
		_mutex.lock()
		var data: Dictionary = _results[coord]
		_results.erase(coord)
		_mutex.unlock()
		if _pending.has(coord):
			WorkerThreadPool.wait_for_task_completion(_pending[coord])
			_pending.erase(coord)
			_pending_spec.erase(coord)
		var dist: int = maxi(absi(coord.x - _center.x), absi(coord.y - _center.y))
		if dist > radius + 1:
			continue
		var chunk: TerrainChunk = _chunks.get(coord) as TerrainChunk
		if chunk == null:
			chunk = TerrainChunk.new()
			chunk.coord = coord
			chunk.name = "Chunk_%d_%d" % [coord.x, coord.y]
			chunk.position = Vector3(float(coord.x) * CHUNK_SIZE, 0.0, float(coord.y) * CHUNK_SIZE)
			add_child(chunk)
			_chunks[coord] = chunk
		chunk.spec = data["spec"]
		var cast_shadows: bool = dist <= 3
		chunk.apply_data(data, _material, _tree_mesh, cast_shadows, CHUNK_SIZE * (float(preset["tree_radius"]) + 0.5))
		applied += 1


func _update_backdrop_clip(radius: int) -> void:
	# Radio (en chunks) completamente cargado alrededor del centro.
	var loaded_radius: int = -1
	for r in radius + 1:
		var complete: bool = true
		for dz in range(-r, r + 1):
			for dx in range(-r, r + 1):
				if maxi(absi(dx), absi(dz)) != r:
					continue
				if not _chunks.has(_center + Vector2i(dx, dz)):
					complete = false
					break
			if not complete:
				break
		if not complete:
			break
		loaded_radius = r
	var half: float = 0.0
	if loaded_radius >= 1:
		half = (float(loaded_radius) - 0.25) * CHUNK_SIZE
	var center_world: Vector2 = Vector2((float(_center.x) + 0.5) * CHUNK_SIZE, (float(_center.y) + 0.5) * CHUNK_SIZE)
	_backdrop_material.set_shader_parameter("clip_center", center_world)
	_backdrop_material.set_shader_parameter("clip_half_size", half)


func _backdrop_task_body() -> void:
	var local_sampler: TerrainSampler = TerrainSampler.new(GameState.WORLD_SEED)
	var data: Dictionary = TerrainChunkBuilder.build_backdrop(local_sampler, BACKDROP_HALF_EXTENT, BACKDROP_RES)
	_mutex.lock()
	_backdrop_data = data
	_mutex.unlock()


func _collect_backdrop() -> void:
	if _backdrop_task == -1:
		return
	_mutex.lock()
	var is_done: bool = not _backdrop_data.is_empty()
	_mutex.unlock()
	if not is_done:
		return
	WorkerThreadPool.wait_for_task_completion(_backdrop_task)
	_backdrop_task = -1
	var arrays: Array = []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = _backdrop_data["vertices"]
	arrays[Mesh.ARRAY_NORMAL] = _backdrop_data["normals"]
	arrays[Mesh.ARRAY_COLOR] = _backdrop_data["colors"]
	arrays[Mesh.ARRAY_INDEX] = _backdrop_data["indices"]
	var mesh: ArrayMesh = ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	mesh.surface_set_material(0, _backdrop_material)
	_backdrop = MeshInstance3D.new()
	_backdrop.name = "TerrenoLejano"
	_backdrop.mesh = mesh
	_backdrop.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(_backdrop)
	_backdrop_data = {}


func _on_quality_changed(_level: int) -> void:
	# Fuerza a regenerar con el nuevo radio y densidad de árboles.
	_refresh_timer = 0.0
