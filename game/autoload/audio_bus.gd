extends Node
## Audio procedural: no usa ningún archivo de sonido.
## - Un AudioStreamGenerator mezcla en tiempo real el viento (ruido filtrado
##   con rachas) y el siseo de los esquís sobre la nieve.
## - Los sonidos puntuales (impactos, aviso de truco) se sintetizan una vez al
##   arrancar como AudioStreamWAV.
## Crea los buses "Musica", "Efectos" y "Ambiente" si no existen.

const MIX_RATE: float = 22050.0
const BUS_NAMES: Array[String] = ["Musica", "Efectos", "Ambiente"]

## Intensidades objetivo (0..1) que fijan el jugador y el clima.
var wind_intensity: float = 0.15
var slide_intensity: float = 0.0
var slide_roughness: float = 0.5

var _player: AudioStreamPlayer
var _playback: AudioStreamGeneratorPlayback
var _rng: RandomNumberGenerator = RandomNumberGenerator.new()
var _wind_now: float = 0.0
var _slide_now: float = 0.0
var _lp1: float = 0.0
var _lp2: float = 0.0
var _hiss_lp: float = 0.0
var _gust_phase: float = 0.0
var _gust_phase2: float = 0.0
var _impact_stream: AudioStreamWAV
var _chime_stream: AudioStreamWAV
var _sfx_players: Array[AudioStreamPlayer] = []
var _sfx_index: int = 0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_rng.seed = 4242
	_ensure_buses()
	var generator: AudioStreamGenerator = AudioStreamGenerator.new()
	generator.mix_rate = MIX_RATE
	generator.buffer_length = 0.2
	_player = AudioStreamPlayer.new()
	_player.stream = generator
	_player.bus = "Ambiente"
	add_child(_player)
	_player.play()
	_playback = _player.get_stream_playback() as AudioStreamGeneratorPlayback
	for i in 4:
		var sfx: AudioStreamPlayer = AudioStreamPlayer.new()
		sfx.bus = "Efectos"
		add_child(sfx)
		_sfx_players.append(sfx)
	_impact_stream = _make_impact()
	_chime_stream = _make_chime()
	apply_master_volume(GameState.master_volume)
	EventBus.settings_changed.connect(_on_settings_changed)


func _exit_tree() -> void:
	shutdown()


## Detiene el generador. Conviene llamarla unos fotogramas antes de cerrar el
## juego para que el hilo de audio libere su reproducción a tiempo.
func shutdown() -> void:
	_playback = null
	if _player != null and _player.playing:
		_player.stop()


func _on_settings_changed() -> void:
	apply_master_volume(GameState.master_volume)


func apply_master_volume(value: float) -> void:
	var idx: int = AudioServer.get_bus_index("Master")
	AudioServer.set_bus_volume_db(idx, linear_to_db(maxf(value, 0.0001)))
	AudioServer.set_bus_mute(idx, value <= 0.001)


func play_impact(strength: float = 1.0) -> void:
	_play_sfx(_impact_stream, linear_to_db(clampf(strength, 0.1, 1.0)), 1.0)


func play_chime(pitch: float = 1.0) -> void:
	_play_sfx(_chime_stream, -6.0, pitch)


func _play_sfx(stream: AudioStream, volume_db: float, pitch: float) -> void:
	var sfx: AudioStreamPlayer = _sfx_players[_sfx_index]
	_sfx_index = (_sfx_index + 1) % _sfx_players.size()
	sfx.stream = stream
	sfx.volume_db = volume_db
	sfx.pitch_scale = pitch
	sfx.play()


func _process(delta: float) -> void:
	if _playback == null:
		return
	var paused: bool = get_tree().paused
	var target_wind: float = 0.05 if paused else wind_intensity
	var target_slide: float = 0.0 if paused else slide_intensity
	var smooth: float = 1.0 - exp(-6.0 * delta)
	var frames: int = _playback.get_frames_available()
	if frames <= 0:
		return
	var buffer: PackedVector2Array = PackedVector2Array()
	buffer.resize(frames)
	var wind_start: float = _wind_now
	var slide_start: float = _slide_now
	_wind_now = lerpf(_wind_now, target_wind, smooth)
	_slide_now = lerpf(_slide_now, target_slide, smooth)
	var inv_frames: float = 1.0 / float(frames)
	# Coeficiente del filtro paso bajo del viento: más intensidad = más agudo.
	var wind_cut: float = lerpf(0.015, 0.06, _wind_now)
	var hiss_cut: float = lerpf(0.25, 0.6, slide_roughness)
	for i in frames:
		var t: float = float(i) * inv_frames
		var wind_amp: float = lerpf(wind_start, _wind_now, t)
		var slide_amp: float = lerpf(slide_start, _slide_now, t)
		_gust_phase += 0.35 / MIX_RATE
		_gust_phase2 += 0.11 / MIX_RATE
		var gust: float = 0.65 + 0.25 * sin(_gust_phase * TAU) + 0.15 * sin(_gust_phase2 * TAU * 1.7)
		var white: float = _rng.randf() * 2.0 - 1.0
		_lp1 += wind_cut * (white - _lp1)
		_lp2 += wind_cut * (_lp1 - _lp2)
		var wind: float = _lp2 * 6.0 * wind_amp * gust
		_hiss_lp += hiss_cut * (white - _hiss_lp)
		var hiss: float = (white - _hiss_lp) * 0.22 * slide_amp
		var sample: float = clampf(wind + hiss, -1.0, 1.0)
		buffer[i] = Vector2(sample + hiss * 0.15, sample - hiss * 0.15)
	_playback.push_buffer(buffer)


func _ensure_buses() -> void:
	for bus_name in BUS_NAMES:
		if AudioServer.get_bus_index(bus_name) == -1:
			AudioServer.add_bus()
			var idx: int = AudioServer.bus_count - 1
			AudioServer.set_bus_name(idx, bus_name)
			AudioServer.set_bus_send(idx, "Master")


func _make_impact() -> AudioStreamWAV:
	var rate: int = 22050
	var length: int = int(rate * 0.45)
	var data: PackedByteArray = PackedByteArray()
	data.resize(length * 2)
	var rng: RandomNumberGenerator = RandomNumberGenerator.new()
	rng.seed = 99
	var lp: float = 0.0
	for i in length:
		var t: float = float(i) / float(rate)
		var env: float = exp(-t * 9.0)
		lp += 0.08 * ((rng.randf() * 2.0 - 1.0) - lp)
		var thump: float = sin(TAU * 70.0 * t) * exp(-t * 14.0)
		var value: float = clampf((lp * 3.0 * env + thump * 0.8), -1.0, 1.0)
		data.encode_s16(i * 2, int(value * 32000.0))
	return _wav_from(data, rate)


func _make_chime() -> AudioStreamWAV:
	var rate: int = 22050
	var length: int = int(rate * 0.6)
	var data: PackedByteArray = PackedByteArray()
	data.resize(length * 2)
	for i in length:
		var t: float = float(i) / float(rate)
		var env: float = exp(-t * 6.0) * minf(t * 200.0, 1.0)
		var value: float = (sin(TAU * 880.0 * t) * 0.5 + sin(TAU * 1320.0 * t) * 0.3 + sin(TAU * 1760.0 * t) * 0.15) * env
		data.encode_s16(i * 2, int(clampf(value, -1.0, 1.0) * 26000.0))
	return _wav_from(data, rate)


func _wav_from(data: PackedByteArray, rate: int) -> AudioStreamWAV:
	var wav: AudioStreamWAV = AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = rate
	wav.stereo = false
	wav.data = data
	return wav
