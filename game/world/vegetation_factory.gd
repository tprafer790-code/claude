class_name VegetationFactory
extends RefCounted
## Modelos de vegetación generados con primitivas (sin archivos externos).
## Cada modelo es una ArrayMesh con varias superficies (tronco, follaje, nieve)
## pensada para dibujarse miles de veces con MultiMeshInstance3D.


static func build_fir_mesh() -> ArrayMesh:
	var mesh: ArrayMesh = ArrayMesh.new()

	var trunk_mat: StandardMaterial3D = StandardMaterial3D.new()
	trunk_mat.albedo_color = Color(0.27, 0.19, 0.13)
	trunk_mat.roughness = 1.0

	var leaf_mat: StandardMaterial3D = StandardMaterial3D.new()
	leaf_mat.albedo_color = Color(0.09, 0.2, 0.14)
	leaf_mat.roughness = 0.95

	var snow_mat: StandardMaterial3D = StandardMaterial3D.new()
	snow_mat.albedo_color = Color(0.9, 0.94, 1.0)
	snow_mat.roughness = 0.7

	# Tronco.
	var trunk: CylinderMesh = CylinderMesh.new()
	trunk.top_radius = 0.12
	trunk.bottom_radius = 0.24
	trunk.height = 2.2
	trunk.radial_segments = 6
	trunk.rings = 1
	var st: SurfaceTool = SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	st.append_from(trunk, 0, Transform3D(Basis.IDENTITY, Vector3(0.0, 1.1, 0.0)))
	st.commit(mesh)
	mesh.surface_set_material(0, trunk_mat)

	# Follaje: conos apilados que se estrechan hacia arriba.
	var layer_count: int = 4
	st = SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var snow_st: SurfaceTool = SurfaceTool.new()
	snow_st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for k in layer_count:
		var radius: float = 2.1 - float(k) * 0.42
		var height: float = 2.8 - float(k) * 0.3
		var base_y: float = 1.6 + float(k) * 1.45
		var cone: CylinderMesh = CylinderMesh.new()
		cone.top_radius = 0.0
		cone.bottom_radius = radius
		cone.height = height
		cone.radial_segments = 9
		cone.rings = 1
		st.append_from(cone, 0, Transform3D(Basis.IDENTITY, Vector3(0.0, base_y + height * 0.5, 0.0)))
		# Capa de nieve: cono algo menor que asoma sobre la mitad superior.
		var cap: CylinderMesh = CylinderMesh.new()
		cap.top_radius = 0.0
		cap.bottom_radius = radius * 0.62
		cap.height = height * 0.6
		cap.radial_segments = 9
		cap.rings = 1
		var cap_y: float = base_y + height - cap.height * 0.5 + 0.06
		snow_st.append_from(cap, 0, Transform3D(Basis.IDENTITY.scaled(Vector3(1.04, 1.0, 1.04)), Vector3(0.0, cap_y, 0.0)))
	st.commit(mesh)
	mesh.surface_set_material(1, leaf_mat)
	snow_st.commit(mesh)
	mesh.surface_set_material(2, snow_mat)
	return mesh
