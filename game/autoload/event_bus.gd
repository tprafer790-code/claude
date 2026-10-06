extends Node
## Bus de señales globales.
## Permite que sistemas desacoplados (HUD, audio, misiones, guardado) reaccionen
## a lo que ocurre en el juego sin conocerse entre sí.

@warning_ignore("unused_signal")
signal trick_landed(trick_name: String, points: int)
@warning_ignore("unused_signal")
signal player_crashed(reason: String)
@warning_ignore("unused_signal")
signal player_respawned()
@warning_ignore("unused_signal")
signal score_changed(total: int)
@warning_ignore("unused_signal")
signal quality_changed(level: int)
@warning_ignore("unused_signal")
signal settings_changed()
@warning_ignore("unused_signal")
signal discipline_changed(discipline_name: String)
@warning_ignore("unused_signal")
signal world_ready()
@warning_ignore("unused_signal")
signal hud_message(text: String, duration: float)
