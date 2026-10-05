// Evaluación del recorrido: convierte progreso de scroll [0,1] en pose de cámara.
// Entre claves: Catmull-Rom centrípeta (posición y mirada) con smootherstep por
// tramo, de modo que la cámara acelera y frena en cada clave.
import * as THREE from 'three';
import { KEYS } from './keys.js';

const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);

export class Journey {
  constructor(keys = KEYS) {
    this.keys = keys;
    this.posCurve = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.pos)), false, 'centripetal');
    this.lookCurve = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.look)), false, 'centripetal');
    this.lookCurveP = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...(k.lookP || k.look))), false, 'centripetal');
    // Tabla de tramos en unidades de scroll.
    this.segments = [];
    let u = 0;
    keys.forEach((k, i) => {
      this.segments.push({ i, type: 'hold', a: u, b: u + k.hold }); u += k.hold;
      if (i < keys.length - 1) { this.segments.push({ i, type: 'move', a: u, b: u + k.move }); u += k.move; }
    });
    this.total = u;
    // Límites de capítulo en unidades (inicio de la primera clave de cada capítulo).
    this.chapterStart = [];
    keys.forEach((k, i) => { if (this.chapterStart[k.ch] === undefined) this.chapterStart[k.ch] = this.keyStart(i); });
    this.chapterStart.push(this.total);
  }

  keyStart(i) { return this.segments.find((s) => s.i === i && s.type === 'hold').a; }
  // Unidad en la que la clave queda centrada (mitad de su permanencia).
  keyCenter(i) { const s = this.segments.find((x) => x.i === i && x.type === 'hold'); return (s.a + s.b) / 2; }

  // Devuelve parámetro continuo de clave (k + fracción) y datos del tramo.
  locate(u) {
    u = Math.min(Math.max(u, 0), this.total);
    for (const s of this.segments) {
      if (u <= s.b || s === this.segments[this.segments.length - 1]) {
        if (s.type === 'hold') return { k: s.i, f: 0, seg: s, local: s.b > s.a ? (u - s.a) / (s.b - s.a) : 1 };
        const f = smoother((u - s.a) / (s.b - s.a));
        return { k: s.i, f, seg: s, local: (u - s.a) / (s.b - s.a) };
      }
    }
  }

  chapterAt(u) {
    let c = 0;
    for (let i = 0; i < this.chapterStart.length - 1; i++) if (u >= this.chapterStart[i] - 1e-6) c = i;
    return c;
  }

  // Pose para la unidad u. `aspect` ajusta el campo de visión en vertical.
  pose(u, aspect, out = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 45 }) {
    const L = this.locate(u);
    const n = this.keys.length - 1;
    const t = (L.k + L.f) / n;
    this.posCurve.getPoint(Math.min(1, t), out.pos);
    (aspect < 1 ? this.lookCurveP : this.lookCurve).getPoint(Math.min(1, t), out.look);
    const k0 = this.keys[L.k], k1 = this.keys[Math.min(n, L.k + 1)];
    out.fov = adaptFov(k0.fov + (k1.fov - k0.fov) * L.f, aspect);
    out.key = L.k; out.f = L.f; out.local = L.local; out.type = L.seg.type;
    return out;
  }

  // Pose fija de una clave (versión de movimiento reducido).
  keyPose(i, aspect) {
    const k = this.keys[i];
    return { pos: new THREE.Vector3(...k.pos), look: new THREE.Vector3(...(aspect < 1 && k.lookP ? k.lookP : k.look)), fov: adaptFov(k.fov, aspect), key: i, f: 0 };
  }
}

// En pantallas verticales se conserva ~78 % del campo horizontal de escritorio
// sin pasar de 76° verticales (evita la deformación de gran angular).
export function adaptFov(fov, aspect) {
  if (aspect >= 1.2) return fov;
  const ref = 16 / 9;
  const h = 2 * Math.atan(Math.tan((fov * Math.PI) / 360) * ref) * 0.78;
  const v = (2 * Math.atan(Math.tan(h / 2) / aspect) * 180) / Math.PI;
  return Math.min(76, Math.max(fov, v));
}
