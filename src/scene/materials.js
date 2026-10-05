// Biblioteca de materiales PBR a partir de las texturas procedurales.
import * as THREE from 'three';

export function createMaterials(T) {
  const pbr = (tex, o = {}) => new THREE.MeshStandardMaterial({
    map: tex?.map, normalMap: tex?.normalMap, roughnessMap: tex?.roughnessMap,
    roughness: 1, metalness: 0, ...o,
  });
  const ns = (v) => new THREE.Vector2(v, v);

  const M = {
    stone: pbr(T.stone, { normalScale: ns(1.0) }),
    stoneDark: pbr(T.stone, { color: 0x8d7d6a, normalScale: ns(1.1) }),
    coping: pbr(T.paving, { color: 0xd9ccb8, normalScale: ns(0.6) }),
    paving: pbr(T.paving, { color: 0xf0e2cc, normalScale: ns(0.7) }),
    plaster: pbr(T.plaster, { normalScale: ns(0.5) }),
    oakFloor: pbr(T.oakFloor, { normalScale: ns(0.35) }),
    deck: pbr(T.deck, { normalScale: ns(0.8) }),
    oak: pbr(T.oak, { normalScale: ns(0.25) }),
    oakLight: pbr(T.oak, { color: 0xc8a27a, normalScale: ns(0.25) }),
    linen: pbr(T.linen, { normalScale: ns(0.6) }),
    linenWarm: pbr(T.linen, { color: 0xe2cfb3, normalScale: ns(0.6) }),
    wool: pbr(T.wool, { normalScale: ns(0.9) }),
    boucle: pbr(T.boucle, { normalScale: ns(1.2) }),
    rug: pbr(T.wool, { color: 0xd9c7aa, normalScale: ns(1.2) }),
    concrete: pbr(T.plaster, { color: 0x9d968c, normalScale: ns(0.7) }),
    ceilingOak: pbr(T.oak, { color: 0xf3dcb8, normalScale: ns(0.2) }),
    roofEdge: pbr(T.oak, { color: 0x6c5844 }),
    forestFloor: pbr(T.forestFloor, { normalScale: ns(1.2) }),
    gravel: pbr(T.gravel, { normalScale: ns(1.0) }),
    bark: pbr(T.bark, { normalScale: ns(1.4) }),
    bronze: new THREE.MeshStandardMaterial({ color: 0x5b4632, metalness: 0.85, roughness: 0.38 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xb48a52, metalness: 0.9, roughness: 0.3 }),
    blackSteel: new THREE.MeshStandardMaterial({ color: 0x1c1a18, metalness: 0.6, roughness: 0.5 }),
    limestonePolished: pbr(T.paving, { color: 0xe9dfcf, roughness: 0.35, normalScale: ns(0.25) }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xbfc8c4, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.16,
      envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide,
    }),
    sheer: new THREE.MeshStandardMaterial({
      map: T.linen.map, color: 0xf2e9da, transparent: true, opacity: 0.55, roughness: 1,
      side: THREE.DoubleSide, depthWrite: false,
    }),
    poolWater: new THREE.MeshPhysicalMaterial({
      color: 0x16211f, roughness: 0.03, metalness: 0, normalMap: T.water.normalMap,
      normalScale: ns(0.15), envMapIntensity: 1.2, clearcoat: 1, clearcoatRoughness: 0.02,
    }),
    // Pantallas y fuentes de luz: emisivas, alimentan el bloom.
    paperLamp: new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffc27a, emissiveIntensity: 2.4, roughness: 1, side: THREE.DoubleSide }),
    warmGlow: new THREE.MeshBasicMaterial({ color: 0xffb46a }),
    windowGlow: new THREE.MeshStandardMaterial({ color: 0x241a12, emissive: 0xffa95c, emissiveIntensity: 1.4 }),
    fire: new THREE.MeshBasicMaterial({ color: 0xff8a3a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
    ceramicAsh: new THREE.MeshPhysicalMaterial({ color: 0x8f8a7c, roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
    ceramicIron: new THREE.MeshPhysicalMaterial({ color: 0x3a2a20, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    ceramicCeladon: new THREE.MeshPhysicalMaterial({ color: 0xa8b39c, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 }),
    ceramicBone: new THREE.MeshPhysicalMaterial({ color: 0xe0d6c4, roughness: 0.6 }),
    book1: new THREE.MeshStandardMaterial({ color: 0x6e3b2a, roughness: 0.8 }),
    book2: new THREE.MeshStandardMaterial({ color: 0x2f3b33, roughness: 0.8 }),
    book3: new THREE.MeshStandardMaterial({ color: 0xc9b99b, roughness: 0.85 }),
    rock: pbr(T.stone, { color: 0xa39a8b, normalScale: ns(1.6) }),
  };
  // Escala de UV de los tejidos: más fina en tela que en piedra.
  return M;
}
