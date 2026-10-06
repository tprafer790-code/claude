class_name TerrainChunk
extends Node3D
## Un trozo cuadrado de terreno: malla visible, colisión opcional y árboles.
## Se crea vacío y recibe sus datos ya calculados (en un hilo) con apply_data().

const TREE_TRUNK_RADIUS: float = 0.45
const TREE_TRUNK_HEIGHT: float = 5.0

var coord: Vector2i = Vector2i.ZERO
var spec: int = -1
var has_collision: bool = false

var _mesh_instance: MeshInstance3D
var _ground_body: StaticBody3D
var _tree_body: StaticBody3D
var _trees: MultiMeshInstance3D

static var _trunk_shape: CylinderShape3D


func apply_data(data: Dictionary, material: Material, tree_mesh: Mesh,
		cast_shadows: bool, tree_visibility: float) -> void:
	_clear()
	var arrays: Array = []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = data["vertices"]
	arrays[Mesh.ARRAY_NORMAL] = data["normals"]
	arrays[Mesh.ARRAY_COLOR] = data["colors"]
	arrays[Mesh.ARRAY_INDEX] = data["indices"]
	var mesh: ArrayMesh = ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	mesh.surface_set_material(0, material)
	_mesh_instance = MeshInstance3D.new()
	_mesh_instance.mesh = mesh
	_mesh_instance.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if cast_shadows \
		else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(_mesh_instance)

	var collision: PackedFloat32Array = data["collision"]
	has_collision = collision.size() > 0
	if has_collision:
		var side: int = data["collision_side"]
		var step: float = data["step"]
		var shape: HeightMapShape3D = HeightMapShape3D.new()
		shape.map_width = side
		shape.map_depth = side
		shape.map_data = collision
		var col_node: CollisionShape3D = CollisionShape3D.new()
		col_node.shape = shape
		var half: float = float(side - 1) * step * 0.5
		col_node.position = Vector3(half, 0.0, half)
		col_node.scale = Vector3(step, step, step)
		_ground_body = StaticBody3D.new()
		_ground_body.collision_layer = 1
		_ground_body.collision_mask = 0
		_ground_body.add_child(col_node)
		add_child(_ground_body)

	var trees: Array = data["trees"]
	if trees.size() > 0 and tree_mesh != null:
		var mm: MultiMesh = MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.mesh = tree_mesh
		mm.instance_count = trees.size()
		for k in trees.size():
			mm.set_instance_transform(k, trees[k])
		_trees = MultiMeshInstance3D.new()
		_trees.multimesh = mm
		_trees.visibility_range_end = tree_visibility
		_trees.visibility_range_end_margin = 40.0
		_trees.visibility_range_fade_mode = GeometryInstance3D.VISIBILITY_RANGE_FADE_SELF
		_trees.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if cast_shadows \
			else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		add_child(_trees)
		if has_collision:
			_build_tree_collision(trees)


func _build_tree_collision(trees: Array) -> void:
	if _trunk_shape == null:
		_trunk_shape = CylinderShape3D.new()
		_trunk_shape.radius = TREE_TRUNK_RADIUS
		_trunk_shape.height = TREE_TRUNK_HEIGHT
	_tree_body = StaticBody3D.new()
	_tree_body.collision_layer = 1
	_tree_body.collision_mask = 0
	# Metadato que permite al jugador saber que ha chocado con un árbol.
	_tree_body.set_meta("obstacle", "árbol")
	for t in trees:
		var xform: Transform3D = t
		var col: CollisionShape3D = CollisionShape3D.new()
		col.shape = _trunk_shape
		col.position = xform.origin + Vector3(0.0, TREE_TRUNK_HEIGHT * 0.5, 0.0)
		_tree_body.add_child(col)
	add_child(_tree_body)


func _clear() -> void:
	for child in get_children():
		remove_child(child)
		child.queue_free()
	_mesh_instance = null
	_ground_body = null
	_tree_body = null
	_trees = null
	has_collision = false
