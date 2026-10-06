extends SceneTree
## Herramienta de desarrollo (no hace falta usarla para jugar).
## Escribe en project.godot el mapa de acciones (teclado, ratón y mando).
## Uso desde una terminal, en la carpeta del proyecto:
##   godot --headless --script res://tools/generar_controles.gd

const ACTIONS: Dictionary = {
	"move_left": [["key", KEY_A], ["key", KEY_LEFT], ["axis", JOY_AXIS_LEFT_X, -1.0]],
	"move_right": [["key", KEY_D], ["key", KEY_RIGHT], ["axis", JOY_AXIS_LEFT_X, 1.0]],
	"move_forward": [["key", KEY_W], ["key", KEY_UP], ["axis", JOY_AXIS_LEFT_Y, -1.0]],
	"move_back": [["key", KEY_S], ["key", KEY_DOWN], ["axis", JOY_AXIS_LEFT_Y, 1.0]],
	"jump": [["key", KEY_SPACE], ["button", JOY_BUTTON_A]],
	"tuck": [["key", KEY_SHIFT], ["axis", JOY_AXIS_TRIGGER_RIGHT, 1.0]],
	"drift": [["key", KEY_CTRL], ["button", JOY_BUTTON_B]],
	"grab": [["key", KEY_E], ["mouse", MOUSE_BUTTON_LEFT], ["axis", JOY_AXIS_TRIGGER_LEFT, 1.0]],
	"camera_left": [["axis", JOY_AXIS_RIGHT_X, -1.0]],
	"camera_right": [["axis", JOY_AXIS_RIGHT_X, 1.0]],
	"camera_up": [["axis", JOY_AXIS_RIGHT_Y, -1.0]],
	"camera_down": [["axis", JOY_AXIS_RIGHT_Y, 1.0]],
	"respawn": [["key", KEY_R], ["button", JOY_BUTTON_BACK]],
	"pause": [["key", KEY_ESCAPE], ["button", JOY_BUTTON_START]],
	"toggle_help": [["key", KEY_F1], ["button", JOY_BUTTON_Y]],
	"switch_discipline": [["key", KEY_TAB], ["button", JOY_BUTTON_LEFT_SHOULDER]],
	"open_map": [["key", KEY_M], ["button", JOY_BUTTON_RIGHT_SHOULDER]],
	"photo_mode": [["key", KEY_P], ["button", JOY_BUTTON_X]],
}


func _init() -> void:
	for action_name in ACTIONS.keys():
		var events: Array = []
		for spec in ACTIONS[action_name]:
			var event: InputEvent = _make_event(spec)
			event.device = -1  # cualquier teclado o mando
			events.append(event)
		ProjectSettings.set_setting("input/" + str(action_name), {"deadzone": 0.25, "events": events})
	var err: Error = ProjectSettings.save()
	print("Controles guardados en project.godot: ", error_string(err))
	quit()


func _make_event(spec: Array) -> InputEvent:
	match spec[0]:
		"key":
			var key: InputEventKey = InputEventKey.new()
			key.physical_keycode = spec[1]
			return key
		"button":
			var button: InputEventJoypadButton = InputEventJoypadButton.new()
			button.button_index = spec[1]
			return button
		"axis":
			var motion: InputEventJoypadMotion = InputEventJoypadMotion.new()
			motion.axis = spec[1]
			motion.axis_value = spec[2]
			return motion
		"mouse":
			var mouse: InputEventMouseButton = InputEventMouseButton.new()
			mouse.button_index = spec[1]
			return mouse
	return null
