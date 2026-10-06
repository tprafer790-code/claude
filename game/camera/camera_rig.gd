class_name CameraRig
extends Node3D
## Cámara en tercera persona.
## - Sigue al jugador con suavizado y se orienta hacia su dirección de avance.
## - Ratón / stick derecho orbitan; tras unos segundos vuelve detrás.
## - SpringArm3D acerca la cámara si hay terreno o árboles en medio.
## - El campo de visión y la distancia aumentan con la velocidad.

const BASE_PITCH: float = -0.3
const MIN_PITCH: float = -1.25
const MAX_PITCH: float = 0.45
const MANUAL_RETURN_DELAY: float = 2.0
const STICK_SPEED: float = 2.6

var target: PlayerController
var camera: Camera3D
var spring: SpringArm3D

var _yaw: float = 0.0
var _manual_yaw: float = 0.0
var _manual_pitch: float = 0.0
var _manual_timer: float = 0.0
var _fov: float = 72.0
var _shake_time: float = 0.0


func _ready() -> void:
	name = "CamaraRig"
	spring = SpringArm3D.new()
	spring.spring_length = 5.5
	spring.margin = 0.3
	spring.collision_mask = 1
	var probe: SphereShape3D = SphereShape3D.new()
	probe.radius = 0.25
	spring.shape = probe
	add_child(spring)
	camera = Camera3D.new()
	camera.near = 0.1
	camera.far = 16000.0
	camera.fov = _fov
	spring.add_child(camera)
	camera.current = true


func snap_to_target() -> void:
	if target == null:
		return
	global_position = target.global_position + Vector3(0.0, 1.5, 0.0)
	_yaw = target.heading
	rotation = Vector3(BASE_PITCH, _yaw, 0.0)
	spring.add_excluded_object(target.get_rid())


func _unhandled_input(event: InputEvent) -> void:
	if Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
		return
	var motion: InputEventMouseMotion = event as InputEventMouseMotion
	if motion == null:
		return
	var sens: float = GameState.mouse_sensitivity * 0.01
	var invert: float = -1.0 if GameState.invert_y else 1.0
	_manual_yaw -= motion.relative.x * sens
	_manual_pitch = clampf(_manual_pitch - motion.relative.y * sens * invert, MIN_PITCH - BASE_PITCH, MAX_PITCH - BASE_PITCH)
	_manual_timer = MANUAL_RETURN_DELAY


func _physics_process(delta: float) -> void:
	if target == null:
		return
	# Stick derecho del mando.
	var stick: Vector2 = Input.get_vector("camera_left", "camera_right", "camera_up", "camera_down")
	if stick.length() > 0.05:
		var invert: float = -1.0 if GameState.invert_y else 1.0
		_manual_yaw -= stick.x * STICK_SPEED * delta
		_manual_pitch = clampf(_manual_pitch - stick.y * STICK_SPEED * delta * invert, MIN_PITCH - BASE_PITCH, MAX_PITCH - BASE_PITCH)
		_manual_timer = MANUAL_RETURN_DELAY

	var target_pos: Vector3 = target.global_position + Vector3(0.0, 1.5, 0.0)
	global_position = global_position.lerp(target_pos, clampf(1.0 - exp(-20.0 * delta), 0.0, 1.0))

	var vel: Vector3 = target.velocity
	var horizontal_speed: float = Vector2(vel.x, vel.z).length()
	var desired_yaw: float = target.heading
	if horizontal_speed > 2.5:
		desired_yaw = atan2(-vel.x, -vel.z)
	_yaw = lerp_angle(_yaw, desired_yaw, clampf(1.0 - exp(-3.2 * delta), 0.0, 1.0))

	_manual_timer -= delta
	if _manual_timer <= 0.0:
		var back: float = clampf(1.0 - exp(-1.8 * delta), 0.0, 1.0)
		_manual_yaw = lerp_angle(_manual_yaw, 0.0, back)
		_manual_pitch = lerpf(_manual_pitch, 0.0, back)

	var speed: float = vel.length()
	var speed_t: float = clampf(speed / 40.0, 0.0, 1.0)
	rotation = Vector3(BASE_PITCH + _manual_pitch - speed_t * 0.06, _yaw + _manual_yaw, 0.0)
	spring.spring_length = lerpf(5.0, 7.0, speed_t)
	_fov = lerpf(_fov, lerpf(72.0, 88.0, speed_t), clampf(1.0 - exp(-4.0 * delta), 0.0, 1.0))
	camera.fov = _fov

	# Vibración ligera a alta velocidad.
	_shake_time += delta
	var shake: float = maxf(0.0, speed_t - 0.45) * 0.05
	camera.h_offset = sin(_shake_time * 37.0) * shake
	camera.v_offset = sin(_shake_time * 29.0 + 1.3) * shake
