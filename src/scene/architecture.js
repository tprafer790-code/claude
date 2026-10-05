// Arquitectura del refugio. Ver docs/estudio/proyecto/planta.md para la planta.
// Todo se construye en coordenadas de mundo y se fusiona por material.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { Builder } from './geo.js';

export function buildArchitecture(M, scene, opts = {}) {
  const group = new THREE.Group();
  group.name = 'arquitectura';
  const B = new Builder();
  const S = { uvScale: 2.4 };          // piedra: 1 tesela = 2,4 m (6 hiladas de 40 cm)
  const P = { uvScale: 3, r: 0.01 };   // pavimento
  const W = { uvScale: 2.2, r: 0.01 }; // madera

  // ---------- Muro de acceso y pasaje cubierto ----------
  B.wallX(M.stone, [-16, 16], [0, 3.6], [12.4, 13.0], [[-1.95, 1.95, 0, 3.25]], S);
  B.box(M.coping, [-16.1, 16.1], [3.6, 3.72], [12.32, 13.08], { uvScale: 3, r: 0.02 });
  for (const sx of [-1, 1]) {
    // muros del pasaje (piedra exterior, roble interior)
    B.box(M.stone, sx < 0 ? [-2.0, -1.62] : [1.62, 2.0], [0, 3.05], [9.0, 12.4], S);
    B.box(M.oak, sx < 0 ? [-1.62, -1.56] : [1.56, 1.62], [0, 3.0], [9.05, 13.0], { ...W, solid: false });
  }
  // losa de cubierta del pasaje que vuela hacia el bosque
  B.box(M.oak, [-2.4, 2.4], [3.0, 3.28], [8.6, 15.2], { ...W, r: 0.02 });
  B.box(M.roofEdge, [-2.45, 2.45], [3.28, 3.34], [8.55, 15.25], { ...W, r: 0.01, solid: false });
  for (let z = 9.2; z < 15.0; z += 0.45) B.box(M.oakLight, [-1.56, 1.56], [2.86, 3.0], [z, z + 0.12], { ...W, solid: false, r: 0.008 });
  // umbral de piedra
  B.box(M.coping, [-1.56, 1.56], [-0.05, 0.02], [9.0, 13.2], { uvScale: 2, r: 0.01, solid: false });

  // ---------- Patio ----------
  for (const sx of [-1, 1]) {
    const xs = sx < 0 ? [-12.6, -12.0] : [12.0, 12.6];
    B.box(M.stone, xs, [0, 3.2], [-6.0, 12.4], S);
    B.box(M.coping, [xs[0] - 0.06, xs[1] + 0.06], [3.2, 3.3], [-6.0, 12.45], { uvScale: 3, r: 0.02, solid: false });
  }
  const pave = (xs, zs) => B.box(M.paving, xs, [-0.12, 0], zs, { ...P, solid: false });
  pave([-12, 0.6], [-6, 12.4]); pave([6.5, 12], [-6, 12.4]);
  pave([0.6, 6.5], [8.0, 12.4]); pave([0.6, 6.5], [-6, -4.0]);
  // estanque: albardilla de piedra oscura y vaso
  B.box(M.stoneDark, [0.6, 6.5], [-0.6, 0.04], [7.7, 8.0], { uvScale: 2, solid: false });
  B.box(M.stoneDark, [0.6, 6.5], [-0.6, 0.04], [-4.0, -3.7], { uvScale: 2, solid: false });
  B.box(M.stoneDark, [0.6, 0.9], [-0.6, 0.04], [-3.7, 7.7], { uvScale: 2, solid: false });
  B.box(M.stoneDark, [6.2, 6.5], [-0.6, 0.04], [-3.7, 7.7], { uvScale: 2, solid: false });
  let pool;
  if (opts.reflections) {
    pool = new Reflector(new THREE.PlaneGeometry(5.3, 11.4), { textureWidth: 768, textureHeight: 768, color: 0x6b6f66, clipBias: 0.003 });
    pool.rotation.x = -Math.PI / 2;
  } else {
    pool = new THREE.Mesh(new THREE.PlaneGeometry(5.3, 11.4).rotateX(-Math.PI / 2), M.poolWater);
    pool.receiveShadow = true;
  }
  pool.position.set(3.55, -0.05, 2.0);
  pool.name = 'estanque';
  group.add(pool);
  // parterre de grava con bordillo
  B.box(M.gravel, [-11, -4.6], [-0.1, 0.03], [-2.2, 5.2], { uvScale: 1.5, solid: false, r: 0.005 });
  B.box(M.stoneDark, [-11.1, -4.5], [-0.1, 0.06], [5.2, 5.32], { uvScale: 2, solid: false, r: 0.01 });
  B.box(M.stoneDark, [-11.1, -4.5], [-0.1, 0.06], [-2.32, -2.2], { uvScale: 2, solid: false, r: 0.01 });
  B.box(M.stoneDark, [-4.62, -4.5], [-0.1, 0.06], [-2.2, 5.2], { uvScale: 2, solid: false, r: 0.01 });
  // banco corrido de piedra
  B.box(M.coping, [-11.95, -11.25], [0, 0.46], [6.0, 11.2], { uvScale: 2, r: 0.03 });
  B.box(M.oak, [-11.9, -11.3], [0.46, 0.5], [6.4, 10.8], { ...W, solid: false });

  // ---------- Suite ----------
  const H = 3.6;
  // fachada sur con puerta y rasgadura horizontal
  B.wallX(M.stone, [-10, 10], [0, H], [-6.42, -6.0], [[-2.4, -0.8, 0, 2.75], [2.2, 8.2, 2.25, 2.65]], S);
  B.wallX(M.plaster, [-9.5, 9.5], [0.15, H], [-6.5, -6.42], [[-2.4, -0.8, 0, 2.75], [2.2, 8.2, 2.25, 2.65]], { uvScale: 3, r: 0.005, solid: false });
  B.box(M.bronze, [-2.48, -0.72], [2.75, 2.85], [-6.55, -5.95], { r: 0.01, solid: false });
  B.box(M.bronze, [-2.48, -2.4], [0, 2.85], [-6.55, -5.95], { r: 0.01, solid: false });
  B.box(M.bronze, [-0.8, -0.72], [0, 2.85], [-6.55, -5.95], { r: 0.01, solid: false });
  // hoja pivotante abierta (roble)
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.6, 1.5), M.oak);
  door.position.set(-0.95, 1.45, -7.3); door.rotation.y = 0.12; door.castShadow = true;
  group.add(door);
  // muros este y oeste
  for (const sx of [-1, 1]) {
    B.box(M.stone, sx < 0 ? [-10, -9.58] : [9.58, 10], [0, H], [-19.75, -6.0], S);
    // El muro tras la cama queda en piedra vista: textura y luz rasante de las lámparas.
    B.box(sx < 0 ? M.plaster : M.stone, sx < 0 ? [-9.58, -9.5] : [9.5, 9.58], [0.15, H], [-19.75, -6.5], sx < 0 ? { uvScale: 3, r: 0.005, solid: false } : { ...S, solid: false, uvOffset: [0.37, 0.11] });
  }
  // suelo interior de roble
  B.box(M.oakFloor, [-9.5, 9.5], [-0.05, 0.15], [-19.75, -6.42], { uvScale: 2.6, r: 0.004, solid: false });
  B.box(M.coping, [-2.4, -0.8], [-0.05, 0.15], [-6.42, -6.0], { uvScale: 2, solid: false, r: 0.01 });
  // cubierta: losa con canto fino que vuela sobre la terraza
  B.box(M.concrete, [-10.6, 10.6], [H - 0.12, H + 0.32], [-24.6, -5.4], { uvScale: 4, r: 0.02 });
  B.box(M.roofEdge, [-10.65, 10.65], [H + 0.32, H + 0.38], [-24.65, -5.35], { uvScale: 4, r: 0.01, solid: false });
  // ventanal: zócalo, dintel y montantes de bronce
  const zW = -19.75;
  B.box(M.bronze, [-9.5, 9.5], [0.15, 0.24], [zW - 0.08, zW + 0.08], { r: 0.01, solid: false });
  B.box(M.bronze, [-9.5, 9.5], [3.3, H - 0.12], [zW - 0.1, zW + 0.1], { r: 0.01, solid: false });
  for (const x of [-9.5, -5.35, -1.25, 1.25, 5.35, 9.5]) B.box(M.bronze, [x - 0.05, x + 0.05], [0.15, 3.35], [zW - 0.07, zW + 0.07], { r: 0.008, solid: false });
  const glassGeo = (x0, x1) => new THREE.PlaneGeometry(x1 - x0, 3.06);
  for (const [x0, x1] of [[-9.45, -5.4], [-5.3, -1.3], [1.3, 5.3], [5.4, 9.45]]) {
    const g = new THREE.Mesh(glassGeo(x0, x1), M.glass);
    g.position.set((x0 + x1) / 2, 0.24 + 1.53, zW); g.renderOrder = 2;
    group.add(g);
  }
  // hoja central corredera: se desplaza con el recorrido (capítulo IV)
  const slider = new THREE.Group();
  const sGlass = new THREE.Mesh(glassGeo(-1.2, 1.2), M.glass); sGlass.position.y = 1.77; sGlass.renderOrder = 2;
  // marco perimetral (solo aristas): cuatro barras
  const bar = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.07), M.bronze); m.position.set(x, y, 0); m.castShadow = true; return m; };
  slider.add(sGlass, bar(2.5, 0.06, 0, 0.24), bar(2.5, 0.06, 0, 3.3), bar(0.06, 3.1, -1.22, 1.77), bar(0.06, 3.1, 1.22, 1.77));
  slider.position.set(0, 0, zW + 0.14);
  slider.userData.closedX = 0; slider.userData.openX = 2.45;
  slider.name = 'hoja-corredera';
  group.add(slider);

  // techo de listones de roble (interior y alero continuo)
  const slat = new THREE.BoxGeometry(0.06, 0.09, 19.0);
  const nSlats = Math.floor(19 / 0.2);
  const slats = new THREE.InstancedMesh(slat, M.ceilingOak, nSlats);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < nSlats; i++) { m4.makeTranslation(-9.4 + i * 0.2, H - 0.17, -15.1); slats.setMatrixAt(i, m4); }
  slats.receiveShadow = true;
  group.add(slats);
  // banda de luz lineal oculta en el encuentro muro-techo
  B.box(M.warmGlow, [-9.45, 9.45], [H - 0.24, H - 0.22], [-6.62, -6.56], { solid: false, r: 0 });

  // ---------- Torre-linterna ----------
  B.box(M.stone, [-14.4, -10.0], [0, 7.4], [-18.4, -7.6], S);
  B.box(M.coping, [-14.5, -9.9], [7.4, 7.55], [-18.5, -7.5], { uvScale: 3, r: 0.02, solid: false });
  B.box(M.windowGlow, [-12.55, -11.85], [1.2, 6.4], [-7.62, -7.56], { solid: false, r: 0 });
  B.box(M.windowGlow, [-14.42, -14.36], [2.0, 5.6], [-13.4, -12.6], { solid: false, r: 0 });

  // ---------- Terraza, muro de contención y muelle ----------
  B.box(M.deck, [-10, 10], [-0.05, 0.15], [-26.5, -19.75], { uvScale: 1.8, r: 0.01, solid: false });
  B.box(M.stone, [-16, 16], [-2.2, 0.0], [-27.1, -26.5], S);
  B.box(M.coping, [-16, 16], [-0.02, 0.06], [-27.2, -26.4], { uvScale: 3, r: 0.02, solid: false });
  B.box(M.deck, [-1.1, 1.1], [-0.02, 0.15], [-35.4, -26.5], { uvScale: 1.8, r: 0.01, solid: false });
  B.box(M.deck, [-2.4, 2.4], [-0.02, 0.15], [-38.6, -35.4], { uvScale: 1.8, r: 0.01, solid: false });
  for (let z = -28; z > -38.6; z -= 2.1) {
    for (const x of z < -35.4 ? [-2.25, 2.25] : [-0.95, 0.95]) B.box(M.oak, [x - 0.1, x + 0.1], [-1.8, -0.02], [z - 0.1, z + 0.1], { ...W, solid: false });
  }
  // balizas bajas en el borde del muelle
  for (let z = -27.4; z > -38.4; z -= 2.2) {
    for (const x of z < -35.4 ? [-2.3, 2.3] : [-1.02, 1.02]) {
      B.box(M.bronze, [x - 0.05, x + 0.05], [0.15, 0.3], [z - 0.05, z + 0.05], { r: 0.01, solid: false });
      B.box(M.warmGlow, [x - 0.035, x + 0.035], [0.24, 0.285], [z - 0.051, z + 0.051], { r: 0, solid: false });
    }
  }
  // banco del mirador
  B.box(M.oak, [-2.25, -1.75], [0.15, 0.6], [-38.2, -36.0], { ...W, r: 0.03 });
  // Marco del mirador: repite la proporción del ventanal y encuadra el poniente.
  B.box(M.bronze, [-2.2, -2.04], [0.15, 3.1], [-38.5, -38.34], { r: 0.01, solid: false });
  B.box(M.bronze, [2.04, 2.2], [0.15, 3.1], [-38.5, -38.34], { r: 0.01, solid: false });
  B.box(M.bronze, [-2.2, 2.2], [3.1, 3.26], [-38.5, -38.34], { r: 0.01, solid: false });

  // balizas del sendero del patio
  for (const z of [10.4, 6.2, 2.0, -2.2]) {
    B.box(M.bronze, [-3.3, -3.1], [0, 0.55], [z - 0.1, z + 0.1], { r: 0.015, solid: false });
    B.box(M.warmGlow, [-3.27, -3.13], [0.44, 0.52], [z - 0.07, z + 0.07], { r: 0, solid: false });
  }

  B.build(group);
  scene.add(group);
  return { group, slider, solids: B.solids };
}
