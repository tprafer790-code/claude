class_name UITheme
extends RefCounted
## Tema visual común de la interfaz: paneles azul noche translúcidos,
## texto blanco nieve y acento naranja (color de la chaqueta del corredor).

const ACCENT: Color = Color(0.95, 0.45, 0.18)
const TEXT: Color = Color(0.95, 0.97, 1.0)
const TEXT_DIM: Color = Color(0.72, 0.79, 0.88)
const PANEL_BG: Color = Color(0.04, 0.07, 0.12, 0.72)


static func create() -> Theme:
	var theme: Theme = Theme.new()
	theme.default_font_size = 18

	var panel: StyleBoxFlat = _box(PANEL_BG, 10)
	theme.set_stylebox("panel", "PanelContainer", panel)
	theme.set_stylebox("panel", "Panel", panel)

	theme.set_color("font_color", "Label", TEXT)
	theme.set_color("font_shadow_color", "Label", Color(0.0, 0.0, 0.0, 0.55))
	theme.set_constant("shadow_offset_x", "Label", 1)
	theme.set_constant("shadow_offset_y", "Label", 1)

	var normal: StyleBoxFlat = _box(Color(0.1, 0.15, 0.24, 0.9), 8)
	var hover: StyleBoxFlat = _box(Color(0.16, 0.24, 0.37, 0.95), 8)
	var pressed: StyleBoxFlat = _box(ACCENT.darkened(0.2), 8)
	var focus: StyleBoxFlat = _box(Color(0.0, 0.0, 0.0, 0.0), 8)
	focus.draw_center = false
	focus.border_color = ACCENT
	focus.set_border_width_all(2)
	for control_type in ["Button", "OptionButton", "CheckBox"]:
		theme.set_stylebox("normal", control_type, normal)
		theme.set_stylebox("hover", control_type, hover)
		theme.set_stylebox("pressed", control_type, pressed)
		theme.set_stylebox("focus", control_type, focus)
		theme.set_color("font_color", control_type, TEXT)
		theme.set_color("font_hover_color", control_type, Color.WHITE)
		theme.set_color("font_pressed_color", control_type, Color.WHITE)

	var slider_bg: StyleBoxFlat = _box(Color(0.1, 0.15, 0.24, 0.9), 4)
	slider_bg.content_margin_top = 4
	slider_bg.content_margin_bottom = 4
	var slider_fill: StyleBoxFlat = _box(ACCENT, 4)
	slider_fill.content_margin_top = 4
	slider_fill.content_margin_bottom = 4
	theme.set_stylebox("slider", "HSlider", slider_bg)
	theme.set_stylebox("grabber_area", "HSlider", slider_fill)
	theme.set_stylebox("grabber_area_highlight", "HSlider", slider_fill)
	return theme


static func _box(color: Color, radius: int) -> StyleBoxFlat:
	var box: StyleBoxFlat = StyleBoxFlat.new()
	box.bg_color = color
	box.set_corner_radius_all(radius)
	box.content_margin_left = 14
	box.content_margin_right = 14
	box.content_margin_top = 8
	box.content_margin_bottom = 8
	return box


static func make_label(text: String, size: int, color: Color = TEXT) -> Label:
	var label: Label = Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	return label
