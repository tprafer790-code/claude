// Paisaje: terreno, orilla, lago, montañas, árboles, helechos, hierba y rocas.
// La vegetación usa tarjetas con textura recortada (alphaTest) instanciadas y un
// sombreador de viento compartido. El número de instancias depende de la calidad.
import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './geo.js';

export const wind = { value: 0 };

// ---------- Terreno ----------
function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z, o = 5) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, z * f); a *= 0.5; f *= 2; } return s; }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Línea de orilla: recta frente a la terraza, se abre en bahía hacia los lados.
export function shoreZ(x) { const ax = Math.abs(x); return ax < 16 ? -27 : -27 - 0.011 * (ax - 16) * (ax - 16); }

export function approachRise(x, z) {
  return smooth(18, 48, z) * 8 * (1 - smooth(70, 140, Math.abs(x)));
}

export function terrainHeight(x, z) {
  const sz = shoreZ(x);
  const toShore = z - sz; // >0 en tierra
  // Explanada plana alrededor del edificio y del sendero de llegada.
  const clearing = Math.max(
    1 - smooth(18, 30, Math.abs(x)) * (z < 18 && z > -30 ? 1 : 0),
    (1 - smooth(4, 12, Math.abs(x))) * (z > 10 && z < 95 ? 1 : 0),
  );
  const dist = Math.hypot(x, z * 0.8);
  const hills = (fbm(x * 0.018, z * 0.018) - 0.35) * 14 * smooth(25, 90, dist) + fbm(x * 0.09, z * 0.09, 3) * 1.2;
  let h = hills * (1 - Math.min(1, clearing)) - 0.04;
  // Bajada hacia el agua.
  const bank = smooth(-2, 9, toShore);
  h = h * bank + (-2.6) * (1 - bank);
  if (Math.abs(x) < 16 && z > -27.2 && z < 16) h = -0.2; // bajo pavimentos y forjados
  // Ladera de llegada: el bosque queda por encima del refugio y la cámara lo
  // descubre desde arriba (se ven cubiertas, patio y torre por encima del muro).
  h += approachRise(x, z);
  return h;
}

function buildTerrain(M, q) {
  const size = 520, seg = q.tier === 'low' ? 140 : 240;
  const g = new THREE.PlaneGeometry(size, size, seg, seg).rotateX(-Math.PI / 2);
  g.translate(0, 0, -60);
  const p = g.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const c1 = new THREE.Color(1.25, 1.2, 1.12), c2 = new THREE.Color(0x8f8a6a);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const h = terrainHeight(x, z);
    p.setY(i, h);
    // orilla más clara y húmeda junto al agua
    const t = smooth(-1.2, 0.2, h);
    const c = c2.clone().lerp(c1, t);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 6, p.getZ(i) / 6);
  const mat = M.forestFloor.clone(); mat.vertexColors = true;
  const mesh = new THREE.Mesh(g, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terreno';
  return mesh;
}

