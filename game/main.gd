extends Node3D
## Escena principal. Monta el mundo entero por código para que no haga falta
## colocar nada a mano en el editor:
##   Atmósfera -> Terreno -> Jugador -> Cámara -> HUD -> Menú de pausa
## Espera a que el terreno bajo el punto de salida tenga colisión antes de
## soltar al jugador.

const MIN_LOAD_RATIO: float = 0.35
const MAX_LOAD_TIME: float = 25.0

var atmosphere: Atmosphere
var terrain: TerrainManager
var player: PlayerController
var camera_rig: CameraRig
var hud: HUD
var pause_menu: PauseMenu


func _ready() -> void:
	atmosphere = Atmosphere.new()
	atmosphere.name = "Atmosfera"
	add_child(atmosphere)

	terrain = TerrainManager.new()
	terrain.name = "Terreno"
	add_child(terrain)

	player = PlayerController.new()
	add_child(player)

	camera_rig = CameraRig.new()
	add_child(camera_rig)
	camera_rig.target = player

	hud = HUD.new()
	hud.name = "HUD"
	add_child(hud)

	pause_menu = PauseMenu.new()
	pause_menu.name = "MenuPausa"
	add_child(pause_menu)

	_start_game()


func _start_game() -> void:
	var spawn: Dictionary = terrain.find_spawn_point()
	var spawn_pos: Vector3 = spawn["position"]
	var spawn_yaw: float = spawn["yaw"]
	terrain.focus_position = spawn_pos
	player.global_position = spawn_pos
	player.heading = spawn_yaw
	camera_rig.snap_to_target()

	var waited: float = 0.0
	while waited < MAX_LOAD_TIME:
		var ratio: float = terrain.loaded_ratio()
		hud.set_loading_progress(ratio)
		if terrain.has_collision_at(spawn_pos) and ratio >= MIN_LOAD_RATIO:
			break
		await get_tree().process_frame
		waited += get_process_delta_time()

	player.spawn(spawn_pos, spawn_yaw)
	camera_rig.snap_to_target()
	hud.set_loading_progress(1.0)
	hud.hide_loading()
	pause_menu.enabled = true
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	EventBus.world_ready.emit()
	EventBus.hud_message.emit("Cumbre del Albor · %d m. ¡A por la bajada!" % roundi(spawn_pos.y), 4.0)


func _process(_delta: float) -> void:
	if player != null and not player.frozen:
		terrain.focus_position = player.global_position


func _unhandled_input(event: InputEvent) -> void:
	# Un clic vuelve a capturar el ratón si se había liberado (p. ej. con Alt+Tab).
	if event is InputEventMouseButton and event.pressed and not get_tree().paused and pause_menu.enabled:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
