class_name SkiDiscipline
extends Discipline
## Física y control del esquí.
##
## Modelo físico (sobre CharacterBody3D, por pasos en cada fotograma):
##  1. La gravedad se proyecta sobre el plano de la pendiente.
##  2. Agarre de cantos: la velocidad lateral respecto a los esquís se elimina
##     exponencialmente; una parte se reconvierte en velocidad hacia delante
##     ("carving"). Con derrape, el agarre cae y la energía se pierde (frena).
##  3. Rozamiento de Coulomb (mu · N) según el tipo de nieve.
##  4. Resistencia aerodinámica cuadrática (menor en posición de huevo).
##  5. En el aire: gravedad, arrastre y rotaciones de truco; al aterrizar se
##     comprueba la alineación del cuerpo y la violencia del impacto.
##
## Máquina de estados: SKIING (en nieve) -> AIRBORNE (en el aire) -> CRASHED
## (caída) -> reaparición.

enum State { SKIING, AIRBORNE, CRASHED }

const STATE_NAMES: Array[String] = ["Esquiando", "En el aire", "Caída"]

const GRAVITY: float = 9.81
const FLOOR_SNAP: float = 0.7
const TURN_RATE_SLOW: float = 2.5
const TURN_RATE_FAST: float = 1.2
const DRIFT_TURN_BONUS: float = 1.55
const DRAG_STAND: float = 0.0085
const DRAG_TUCK: float = 0.0048
const AIR_DRAG: float = 0.004
const POLE_PUSH_ACCEL: float = 4.5
const POLE_PUSH_MAX_SPEED: float = 6.5
const SNOWPLOW_FRICTION: float = 0.32
const JUMP_BASE: float = 3.8
const JUMP_CHARGE_BONUS: float = 3.4
const JUMP_CHARGE_TIME: float = 0.6
const SPIN_RATE: float = 6.8
const FLIP_RATE: float = 5.2
const LAND_TOLERANCE: float = 0.8
const HARD_LANDING_SPEED: float = 20.0
const WALL_IMPACT_SPEED: float = 11.0
const MIN_TRICK_AIRTIME: float = 0.45
const CRASH_DURATION: float = 2.6
const UNGROUNDED_GRACE: float = 0.12
const TRICK_START_DELAY: float = 0.22
const AUTO_ALIGN_SPIN: float = 3.0
const AUTO_ALIGN_FLIP: float = 2.2

# Parámetros por superficie: polvo, compactada, hielo, roca.
const SURF_FRICTION: Vector4 = Vector4(0.065, 0.032, 0.012, 0.5)
const SURF_GRIP: Vector4 = Vector4(5.0, 8.5, 2.3, 3.0)
const SURF_CARVE: Vector4 = Vector4(0.85, 0.94, 0.7, 0.35)
const SURF_EXTRA_DRAG: Vector4 = Vector4(0.0028, 0.0, 0.0, 0.002)

var state: int = State.SKIING

var _air_time: float = 0.0
var _ungrounded_time: float = 0.0
var _spin: float = 0.0
var _flip: float = 0.0
var _grab_time: float = 0.0
var _jump_charge: float = 0.0
var _snap_block: float = 0.0
var _crash_timer: float = 0.0
var _lean: float = 0.0
var _tuck: float = 0.0
var _crouch: float = 0.2
var _last_velocity: Vector3 = Vector3.ZERO


func _init(owner_player: PlayerController) -> void:
	super(owner_player)
	display_name = "Esquí"


func enter() -> void:
	player.floor_snap_length = FLOOR_SNAP
	state = State.SKIING if player.is_on_floor() else State.AIRBORNE
	player.model.set_tumbling(false)


func reset() -> void:
	state = State.SKIING
	_air_time = 0.0
	_ungrounded_time = 0.0
	_spin = 0.0
	_flip = 0.0
	_grab_time = 0.0
	_jump_charge = 0.0
	_snap_block = 0.0
	_crash_timer = 0.0
	player.floor_snap_length = FLOOR_SNAP
	player.model.set_tumbling(false)
	player.model.set_trick_rotation(0.0, 0.0)


func get_state_name() -> String:
	return STATE_NAMES[state]


func physics_update(delta: float) -> void:
	match state:
		State.SKIING:
			_update_skiing(delta)
		State.AIRBORNE:
			_update_air(delta)
		State.CRASHED:
			_update_crashed(delta)
	_last_velocity = player.velocity


