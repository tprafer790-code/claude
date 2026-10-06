class_name HUD
extends CanvasLayer
## Interfaz durante el juego: velocidad, altitud, pendiente, tipo de nieve,
## brújula, puntos, avisos de trucos y caídas, ayuda de controles y pantalla
## de carga. Se construye entera por código.

var _root: Control
var _speed_label: Label
var _speed_unit: Label
var _altitude_label: Label
var _slope_label: Label
var _surface_label: Label
var _state_label: Label
var _points_label: Label
var _trick_label: Label
var _message_label: Label
var _fps_label: Label
var _help_panel: PanelContainer
var _compass: Compass
var _loading: ColorRect
var _loading_label: Label
var _loading_bar: ProgressBar
var _trick_tween: Tween
var _message_tween: Tween


func _ready() -> void:
	layer = 5
	_root = Control.new()
	_root.name = "HUDRaiz"
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.theme = UITheme.create()
	add_child(_root)
	_build_speed_panel()
	_build_compass()
	_build_points()
	_build_center_labels()
	_build_help()
	_build_loading()
	EventBus.trick_landed.connect(_on_trick_landed)
	EventBus.player_crashed.connect(_on_player_crashed)
	EventBus.score_changed.connect(_on_score_changed)
	EventBus.hud_message.connect(show_message)
	_on_score_changed(GameState.total_points)


func _build_speed_panel() -> void:
	var panel: PanelContainer = PanelContainer.new()
	panel.position = Vector2(20.0, 20.0)
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(panel)
	var box: VBoxContainer = VBoxContainer.new()
	box.add_theme_constant_override("separation", 2)
	panel.add_child(box)
	var row: HBoxContainer = HBoxContainer.new()
	box.add_child(row)
	_speed_label = UITheme.make_label("0", 46)
	row.add_child(_speed_label)
	_speed_unit = UITheme.make_label(" km/h", 20, UITheme.TEXT_DIM)
	_speed_unit.size_flags_vertical = Control.SIZE_SHRINK_END
	row.add_child(_speed_unit)
	_altitude_label = UITheme.make_label("Altitud: -", 17)
	box.add_child(_altitude_label)
	_slope_label = UITheme.make_label("Pendiente: -", 17)
	box.add_child(_slope_label)
	_surface_label = UITheme.make_label("Nieve: -", 17, UITheme.TEXT_DIM)
	box.add_child(_surface_label)
	_state_label = UITheme.make_label("", 15, UITheme.ACCENT)
	box.add_child(_state_label)


func _build_compass() -> void:
	_compass = Compass.new()
	_compass.set_anchors_preset(Control.PRESET_CENTER_TOP)
	_compass.position = Vector2(-210.0, 16.0)
	_compass.size = Vector2(420.0, 44.0)
	_root.add_child(_compass)


func _build_points() -> void:
	var panel: PanelContainer = PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	panel.position = Vector2(-240.0, 20.0)
	panel.custom_minimum_size = Vector2(220.0, 0.0)
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(panel)
	var box: VBoxContainer = VBoxContainer.new()
	panel.add_child(box)
	box.add_child(UITheme.make_label("PUNTOS", 14, UITheme.TEXT_DIM))
	_points_label = UITheme.make_label("0", 30)
	box.add_child(_points_label)
	_fps_label = UITheme.make_label("", 13, UITheme.TEXT_DIM)
	box.add_child(_fps_label)


func _build_center_labels() -> void:
	_trick_label = UITheme.make_label("", 34, UITheme.ACCENT)
	_trick_label.set_anchors_preset(Control.PRESET_CENTER)
	_trick_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_trick_label.position = Vector2(-400.0, -170.0)
	_trick_label.size = Vector2(800.0, 90.0)
	_trick_label.modulate.a = 0.0
	_root.add_child(_trick_label)

	_message_label = UITheme.make_label("", 26)
	_message_label.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	_message_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_message_label.position = Vector2(-400.0, -200.0)
	_message_label.size = Vector2(800.0, 50.0)
	_message_label.modulate.a = 0.0
	_root.add_child(_message_label)


