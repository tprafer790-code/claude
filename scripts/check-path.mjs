// Comprueba que la trayectoria de cámara no atraviesa muros ni mobiliario.
// Muestrea la curva y mide la distancia a cada volumen sólido (AABB).
import * as THREE from 'three';
import { Journey } from '../src/journey/path.js';
import { buildArchitecture } from '../src/scene/architecture.js';
import { buildFurniture } from '../src/scene/furniture.js';

const M = new Proxy({}, { get: (t, k) => (t[k] ??= new THREE.MeshBasicMaterial()) });
const scene = new THREE.Scene();
const arch = buildArchitecture(M, scene);
const furn = buildFurniture(M, scene, { tier: 'high' });
const solids = [...arch.solids, ...furn.solids];
const J = new Journey();
const margin = 0.3; // plano cercano + cuerpo de cámara
let worst = { d: Infinity }, hits = [];
const pose = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
for (let i = 0; i <= 4000; i++) {
  const u = (i / 4000) * J.total;
  J.pose(u, 16 / 9, pose);
  const p = pose.pos;
  for (const s of solids) {
    const dx = Math.max(s.min[0] - p.x, 0, p.x - s.max[0]);
    const dy = Math.max(s.min[1] - p.y, 0, p.y - s.max[1]);
    const dz = Math.max(s.min[2] - p.z, 0, p.z - s.max[2]);
    const d = Math.hypot(dx, dy, dz);
    if (d < worst.d) worst = { d, u, p: p.toArray().map((v) => +v.toFixed(2)), s };
    if (d < margin) hits.push({ u: +u.toFixed(2), p: p.toArray().map((v) => +v.toFixed(2)), s });
  }
}
console.log(`Sólidos: ${solids.length} · muestras: 4001 · longitud: ${J.total.toFixed(2)} pantallas`);
console.log(`Distancia mínima: ${worst.d.toFixed(3)} m en u=${worst.u.toFixed(2)} pos=${worst.p}`);
if (hits.length) { console.log(`COLISIONES (<${margin} m): ${hits.length}`); console.log(hits.slice(0, 10)); process.exit(1); }
console.log(`OK: ninguna muestra a menos de ${margin} m de un sólido.`);
// Altura sobre el terreno (exterior): la cámara no debe quedar enterrada.
const { terrainHeight } = await import('../src/scene/landscape.js');
let minClear = Infinity, at = null;
for (let i = 0; i <= 2000; i++) {
  const u = (i / 2000) * J.total; J.pose(u, 16 / 9, pose);
  const p = pose.pos; if (p.z < 16 && p.z > -27) continue; // dentro del edificio: suelo construido
  const c = p.y - terrainHeight(p.x, p.z);
  if (c < minClear) { minClear = c; at = p.toArray().map((v) => +v.toFixed(2)); }
}
console.log(`Altura mínima sobre el terreno exterior: ${minClear.toFixed(2)} m en ${at}`);
if (minClear < 1.1) { console.log('ERROR: cámara demasiado baja respecto al terreno'); process.exit(1); }