# ---------------------------------------------------------------- En nieve --

func _update_skiing(delta: float) -> void:
	var steer: float = Input.get_axis("move_right", "move_left")
	var push: float = Input.get_action_strength("move_forward")
	var brake: float = Input.get_action_strength("move_back")
	var tuck: float = Input.get_action_strength("tuck")
	var drift: bool = Input.is_action_pressed("drift")

	var n: Vector3 = player.get_floor_normal() if player.is_on_floor() else player.ground_normal
	var w: Color = player.update_surface(n)
	var wv: Vector4 = Vector4(w.r, w.g, w.b, w.a)
	var mu: float = wv.dot(SURF_FRICTION)
	var grip: float = wv.dot(SURF_GRIP)
	var carve_eff: float = wv.dot(SURF_CARVE)
	var extra_drag: float = wv.dot(SURF_EXTRA_DRAG)

	var speed: float = player.velocity.length()
	var turn_rate: float = lerpf(TURN_RATE_SLOW, TURN_RATE_FAST, clampf(speed / 35.0, 0.0, 1.0))
	if drift:
		turn_rate *= DRIFT_TURN_BONUS
		grip *= 0.22
		carve_eff *= 0.3
	if brake > 0.0:
		mu += SNOWPLOW_FRICTION * brake
		tuck = 0.0
	player.heading = wrapf(player.heading + steer * turn_rate * delta, -PI, PI)

	var facing: Vector3 = player.get_facing()
	var fwd: Vector3 = (facing - n * facing.dot(n)).normalized()
	var right: Vector3 = fwd.cross(n).normalized()

	var v: Vector3 = player.velocity
	v -= n * v.dot(n)
	var g: Vector3 = Vector3.DOWN * GRAVITY
	v += (g - n * g.dot(n)) * delta

	# Agarre de cantos: la dirección de la velocidad gira hacia la de los esquís.
	# El módulo nunca aumenta; se pierde una parte proporcional al ángulo de
	# deslizamiento lateral y a la ineficacia del canto (derrape = frenada).
	var v_fwd: float = v.dot(fwd)
	var dir_sign: float = 1.0 if v_fwd >= 0.0 else -1.0
	var plane_speed: float = v.length()
	if plane_speed > 0.01:
		var dir_v: Vector3 = v / plane_speed
		var k: float = 1.0 - exp(-grip * delta)
		var slip: float = absf(dir_v.dot(right))
		var new_dir: Vector3 = dir_v.lerp(fwd * dir_sign, k).normalized()
		var loss: float = slip * k * (1.0 - carve_eff)
		v = new_dir * plane_speed * (1.0 - loss)
		v_fwd = v.dot(fwd)

	# Impulso con bastones a baja velocidad.
	if push > 0.0 and v_fwd < POLE_PUSH_MAX_SPEED:
		v += fwd * POLE_PUSH_ACCEL * push * delta

	# Rozamiento y resistencia del aire.
	var normal_force: float = GRAVITY * maxf(n.y, 0.2)
	var sp: float = v.length()
	if sp > 0.0001:
		var friction: float = minf(mu * normal_force * delta, sp)
		v -= v / sp * friction
		sp = v.length()
		var drag: float = lerpf(DRAG_STAND, DRAG_TUCK, tuck) + extra_drag
		v -= v * minf(drag * sp * delta, 0.5)
	if v.length() < 0.15 and push <= 0.0 and n.y > 0.97:
		v = Vector3.ZERO

	# Salto (mantener para cargar, soltar para saltar).
	var jumped: bool = false
	if Input.is_action_pressed("jump"):
		_jump_charge = minf(_jump_charge + delta, JUMP_CHARGE_TIME)
	if Input.is_action_just_released("jump"):
		var power: float = JUMP_BASE + JUMP_CHARGE_BONUS * (_jump_charge / JUMP_CHARGE_TIME)
		v += (n * 0.6 + Vector3.UP * 0.4).normalized() * power
		_jump_charge = 0.0
		jumped = true

	player.velocity = v
	if jumped:
		_snap_block = 0.25
		player.floor_snap_length = 0.0
		_enter_air(0.0)
		player.move_and_slide()
		return

	player.floor_snap_length = FLOOR_SNAP
	var before: Vector3 = player.velocity
	player.move_and_slide()
	if _check_wall_impact(before):
		return

	if player.is_on_floor():
		_ungrounded_time = 0.0
		player.ground_normal = player.get_floor_normal()
		_restore_slope_velocity(before)
	else:
		_ungrounded_time += delta
		if _ungrounded_time > UNGROUNDED_GRACE:
			_enter_air(_ungrounded_time)
			return

	# Animación.
	var carve_amount: float = clampf(absf(steer) * clampf(speed / 12.0, 0.0, 1.0), 0.0, 1.0)
	_lean = -steer * carve_amount
	_tuck = tuck
	_crouch = 0.15 + absf(steer) * 0.25 + (_jump_charge / JUMP_CHARGE_TIME) * 0.6 + brake * 0.2
	player.model.update_pose(delta, _lean, _crouch, _tuck, 0.0, 0.0, _lean)
	player.model.set_trick_rotation(0.0, 0.0)
	player.align_model(n, delta, 12.0)
	player.set_trail_emitting(speed > 4.0, speed, drift or brake > 0.3)

	# Audio.
	AudioBus.slide_intensity = clampf(speed / 22.0, 0.0, 1.0) * (1.25 if drift or brake > 0.0 else 0.85)
	AudioBus.slide_roughness = clampf(w.r + w.a, 0.0, 1.0)