func _build_help() -> void:
	_help_panel = PanelContainer.new()
	_help_panel.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	_help_panel.position = Vector2(20.0, -300.0)
	_help_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(_help_panel)
	var text: String = "\n".join([
		"CONTROLES  (F1 ocultar)",
		"A / D  o  ← →  ·  girar  ·  en el aire: giro",
		"W  ·  impulso con bastones  ·  en el aire: mortal adelante",
		"S  ·  cuña (frenar)  ·  en el aire: mortal atrás",
		"Mayús  ·  posición de huevo (más velocidad)",
		"Ctrl  ·  derrape",
		"Espacio  ·  mantener y soltar para saltar",
		"E  ·  grab en el aire (suéltalo antes de aterrizar)",
		"R  ·  reaparecer   ·   Esc  ·  pausa y ajustes",
		"Ratón  ·  mirar alrededor",
	])
	var label: Label = UITheme.make_label(text, 15)
	_help_panel.add_child(label)
	EventBus.world_ready.connect(_on_world_ready)


func _build_loading() -> void:
	_loading = ColorRect.new()
	_loading.color = Color(0.03, 0.06, 0.11, 1.0)
	_loading.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.add_child(_loading)
	var center: CenterContainer = CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	_loading.add_child(center)
	var box: VBoxContainer = VBoxContainer.new()
	box.add_theme_constant_override("separation", 14)
	center.add_child(box)
	var title: Label = UITheme.make_label("VERTIENTE", 64, UITheme.TEXT)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(title)
	var subtitle: Label = UITheme.make_label("Macizo del Albor", 24, UITheme.ACCENT)
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(subtitle)
	_loading_label = UITheme.make_label("Generando la montaña…", 18, UITheme.TEXT_DIM)
	_loading_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(_loading_label)
	_loading_bar = ProgressBar.new()
	_loading_bar.custom_minimum_size = Vector2(420.0, 14.0)
	_loading_bar.show_percentage = false
	_loading_bar.max_value = 1.0
	box.add_child(_loading_bar)


func _on_world_ready() -> void:
	# La ayuda se muestra al empezar y se oculta sola; F1 la vuelve a mostrar.
	var tween: Tween = create_tween()
	tween.tween_interval(20.0)
	tween.tween_callback(func() -> void: _help_panel.visible = false)


func set_loading_progress(value: float) -> void:
	_loading_bar.value = value


func hide_loading() -> void:
	var tween: Tween = create_tween()
	tween.tween_property(_loading, "modulate:a", 0.0, 0.8)
	tween.tween_callback(_loading.hide)


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("toggle_help"):
		_help_panel.visible = not _help_panel.visible


func _process(_delta: float) -> void:
	var player: PlayerController = GameState.player
	if player == null:
		return
	_speed_label.text = "%d" % roundi(player.speed_kmh)
	_altitude_label.text = "Altitud: %d m" % roundi(player.altitude)
	_slope_label.text = "Pendiente: %d°" % roundi(player.slope_deg)
	_surface_label.text = "Nieve: %s" % TerrainSampler.SURFACE_NAMES[player.surface_index]
	_state_label.text = "%s · %s" % [player.discipline.display_name, player.get_state_name()]
	var camera: Camera3D = get_viewport().get_camera_3d()
	if camera != null:
		var fwd: Vector3 = -camera.global_transform.basis.z
		_compass.heading = atan2(-fwd.x, -fwd.z)
	_fps_label.visible = GameState.show_fps
	if GameState.show_fps:
		_fps_label.text = "%d FPS" % Engine.get_frames_per_second()


func _on_score_changed(total: int) -> void:
	_points_label.text = "%d" % total


func _on_trick_landed(trick_name: String, points: int) -> void:
	_trick_label.text = "%s\n+%d" % [trick_name, points]
	if _trick_tween != null and _trick_tween.is_valid():
		_trick_tween.kill()
	_trick_label.modulate.a = 1.0
	_trick_label.scale = Vector2(1.0, 1.0)
	_trick_tween = create_tween()
	_trick_tween.tween_interval(1.4)
	_trick_tween.tween_property(_trick_label, "modulate:a", 0.0, 0.6)


func _on_player_crashed(reason: String) -> void:
	show_message("¡Caída! %s" % reason, 2.2)


func show_message(text: String, duration: float) -> void:
	_message_label.text = text
	if _message_tween != null and _message_tween.is_valid():
		_message_tween.kill()
	_message_label.modulate.a = 1.0
	_message_tween = create_tween()
	_message_tween.tween_interval(duration)
	_message_tween.tween_property(_message_label, "modulate:a", 0.0, 0.5)
