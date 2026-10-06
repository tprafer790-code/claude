class_name Compass
extends Control
## Brújula horizontal dibujada a mano: una tira con los puntos cardinales que
## se desplaza según hacia dónde mira la cámara. El norte es -Z.

const LABELS: Array[String] = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"]
const VISIBLE_ARC: float = PI * 0.9

var heading: float = 0.0  # rumbo en radianes; 0 = norte, positivo = hacia el oeste
var objective_bearing: float = NAN


func _ready() -> void:
	custom_minimum_size = Vector2(420.0, 44.0)
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func _process(_delta: float) -> void:
	queue_redraw()


func _draw() -> void:
	var w: float = size.x
	var h: float = size.y
	var font: Font = get_theme_default_font()
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.04, 0.07, 0.12, 0.55))
	# El oeste está a la izquierda cuando miras al norte; el rumbo crece hacia
	# el oeste, por eso la posición en pantalla usa (rumbo_cámara - rumbo_marca).
	for i in 72:
		var mark: float = float(i) * TAU / 72.0
		var diff: float = wrapf(heading - mark, -PI, PI)
		if absf(diff) > VISIBLE_ARC * 0.5:
			continue
		var x: float = w * 0.5 + diff / (VISIBLE_ARC * 0.5) * w * 0.5
		var alpha: float = 1.0 - absf(diff) / (VISIBLE_ARC * 0.5)
		if i % 9 == 0:
			var text: String = LABELS[(8 - int(float(i) / 9.0)) % 8]
			var color: Color = UITheme.ACCENT if text == "N" else UITheme.TEXT
			color.a = alpha
			var font_size: int = 20 if text.length() == 1 else 15
			var text_size: Vector2 = font.get_string_size(text, HORIZONTAL_ALIGNMENT_CENTER, -1, font_size)
			draw_string(font, Vector2(x - text_size.x * 0.5, h * 0.5 + 7.0), text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, color)
		else:
			var tick: float = 10.0 if i % 3 == 0 else 5.0
			draw_line(Vector2(x, h - tick - 2.0), Vector2(x, h - 2.0), Color(1.0, 1.0, 1.0, alpha * 0.7), 1.5)
	if not is_nan(objective_bearing):
		var d: float = wrapf(heading - objective_bearing, -PI, PI)
		var ox: float = w * 0.5 + clampf(d / (VISIBLE_ARC * 0.5), -1.0, 1.0) * w * 0.5
		draw_colored_polygon(PackedVector2Array([Vector2(ox - 6.0, 0.0), Vector2(ox + 6.0, 0.0), Vector2(ox, 9.0)]), UITheme.ACCENT)
	draw_line(Vector2(w * 0.5, 0.0), Vector2(w * 0.5, h), Color(1.0, 1.0, 1.0, 0.9), 2.0)
