class_name TerrainSampler
extends RefCounted
## Función de altura determinista del Macizo del Albor.
##
## Todo el relieve sale de esta clase: dada una coordenada (x, z) devuelve
## siempre la misma altura, de modo que cada chunk puede generarse por separado
## (incluso en hilos distintos) y encaja perfectamente con sus vecinos.
##
## Capas del relieve:
##  1. Macizo: una gran cúpula centrada en el origen (el pico del Albor).
##  2. Crestas: ruido "ridged" (1 - |ruido|)^3 que forma aristas afiladas.
##  3. Colinas: ruido fractal suave de baja frecuencia.
##  4. Erosión simulada: canales de valle tallados donde el ruido de valles es
##     casi cero, con más profundidad en zonas altas (como las torrenteras y
##     circos glaciares). Es una aproximación analítica; la erosión hidráulica
##     real exige simular gotas sobre una malla global y rompería la
##     generación por chunks independientes.
##  5. Deformación de dominio (domain warping) para que nada parezca una rejilla.

const MAP_RADIUS: float = 5000.0
const PEAK_HEIGHT: float = 1250.0
const TREELINE: float = 1150.0

enum Surface { POWDER, PACKED, ICE, ROCK }

const SURFACE_NAMES: Array[String] = ["Nieve polvo", "Nieve compactada", "Hielo", "Roca"]

var _base: FastNoiseLite
var _ridge: FastNoiseLite
var _warp: FastNoiseLite
var _valley: FastNoiseLite
var _detail: FastNoiseLite
var _ice: FastNoiseLite
var _forest: FastNoiseLite


func _init(world_seed: int) -> void:
	_base = _make_noise(world_seed, 0.00045, 5)
	_ridge = _make_noise(world_seed + 11, 0.0007, 3)
	_warp = _make_noise(world_seed + 23, 0.0006, 3)
	_valley = _make_noise(world_seed + 37, 0.00055, 3)
	_detail = _make_noise(world_seed + 41, 0.025, 3)
	_ice = _make_noise(world_seed + 53, 0.006, 2)
	_forest = _make_noise(world_seed + 67, 0.0035, 3)


static func _make_noise(noise_seed: int, frequency: float, octaves: int) -> FastNoiseLite:
	var noise: FastNoiseLite = FastNoiseLite.new()
	noise.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	noise.seed = noise_seed
	noise.frequency = frequency
	noise.fractal_type = FastNoiseLite.FRACTAL_FBM
	noise.fractal_octaves = octaves
	noise.fractal_lacunarity = 2.0
	noise.fractal_gain = 0.5
	return noise


## Altura del terreno en metros.
func height_at(x: float, z: float) -> float:
	var wx: float = x + _warp.get_noise_2d(x, z) * 120.0
	var wz: float = z + _warp.get_noise_2d(z + 913.0, x - 371.0) * 120.0
	var dist: float = Vector2(x, z).length()
	var massif: float = 1.0 - smoothstep(0.0, MAP_RADIUS, dist)
	var ridge: float = 1.0 - absf(_ridge.get_noise_2d(wx, wz))
	ridge = ridge * ridge * ridge
	var hills: float = _base.get_noise_2d(wx, wz) * 0.5 + 0.5
	var h: float = massif * PEAK_HEIGHT
	h += ridge * 150.0 * (0.25 + massif)
	h += hills * 180.0
	# Erosión simulada: valles tallados, más profundos y anchos en altura.
	var valley: float = absf(_valley.get_noise_2d(wx * 0.7, wz * 0.7))
	var channel: float = 1.0 - smoothstep(0.0, 0.22, valley)
	h -= channel * channel * 90.0 * (0.35 + massif)
	# Microrrelieve: baches y ondulaciones de nieve.
	h += _detail.get_noise_2d(x, z) * 1.6
	return h


## Pendiente en grados calculada por diferencias centrales.
func slope_at(x: float, z: float, step: float = 2.0) -> float:
	var hl: float = height_at(x - step, z)
	var hr: float = height_at(x + step, z)
	var hd: float = height_at(x, z - step)
	var hu: float = height_at(x, z + step)
	var normal: Vector3 = Vector3(hl - hr, 2.0 * step, hd - hu).normalized()
	return rad_to_deg(acos(clampf(normal.y, -1.0, 1.0)))


## Dirección cuesta abajo (horizontal, normalizada).
func downhill_at(x: float, z: float, step: float = 4.0) -> Vector3:
	var hl: float = height_at(x - step, z)
	var hr: float = height_at(x + step, z)
	var hd: float = height_at(x, z - step)
	var hu: float = height_at(x, z + step)
	var dir: Vector3 = Vector3(hl - hr, 0.0, hd - hu)
	if dir.length() < 0.0001:
		return Vector3.FORWARD
	return dir.normalized()


## Pesos de superficie: r = polvo, g = compactada, b = hielo, a = roca.
## Se guardan en el color de vértice para el shader y los usa la física.
func surface_weights(h: float, slope_deg: float, x: float, z: float) -> Color:
	var jitter: float = _detail.get_noise_2d(x * 0.4, z * 0.4) * 5.0
	var rock: float = smoothstep(34.0, 46.0, slope_deg + jitter)
	var ice_noise: float = _ice.get_noise_2d(x, z)
	var ice: float = smoothstep(0.2, 0.42, ice_noise) * smoothstep(10.0, 24.0, slope_deg) * (1.0 - rock)
	var powder_alt: float = smoothstep(TREELINE - 300.0, TREELINE + 250.0, h)
	var powder: float = powder_alt * (1.0 - smoothstep(20.0, 32.0, slope_deg)) * (1.0 - rock) * (1.0 - ice)
	var packed: float = maxf(0.0, 1.0 - rock - ice - powder)
	var total: float = rock + ice + powder + packed
	if total <= 0.0001:
		return Color(0.0, 1.0, 0.0, 0.0)
	return Color(powder / total, packed / total, ice / total, rock / total)


## Índice de la superficie dominante a partir de los pesos.
static func dominant_surface(weights: Color) -> int:
	var best: int = Surface.PACKED
	var best_value: float = weights.g
	if weights.r > best_value:
		best = Surface.POWDER
		best_value = weights.r
	if weights.b > best_value:
		best = Surface.ICE
		best_value = weights.b
	if weights.a > best_value:
		best = Surface.ROCK
	return best


## Probabilidad (0..1) de que crezca un abeto en este punto.
func tree_probability(h: float, slope_deg: float, x: float, z: float) -> float:
	if h > TREELINE or slope_deg > 32.0:
		return 0.0
	var forest: float = _forest.get_noise_2d(x, z) * 0.5 + 0.5
	var alt_fade: float = 1.0 - smoothstep(TREELINE - 250.0, TREELINE, h)
	var slope_fade: float = 1.0 - smoothstep(22.0, 32.0, slope_deg)
	return smoothstep(0.42, 0.68, forest) * alt_fade * slope_fade
