// Utilidades de geometría: cajas biseladas en coordenadas de mundo con UV
// proyectadas por cara (escala real en metros), agrupadas por material para
// fusionarlas en pocas llamadas de dibujo.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// UV planares según la normal dominante: 1 unidad UV = `scale` metros.
export function worldUV(geo, scale = 1, offset = [0, 0]) {
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = x; v = z; }
    else if (ax >= az) { u = z; v = y; }
    else { u = x; v = y; }
    uv[i * 2] = u / scale + offset[0]; uv[i * 2 + 1] = v / scale + offset[1];
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

export class Builder {
  constructor() { this.buckets = new Map(); this.solids = []; }

  add(material, geo) {
    if (!this.buckets.has(material)) this.buckets.set(material, []);
    // Normaliza atributos para poder fusionar.
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    if (geo.index) geo = geo.toNonIndexed();
    this.buckets.get(material).push(geo);
    return geo;
  }

  // Caja con aristas redondeadas definida por sus límites.
  box(material, [x0, x1], [y0, y1], [z0, z1], { r = 0.025, uvScale = 2, solid = true, rotY = 0, uvOffset } = {}) {
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    const rr = Math.min(r, w / 2.01, h / 2.01, d / 2.01);
    const g = rr > 0.004 ? new RoundedBoxGeometry(w, h, d, 2, rr) : new THREE.BoxGeometry(w, h, d);
    if (rotY) g.rotateY(rotY);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    worldUV(g, uvScale, uvOffset);
    if (solid) this.solids.push({ min: [x0, y0, z0], max: [x1, y1, z1] });
    return this.add(material, g);
  }

  // Muro con huecos: rellena alrededor de las aberturas [xa, xb, ya, yb] en un plano X.
  wallX(material, [x0, x1], [y0, y1], [z0, z1], openings = [], opts = {}) {
    let cursor = x0;
    const sorted = [...openings].sort((a, b) => a[0] - b[0]);
    for (const [a, b, ya, yb] of sorted) {
      if (a > cursor) this.box(material, [cursor, a], [y0, y1], [z0, z1], opts);
      if (ya > y0) this.box(material, [a, b], [y0, ya], [z0, z1], opts);
      if (yb < y1) this.box(material, [a, b], [yb, y1], [z0, z1], opts);
      cursor = b;
    }
    if (cursor < x1) this.box(material, [cursor, x1], [y0, y1], [z0, z1], opts);
  }

  build(group, { castShadow = true, receiveShadow = true } = {}) {
    for (const [mat, list] of this.buckets) {
      const merged = mergeGeometries(list, false);
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = castShadow && !mat.transparent;
      mesh.receiveShadow = receiveShadow;
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
    }
    this.buckets.clear();
    return group;
  }
}

// Desplaza vértices en la dirección de la normal (cojines, piedras, follaje).
export function puff(geo, fn) {
  const p = geo.attributes.position, n = geo.attributes.normal, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const d = fn(v, i);
    p.setXYZ(i, v.x + n.getX(i) * d, v.y + n.getY(i) * d, v.z + n.getZ(i) * d);
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export function rng(seed = 1) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
