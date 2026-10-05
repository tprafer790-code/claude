// Mobiliario, textiles, objetos y luminarias. Dan escala y carácter a la suite
// y a la terraza. Las luces puntuales se devuelven para animarlas por capítulo.
import * as THREE from 'three';
import { Builder, worldUV, rng } from './geo.js';

const F = 0.15; // cota del suelo interior

function lathe(points, mat, segs = 40) {
  const g = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segs);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// Perfil de torneado muestreado: r(t) con t ∈ [0,1] a lo largo de la altura h.
function profile(r, h, n = 24, y0 = 0) {
  const pts = [[0.001, y0]];
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push([Math.max(0.001, r(t)), y0 + t * h]); }
  pts.push([0.001, y0 + h]);
  return pts;
}

function cushion(mat, w, h, d, amount, uvScale = 0.6, seed = 1) {
  const g = new THREE.BoxGeometry(w, h, d, 16, 6, 12);
  const r = rng(seed);
  const ph = r() * 10;
  // Redondea esquinas y abomba caras: aspecto de pieza tapizada.
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const nx = (v.x / (w / 2)), ny = (v.y / (h / 2)), nz = (v.z / (d / 2));
    const bulge = (1 - nx * nx) * (1 - nz * nz);
    const k = Math.max(Math.abs(nx), Math.abs(nz));
    v.y *= 1 - 0.35 * Math.pow(k, 4);
    v.y += Math.sign(v.y) * bulge * amount * (h / 2) + Math.sin(v.x * 7 + ph) * Math.cos(v.z * 6) * 0.006;
    v.x *= 1 - 0.04 * ny * ny; v.z *= 1 - 0.04 * ny * ny;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  worldUV(g, uvScale);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function buildFurniture(M, scene, quality) {
  const group = new THREE.Group();
  group.name = 'mobiliario';
  const B = new Builder();
  const W = { uvScale: 1.4, r: 0.02 };
  const lights = [];

  // ---------- Dormitorio ----------
  // Cabecero exento de listones
  B.box(M.oak, [2.6, 6.9], [F, 1.58], [-8.72, -8.58], W);
  for (let x = 2.66; x < 6.86; x += 0.11) B.box(M.oak, [x, x + 0.075], [F + 0.04, 1.54], [-8.82, -8.72], { ...W, r: 0.012, solid: false });
  B.box(M.oak, [2.55, 6.95], [1.58, 1.64], [-8.86, -8.54], { ...W, r: 0.015, solid: false });
  // Mesillas
  for (const x of [3.15, 6.35]) {
    B.box(M.oak, [x - 0.3, x + 0.3], [F, 0.56], [-9.25, -8.88], W);
  }
  // Base de cama retranqueada y bastidor
  B.box(M.oak, [3.95, 5.55], [F, 0.3], [-10.9, -8.95], { ...W, solid: false });
  B.box(M.oak, [3.7, 5.8], [0.3, 0.44], [-11.15, -8.86], W);
  // Banco a los pies
  B.box(M.oak, [3.95, 5.55], [0.48, 0.54], [-11.75, -11.35], { ...W, solid: false });
  for (const x of [4.0, 5.45]) B.box(M.oak, [x, x + 0.1], [F, 0.48], [-11.7, -11.4], { ...W, solid: false, r: 0.01 });

  // Colchón, edredón, almohadas y manta (textiles con volumen)
  const mattress = cushion(M.linen, 2.04, 0.24, 2.2, 0.08, 0.5, 2); mattress.position.set(4.75, 0.57, -9.98);
  const duvet = cushion(M.linen, 2.16, 0.12, 1.72, 0.55, 0.5, 3); duvet.position.set(4.75, 0.74, -10.26);
  const pillowA = cushion(M.linenWarm, 0.82, 0.2, 0.46, 0.7, 0.4, 4); pillowA.position.set(4.28, 0.83, -9.18); pillowA.rotation.x = -0.35;
  const pillowB = cushion(M.linenWarm, 0.82, 0.2, 0.46, 0.7, 0.4, 5); pillowB.position.set(5.22, 0.83, -9.18); pillowB.rotation.x = -0.35;
  const throwB = cushion(M.wool, 2.26, 0.05, 0.6, 0.4, 0.35, 6); throwB.position.set(4.75, 0.82, -10.82);
  // la manta cae por los laterales
  {
    const p = throwB.geometry.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const e = Math.max(0, Math.abs(v.x) - 1.0); v.y -= e * e * 3.2; v.x -= Math.sign(v.x) * e * 0.55; p.setXYZ(i, v.x, v.y, v.z); }
    throwB.geometry.computeVertexNormals();
  }
  group.add(mattress, duvet, pillowA, pillowB, throwB);

  // Lámparas colgantes de papel junto a la cama
  for (const x of [3.2, 6.3]) {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 3.45 - 1.55, 4), M.blackSteel);
    cord.position.set(x, (3.45 + 1.55) / 2, -9.15);
    const shade = lathe(profile((t) => 0.185 * Math.pow(Math.sin(Math.PI * t), 0.75) + 0.001, 0.34, 28, -0.16), M.paperLamp, 48);
    shade.position.set(x, 1.38, -9.15); shade.castShadow = false;
    const cap = lathe([[0.001, 0.17], [0.035, 0.17], [0.035, 0.22], [0.001, 0.22]], M.brass, 16); cap.position.copy(shade.position).setY(1.38);
    group.add(cord, shade, cap);
  }
  // Una sola luz para las dos lámparas (centrada sobre el cabecero): mismo efecto
  // visual, la mitad de coste por píxel.
  const bedLight = new THREE.PointLight(0xffb470, 4.2, 8, 1.6); bedLight.position.set(4.75, 1.3, -9.4);
  lights.push(bedLight); group.add(bedLight);

  // Bañera exenta de piedra caliza junto al ventanal
  {
    const outer = cushion(M.limestonePolished, 1.85, 0.6, 0.92, 0.0, 1, 7);
    outer.position.set(5.5, F + 0.3, -16.5);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 10, 48), M.limestonePolished);
    rim.scale.set(0.82, 0.36, 1); rim.rotation.x = Math.PI / 2; rim.position.set(5.5, F + 0.6, -16.5);
    const water = new THREE.Mesh(new THREE.CircleGeometry(1, 48), M.poolWater);
    water.scale.set(0.8, 0.34, 1); water.rotation.x = -Math.PI / 2; water.position.set(5.5, F + 0.56, -16.5);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 10), M.brass);
    spout.position.set(6.55, F + 0.5, -16.5);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.28, 10), M.brass);
    arm.rotation.z = Math.PI / 2; arm.position.set(6.42, F + 0.98, -16.5);
    // plataforma de piedra: la bañera se asienta, no flota
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.7), M.coping); plinth.position.set(5.5, F + 0.04, -16.5); plinth.receiveShadow = true;
    outer.position.y += 0.08; rim.position.y += 0.08; water.position.y += 0.08;
    group.add(plinth, outer, rim, water, spout, arm);
    B.solids.push({ min: [4.55, 0, -17.0], max: [6.45, 0.8, -16.0] });
  }

  // Rincón de lectura: alfombra, butaca, mesa auxiliar y lámpara de pie
  B.box(M.rug, [-6.6, -2.4], [F, F + 0.025], [-18.8, -14.2], { uvScale: 0.5, r: 0.01, solid: false });
  {
    const chair = new THREE.Group();
    const seat = cushion(M.boucle, 0.86, 0.18, 0.78, 0.4, 0.4, 8); seat.position.set(0, 0.42, 0.04);
    const back = cushion(M.boucle, 0.86, 0.16, 0.62, 0.35, 0.4, 9); back.rotation.x = -1.35; back.position.set(0, 0.74, 0.42);
    const armL = cushion(M.boucle, 0.16, 0.5, 0.86, 0.2, 0.4, 10); armL.position.set(-0.5, 0.5, 0.06);
    const armR = armL.clone(); armR.position.x = 0.5;
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.22, 0.92), M.oak); base.position.set(0, 0.2, 0.06); base.castShadow = true;
    chair.add(seat, back, armL, armR, base);
    chair.position.set(-4.6, F, -16.2); chair.rotation.y = Math.PI + 0.55;
    group.add(chair);
    B.solids.push({ min: [-5.3, 0, -16.9], max: [-3.9, 1.1, -15.5] });
    const side = lathe([[0.001, 0], [0.26, 0], [0.24, 0.04], [0.2, 0.46], [0.27, 0.5], [0.001, 0.5]], M.limestonePolished, 40);
    side.position.set(-3.6, F, -17.0); group.add(side);
    const cup = lathe([[0.001, 0], [0.04, 0], [0.05, 0.08], [0.046, 0.08], [0.036, 0.004], [0.001, 0.004]], M.ceramicIron, 24);
    cup.position.set(-3.55, F + 0.5, -16.95); group.add(cup);
    // lámpara de pie
    const base2 = lathe([[0.001, 0], [0.18, 0], [0.17, 0.03], [0.001, 0.03]], M.bronze, 24); base2.position.set(-5.5, F, -17.3);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.5, 8), M.bronze); pole.position.set(-5.5, F + 0.75, -17.3);
    const drum = lathe([[0.22, 0], [0.19, 0.3]], M.paperLamp, 40); drum.position.set(-5.5, F + 1.38, -17.3); drum.castShadow = false;
    group.add(base2, pole, drum);
    const L = new THREE.PointLight(0xffb470, 2.4, 6, 1.6); L.position.set(-5.5, F + 1.5, -17.3);
    lights.push(L); group.add(L);
  }

  // Consola de roble con cerámica y libros (muro oeste)
  B.box(M.oak, [-9.5, -8.95], [0.78, 0.84], [-14.2, -10.2], W);
  for (const z of [-14.1, -10.4]) B.box(M.oak, [-9.45, -9.0], [F, 0.78], [z - 0.08, z + 0.08], W);
  B.box(M.oak, [-9.45, -9.0], [0.36, 0.4], [-14.1, -10.4], { ...W, solid: false });
  const vases = [
    { at: [-9.2, -12.65], mat: M.ceramicAsh, prof: [[0.001, 0], [0.07, 0], [0.12, 0.08], [0.13, 0.18], [0.08, 0.3], [0.045, 0.36], [0.05, 0.4], [0.042, 0.4], [0.035, 0.36]] },
    { at: [-9.18, -12.2], mat: M.ceramicIron, prof: [[0.001, 0], [0.09, 0], [0.1, 0.12], [0.06, 0.2], [0.07, 0.24], [0.062, 0.24], [0.05, 0.2]] },
    { at: [-9.25, -11.85], mat: M.ceramicCeladon, prof: [[0.001, 0], [0.05, 0], [0.06, 0.25], [0.045, 0.5], [0.03, 0.58], [0.036, 0.62], [0.03, 0.62], [0.022, 0.58]] },
    { at: [-9.15, -11.45], mat: M.ceramicBone, prof: [[0.001, 0], [0.1, 0], [0.16, 0.06], [0.17, 0.09], [0.16, 0.09], [0.12, 0.03]] },
  ];
  for (const v of vases) { const m = lathe(v.prof, v.mat, 40); m.position.set(v.at[0], 0.84, v.at[1]); group.add(m); }
  const books = [[0.42, 0.05, M.book1], [0.4, 0.04, M.book3], [0.44, 0.06, M.book2], [0.38, 0.035, M.book3]];
  let by = 0.84;
  books.forEach(([w, h, mat], i) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, h, w), mat);
    b.position.set(-9.2, by + h / 2, -13.5); b.rotation.y = (i % 2 ? 0.08 : -0.05); b.castShadow = true;
    by += h; group.add(b);
  });

  // Visillos de lino a los lados del ventanal (pliegues reales)
  for (const [x0, x1] of [[-9.4, -7.4], [7.4, 9.4]]) {
    const g = new THREE.PlaneGeometry(x1 - x0, 3.2, 60, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 13) * 0.05 + Math.sin(p.getX(i) * 4.7) * 0.03);
    g.computeVertexNormals();
    const c = new THREE.Mesh(g, M.sheer);
    c.position.set((x0 + x1) / 2, F + 1.62, -19.5);
    c.renderOrder = 3;
    group.add(c);
  }

  // Tabique-armario de roble exento: ordena la planta (dormitorio / sala de lectura)
  // y da escala. No llega al techo: la luz y los listones continúan por encima.
  B.box(M.oak, [-3.85, -3.25], [F, 2.6], [-15.0, -9.8], W);
  for (let z = -14.9; z < -9.85; z += 0.62) B.box(M.blackSteel, [-3.25, -3.23], [1.2, 1.5], [z + 0.29, z + 0.31], { r: 0, solid: false });
  // Alfombra de lana bajo la cama
  B.box(M.rug, [2.4, 7.1], [F, F + 0.02], [-12.6, -8.5], { uvScale: 0.5, r: 0.01, solid: false });
  // Jarrón de suelo con ramas secas junto al ventanal
  {
    const vase = lathe(profile((t) => 0.16 + 0.1 * Math.sin(t * Math.PI) - 0.07 * t, 0.85, 26), M.ceramicIron, 40);
    vase.position.set(7.0, F, -18.6); group.add(vase);
    const r = rng(5);
    for (let i = 0; i < 6; i++) {
      const len = 1.1 + r() * 0.7;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.012, len, 5), M.bark);
      b.geometry.translate(0, len / 2, 0);
      b.position.set(7.0, F + 0.8, -18.6); b.rotation.set((r() - 0.5) * 0.7, r() * 6, (r() - 0.5) * 0.7);
      group.add(b);
    }
  }
  // Cerámica en la mesilla y libro abierto en el banco
  { const v = lathe(profile((t) => 0.05 + 0.035 * Math.sin(t * Math.PI * 0.9), 0.22, 20), M.ceramicCeladon, 32); v.position.set(6.35, 0.56, -9.05); group.add(v); }
  { const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.24), M.book3); b.position.set(4.3, 0.555, -11.55); b.rotation.y = 0.2; group.add(b); }
  // Butaca baja junto a la cama, orientada al lago
  {
    const seat = cushion(M.wool, 0.7, 0.16, 0.7, 0.35, 0.4, 31); seat.position.set(1.9, F + 0.32, -12.9);
    const back = cushion(M.wool, 0.7, 0.14, 0.5, 0.3, 0.4, 32); back.rotation.x = -1.3; back.position.set(1.9, F + 0.6, -12.6);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.22, 0.74), M.oak); base.position.set(1.9, F + 0.12, -12.9); base.castShadow = true;
    const ch = new THREE.Group(); ch.add(seat, back, base); ch.rotation.y = 0.4;
    group.add(ch);
    B.solids.push({ min: [1.5, 0, -13.3], max: [2.3, 0.9, -12.5] });
  }

  // ---------- Terraza ----------
  for (const x of [4.6, 6.8]) {
    B.box(M.oak, [x - 0.36, x + 0.36], [F, 0.32], [-25.6, -23.4], W);
    const pad = cushion(M.linen, 0.66, 0.1, 1.5, 0.4, 0.5, 11 + x); pad.position.set(x, 0.37, -24.85);
    const backrest = cushion(M.linen, 0.66, 0.1, 0.7, 0.4, 0.5, 12 + x); backrest.position.set(x, 0.58, -23.82); backrest.rotation.x = 0.75;
    group.add(pad, backrest);
  }
  // Brasero de piedra con fuego (luz que parpadea)
  const bowl = lathe([[0.001, 0], [0.35, 0], [0.42, 0.06], [0.58, 0.32], [0.62, 0.42], [0.52, 0.42], [0.45, 0.3], [0.001, 0.3]], M.stoneDark, 48);
  bowl.position.set(-5.0, F, -23.6); group.add(bowl);
  const flames = new THREE.Group();
  const fr = rng(99);
  for (let i = 0; i < 7; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.07 + fr() * 0.07, 0.3 + fr() * 0.35, 8, 1, true), M.fire);
    f.position.set((fr() - 0.5) * 0.4, F + 0.5 + fr() * 0.1, -23.6 + (fr() - 0.5) * 0.4);
    f.position.x += -5.0;
    f.userData.phase = fr() * 6.28; f.userData.base = f.scale.clone();
    flames.add(f);
  }
  group.add(flames);
  const fireLight = new THREE.PointLight(0xff8a3a, 4, 9, 1.8); fireLight.position.set(-5.0, F + 0.9, -23.6);
  lights.push(fireLight); group.add(fireLight);
  for (const [x, z, ry] of [[-6.3, -22.6, 0.9], [-3.8, -22.5, -0.9]]) {
    const s = cushion(M.wool, 0.72, 0.36, 0.72, 0.18, 0.4, 20 + x); s.position.set(x, F + 0.2, z); s.rotation.y = ry;
    group.add(s);
  }

  // Relleno interior suave (sin sombras): evita que la suite quede en negro
  // fuera de la luz del ventanal y de las lámparas.
  const fill = new THREE.PointLight(0xffd2a6, 1.6, 16, 1.2); fill.position.set(0, 3.0, -12.5);
  lights.push(fill); group.add(fill);


  B.build(group);
  scene.add(group);

  const update = (t) => {
    for (const f of flames.children) {
      const s = 0.8 + 0.25 * Math.sin(t * 9 + f.userData.phase) + 0.1 * Math.sin(t * 23 + f.userData.phase * 2);
      f.scale.set(1, s, 1);
    }
    fireLight.intensity = 3.4 + Math.sin(t * 11) * 0.5 + Math.sin(t * 27.3) * 0.35;
  };
  return { group, lights, solids: B.solids, update };
}
