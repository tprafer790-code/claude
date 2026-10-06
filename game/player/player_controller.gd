class_name PlayerController
extends CharacterBody3D
## Controlador base del jugador.
##
## Por qué CharacterBody3D y no RigidBody3D: el deporte exige un control muy
## preciso (cantos, giros, trucos y aterrizajes) que con un cuerpo rígido
## obliga a luchar contra el solver de física. Con CharacterBody3D cada
## disciplina integra su propio modelo de fuerzas (gravedad proyectada,
## rozamiento, arrastre, sustentación) y move_and_slide() resuelve solo las
## colisiones. Es determinista, estable a alta velocidad y barato.
##
## El controlador guarda lo común (rumbo, superficie, modelo, partículas,
## reaparición) y delega el movimiento en la disciplina activa.

const SAFE_POINT_INTERVAL: float = 1.5

var model: CharacterModel
var discipline: Discipline
var heading: float = 0.0
var frozen: bool = true
var ground_normal: Vector3 = Vector3.UP

# Datos para el HUD.
var speed_kmh: float = 0.0
var altitude: float = 0.0
var slope_deg: float = 0.0
var surface_weights: Color = Color(0.0, 1.0, 0.0, 0.0)
var surface_index: int = TerrainSampler.Surface.PACKED

var _safe_position: Vector3 = Vector3.ZERO
var _safe_heading: float = 0.0
var _safe_timer: float = 0.0
var _model_up: Vector3 = Vector3.UP
var _trail: GPUParticles3D


func _ready() -> void:
	name = "Jugador"
	collision_layer = 2
	collision_mask = 1
	floor_max_angle = deg_to_rad(62.0)
	floor_snap_length = 0.7
	floor_stop_on_slope = false
	floor_block_on_wall = false
	floor_constant_speed = false
	max_slides = 6
	safe_margin = 0.05
	var shape_node: CollisionShape3D = CollisionShape3D.new()
	var capsule: CapsuleShape3D = CapsuleShape3D.new()
	capsule.radius = 0.35
	capsule.height = 1.6
	shape_node.shape = capsule
	shape_node.position = Vector3(0.0, 0.8, 0.0)
	add_child(shape_node)

	model = CharacterModel.new()
	model.name = "Modelo"
	add_child(model)
	_build_trail()

	discipline = SkiDiscipline.new(self)
	discipline.enter()
	GameState.player = self


func _build_trail() -> void:
	_trail = GPUParticles3D.new()
	_trail.name = "NieveLevantada"
	_trail.amount = 96
	_trail.lifetime = 0.9
	_trail.local_coords = false
	_trail.emitting = false
	_trail.position = Vector3(0.0, 0.1, 0.4)
	var process: ParticleProcessMaterial = ParticleProcessMaterial.new()
	process.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	process.emission_box_extents = Vector3(0.3, 0.05, 0.6)
	process.direction = Vector3(0.0, 1.0, 0.0)
	process.spread = 55.0
	process.initial_velocity_min = 0.8
	process.initial_velocity_max = 3.2
	process.gravity = Vector3(0.0, -5.0, 0.0)
	process.damping_min = 1.0
	process.damping_max = 2.5
	process.scale_min = 0.5
	process.scale_max = 1.4
	var ramp: Gradient = Gradient.new()
	ramp.set_color(0, Color(1.0, 1.0, 1.0, 0.7))
	ramp.set_color(1, Color(1.0, 1.0, 1.0, 0.0))
	var ramp_tex: GradientTexture1D = GradientTexture1D.new()
	ramp_tex.gradient = ramp
	process.color_ramp = ramp_tex
	_trail.process_material = process
	var quad: QuadMesh = QuadMesh.new()
	quad.size = Vector2(0.14, 0.14)
	var mat: StandardMaterial3D = StandardMaterial3D.new()
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.billboard_mode = BaseMaterial3D.BILLBOARD_PARTICLES
	mat.vertex_color_use_as_albedo = true
	mat.albedo_color = Color(0.95, 0.97, 1.0)
	# Copo suave: degradado radial blanco -> transparente generado por código.
	var dot: Gradient = Gradient.new()
	dot.set_color(0, Color(1.0, 1.0, 1.0, 1.0))
	dot.set_color(1, Color(1.0, 1.0, 1.0, 0.0))
	var dot_tex: GradientTexture2D = GradientTexture2D.new()
	dot_tex.gradient = dot
	dot_tex.fill = GradientTexture2D.FILL_RADIAL
	dot_tex.fill_from = Vector2(0.5, 0.5)
	dot_tex.fill_to = Vector2(0.5, 0.0)
	dot_tex.width = 32
	dot_tex.height = 32
	mat.albedo_texture = dot_tex
	quad.material = mat
	_trail.draw_pass_1 = quad
	add_child(_trail)