// ---------- Texturas de follaje (canvas) ----------
function leafTexture(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  const r = rng(kind === 'beech' ? 3 : kind === 'pine' ? 5 : 9);
  if (kind === 'beech') {
    for (let i = 0; i < 46; i++) {
      const px = 30 + r() * 196, py = 30 + r() * 196, a = r() * Math.PI * 2, s = 10 + r() * 12;
      x.save(); x.translate(px, py); x.rotate(a);
      const l = 40 + r() * 25;
      x.fillStyle = `hsl(${78 + r() * 26}, ${38 + r() * 18}%, ${30 + r() * 22}%)`;
      x.beginPath(); x.ellipse(0, 0, s, s * 0.55, 0, 0, Math.PI * 2); x.fill();
      x.strokeStyle = `hsla(70, 30%, ${l}%, 0.5)`; x.lineWidth = 1; x.beginPath(); x.moveTo(-s, 0); x.lineTo(s, 0); x.stroke();
      x.restore();
    }
  } else if (kind === 'pine') {
    x.strokeStyle = '#3a2c20'; x.lineWidth = 4; x.beginPath(); x.moveTo(128, 250); x.lineTo(128, 10); x.stroke();
    for (let i = 0; i < 520; i++) {
      const t = r(), y = 245 - t * 235, side = r() < 0.5 ? -1 : 1, len = (1 - t * 0.6) * (40 + r() * 70);
      x.strokeStyle = `hsl(${105 + r() * 30}, ${28 + r() * 16}%, ${16 + r() * 16}%)`;
      x.lineWidth = 1.6; x.beginPath(); x.moveTo(128, y); x.lineTo(128 + side * len, y - len * (0.25 + r() * 0.35)); x.stroke();
    }
  } else { // helecho
    x.strokeStyle = '#4e5a2a'; x.lineWidth = 3; x.beginPath(); x.moveTo(128, 255); x.quadraticCurveTo(140, 120, 128, 6); x.stroke();
    for (let i = 0; i < 34; i++) {
      const t = i / 34, y = 250 - t * 240, len = Math.sin(t * Math.PI) * 95 + 8;
      for (const s of [-1, 1]) {
        x.fillStyle = `hsl(${80 + r() * 20}, ${40 + r() * 15}%, ${24 + r() * 14}%)`;
        x.beginPath(); x.moveTo(128, y); x.quadraticCurveTo(128 + s * len * 0.5, y - 14, 128 + s * len, y - 10 - t * 6);
        x.quadraticCurveTo(128 + s * len * 0.5, y + 2, 128, y + 4); x.fill();
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function windMaterial(params, amp = 0.06) {
  const m = new THREE.MeshStandardMaterial({ alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85, ...params });
  m.onBeforeCompile = (s) => {
    s.uniforms.uWind = wind;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 ip = instanceMatrix[3].xyz;
        #else
          vec3 ip = vec3(0.0);
        #endif
        float sway = sin(uWind * 1.3 + ip.x * 0.21 + ip.z * 0.17) + 0.4 * sin(uWind * 3.1 + position.y * 1.7 + ip.x);
        transformed.x += sway * ${amp.toFixed(3)} * max(position.y, 0.0);
        transformed.z += cos(uWind * 1.1 + ip.z * 0.2) * ${(amp * 0.6).toFixed(3)} * max(position.y, 0.0);`);
  };
  return m;
}

// Tarjeta orientada con normales "esféricas" alrededor de `center` (iluminación suave de copa).
function card(w, h, pos, rotY, tilt, center) {
  const g = new THREE.PlaneGeometry(w, h);
  g.translate(0, h / 2, 0); g.rotateX(tilt); g.rotateY(rotY); g.translate(pos.x, pos.y, pos.z);
  const p = g.attributes.position, n = g.attributes.normal, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).sub(center).normalize(); n.setXYZ(i, v.x, v.y * 0.8 + 0.2, v.z); }
  return g;
}

function beechGeometry(seed) {
  const r = rng(seed), cards = [];
  const H = 7 + r() * 5;
  const blobs = [];
  for (let i = 0; i < 7; i++) blobs.push(new THREE.Vector3((r() - 0.5) * 4.5, H * (0.55 + r() * 0.4), (r() - 0.5) * 4.5));
  const center = new THREE.Vector3(0, H * 0.75, 0);
  for (const b of blobs) {
    const rad = 1.4 + r() * 1.3;
    for (let k = 0; k < 16; k++) {
      const d = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize().multiplyScalar(rad * (0.4 + r() * 0.6));
      cards.push(card(1.5 + r() * 0.8, 1.5 + r() * 0.8, b.clone().add(d), r() * Math.PI * 2, -0.6 + r() * 1.2, center));
    }
  }
  const leaves = mergeGeometries(cards);
  // tronco + ramas principales
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.1, 0.21, H * 0.75, 9, 4); trunk.translate(0, H * 0.375, 0); parts.push(trunk);
  for (const b of blobs.slice(0, 4)) {
    const from = new THREE.Vector3(0, H * (0.4 + r() * 0.2), 0), to = b.clone().multiplyScalar(0.85);
    const len = from.distanceTo(to);
    const br = new THREE.CylinderGeometry(0.05, 0.11, len, 6); br.translate(0, len / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    br.applyQuaternion(q); br.translate(from.x, from.y, from.z); parts.push(br);
  }
  const wood = mergeGeometries(parts.map((g) => g.toNonIndexed()));
  return { leaves, wood, height: H };
}

function pineGeometry(seed) {
  const r = rng(seed), cards = [];
  const H = 12 + r() * 8, crownStart = H * (0.3 + r() * 0.15);
  const center = new THREE.Vector3(0, (crownStart + H) / 2, 0);
  const tiers = 13;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1), y = crownStart + t * (H - crownStart);
    const rad = (1 - t) * (2.4 + r() * 0.6) + 0.3;
    const n = Math.max(3, Math.round(9 * (1 - t)) + 2);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + r();
      const pos = new THREE.Vector3(Math.cos(a) * rad * 0.15, y, Math.sin(a) * rad * 0.15);
      const g = card(rad * 1.1, rad * 1.25, pos, -a + Math.PI / 2, 1.15 + r() * 0.25, center);
      cards.push(g);
    }
  }
  const leaves = mergeGeometries(cards);
  const trunk = new THREE.CylinderGeometry(0.05, 0.24, H, 9, 4); trunk.translate(0, H / 2, 0);
  return { leaves, wood: trunk.toNonIndexed(), height: H };
}

function fernGeometry() {
  const fronds = [];
  const r = rng(17);
  for (let i = 0; i < 13; i++) {
    const len = 0.8 + r() * 0.5;
    const g = new THREE.PlaneGeometry(0.34, len, 1, 8); g.translate(0, len / 2, 0);
    const p = g.attributes.position;
    // arco: sube y cae hacia fuera
    for (let k = 0; k < p.count; k++) { const t = p.getY(k) / len; p.setZ(k, t * t * len * 0.75); p.setY(k, p.getY(k) * (1 - t * 0.45)); }
    g.rotateX(-0.35 - r() * 0.45); g.rotateY((i / 13) * Math.PI * 2 + r() * 0.4);
    fronds.push(g);
  }
  const m = mergeGeometries(fronds); m.computeVertexNormals();
  const n = m.attributes.normal; for (let k = 0; k < n.count; k++) n.setXYZ(k, n.getX(k) * 0.3, 0.95, n.getZ(k) * 0.3);
  return m;
}

function grassGeometry() {
  const blades = [], r = rng(23);
  for (let i = 0; i < 14; i++) {
    const h = 0.14 + r() * 0.26, w = 0.016;
    const g = new THREE.BufferGeometry();
    const bend = (r() - 0.5) * 0.25;
    g.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, 0, w, 0, 0, -w * 0.5, h * 0.55, bend * 0.4, w * 0.5, h * 0.55, bend * 0.4, 0, h, bend], 3));
    g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
    g.computeVertexNormals();
    const n = g.attributes.normal; for (let k = 0; k < n.count; k++) n.setXYZ(k, 0, 1, 0);
    g.rotateY(r() * Math.PI); g.translate((r() - 0.5) * 0.25, 0, (r() - 0.5) * 0.25);
    blades.push(g.toNonIndexed());
  }
  return mergeGeometries(blades);
}

function scatterInstanced(geo, mat, points, { scale = [0.8, 1.2], tint, shadow = true, rot = true }) {
  const mesh = new THREE.InstancedMesh(geo, mat, points.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), e = new THREE.Euler();
  const r = rng(points.length + 7), col = new THREE.Color();
  points.forEach((p, i) => {
    const k = scale[0] + r() * (scale[1] - scale[0]);
    e.set(0, rot ? r() * Math.PI * 2 : 0, 0); q.setFromEuler(e); s.set(k, k * (0.9 + r() * 0.2), k);
    m.compose(new THREE.Vector3(p[0], p[1], p[2]), q, s);
    mesh.setMatrixAt(i, m);
    if (tint) { tint(col, r); mesh.setColorAt(i, col); }
  });
  mesh.castShadow = shadow; mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

// ¿Está el punto en una zona libre (edificio, sendero, cámara)?
function blocked(x, z) {
  if (x > -18 && x < 18 && z > -30 && z < 16) return true;  // edificio, patio, terraza
  if (Math.abs(x) < 3.2 && z > 14 && z < 90) return true;    // sendero de llegada
  return false;
}

export function buildLandscape(M, scene, q, sunDir) {
  const group = new THREE.Group(); group.name = 'paisaje';
  const terrain = buildTerrain(M, q);
  group.add(terrain);

  // ---------- Lago ----------
  let water;
  const waterGeo = new THREE.PlaneGeometry(1400, 900);
  if (q.waterReflections) {
    const nTex = M.__waterNormals; nTex.repeat.set(1, 1);
    water = new Water(waterGeo, {
      textureWidth: q.tier === 'high' ? 1024 : 512, textureHeight: q.tier === 'high' ? 1024 : 512,
      waterNormals: nTex, sunDirection: sunDir.clone(), sunColor: 0xffc58a,
      waterColor: 0x0d1714, distortionScale: 1.6, fog: true,
    });
    water.material.uniforms.size.value = 6;
  } else {
    water = new THREE.Mesh(waterGeo, new THREE.MeshPhysicalMaterial({
      color: 0x0f1a17, roughness: 0.06, metalness: 0, normalMap: M.__waterNormals,
      normalScale: new THREE.Vector2(0.25, 0.25), envMapIntensity: 1.3, clearcoat: 1, clearcoatRoughness: 0.08,
    }));
    M.__waterNormals.repeat.set(60, 40);
  }
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.9, -476);
  water.name = 'lago';
  group.add(water);

  // ---------- Montañas (tres planos de profundidad) ----------
  const ridges = [
    { z: -260, h: 55, w: 1400, col: 0x1c2620, top: 0x3a4236, seed: 1.3 },
    { z: -380, h: 120, w: 1900, col: 0x26302c, top: 0x6a6660, seed: 4.7 },
    { z: -560, h: 220, w: 2600, col: 0x3c4246, top: 0x9a948c, seed: 9.1 },
  ];
  for (const R of ridges) {
    // Cada columna sube desde el agua hasta la cresta r(x); las filas inclinan la
    // ladera hacia atrás. Silueta suave a cualquier distancia.
    const cols = 600, rows = 24;
    const g = new THREE.PlaneGeometry(R.w, 1, cols, rows);
    const p = g.attributes.position;
    const colsArr = new Float32Array(p.count * 3), base = new THREE.Color(R.col), top = new THREE.Color(R.top), cc = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), f = p.getY(i) + 0.5; // 0 = pie, 1 = cresta
      const ridge = Math.max(0.08, fbm(x * 0.004 + R.seed, R.seed * 3.1, 7) * 1.5 - 0.25) * R.h;
      const shoulder = Math.pow(f, 0.7);
      const yv = ridge * shoulder - 3;
      p.setXYZ(i, x, yv, -(1 - f) * 0 - f * R.h * 0.9);
      const nn = fbm(x * 0.05, f * 9 + R.seed, 3);
      cc.copy(base).lerp(top, Math.min(1, Math.max(0, f * 1.2 - 0.35 + (nn - 0.5) * 0.4)));
      colsArr.set([cc.r, cc.g, cc.b], i * 3);
    }
    g.computeVertexNormals();
    g.setAttribute('color', new THREE.BufferAttribute(colsArr, 3));
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
    m.position.set(0, 0, R.z);
    group.add(m);
  }

  // ---------- Árboles ----------
  const r = rng(2024);
  const beechPts = [], pinePts = [];
  const N = q.trees;
  let guard = 0;
  while ((beechPts.length + pinePts.length) < N && guard++ < N * 40) {
    // densidad mayor junto al sendero de llegada y a los lados del lago
    const zone = r();
    let x, z;
    if (zone < 0.45) { x = (r() < 0.5 ? -1 : 1) * (3.5 + Math.pow(r(), 1.6) * 40); z = 14 + r() * 90; }
    else if (zone < 0.75) { x = (r() < 0.5 ? -1 : 1) * (18 + r() * 70); z = -60 + r() * 80; }
    else { x = (r() - 0.5) * 280; z = -200 + r() * 330; }
    if (blocked(x, z)) continue;
    if (z < shoreZ(x) + 3) continue;
    const y = terrainHeight(x, z) - 0.1;
    (r() < 0.55 ? beechPts : pinePts).push([x, y, z]);
  }
  // árbol del patio
  beechPts.push([-7.8, 0, 1.5]);
  const leafBeech = windMaterial({ map: leafTexture('beech'), color: 0xd8c9a0 }, 0.02);
  const leafPine = windMaterial({ map: leafTexture('pine'), color: 0xb8c0a8 }, 0.012);
  const tintLeaf = (c, rr) => c.setHSL(0.1 + rr() * 0.08, 0.35 + rr() * 0.25, 0.45 + rr() * 0.2);
  const variants = 3;
  for (let v = 0; v < variants; v++) {
    const bg = beechGeometry(11 + v), pg = pineGeometry(31 + v);
    const bp = beechPts.filter((_, i) => i % variants === v), pp = pinePts.filter((_, i) => i % variants === v);
    if (bp.length) {
      group.add(scatterInstanced(bg.leaves, leafBeech, bp, { scale: [0.8, 1.25], tint: tintLeaf }));
      group.add(scatterInstanced(bg.wood, M.bark, bp, { scale: [0.8, 1.25], tint: null }));
    }
    if (pp.length) {
      group.add(scatterInstanced(pg.leaves, leafPine, pp, { scale: [0.8, 1.3], tint: (c, rr) => c.setHSL(0.28 + rr() * 0.06, 0.2 + rr() * 0.2, 0.55 + rr() * 0.2) }));
      group.add(scatterInstanced(pg.wood, M.bark, pp, { scale: [0.8, 1.3], tint: null }));
    }
  }

  // ---------- Sotobosque ----------
  const fernPts = [], grassPts = [], rockPts = [];
  const nearPath = (x, z) => z > 12 && z < 85 && Math.abs(x) < 16;
  guard = 0;
  while (fernPts.length < q.ferns && guard++ < q.ferns * 30) {
    const x = (r() - 0.5) * 34, z = 14 + r() * 75;
    if (Math.abs(x) < 2.4) continue;
    fernPts.push([x, terrainHeight(x, z), z]);
  }
  // helechos junto a los muros del patio, fuera
  for (let i = 0; i < 40; i++) { const x = (r() < 0.5 ? -1 : 1) * (12.8 + r() * 4), z = -26 + r() * 40; if (!blocked(x * 1.5, z)) fernPts.push([x, terrainHeight(x, z), z]); else fernPts.push([x, -0.04, z]); }
  guard = 0;
  while (grassPts.length < q.grass && guard++ < q.grass * 20) {
    const x = (r() - 0.5) * 70, z = -45 + r() * 135;
    if (Math.abs(x) < 1.6 && z > 12) continue;           // senda pisada
    if (x > -17 && x < 17 && z > -27 && z < 13.2) continue; // dentro del edificio
    if (z < shoreZ(x) + 0.5) continue;
    if (!nearPath(x, z) && r() < 0.5) continue;
    grassPts.push([x, terrainHeight(x, z), z]);
  }
  for (let i = 0; i < q.rocks; i++) {
    let x, z;
    if (i < q.rocks * 0.5) { x = (r() < 0.5 ? -1 : 1) * (16 + r() * 40); z = shoreZ(x) + (r() - 0.3) * 4; }
    else { x = (r() - 0.5) * 50; z = 14 + r() * 70; if (Math.abs(x) < 2) x += 3; }
    rockPts.push([x, terrainHeight(x, z) - 0.15, z]);
  }
  const fernMat = windMaterial({ map: leafTexture('fern'), color: 0xa8a886 }, 0.05);
  group.add(scatterInstanced(fernGeometry(), fernMat, fernPts, { scale: [0.6, 1.3], tint: (c, rr) => c.setHSL(0.15 + rr() * 0.06, 0.3, 0.55 + rr() * 0.2), shadow: q.tier !== 'low' }));
  const grassMat = windMaterial({ color: 0x8a8150, alphaTest: 0 }, 0.22);
  group.add(scatterInstanced(grassGeometry(), grassMat, grassPts, { scale: [0.7, 1.4], tint: (c, rr) => c.setHSL(0.12 + rr() * 0.07, 0.22 + rr() * 0.15, 0.3 + rr() * 0.16), shadow: false }));
  const rockGeo = new THREE.IcosahedronGeometry(1, 3);
  {
    const p = rockGeo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = fbm(v.x * 1.5 + 3, v.z * 1.5 + v.y, 4); v.multiplyScalar(0.65 + n * 0.7); v.y *= 0.75; p.setXYZ(i, v.x, v.y, v.z); }
    rockGeo.computeVertexNormals();
    const uv = rockGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) * 0.5, p.getY(i) * 0.5 + p.getZ(i) * 0.3);
  }
  group.add(scatterInstanced(rockGeo, M.boulder, rockPts, { scale: [0.3, 1.6], tint: (c, rr) => c.setHSL(0.08, 0.1, 0.24 + rr() * 0.14) }));

  scene.add(group);
  return { group, water };
}