# ---------------------------------------------------------------- En el aire --

func _enter_air(initial_time: float) -> void:
	state = State.AIRBORNE
	_air_time = initial_time
	_spin = 0.0
	_flip = 0.0
	_grab_time = 0.0
	player.set_trail_emitting(false, 0.0, false)
	AudioBus.slide_intensity = 0.0


func _update_air(delta: float) -> void:
	var steer: float = Input.get_axis("move_right", "move_left")
	var pitch_input: float = Input.get_axis("move_back", "move_forward")
	var grabbing: bool = Input.is_action_pressed("grab")

	_air_time += delta
	# Los trucos solo se pueden iniciar tras un instante en el aire, para que
	# girar al pasar por un bache no provoque una rotación accidental.
	if _air_time > TRICK_START_DELAY:
		_spin += steer * SPIN_RATE * delta
		_flip += pitch_input * FLIP_RATE * delta
	# Autoalineación: sin pulsar nada, el cuerpo busca la postura de aterrizaje
	# más cercana (media vuelta completa o mortal completo).
	if absf(steer) < 0.1:
		_spin = move_toward(_spin, roundf(_spin / PI) * PI, AUTO_ALIGN_SPIN * delta)
	if absf(pitch_input) < 0.1:
		_flip = move_toward(_flip, roundf(_flip / TAU) * TAU, AUTO_ALIGN_FLIP * delta)
	if grabbing:
		_grab_time += delta

	var v: Vector3 = player.velocity
	v.y -= GRAVITY * delta
	v -= v * minf(AIR_DRAG * v.length() * delta, 0.5)
	player.velocity = v

	_snap_block -= delta
	player.floor_snap_length = 0.0 if _snap_block > 0.0 else 0.3
	var before: Vector3 = player.velocity
	player.move_and_slide()
	if _check_wall_impact(before):
		return

	player.model.update_pose(delta, 0.0, 0.25, 0.0, 1.0 - (1.0 if grabbing else 0.0), 1.0 if grabbing else 0.0, 0.0)
	player.model.set_trick_rotation(_spin, _flip)
	player.align_model(Vector3.UP, delta, 3.0)

	if player.is_on_floor() and _snap_block <= 0.0:
		_land(before)


func _land(impact_velocity: Vector3) -> void:
	var n: Vector3 = player.get_floor_normal()
	player.ground_normal = n
	var impact_speed: float = -impact_velocity.dot(n)
	var spin_rest: float = wrapf(_spin, -PI, PI)
	var switch_landing: bool = absf(spin_rest) > PI * 0.5
	var spin_error: float = (PI - absf(spin_rest)) if switch_landing else absf(spin_rest)
	var flip_error: float = absf(wrapf(_flip, -PI, PI))
	var still_grabbing: bool = Input.is_action_pressed("grab") and _grab_time > 0.0

	if impact_speed > HARD_LANDING_SPEED:
		crash("Aterrizaje demasiado duro")
		return
	if spin_error > LAND_TOLERANCE or flip_error > LAND_TOLERANCE:
		crash("Aterrizaje desequilibrado")
		return
	if still_grabbing and _air_time > MIN_TRICK_AIRTIME:
		crash("Aterrizaje sin soltar el grab")
		return

	# Aterrizaje limpio: el rumbo absorbe las medias vueltas completadas.
	player.heading = wrapf(player.heading + roundf(_spin / PI) * PI, -PI, PI)
	# Se conserva la componente de la velocidad paralela a la pendiente de
	# aterrizaje (aterrizar en cuesta abajo mantiene la inercia).
	player.velocity = impact_velocity - n * impact_velocity.dot(n)
	state = State.SKIING
	_ungrounded_time = 0.0
	player.model.set_trick_rotation(0.0, 0.0)
	_score_trick(switch_landing)
	if impact_speed > 9.0:
		AudioBus.play_impact(clampf(impact_speed / HARD_LANDING_SPEED, 0.2, 0.7))


