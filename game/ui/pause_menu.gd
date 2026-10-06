class_name PauseMenu
extends CanvasLayer
## Menú de pausa con ajustes básicos: calidad gráfica, volumen, sensibilidad
## del ratón, invertir eje vertical y contador de FPS. Funciona con el juego
## en pausa (process_mode = ALWAYS) y guarda los cambios al instante.

signal resumed()

var _panel: PanelContainer
var _quality: OptionButton
var _volume: HSlider
var _sensitivity: HSlider
var _invert: CheckBox
var _fps: CheckBox
var _stats: Label
var _resume_button: Button
var enabled: bool = false


func _ready() -> void:
	layer = 10
	process_mode = Node.PROCESS_MODE_ALWAYS
	var root: Control = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.theme = UITheme.create()
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)

	var dim: ColorRect = ColorRect.new()
	dim.color = Color(0.0, 0.02, 0.06, 0.55)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(dim)

	var center: CenterContainer = CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(center)
	_panel = PanelContainer.new()
	_panel.custom_minimum_size = Vector2(460.0, 0.0)
	center.add_child(_panel)
	var box: VBoxContainer = VBoxContainer.new()
	box.add_theme_constant_override("separation", 10)
	_panel.add_child(box)

	var title: Label = UITheme.make_label("PAUSA", 34)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(title)

	_resume_button = _button(box, "Continuar", _on_resume)
	_button(box, "Reaparecer en el último punto seguro", _on_respawn)

	box.add_child(HSeparator.new())
	box.add_child(UITheme.make_label("Calidad gráfica", 16, UITheme.TEXT_DIM))
	_quality = OptionButton.new()
	for q in GameState.QUALITY_NAMES:
		_quality.add_item(q)
	_quality.selected = GameState.quality
	_quality.item_selected.connect(_on_quality_selected)
	box.add_child(_quality)

	box.add_child(UITheme.make_label("Volumen general", 16, UITheme.TEXT_DIM))
	_volume = _slider(box, 0.0, 1.0, GameState.master_volume, _on_volume_changed)
	box.add_child(UITheme.make_label("Sensibilidad del ratón", 16, UITheme.TEXT_DIM))
	_sensitivity = _slider(box, 0.05, 1.0, GameState.mouse_sensitivity, _on_sensitivity_changed)

	_invert = CheckBox.new()
	_invert.text = "Invertir eje vertical de la cámara"
	_invert.button_pressed = GameState.invert_y
	_invert.toggled.connect(_on_invert_toggled)
	box.add_child(_invert)
	_fps = CheckBox.new()
	_fps.text = "Mostrar FPS"
	_fps.button_pressed = GameState.show_fps
	_fps.toggled.connect(_on_fps_toggled)
	box.add_child(_fps)

	box.add_child(HSeparator.new())
	_stats = UITheme.make_label("", 15, UITheme.TEXT_DIM)
	box.add_child(_stats)
	_button(box, "Guardar y salir", _on_quit)
	visible = false


func _button(parent: Control, text: String, callback: Callable) -> Button:
	var b: Button = Button.new()
	b.text = text
	b.pressed.connect(callback)
	parent.add_child(b)
	return b


func _slider(parent: Control, min_value: float, max_value: float, value: float, callback: Callable) -> HSlider:
	var s: HSlider = HSlider.new()
	s.min_value = min_value
	s.max_value = max_value
	s.step = 0.01
	s.value = value
	s.custom_minimum_size = Vector2(0.0, 24.0)
	s.value_changed.connect(callback)
	parent.add_child(s)
	return s


func _unhandled_input(event: InputEvent) -> void:
	if not enabled:
		return
	if event.is_action_pressed("pause"):
		if visible:
			_on_resume()
		else:
			open()
		get_viewport().set_input_as_handled()


func open() -> void:
	visible = true
	get_tree().paused = true
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	var minutes: int = int(GameState.play_time / 60.0)
	_stats.text = "Tiempo jugado: %d min  ·  Velocidad máx.: %d km/h  ·  Mejor truco: %d" % [
		minutes, roundi(GameState.best_speed_kmh), GameState.best_trick_points]
	_resume_button.grab_focus()


func _on_resume() -> void:
	visible = false
	get_tree().paused = false
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	SaveSystem.save_game()
	resumed.emit()


func _on_respawn() -> void:
	_on_resume()
	if GameState.player != null:
		GameState.player.respawn()


func _on_quality_selected(index: int) -> void:
	GameState.set_quality(index)
	SaveSystem.save_game()


func _on_volume_changed(value: float) -> void:
	GameState.master_volume = value
	EventBus.settings_changed.emit()


func _on_sensitivity_changed(value: float) -> void:
	GameState.mouse_sensitivity = value


func _on_invert_toggled(pressed: bool) -> void:
	GameState.invert_y = pressed


func _on_fps_toggled(pressed: bool) -> void:
	GameState.show_fps = pressed


func _on_quit() -> void:
	SaveSystem.save_game()
	AudioBus.shutdown()
	await get_tree().process_frame
	await get_tree().process_frame
	get_tree().quit()
