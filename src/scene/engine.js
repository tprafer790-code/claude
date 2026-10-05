// Motor de la escena: renderer, construcción progresiva, postprocesado,
// calidad adaptativa y API para la interfaz (pose de cámara, hotspots, capturas).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { textureJobs, textureLabels } from './textures.js';
import { createMaterials } from './materials.js';
import { buildArchitecture } from './architecture.js';
import { buildFurniture } from './furniture.js';
import { buildLandscape, wind } from './landscape.js';
import { buildAtmosphere } from './atmosphere.js';
import { Journey } from '../journey/path.js';

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

// Gradación final: viñeta, grano fino y levantamiento cálido de sombras.
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: 0.32 }, uGrain: { value: 0.035 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uVignette, uGrain; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5; float v = 1.0 - uVignette * smoothstep(0.25, 0.85, dot(d, d) * 2.2);
      c.rgb *= v;
      c.rgb += vec3(0.012, 0.007, 0.0) * (1.0 - smoothstep(0.0, 0.3, dot(c.rgb, vec3(0.33))));
      float g = h(vUv * 1000.0 + uTime) - 0.5;
      c.rgb += g * uGrain * (0.4 + 0.6 * (1.0 - dot(c.rgb, vec3(0.33))));
      gl_FragColor = c;
    }`,
};

export function detectQuality() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(innerWidth, innerHeight) < 600 || innerWidth < 820;
  const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 4;
  let tier = 'high';
  if (coarse || small) tier = 'low';
  else if (mem <= 4 || cores <= 4) tier = 'medium';
  const sp = new URLSearchParams(location.search);
  const forced = sp.get('q');
  if (['high', 'medium', 'low'].includes(forced)) tier = forced;
  const capture = sp.has('capture');
  const presets = {
    high: { textureSize: 1024, shadows: true, shadowSize: 2048, bloom: true, waterReflections: true, maxDpr: 2, trees: 520, ferns: 520, grass: 9000, rocks: 140 },
    medium: { textureSize: 1024, shadows: true, shadowSize: 1024, bloom: true, waterReflections: true, maxDpr: 1.5, trees: 380, ferns: 340, grass: 5000, rocks: 100 },
    low: { textureSize: 512, shadows: true, shadowSize: 1024, bloom: false, waterReflections: false, maxDpr: 1.5, trees: 230, ferns: 200, grass: 2200, rocks: 60 },
  };
  const q = { tier, ...presets[tier], fixedDpr: capture };
  if (capture) q.maxDpr = +(sp.get('dpr') || 1);
  return q;
}

export async function createEngine(canvas, q, onProgress = () => {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !q.bloom, powerPreference: 'high-performance', alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, q.maxDpr));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.78;
  renderer.shadowMap.enabled = q.shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = true;
  const gl = renderer.getContext();
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'desconocido';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.08, 6000);
  const journey = new Journey();

  // ---------- Construcción con progreso real ----------
  const jobs = textureJobs(q);
  const steps = jobs.length + 5;
  let done = 0;
  const tick = async (label) => { done++; onProgress(done / steps, label); await nextFrame(); };
  const T = {};
  for (const [id, gen] of jobs) {
    T[id] = gen();
    for (const t of Object.values(T[id])) t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    await tick(`Textura · ${textureLabels[id]}`);
  }
  const M = createMaterials(T);
  M.__waterNormals = T.water.normalMap;
  const atmo = buildAtmosphere(scene, renderer, q);
  await tick('Cielo y luz de atardecer');
  const arch = buildArchitecture(M, scene, { reflections: q.waterReflections });
  await tick('Arquitectura');
  const furn = buildFurniture(M, scene, q);
  await tick('Mobiliario y textiles');
  const land = buildLandscape(M, scene, q, atmo.sunDir);
  await tick('Bosque, lago y montañas');

  // ---------- Postprocesado ----------
  let composer = null, grade = null, bloom = null;
  if (q.bloom) {
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.32, 0.55, 0.88);
    composer.addPass(bloom);
    grade = new ShaderPass(GradeShader);
    composer.addPass(grade);
    composer.addPass(new OutputPass());
  }

  // Compila sombreadores antes de mostrar la escena (evita tirones en el primer recorrido).
  camera.position.set(0, 2, 40); camera.lookAt(0, 2, 0);
  if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
  else renderer.compile(scene, camera);
  await tick('Compilando sombreadores');

  // ---------- Estado ----------
  const pose = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 40 };
  const ov = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 40 };
  const curLook = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  let dpr = renderer.getPixelRatio();
  const stats = { frames: 0, avg: 16.7, dpr, gpu, tier: q.tier, drawCalls: 0, triangles: 0 };
  const clock = new THREE.Clock();
  const k10 = journey.keys.findIndex((k) => k.slide);
  const slideA = journey.keyStart(k10), slideH = journey.keys[k10].hold;

  function resize() {
    const w = innerWidth, h = innerHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
  }
  resize();

  // Ajuste de resolución según el tiempo medio de fotograma medido.
  let adaptTimer = 0;
  function adapt(dt) {
    stats.avg = stats.avg * 0.95 + dt * 1000 * 0.05;
    adaptTimer += dt;
    if (adaptTimer < 2) return;
    adaptTimer = 0;
    const max = Math.min(devicePixelRatio, q.maxDpr);
    if (stats.avg > 30 && dpr > 0.6) dpr = Math.max(0.6, dpr - 0.15);
    else if (stats.avg < 15 && dpr < max) dpr = Math.min(max, dpr + 0.1);
    if (Math.abs(dpr - renderer.getPixelRatio()) > 0.01) { renderer.setPixelRatio(dpr); resize(); }
    stats.dpr = dpr;
  }

  /**
   * u: unidades de recorrido · opts.pointer: [-1,1]² · opts.override: pose alternativa
   * (perspectiva de detalle) y opts.blend su peso · opts.still: sin animación ambiental.
   */
  function frame(u, opts = {}) {
    const dt = Math.min(0.1, clock.getDelta());
    const t = clock.elapsedTime;
    const aspect = innerWidth / innerHeight;
    if (opts.keyPose !== undefined) Object.assign(pose, journey.keyPose(opts.keyPose, aspect));
    else journey.pose(u, aspect, pose);

    let pos = pose.pos, look = pose.look, fov = pose.fov;
    if (opts.override && opts.blend > 0.001) {
      const o = opts.override, b = opts.blend;
      ov.pos.set(...o.pos); ov.look.set(...o.look);
      pos = tmp.copy(pose.pos).lerp(ov.pos, b);
      look = curLook.copy(pose.look).lerp(ov.look, b);
      fov = pose.fov + (o.fov - pose.fov) * b;
    } else look = curLook.copy(look);
    camera.position.copy(pos);
    if (!opts.still) {
      camera.position.y += Math.sin(t * 0.7) * 0.012;
      if (opts.pointer) { look.x += opts.pointer[0] * 0.35; look.y -= opts.pointer[1] * 0.2; }
    }
    camera.lookAt(look);
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }

    // Hora del día y hoja corredera ligadas al recorrido.
    const uu = opts.keyPose !== undefined ? journey.keyCenter(opts.keyPose) : u;
    const ch = journey.chapterAt(uu);
    const cs = journey.chapterStart;
    atmo.update(ch + Math.min(1, (uu - cs[ch]) / (cs[ch + 1] - cs[ch])));
    const open = THREE.MathUtils.smoothstep(uu, slideA + slideH * 0.1, slideA + slideH * 0.75);
    arch.slider.position.x = arch.slider.userData.openX * open;

    if (!opts.still) { wind.value = t; furn.update(t); }
    if (land.water.material.uniforms) land.water.material.uniforms.time.value = opts.still ? 0 : t * 0.35;
    if (land.water.material.uniforms) land.water.material.uniforms.sunDirection.value.copy(atmo.sunDir);
    if (grade) grade.uniforms.uTime.value = opts.still ? 0 : t % 100;

    if (composer) composer.render(dt); else renderer.render(scene, camera);
    stats.frames++; stats.drawCalls = renderer.info.render.calls; stats.triangles = renderer.info.render.triangles;
    if (!opts.still && !q.fixedDpr) adapt(dt);
    return { chapter: ch, key: pose.key };
  }

  // Proyección de puntos 3D a la pantalla (hotspots).
  function project(p3, out = {}) {
    tmp.set(p3[0], p3[1], p3[2]);
    const dist = tmp.distanceTo(camera.position);
    tmp.project(camera);
    out.x = (tmp.x * 0.5 + 0.5) * innerWidth;
    out.y = (-tmp.y * 0.5 + 0.5) * innerHeight;
    out.visible = tmp.z < 1 && Math.abs(tmp.x) < 0.92 && Math.abs(tmp.y) < 0.85 && dist < 10;
    return out;
  }

  function snapshot(type = 'image/webp', quality = 0.86) {
    return canvas.toDataURL(type, quality);
  }

  return { renderer, scene, camera, journey, frame, resize, project, snapshot, stats, quality: q };
}