func _score_trick(switch_landing: bool) -> void:
	if _air_time < MIN_TRICK_AIRTIME:
		return
	var halves: int = int(roundf(absf(_spin) / PI))
	var flips: int = int(roundf(absf(_flip) / TAU))
	var parts: Array[String] = []
	var points: int = int(_air_time * 40.0)
	if halves > 0:
		parts.append("Giro %d" % (halves * 180))
		points += halves * 150
	if flips > 0:
		var flip_name: String = "Mortal adelante" if _flip > 0.0 else "Mortal atrás"
		if flips > 1:
			flip_name += " x%d" % flips
		parts.append(flip_name)
		points += flips * 500
	if _grab_time > 0.25:
		parts.append("Grab")
		points += 80 + int(_grab_time * 120.0)
	if switch_landing:
		parts.append("Switch")
		points = int(float(points) * 1.2)
	var trick_name: String = " + ".join(parts) if not parts.is_empty() else "Salto"
	if parts.is_empty() and _air_time < 1.0:
		# Saltitos sin truco: solo suman, sin mensaje.
		GameState.add_points(points)
		return
	EventBus.trick_landed.emit(trick_name, points)
	GameState.add_points(points)
	AudioBus.play_chime(1.0 + minf(float(points) / 2000.0, 0.5))


# ------------------------------------------------------------------- Caída --

func crash(reason: String) -> void:
	if state == State.CRASHED:
		return
	state = State.CRASHED
	_crash_timer = CRASH_DURATION
	player.model.set_tumbling(true)
	player.set_trail_emitting(false, 0.0, false)
	player.floor_snap_length = 0.3
	AudioBus.slide_intensity = 0.0
	AudioBus.play_impact(1.0)
	EventBus.player_crashed.emit(reason)


func _update_crashed(delta: float) -> void:
	var v: Vector3 = player.velocity
	v.y -= GRAVITY * delta
	if player.is_on_floor():
		var horizontal: Vector3 = Vector3(v.x, 0.0, v.z) * exp(-2.2 * delta)
		v = Vector3(horizontal.x, v.y, horizontal.z)
	player.velocity = v
	player.move_and_slide()
	player.model.update_pose(delta, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0)
	_crash_timer -= delta
	if _crash_timer <= 0.0:
		player.respawn()


## move_and_slide() anula la componente vertical de la velocidad al tocar suelo
## (pensado para personajes que caminan). En una ladera eso frenaría al
## esquiador en cada fotograma, así que se recupera la velocidad calculada y
## se reproyecta sobre el plano del suelo nuevo, conservando su módulo.
## Si hubo roce con una pared, se parte de la velocidad ya deslizada.
func _restore_slope_velocity(computed: Vector3) -> void:
	var n: Vector3 = player.get_floor_normal()
	var base: Vector3 = player.velocity if player.is_on_wall() else computed
	var speed: float = base.length() if not player.is_on_wall() else player.velocity.length()
	var tangent: Vector3 = base - n * base.dot(n)
	if tangent.length_squared() > 0.000001:
		player.velocity = tangent.normalized() * speed


## Detecta choques contra paredes, rocas verticales o árboles.
func _check_wall_impact(velocity_before: Vector3) -> bool:
	for i in player.get_slide_collision_count():
		var collision: KinematicCollision3D = player.get_slide_collision(i)
		var normal: Vector3 = collision.get_normal()
		if normal.y > 0.55:
			continue
		var impact: float = -velocity_before.dot(normal)
		if impact > WALL_IMPACT_SPEED:
			var collider: Object = collision.get_collider()
			var what: String = "la roca"
			if collider != null and collider.has_meta("obstacle"):
				what = "un " + str(collider.get_meta("obstacle"))
			crash("Choque contra %s" % what)
			return true
	return false
