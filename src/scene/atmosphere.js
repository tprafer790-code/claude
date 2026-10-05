// Cielo, sol, niebla, luz ambiental y mapa de entorno. La hora del día se
// interpola con el progreso del recorrido (el sol baja capítulo a capítulo).
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { SUN_ELEVATION, SUN_AZIMUTH } from '../journey/keys.js';

export function buildAtmosphere(scene, renderer, q) {
  const sky = new Sky();
  sky.scale.setScalar(4500);
  const U = sky.material.uniforms;
  U.turbidity.value = 4.2; U.rayleigh.value = 2.4; U.mieCoefficient.value = 0.0035; U.mieDirectionalG.value = 0.9;
  scene.add(sky);

  const sun = new THREE.DirectionalLight(0xffc690, 3.2);
  sun.castShadow = q.shadows;
  if (q.shadows) {
    sun.shadow.mapSize.set(q.shadowSize, q.shadowSize);
    const c = sun.shadow.camera;
    c.left = -34; c.right = 34; c.top = 34; c.bottom = -34; c.near = 1; c.far = 200;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
    sun.shadow.radius = 4;
  }
  scene.add(sun, sun.target);
  sun.target.position.set(0, 0, -8);

  const hemi = new THREE.HemisphereLight(0xd9cfc2, 0x4a3a2a, 0.55);
  scene.add(hemi);

  scene.fog = new THREE.FogExp2(0xd6a985, 0.0024);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new Sky(); envSky.scale.setScalar(1000); envScene.add(envSky);
  let envRT = null, envElevation = null;

  const sunDir = new THREE.Vector3();
  const fogWarm = new THREE.Color(0xc9a68a), fogDusk = new THREE.Color(0xb47f66);
  const sunHigh = new THREE.Color(0xffd3a0), sunLow = new THREE.Color(0xff9a52);

  function setElevation(elev) {
    const phi = THREE.MathUtils.degToRad(90 - elev);
    const theta = THREE.MathUtils.degToRad(180 - SUN_AZIMUTH); // azimut negativo = oeste (−X)
    sunDir.setFromSphericalCoords(1, phi, theta);
    U.sunPosition.value.copy(sunDir);
    sun.position.copy(sunDir).multiplyScalar(90).add(sun.target.position);
    const t = THREE.MathUtils.clamp((elev - 1.5) / 10, 0, 1);
    sun.color.copy(sunLow).lerp(sunHigh, t);
    sun.intensity = 1.6 + 2.0 * t;
    hemi.intensity = 0.35 + 0.3 * t;
    scene.fog.color.copy(fogDusk).lerp(fogWarm, t);
    // El entorno (reflejos) se regenera solo cuando la hora cambia de forma apreciable.
    if (envElevation === null || Math.abs(envElevation - elev) > 1.2) {
      envSky.material.uniforms.sunPosition.value.copy(sunDir);
      for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) envSky.material.uniforms[k].value = U[k].value;
      const next = pmrem.fromScene(envScene, 0, 0.1, 2000);
      if (envRT) envRT.dispose();
      envRT = next; scene.environment = envRT.texture; envElevation = elev;
    }
  }

  // Elevación continua a partir del capítulo fraccionario.
  function update(chapterFloat) {
    const i = Math.floor(chapterFloat), f = chapterFloat - i;
    const a = SUN_ELEVATION[Math.min(i, SUN_ELEVATION.length - 1)];
    const b = SUN_ELEVATION[Math.min(i + 1, SUN_ELEVATION.length - 1)];
    setElevation(a + (b - a) * f);
  }

  setElevation(SUN_ELEVATION[0]);
  return { sky, sun, hemi, sunDir, update };
}
