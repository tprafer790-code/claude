class_name CharacterModel
extends Node3D
## Esquiador modelado con primitivas y animado de forma procedural.
##
## Jerarquía (el origen está a la altura de los pies):
##   CharacterModel  -> orientación: pendiente + rumbo
##     pivot (y = 0.95) -> giros y mortales del truco (rota en torno al cuerpo)
##       body (y = -0.95) -> inclinación lateral en los giros
##         hips -> muslos -> rodillas -> espinillas
##         torso -> cabeza, hombros -> brazos -> bastones
##       skis -> esquís (se inclinan sobre el canto)

const THIGH_LENGTH: float = 0.45
const SHIN_LENGTH: float = 0.45
const FOOT_HEIGHT: float = 0.1

var pivot: Node3D
var body: Node3D
var _hips: Node3D
var _torso: Node3D
var _head: Node3D
var _thighs: Array[Node3D] = []
var _shins: Array[Node3D] = []
var _shoulders: Array[Node3D] = []
var _elbows: Array[Node3D] = []
var _skis: Array[Node3D] = []
var _skis_root: Node3D

# Estado de animación suavizado.
var _lean: float = 0.0
var _crouch: float = 0.2
var _tuck: float = 0.0
var _arm_raise: float = 0.0
var _grab: float = 0.0
var _edge: float = 0.0
var _time: float = 0.0
var _tumble_axis: Vector3 = Vector3.RIGHT
var _tumbling: bool = false

var _mat_jacket: StandardMaterial3D
var _mat_pants: StandardMaterial3D
var _mat_helmet: StandardMaterial3D
var _mat_goggles: StandardMaterial3D
var _mat_skin: StandardMaterial3D
var _mat_ski: StandardMaterial3D
var _mat_pole: StandardMaterial3D
var _mat_glove: StandardMaterial3D


func _ready() -> void:
	_build_materials()
	pivot = Node3D.new()
	pivot.name = "Pivote"
	pivot.position = Vector3(0.0, 0.95, 0.0)
	add_child(pivot)
	body = Node3D.new()
	body.name = "Cuerpo"
	body.position = Vector3(0.0, -0.95, 0.0)
	pivot.add_child(body)
	_build_legs()
	_build_upper_body()
	_build_skis()


func _build_materials() -> void:
	_mat_jacket = _mat(Color(0.86, 0.27, 0.12), 0.7)
	_mat_pants = _mat(Color(0.1, 0.13, 0.22), 0.8)
	_mat_helmet = _mat(Color(0.95, 0.95, 0.97), 0.35)
	_mat_goggles = _mat(Color(0.95, 0.62, 0.15), 0.1)
	_mat_goggles.metallic = 0.6
	_mat_skin = _mat(Color(0.86, 0.68, 0.56), 0.7)
	_mat_ski = _mat(Color(0.98, 0.84, 0.12), 0.3)
	_mat_pole = _mat(Color(0.55, 0.58, 0.62), 0.3)
	_mat_pole.metallic = 0.7
	_mat_glove = _mat(Color(0.12, 0.12, 0.14), 0.8)


func _mat(color: Color, roughness: float) -> StandardMaterial3D:
	var m: StandardMaterial3D = StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = roughness
	return m


func _part(parent: Node3D, mesh: Mesh, material: Material, pos: Vector3, rot_deg: Vector3 = Vector3.ZERO) -> MeshInstance3D:
	var mi: MeshInstance3D = MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = material
	mi.position = pos
	mi.rotation_degrees = rot_deg
	parent.add_child(mi)
	return mi


func _capsule(radius: float, height: float) -> CapsuleMesh:
	var c: CapsuleMesh = CapsuleMesh.new()
	c.radius = radius
	c.height = height
	c.radial_segments = 10
	c.rings = 4
	return c


func _box(size: Vector3) -> BoxMesh:
	var b: BoxMesh = BoxMesh.new()
	b.size = size
	return b