func spawn(pos: Vector3, yaw: float) -> void:
	global_position = pos
	heading = yaw
	velocity = Vector3.ZERO
	_safe_position = pos
	_safe_heading = yaw
	_safe_timer = 0.0
	frozen = false
	discipline.reset()


func respawn() -> void:
	global_position = _safe_position + Vector3(0.0, 0.5, 0.0)
	heading = _safe_heading
	velocity = Vector3.ZERO
	discipline.reset()
	model.basis = Basis(Vector3.UP, heading)
	EventBus.player_respawned.emit()


## Vector horizontal hacia donde apuntan los esquís.
func get_facing() -> Vector3:
	return Vector3(-sin(heading), 0.0, -cos(heading))


func _physics_process(delta: float) -> void:
	if frozen:
		return
	discipline.physics_update(delta)
	_update_stats(delta)
	_safety_checks()


func _unhandled_input(event: InputEvent) -> void:
	if frozen:
		return
	if event.is_action_pressed("respawn"):
		respawn()


func _update_stats(delta: float) -> void:
	speed_kmh = velocity.length() * 3.6
	altitude = global_position.y
	slope_deg = rad_to_deg(acos(clampf(ground_normal.y, -1.0, 1.0)))
	GameState.register_speed(speed_kmh)
	AudioBus.wind_intensity = clampf(0.12 + velocity.length() / 38.0, 0.0, 1.0)
	# Guarda puntos seguros para reaparecer tras una caída.
	_safe_timer += delta
	if _safe_timer >= SAFE_POINT_INTERVAL:
		_safe_timer = 0.0
		var ski: SkiDiscipline = discipline as SkiDiscipline
		var calm: bool = ski == null or ski.state == SkiDiscipline.State.SKIING
		if calm and is_on_floor() and slope_deg < 38.0:
			_safe_position = global_position
			_safe_heading = heading


func _safety_checks() -> void:
	var terrain: TerrainManager = GameState.terrain
	if terrain == null:
		return
	var ground: float = terrain.sampler.height_at(global_position.x, global_position.z)
	# Si por cualquier motivo atravesara el suelo, se recoloca encima.
	if global_position.y < ground - 2.5:
		global_position.y = ground + 0.5
		velocity.y = maxf(velocity.y, 0.0)


## Consulta la superficie bajo los pies y devuelve sus pesos.
func update_surface(normal: Vector3) -> Color:
	var terrain: TerrainManager = GameState.terrain
	if terrain == null:
		return surface_weights
	var slope: float = rad_to_deg(acos(clampf(normal.y, -1.0, 1.0)))
	surface_weights = terrain.sampler.surface_weights(global_position.y, slope, global_position.x, global_position.z)
	surface_index = TerrainSampler.dominant_surface(surface_weights)
	return surface_weights


## Orienta el modelo según la normal del suelo y el rumbo, suavizado.
func align_model(up_target: Vector3, delta: float, rate: float) -> void:
	_model_up = _model_up.slerp(up_target.normalized(), clampf(1.0 - exp(-rate * delta), 0.0, 1.0)).normalized()
	var facing: Vector3 = get_facing()
	var forward: Vector3 = (facing - _model_up * facing.dot(_model_up)).normalized()
	if forward.length() < 0.01:
		forward = facing
	var right: Vector3 = forward.cross(_model_up).normalized()
	model.basis = Basis(right, _model_up, -forward)


func set_trail_emitting(enabled: bool, speed: float, spray: bool) -> void:
	var quality_scale: float = GameState.get_preset()["particles"]
	_trail.emitting = enabled and quality_scale > 0.0
	if enabled:
		var ratio: float = clampf(speed / 25.0, 0.15, 1.0) * quality_scale
		if spray:
			ratio = minf(1.0, ratio * 1.8)
		_trail.amount_ratio = ratio


func get_state_name() -> String:
	return discipline.get_state_name()
