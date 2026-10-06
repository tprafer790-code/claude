// Shader de terreno del Macizo del Albor.
// Mezcla cuatro superficies según los pesos que el generador guarda en el
// color de cada vértice (r = polvo, g = compactada, b = hielo, a = roca),
// rotos con ruido procedural para que no se vea la malla.
// - Normales detalladas: relieve de nieve (ondas de viento) y roca (estratos)
//   calculado por diferencias finitas de una función de altura procedural.
// - Hielo con baja rugosidad y alto especular (brillo).
// - Destellos (cristales de nieve) dependientes de la vista.
// Compatible con Forward+ y Compatibility (no usa funciones exclusivas).
shader_type spatial;
render_mode blend_mix, depth_draw_opaque, cull_back, diffuse_burley, specular_schlick_ggx;

uniform vec3 powder_color : source_color = vec3(0.96, 0.975, 1.0);
uniform vec3 packed_color : source_color = vec3(0.87, 0.9, 0.95);
uniform vec3 ice_color : source_color = vec3(0.66, 0.79, 0.9);
uniform vec3 rock_color_a : source_color = vec3(0.34, 0.32, 0.3);
uniform vec3 rock_color_b : source_color = vec3(0.17, 0.165, 0.17);
uniform float detail_strength : hint_range(0.0, 2.0) = 1.0;
uniform float sparkle_strength : hint_range(0.0, 4.0) = 1.4;
uniform float detail_fade_distance = 220.0;

// Recorte del terreno lejano: oculta la zona que cubren los chunks detallados.
uniform bool use_clip = false;
uniform vec2 clip_center = vec2(0.0);
uniform float clip_half_size = 0.0;

varying vec3 world_pos;
varying vec3 world_nrm;
varying vec4 surface_w;

float hash12(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * 0.1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	float a = hash12(i);
	float b = hash12(i + vec2(1.0, 0.0));
	float c = hash12(i + vec2(0.0, 1.0));
	float d = hash12(i + vec2(1.0, 1.0));
	return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
	float v = 0.0;
	float a = 0.5;
	for (int k = 0; k < 4; k++) {
		v += a * vnoise(p);
		p = p * 2.03 + vec2(17.1, 9.7);
		a *= 0.5;
	}
	return v;
}

// Altura de detalle (en metros) para las normales.
float detail_height(vec2 p, float rock, float fade) {
	// Ondas de nieve esculpidas por el viento, alargadas en una dirección.
	vec2 q = vec2(p.x * 0.55 + p.y * 0.25, p.y * 0.9 - p.x * 0.2);
	float snow = fbm(q * 0.9) * 0.18 + vnoise(p * 5.0) * 0.015 * fade;
	float rocky = fbm(p * 0.35) * 0.9 + vnoise(p * 2.2) * 0.25 * fade;
	return mix(snow, rocky, rock);
}

void vertex() {
	world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	world_nrm = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
	surface_w = COLOR;
}

void fragment() {
	if (use_clip && clip_half_size > 0.0) {
		vec2 dxz = abs(world_pos.xz - clip_center);
		if (max(dxz.x, dxz.y) < clip_half_size) {
			discard;
		}
	}

	float dist = length(world_pos - CAMERA_POSITION_WORLD);
	float fade = 1.0 - smoothstep(detail_fade_distance * 0.4, detail_fade_distance, dist);

	// Pesos rotos con ruido para bordes naturales entre superficies.
	float n1 = fbm(world_pos.xz * 0.045);
	float n2 = fbm(world_pos.xz * 0.21 + vec2(3.7, 1.3));
	float rock = clamp(surface_w.a + (n1 - 0.5) * 0.45, 0.0, 1.0);
	rock = smoothstep(0.35, 0.65, rock);
	float ice = smoothstep(0.3, 0.6, surface_w.b + (n2 - 0.5) * 0.35) * (1.0 - rock);
	float powder = clamp(surface_w.r + (n2 - 0.5) * 0.25, 0.0, 1.0) * (1.0 - rock) * (1.0 - ice);
	float packed_w = max(0.0, 1.0 - rock - ice - powder);

	// Normal con detalle por diferencias finitas.
	vec3 n = normalize(world_nrm);
	float e = 0.35;
	vec2 p = world_pos.xz;
	float h0 = detail_height(p, rock, fade);
	float hx = detail_height(p + vec2(e, 0.0), rock, fade);
	float hz = detail_height(p + vec2(0.0, e), rock, fade);
	float strength = detail_strength * mix(0.35, 1.0, fade);
	vec3 grad = vec3((hx - h0) / e, 0.0, (hz - h0) / e) * strength;
	vec3 detailed = normalize(n - (grad - n * dot(grad, n)));

	// Roca estratificada (bandas horizontales irregulares).
	// La banda se atenúa con la distancia para evitar el efecto muaré.
	float strata = sin(world_pos.y * 0.45 + n1 * 7.0 + n2 * 3.0) * 0.5 + 0.5;
	strata = mix(0.5, strata, fade);
	vec3 rock_col = mix(rock_color_b, rock_color_a, strata * 0.35 + n2 * 0.4 + n1 * 0.25);
	// Nieve acumulada en las zonas menos inclinadas de la roca.
	float ledge_snow = smoothstep(0.75, 0.9, detailed.y) * 0.8;
	rock_col = mix(rock_col, packed_color, ledge_snow);

	vec3 powder_col = powder_color * (0.97 + n2 * 0.05);
	vec3 packed_col = packed_color * (0.94 + n1 * 0.08);
	vec3 ice_col = ice_color * (0.9 + n2 * 0.15);

	vec3 albedo = powder_col * powder + packed_col * packed_w + ice_col * ice + rock_col * rock;
	float rough = 0.78 * powder + 0.6 * packed_w + 0.12 * ice + 0.92 * rock;
	float spec = 0.35 * powder + 0.4 * packed_w + 0.75 * ice + 0.25 * rock;

	// Destellos de cristales de hielo en la nieve, según el ángulo de visión.
	vec3 cell = floor(world_pos * 9.0);
	float glint_seed = hash12(cell.xz + cell.y * 13.1);
	vec3 view_dir_world = normalize(CAMERA_POSITION_WORLD - world_pos);
	float facing = abs(dot(view_dir_world, normalize(vec3(glint_seed - 0.5, 1.0, fract(glint_seed * 7.3) - 0.5))));
	float glint = step(0.985, glint_seed) * smoothstep(0.92, 1.0, facing) * fade * (1.0 - rock);

	ALBEDO = albedo;
	ROUGHNESS = rough;
	SPECULAR = spec;
	METALLIC = 0.0;
	EMISSION = vec3(0.9, 0.95, 1.0) * glint * sparkle_strength;
	NORMAL = normalize((VIEW_MATRIX * vec4(detailed, 0.0)).xyz);
}
