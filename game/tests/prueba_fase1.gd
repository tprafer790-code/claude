extends SceneTree
## Prueba automática de la fase 1 (para desarrolladores).
## Uso: godot --headless --script res://tests/prueba_fase1.gd
## Carga el juego, simula controles y comprueba que el esquiador baja la
## montaña sin atravesar el suelo ni producir errores.

var _time: float = 0.0
var _log_timer: float = 0.0
var _started: bool = false
var _start_pos: Vector3
var _max_speed: float = 0.0
var _crashes: int = 0
var _tricks: Array[String] = []
var _below_ground: int = 0


func _initialize() -> void:
	change_scene_to_file("res://main.tscn")


func _process(delta: float) -> bool:
	_time += delta
	var state: Node = root.get_node_or_null("/root/GameState")
	if state == null:
		return false
	var player: Node = state.player
	if player == null or player.frozen:
		if _time > 40.0:
			print("FALLO: el jugador no se liberó en 40 s")
			return true
		return false
	if not _started:
		_started = true
		_start_pos = player.global_position
		print("Inicio en ", _start_pos, " tras %.1f s de carga" % _time)
		var bus: Node = root.get_node("/root/EventBus")
		bus.player_crashed.connect(func(r: String) -> void: _crashes += 1; print("  caída: ", r))
		bus.trick_landed.connect(func(n: String, p: int) -> void: _tricks.append("%s (%d)" % [n, p]))
		_time = 0.0
	_drive(player)
	_max_speed = maxf(_max_speed, player.speed_kmh)
	var ground: float = state.terrain.sampler.height_at(player.global_position.x, player.global_position.z)
	if player.global_position.y < ground - 1.0:
		_below_ground += 1
	_log_timer += delta
	if _log_timer >= 2.0:
		_log_timer = 0.0
		print("t=%4.1f  vel=%5.1f km/h  alt=%6.1f  pend=%4.1f°  %s  %s  chunks=%d" % [
			_time, player.speed_kmh, player.altitude, player.slope_deg,
			TerrainSampler.SURFACE_NAMES[player.surface_index], player.get_state_name(),
			state.terrain.get_child_count()])
	if _time > 45.0:
		print("RESUMEN: recorrido %.0f m, desnivel %.0f m, vel. máx %.0f km/h, caídas %d, bajo suelo %d fotogramas" % [
			Vector2(player.global_position.x - _start_pos.x, player.global_position.z - _start_pos.z).length(),
			_start_pos.y - player.global_position.y, _max_speed, _crashes, _below_ground])
		print("Trucos: ", _tricks)
		print("Puntos: ", state.total_points)
		return true
	return false


func _drive(player: Node) -> void:
	var t: float = _time
	var airborne: bool = player.get_state_name() == "En el aire"
	_press("tuck", t > 1.0 and t < 8.0)
	# Curvas alternas (solo en nieve) para comprobar el carving.
	var phase: float = fmod(t, 5.0)
	_press("move_left", not airborne and t > 8.0 and phase < 1.2)
	_press("move_right", not airborne and t > 8.0 and phase > 2.5 and phase < 3.7)
	# Salto cargado a los 20 s y a los 32 s; giro en el aire mantenido 0,45 s.
	_press("jump", (t > 19.4 and t < 20.0) or (t > 31.4 and t < 32.0))
	if airborne and ((t > 20.3 and t < 20.75) or (t > 32.3 and t < 32.75)):
		_press("move_left", true)
	# Cambios de calidad en caliente, pausa y reaparición.
	var state: Node = root.get_node("/root/GameState")
	if _once("calidad_alta", t > 34.0):
		state.set_quality(2)
	if _once("calidad_baja", t > 38.0):
		state.set_quality(0)
	if _once("pausa", t > 40.0):
		var menu: Node = root.get_node("Main/MenuPausa")
		menu.open()
		print("  pausa abierta: ", paused)
		menu._on_resume()
		print("  pausa cerrada: ", not paused)
	if _once("reaparecer", t > 42.0):
		player.respawn()
		print("  reaparición en ", player.global_position)


func _once(key: String, condition: bool) -> bool:
	if condition and not has_meta(key):
		set_meta(key, true)
		return true
	return false


func _press(action: String, pressed: bool) -> void:
	if pressed and not Input.is_action_pressed(action):
		Input.action_press(action)
	elif not pressed and Input.is_action_pressed(action):
		Input.action_release(action)