func _build_legs() -> void:
	_hips = Node3D.new()
	_hips.name = "Cadera"
	_hips.position = Vector3(0.0, THIGH_LENGTH + SHIN_LENGTH + FOOT_HEIGHT, 0.0)
	body.add_child(_hips)
	_part(_hips, _box(Vector3(0.34, 0.18, 0.22)), _mat_pants, Vector3(0.0, 0.02, 0.0))
	for side in [-1.0, 1.0]:
		var thigh: Node3D = Node3D.new()
		thigh.position = Vector3(0.11 * side, 0.0, 0.0)
		_hips.add_child(thigh)
		_part(thigh, _capsule(0.085, THIGH_LENGTH + 0.1), _mat_pants, Vector3(0.0, -THIGH_LENGTH * 0.5, 0.0))
		var knee: Node3D = Node3D.new()
		knee.position = Vector3(0.0, -THIGH_LENGTH, 0.0)
		thigh.add_child(knee)
		_part(knee, _capsule(0.075, SHIN_LENGTH + 0.08), _mat_pants, Vector3(0.0, -SHIN_LENGTH * 0.5, 0.0))
		# Bota.
		_part(knee, _box(Vector3(0.14, 0.18, 0.3)), _mat_glove, Vector3(0.0, -SHIN_LENGTH - 0.02, -0.04))
		_thighs.append(thigh)
		_shins.append(knee)


func _build_upper_body() -> void:
	_torso = Node3D.new()
	_torso.name = "Torso"
	_torso.position = Vector3(0.0, 0.08, 0.0)
	_hips.add_child(_torso)
	_part(_torso, _capsule(0.19, 0.62), _mat_jacket, Vector3(0.0, 0.28, 0.0))
	# Mochila pequeña.
	_part(_torso, _box(Vector3(0.26, 0.32, 0.12)), _mat_pants, Vector3(0.0, 0.32, 0.18))
	_head = Node3D.new()
	_head.position = Vector3(0.0, 0.66, 0.0)
	_torso.add_child(_head)
	var helmet: SphereMesh = SphereMesh.new()
	helmet.radius = 0.135
	helmet.height = 0.27
	_part(_head, helmet, _mat_helmet, Vector3(0.0, 0.08, 0.0))
	var face: SphereMesh = SphereMesh.new()
	face.radius = 0.11
	face.height = 0.22
	_part(_head, face, _mat_skin, Vector3(0.0, 0.02, -0.03))
	_part(_head, _box(Vector3(0.22, 0.07, 0.06)), _mat_goggles, Vector3(0.0, 0.07, -0.12))
	for side in [-1.0, 1.0]:
		var shoulder: Node3D = Node3D.new()
		shoulder.position = Vector3(0.23 * side, 0.5, 0.0)
		_torso.add_child(shoulder)
		_part(shoulder, _capsule(0.065, 0.36), _mat_jacket, Vector3(0.0, -0.15, 0.0))
		var elbow: Node3D = Node3D.new()
		elbow.position = Vector3(0.0, -0.3, 0.0)
		shoulder.add_child(elbow)
		_part(elbow, _capsule(0.055, 0.32), _mat_jacket, Vector3(0.0, -0.14, 0.0))
		_part(elbow, _box(Vector3(0.09, 0.1, 0.1)), _mat_glove, Vector3(0.0, -0.3, 0.0))
		# Bastón: sale de la mano hacia abajo y atrás.
		var pole: CylinderMesh = CylinderMesh.new()
		pole.top_radius = 0.012
		pole.bottom_radius = 0.01
		pole.height = 1.15
		pole.radial_segments = 6
		_part(elbow, pole, _mat_pole, Vector3(0.0, -0.82, 0.12), Vector3(-12.0, 0.0, 0.0))
		var basket: CylinderMesh = CylinderMesh.new()
		basket.top_radius = 0.05
		basket.bottom_radius = 0.05
		basket.height = 0.01
		basket.radial_segments = 8
		_part(elbow, basket, _mat_glove, Vector3(0.0, -1.27, 0.21), Vector3(-12.0, 0.0, 0.0))
		_shoulders.append(shoulder)
		_elbows.append(elbow)


