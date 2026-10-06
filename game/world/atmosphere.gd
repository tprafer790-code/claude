class_name Atmosphere
extends Node3D
## Cielo procedural, sol con sombras en cascada, niebla, bloom y corrección de
## color. En la fase 3 se le añadirán el ciclo día/noche y el clima dinámico.

var environment: Environment
var sun: DirectionalLight3D
var sky_material: ProceduralSkyMaterial
var _world_env: WorldEnvironment


func _ready() -> void:
	sky_material = ProceduralSkyMaterial.new()
	sky_material.sky_top_color = Color(0.2, 0.4, 0.74)
	sky_material.sky_horizon_color = Color(0.66, 0.77, 0.89)
	sky_material.sky_curve = 0.12
	sky_material.ground_bottom_color = Color(0.6, 0.68, 0.78)
	sky_material.ground_horizon_color = Color(0.68, 0.78, 0.89)
	sky_material.sun_angle_max = 25.0
	sky_material.sun_curve = 0.1

	var sky: Sky = Sky.new()
	sky.sky_material = sky_material

	environment = Environment.new()
	environment.background_mode = Environment.BG_SKY
	environment.sky = sky
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	environment.ambient_light_energy = 0.85
	environment.reflected_light_source = Environment.REFLECTION_SOURCE_SKY
	environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	environment.tonemap_exposure = 0.95
	environment.tonemap_white = 6.0
	environment.fog_enabled = true
	environment.fog_light_color = Color(0.72, 0.8, 0.9)
	environment.fog_light_energy = 1.0
	environment.fog_density = 0.00028
	environment.fog_aerial_perspective = 0.55
	environment.fog_sky_affect = 0.2
	environment.adjustment_enabled = true
	environment.adjustment_brightness = 1.0
	environment.adjustment_contrast = 1.06
	environment.adjustment_saturation = 1.08
	environment.glow_intensity = 0.45
	environment.glow_bloom = 0.04
	environment.glow_hdr_threshold = 1.15
	environment.glow_blend_mode = Environment.GLOW_BLEND_MODE_SOFTLIGHT
	environment.volumetric_fog_density = 0.0025
	environment.volumetric_fog_albedo = Color(0.9, 0.93, 1.0)
	environment.volumetric_fog_length = 180.0
	environment.ssao_radius = 1.5
	environment.ssao_intensity = 1.2

	_world_env = WorldEnvironment.new()
	_world_env.environment = environment
	add_child(_world_env)

	sun = DirectionalLight3D.new()
	sun.name = "Sol"
	sun.rotation_degrees = Vector3(-38.0, 145.0, 0.0)
	sun.light_color = Color(1.0, 0.96, 0.9)
	sun.light_energy = 1.25
	sun.shadow_enabled = true
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS
	sun.directional_shadow_blend_splits = true
	sun.shadow_bias = 0.04
	sun.shadow_normal_bias = 1.2
	add_child(sun)

	EventBus.quality_changed.connect(_on_quality_changed)
	_on_quality_changed(GameState.quality)


func _on_quality_changed(_level: int) -> void:
	var preset: Dictionary = GameState.get_preset()
	sun.directional_shadow_max_distance = preset["shadow_distance"]
	sun.shadow_blur = 1.5 if preset["shadows_soft"] else 0.5
	environment.glow_enabled = preset["glow"]
	environment.ssao_enabled = preset["ssao"]
	environment.volumetric_fog_enabled = preset["volumetric_fog"]
