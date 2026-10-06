extends SceneTree
## Herramienta de desarrollo: hace capturas reales del juego (cumbre y bosque).
## Uso: SHOT_DIR=/carpeta godot --rendering-method gl_compatibility --script res://tests/captura_pantalla.gd
var _t := 0.0
var _shots := 0
var _ready_t := -1.0
func _initialize() -> void:
	change_scene_to_file("res://main.tscn")
func _process(delta: float) -> bool:
	_t += delta
	var state: Node = root.get_node_or_null("/root/GameState")
	if state == null or state.player == null or state.player.frozen:
		return _t > 60.0
	if _ready_t < 0.0:
		_ready_t = _t
	var since := _t - _ready_t
	if since > 1.0 and since < 2.5:
		Input.action_press("tuck")
	else:
		Input.action_release("tuck")
	if since > 3.0 and not has_meta("moved"):
		set_meta("moved", true)
		var smp = state.terrain.sampler
		var best := Vector3.ZERO
		var best_p := -1.0
		for i in range(-40, 41):
			for j in range(-40, 41):
				var x := 900.0 + i * 25.0
				var z := 900.0 + j * 25.0
				var h: float = smp.height_at(x, z)
				var sl: float = smp.slope_at(x, z)
				var pr: float = smp.tree_probability(h, sl, x, z)
				if pr > best_p and sl > 12.0 and sl < 22.0:
					best_p = pr
					best = Vector3(x, h + 1.0, z)
		print("bosque en ", best, " prob ", best_p)
		var dh: Vector3 = smp.downhill_at(best.x, best.z, 8.0)
		state.terrain.focus_position = best
		state.player.spawn(best, atan2(-dh.x, -dh.z))
	var times := [2.5, 9.0, 12.0]
	if _shots < times.size() and since > times[_shots]:
		var img := root.get_viewport().get_texture().get_image()
		var path := OS.get_environment("SHOT_DIR") + "/captura_%d.png" % _shots
		img.save_png(path)
		print("captura ", path, " fps=", Engine.get_frames_per_second())
		_shots += 1
	return _shots >= times.size()
