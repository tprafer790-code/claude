// Claves de cámara del recorrido.
// hold: permanencia (en pantallas de scroll) sin desplazamiento en la clave.
// move: longitud de scroll del tramo hacia la clave siguiente.
// ch: índice de capítulo al que pertenece la clave.
// Ver docs/estudio/proyecto/planta.md.
export const KEYS = [
  // I · El descubrimiento — emerger del bosque y revelar el refugio
  { ch: 0, pos: [2.6, 9.4, 74], look: [0.4, 8.6, 30], fov: 40, hold: 0.35, move: 1.6 },
  { ch: 0, pos: [0.9, 10.0, 47], look: [0.1, 5.5, 8], fov: 38, hold: 0, move: 1.4 },
  { ch: 0, pos: [0.4, 5.4, 31], look: [-1.0, 1.6, -6], fov: 38, hold: 1.2, move: 1.3, still: true },
  // II · El umbral — pasaje cubierto y patio de agua
  { ch: 1, pos: [0.0, 1.65, 16.5], look: [0.0, 1.7, 0], fov: 44, hold: 0.2, move: 0.9 },
  { ch: 1, pos: [0.0, 1.65, 10.4], look: [0.6, 1.5, 0], fov: 50, hold: 0, move: 1.0 },
  { ch: 1, pos: [-1.5, 1.7, 6.2], look: [2.8, 0.9, -3.5], fov: 48, hold: 1.2, move: 1.2, still: true },
  { ch: 1, pos: [-1.6, 1.68, -1.5], look: [-1.6, 1.6, -10], fov: 46, hold: 0, move: 0.9 },
  // III · La estancia — interior de la suite
  { ch: 2, pos: [-1.6, 1.8, -6.3], look: [-0.6, 1.5, -12], fov: 50, hold: 0, move: 1.0 },
  { ch: 2, pos: [-1.9, 1.7, -8.4], look: [4.2, 0.9, -13.2], fov: 52, hold: 1.6, move: 1.2, still: true, hotspots: true },
  { ch: 2, pos: [0.2, 1.72, -13.8], look: [1.6, 1.2, -24], fov: 52, hold: 0.8, move: 1.0, hotspots: true },
  // IV · La apertura — el ventanal se desliza, salimos a la terraza
  { ch: 3, pos: [0.0, 1.72, -18.2], look: [0.0, 1.6, -40], fov: 50, hold: 1.0, move: 1.1, still: true, slide: true },
  { ch: 3, pos: [0.0, 1.72, -23.6], look: [-6, 2.2, -80], fov: 58, hold: 0.6, move: 1.4 },
  // V · La llegada — muelle y mirador al atardecer
  { ch: 4, pos: [0.0, 1.66, -29.5], look: [-10, 2.4, -160], fov: 56, hold: 0.4, move: 1.2 },
  { ch: 4, pos: [0.9, 1.75, -33.6], look: [-26, 5, -300], fov: 50, hold: 1.4, move: 0, still: true },
];

// Hora del día por capítulo: elevación solar en grados (el sol baja con el recorrido).
export const SUN_ELEVATION = [11, 9, 7, 4.5, 1.6];
export const SUN_AZIMUTH = -17; // grados respecto a −Z, hacia el oeste