func _build_skis() -> void:
	_skis_root = Node3D.new()
	_skis_root.name = "Esquis"
	body.add_child(_skis_root)
	for side in [-1.0, 1.0]:
		var ski: Node3D = Node3D.new()
		ski.position = Vector3(0.12 * side, 0.03, 0.0)
		_skis_root.add_child(ski)
		_part(ski, _box(Vector3(0.09, 0.025, 1.7)), _mat_ski, Vector3(0.0, 0.0, 0.0))
		# Espátula levantada.
		_part(ski, _box(Vector3(0.09, 0.025, 0.16)), _mat_ski, Vector3(0.0, 0.035, -0.9), Vector3(28.0, 0.0, 0.0))
		_part(ski, _box(Vector3(0.1, 0.05, 0.22)), _mat_glove, Vector3(0.0, 0.035, 0.0))
		_skis.append(ski)


## Actualiza la postura. Todos los valores se suavizan internamente.
## lean: -1 (izquierda) .. 1 (derecha); crouch/tuck/arm_raise/grab: 0..1.
func update_pose(delta: float, lean: float, crouch: float, tuck: float, arm_raise: float,
		grab: float, edge: float) -> void:
	_time += delta
	var k: float = 1.0 - exp(-10.0 * delta)
	_lean = lerpf(_lean, lean, k)
	_crouch = lerpf(_crouch, crouch, k)
	_tuck = lerpf(_tuck, tuck, k)
	_arm_raise = lerpf(_arm_raise, arm_raise, k)
	_grab = lerpf(_grab, grab, 1.0 - exp(-14.0 * delta))
	_edge = lerpf(_edge, edge, k)

	if _tumbling:
		pivot.rotate(_tumble_axis, delta * 7.0)
		return

	# Piernas: el ángulo del muslo baja la cadera para que los pies sigan en
	# los esquís (cinemática inversa simplificada de dos segmentos).
	var bend: float = clampf(0.25 + _crouch * 0.6 + _tuck * 0.55 + _grab * 0.5, 0.0, 1.35)
	var hip_height: float = (THIGH_LENGTH + SHIN_LENGTH) * cos(bend) + FOOT_HEIGHT
	_hips.position.y = hip_height
	for i in 2:
		_thighs[i].rotation = Vector3(bend, 0.0, 0.0)
		_shins[i].rotation = Vector3(-bend * 2.0, 0.0, 0.0)

	# Inclinación lateral hacia el interior del giro.
	body.rotation = Vector3(0.0, 0.0, -_lean * 0.45)
	_skis_root.rotation = Vector3(0.0, 0.0, -_edge * 0.35)

	# Torso: más inclinado al agacharse o en posición de huevo.
	_torso.rotation = Vector3(-(0.18 + _crouch * 0.35 + _tuck * 0.75 + _grab * 0.4), 0.0, _lean * 0.15)
	_head.rotation = Vector3(0.18 + _tuck * 0.6, 0.0, 0.0)

	# Brazos: delante en posición normal, pegados en huevo, abiertos en el aire.
	var sway: float = sin(_time * 2.2) * 0.04
	for i in 2:
		var side: float = -1.0 if i == 0 else 1.0
		var forward: float = lerpf(0.55, 1.25, _tuck) + sway
		forward = lerpf(forward, 0.2, _arm_raise)
		var spread: float = lerpf(0.18, 0.05, _tuck) + _arm_raise * 0.9
		forward = lerpf(forward, 1.6, _grab)
		_shoulders[i].rotation = Vector3(forward, 0.0, spread * side)
		_elbows[i].rotation = Vector3(lerpf(0.5, 0.9, _tuck), 0.0, 0.0)


## Rotación de trucos aéreos alrededor del centro del cuerpo.
func set_trick_rotation(spin: float, flip: float) -> void:
	if _tumbling:
		return
	pivot.basis = Basis(Vector3.UP, spin) * Basis(Vector3.RIGHT, -flip)


func set_tumbling(enabled: bool) -> void:
	_tumbling = enabled
	if enabled:
		_tumble_axis = Vector3(randf_range(-1.0, 1.0), randf_range(-0.3, 0.3), randf_range(-1.0, 1.0)).normalized()
		if _tumble_axis.length() < 0.1:
			_tumble_axis = Vector3.RIGHT
	else:
		pivot.basis = Basis.IDENTITY
