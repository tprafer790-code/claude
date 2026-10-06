extends Node
## Estado global de la partida: ajustes, calidad gráfica, progresión y
## referencias a los sistemas principales del mundo.

enum Quality { LOW, MEDIUM, HIGH }

const QUALITY_NAMES: Array[String] = ["Bajo", "Medio", "Alto"]

## Ajustes por nivel de calidad. Todos los sistemas leen de aquí.
## - view_radius: anillos de chunks de terreno visibles alrededor del jugador.
## - tree_radius: anillos de chunks que llevan vegetación.
## - tree_density: multiplicador de densidad de árboles.
const QUALITY_PRESETS: Dictionary = {
	Quality.LOW: {
		"view_radius": 4,
		"tree_radius": 2,
		"tree_density": 0.45,
		"shadow_distance": 140.0,
		"shadows_soft": false,
		"msaa": Viewport.MSAA_DISABLED,
		"fxaa": true,
		"glow": false,
		"ssao": false,
		"volumetric_fog": false,
		"particles": 0.4,
		"max_tasks": 2,
	},
	Quality.MEDIUM: {
		"view_radius": 6,
		"tree_radius": 3,
		"tree_density": 0.75,
		"shadow_distance": 260.0,
		"shadows_soft": true,
		"msaa": Viewport.MSAA_2X,
		"fxaa": false,
		"glow": true,
		"ssao": false,
		"volumetric_fog": false,
		"particles": 0.75,
		"max_tasks": 3,
	},
	Quality.HIGH: {
		"view_radius": 8,
		"tree_radius": 4,
		"tree_density": 1.0,
		"shadow_distance": 420.0,
		"shadows_soft": true,
		"msaa": Viewport.MSAA_4X,
		"fxaa": false,
		"glow": true,
		"ssao": true,
		"volumetric_fog": true,
		"particles": 1.0,
		"max_tasks": 4,
	},
}

## Semilla del mundo: el mismo valor genera siempre la misma montaña.
const WORLD_SEED: int = 20261006

# --- Ajustes (se guardan en disco) ---
var quality: int = Quality.MEDIUM
var master_volume: float = 0.8
var mouse_sensitivity: float = 0.25
var invert_y: bool = false
var show_fps: bool = false

# --- Progresión (se guarda en disco) ---
var total_points: int = 0
var best_trick_points: int = 0
var best_speed_kmh: float = 0.0
var play_time: float = 0.0

# --- Referencias de ejecución (no se guardan) ---
var terrain: TerrainManager = null
var player: PlayerController = null


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS


func _process(delta: float) -> void:
	if not get_tree().paused:
		play_time += delta


func get_preset() -> Dictionary:
	return QUALITY_PRESETS[quality]


func set_quality(level: int) -> void:
	quality = clampi(level, Quality.LOW, Quality.HIGH)
	apply_viewport_quality()
	EventBus.quality_changed.emit(quality)


func apply_viewport_quality() -> void:
	var preset: Dictionary = get_preset()
	var viewport: Viewport = get_viewport()
	if viewport == null:
		return
	viewport.msaa_3d = preset["msaa"]
	if preset["fxaa"]:
		viewport.screen_space_aa = Viewport.SCREEN_SPACE_AA_FXAA
	else:
		viewport.screen_space_aa = Viewport.SCREEN_SPACE_AA_DISABLED


func add_points(points: int) -> void:
	total_points += points
	best_trick_points = maxi(best_trick_points, points)
	EventBus.score_changed.emit(total_points)


func register_speed(speed_kmh: float) -> void:
	if speed_kmh > best_speed_kmh:
		best_speed_kmh = speed_kmh
