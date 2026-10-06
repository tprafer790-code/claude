extends Node
## Guardado automático en formato JSON dentro de user://
## En Windows la ruta real es %APPDATA%/Godot/app_userdata/Vertiente - Macizo del Albor/

const SAVE_PATH: String = "user://vertiente_guardado.json"
const SAVE_VERSION: int = 1
const AUTOSAVE_INTERVAL: float = 60.0

var _autosave_timer: float = 0.0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	load_game()
	GameState.apply_viewport_quality()


func _process(delta: float) -> void:
	_autosave_timer += delta
	if _autosave_timer >= AUTOSAVE_INTERVAL:
		_autosave_timer = 0.0
		save_game()


func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		save_game()
		AudioBus.shutdown()


func save_game() -> bool:
	var data: Dictionary = {
		"version": SAVE_VERSION,
		"settings": {
			"quality": GameState.quality,
			"master_volume": GameState.master_volume,
			"mouse_sensitivity": GameState.mouse_sensitivity,
			"invert_y": GameState.invert_y,
			"show_fps": GameState.show_fps,
		},
		"progress": {
			"total_points": GameState.total_points,
			"best_trick_points": GameState.best_trick_points,
			"best_speed_kmh": GameState.best_speed_kmh,
			"play_time": GameState.play_time,
		},
	}
	var file: FileAccess = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		push_warning("No se pudo guardar la partida: %s" % error_string(FileAccess.get_open_error()))
		return false
	file.store_string(JSON.stringify(data, "\t"))
	file.close()
	return true


func load_game() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var text: String = FileAccess.get_file_as_string(SAVE_PATH)
	var parsed: Variant = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		push_warning("Archivo de guardado dañado; se usarán valores por defecto.")
		return
	var data: Dictionary = parsed
	var settings: Dictionary = _get_dict(data, "settings")
	var progress: Dictionary = _get_dict(data, "progress")
	GameState.quality = clampi(int(settings.get("quality", GameState.quality)), 0, 2)
	GameState.master_volume = clampf(float(settings.get("master_volume", GameState.master_volume)), 0.0, 1.0)
	GameState.mouse_sensitivity = clampf(float(settings.get("mouse_sensitivity", GameState.mouse_sensitivity)), 0.05, 1.0)
	GameState.invert_y = bool(settings.get("invert_y", GameState.invert_y))
	GameState.show_fps = bool(settings.get("show_fps", GameState.show_fps))
	GameState.total_points = int(progress.get("total_points", 0))
	GameState.best_trick_points = int(progress.get("best_trick_points", 0))
	GameState.best_speed_kmh = float(progress.get("best_speed_kmh", 0.0))
	GameState.play_time = float(progress.get("play_time", 0.0))


func _get_dict(source: Dictionary, key: String) -> Dictionary:
	var value: Variant = source.get(key, {})
	if typeof(value) == TYPE_DICTIONARY:
		return value
	return {}
