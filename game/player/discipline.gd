class_name Discipline
extends RefCounted
## Clase base de cada disciplina (esquí, snowboard, parapente, wingsuit).
## Cada disciplina implementa su propio modelo físico y su máquina de estados,
## y el PlayerController delega en ella cada fotograma de física.

var player: PlayerController
var display_name: String = "Disciplina"


func _init(owner_player: PlayerController) -> void:
	player = owner_player


## Se llama al activar la disciplina (también al cambiar en pleno recorrido).
func enter() -> void:
	pass


## Se llama al desactivarla.
func exit() -> void:
	pass


## Paso de física: debe calcular player.velocity y llamar a move_and_slide().
func physics_update(_delta: float) -> void:
	pass


## Reinicia el estado interno tras reaparecer.
func reset() -> void:
	pass


## Nombre legible del estado actual (para el HUD).
func get_state_name() -> String:
	return ""


func is_grounded() -> bool:
	return player.is_on_floor()
