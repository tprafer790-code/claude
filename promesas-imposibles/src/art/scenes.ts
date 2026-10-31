// Escenarios recortables en SVG (1280×720). Reaccionan al estado del país.
// Los textos traducibles NO se dibujan aquí: la interfaz los superpone como HTML.
import type { CountryId, HotspotId, SceneId } from '../core/types';
import { INK, PAL } from './palette';

const O = `stroke="${INK}" stroke-width="4" stroke-linejoin="round"`;
const o2 = `stroke="${INK}" stroke-width="3" stroke-linejoin="round"`;

export interface SceneOpts {
  country: CountryId;
  partyColor: string;
  rivalColor?: string;
  /** 0-100: deterioro/mejora visibles */
  wellbeing?: number;
  unrest?: number;
  round?: number;
  night?: boolean;
  /** Escaños para el hemiciclo: lista de [color, n] */
  seats?: [string, number][];
  /** Votos en el hemiciclo, misma longitud que seats expandidos */
  seatVotes?: ('yes' | 'no' | 'abstain' | null)[];
  crowd?: number;
}

/** Posición de los objetos interactivos (porcentaje del escenario) */
export const HOTSPOTS: Partial<Record<SceneId, Partial<Record<HotspotId, { x: number; y: number }>>>> = {
  // El tercio derecho queda libre de objetos: ahí va la agenda lateral en horizontal.
  office: { phone: { x: 59, y: 57 }, desk: { x: 47, y: 66 }, tv: { x: 26, y: 48 }, door: { x: 8, y: 52 }, folder: { x: 68, y: 56 }, map: { x: 27, y: 21 } },
  hq: { phone: { x: 35.5, y: 54 }, desk: { x: 61, y: 62 }, tv: { x: 21, y: 42 }, door: { x: 7.5, y: 50 }, folder: { x: 50, y: 54 }, map: { x: 62, y: 21 } },
};

export function flagSVG(c: CountryId, w = 90, h = 60): string {
  if (c === 'es') return `<g><rect width="${w}" height="${h}" fill="${PAL.red}"/><rect y="${h / 4}" width="${w}" height="${h / 2}" fill="${PAL.yellow}"/><rect width="${w}" height="${h}" fill="none" ${o2}/></g>`;
  if (c === 'us') {
    let s = `<rect width="${w}" height="${h}" fill="#fff"/>`;
    for (let i = 0; i < 7; i++) s += `<rect y="${(i * 2 * h) / 13}" width="${w}" height="${h / 13}" fill="${PAL.red}"/>`;
    s += `<rect width="${w * 0.42}" height="${(h * 7) / 13}" fill="${PAL.blue}"/>`;
    for (let r = 0; r < 4; r++) for (let q = 0; q < 5; q++) s += `<circle cx="${4 + q * (w * 0.42 - 8) / 4}" cy="${4 + r * ((h * 7) / 13 - 8) / 3}" r="1.6" fill="#fff"/>`;
    return `<g>${s}<rect width="${w}" height="${h}" fill="none" ${o2}/></g>`;
  }
  return `<g><rect width="${w}" height="${h}" fill="${PAL.green}"/><path d="M${w / 2} 5 L${w - 6} ${h / 2} L${w / 2} ${h - 5} L6 ${h / 2} Z" fill="${PAL.yellow}"/><circle cx="${w / 2}" cy="${h / 2}" r="${h / 4.2}" fill="#1f4aa8"/><path d="M${w / 2 - h / 4.2} ${h / 2 - 2} Q${w / 2} ${h / 2 - 8} ${w / 2 + h / 4.2} ${h / 2 + 2}" stroke="#fff" stroke-width="2" fill="none"/><rect width="${w}" height="${h}" fill="none" ${o2}/></g>`;
}

function skyline(y: number, night: boolean): string {
  const col = night ? '#3a3f6b' : '#9bb7d4';
  const win = night ? '#ffe27a' : '#dfeefa';
  let s = '';
  const xs = [0, 90, 170, 260, 330, 430, 520, 600, 700, 790, 880, 960, 1060, 1150, 1230];
  xs.forEach((x, i) => {
    const h = 80 + ((i * 53) % 120);
    s += `<rect x="${x}" y="${y - h}" width="${70 + (i % 3) * 14}" height="${h}" fill="${col}" stroke="${INK}" stroke-width="2"/>`;
    for (let r = 0; r < Math.floor(h / 28); r++) s += `<rect x="${x + 12}" y="${y - h + 12 + r * 26}" width="12" height="12" fill="${win}"/><rect x="${x + 40}" y="${y - h + 12 + r * 26}" width="12" height="12" fill="${(r + i) % 3 ? win : col}"/>`;
  });
  return s;
}

function plant(x: number, y: number, s = 1, dead = false): string {
  const leaf = dead ? '#9a8a4a' : PAL.green;
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-22 0 L22 0 L16 40 L-16 40 Z" fill="#c96a3a" ${O}/><g fill="${leaf}" ${o2}><ellipse cx="-14" cy="-26" rx="12" ry="26" transform="rotate(-25 -14 -26)"/><ellipse cx="14" cy="-26" rx="12" ry="26" transform="rotate(25 14 -26)"/><ellipse cx="0" cy="-38" rx="12" ry="30"/></g></g>`;
}

function protesters(n: number, y: number, color: string): string {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = 60 + i * (1160 / Math.max(1, n));
    const h = 26 + (i % 3) * 6;
    s += `<g class="sc-protester" style="animation-delay:${(i % 5) * 0.13}s"><circle cx="${x}" cy="${y - h - 18}" r="14" fill="${PAL.skin[i % 5]}" ${o2}/><rect x="${x - 11}" y="${y - h - 4}" width="22" height="${h}" fill="${[PAL.purple, PAL.teal, PAL.orange, PAL.red][i % 4]}" ${o2}/>${i % 2 ? `<path d="M${x + 10} ${y - h - 4} L${x + 16} ${y - h - 50}" stroke="${INK}" stroke-width="3"/><rect x="${x - 6}" y="${y - h - 80}" width="46" height="30" fill="#fff" ${o2}/><path d="M${x} ${y - h - 70} L${x + 34} ${y - h - 70} M${x} ${y - h - 60} L${x + 26} ${y - h - 60}" stroke="${color}" stroke-width="4"/>` : ''}</g>`;
  }
  return s;
}

export function sceneSVG(id: SceneId, o: SceneOpts): string {
  const body = SCENES[id](o);
  return `<svg class="scene scene-${id}" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
}

const SCENES: Record<SceneId, (o: SceneOpts) => string> = {
  // ── Sede electoral modesta ───────────────────────────────────────────
  hq: (o) => `
    <rect width="1280" height="720" fill="#f0d9a8"/>
    <rect y="0" width="1280" height="40" fill="#e4c88f"/>
    <g opacity=".25" stroke="#b88f50" stroke-width="3">${Array.from({ length: 16 }, (_, i) => `<path d="M${i * 80} 40 L${i * 80} 540"/>`).join('')}</g>
    <rect y="540" width="1280" height="180" fill="${PAL.wood}"/>
    <g stroke="${PAL.woodDark}" stroke-width="3">${Array.from({ length: 7 }, (_, i) => `<path d="M0 ${560 + i * 26} L1280 ${560 + i * 26}"/>`).join('')}</g>
    <path d="M0 540 L1280 540" stroke="${INK}" stroke-width="5"/>
    <!-- ventana a la calle -->
    <g transform="translate(960 90)"><rect width="250" height="200" fill="${PAL.sky}" ${O}/>${`<g transform="translate(0 200) scale(.2 .3)">${skyline(0, !!o.night)}</g>`}<path d="M125 0 L125 200 M0 100 L250 100" stroke="${INK}" stroke-width="6"/><rect x="-10" y="196" width="270" height="16" fill="#e8e8e8" ${O}/></g>
    <!-- carteles de campaña -->
    <g transform="translate(380 70) rotate(-3)"><rect width="150" height="200" fill="${o.partyColor}" ${O}/><circle cx="75" cy="80" r="45" fill="#fff" ${o2}/><rect x="20" y="145" width="110" height="18" fill="#fff"/><rect x="35" y="172" width="80" height="10" fill="#fff" opacity=".7"/></g>
    <g transform="translate(560 90) rotate(2)"><rect width="130" height="170" fill="#fff" ${O}/><rect x="15" y="20" width="100" height="12" fill="${o.partyColor}"/><rect x="15" y="44" width="80" height="8" fill="#aaa"/><rect x="15" y="60" width="90" height="8" fill="#aaa"/><path d="M20 110 L110 110 L110 150 L20 150 Z" fill="${PAL.yellow}" opacity=".6"/></g>
    <!-- corcho con notas: el mapa de campaña -->
    <g transform="translate(700 70)"><rect width="230" height="160" fill="#c8945b" ${O}/>${[PAL.yellow, PAL.pink, PAL.teal, PAL.yellow, PAL.orange].map((c, i) => `<rect x="${16 + i * 42}" y="${20 + (i % 2) * 54}" width="34" height="34" fill="${c}" transform="rotate(${(i % 3) * 4 - 4} ${33 + i * 42} ${37 + (i % 2) * 54})"/>`).join('')}<path d="M30 130 L200 130" stroke="${PAL.red}" stroke-width="3" stroke-dasharray="6 6"/></g>
    <!-- tele vieja -->
    <g transform="translate(200 250)"><rect x="-10" y="110" width="160" height="80" fill="${PAL.woodDark}" ${O}/><rect width="140" height="110" rx="12" fill="#5a5a66" ${O}/><rect x="14" y="14" width="96" height="78" rx="8" fill="#8fd3f4" ${o2}/><circle cx="124" cy="30" r="6" fill="#ddd"/><path d="M40 0 L20 -40 M90 0 L110 -40" stroke="${INK}" stroke-width="4"/></g>
    <!-- puerta -->
    <g transform="translate(20 190)"><rect width="150" height="350" fill="#8a5a32" ${O}/><rect x="20" y="20" width="110" height="140" fill="#a87346" ${o2}/><rect x="20" y="180" width="110" height="150" fill="#a87346" ${o2}/><circle cx="128" cy="190" r="9" fill="${PAL.yellow}" ${o2}/></g>
    <!-- mesa plegable con teléfono, carpeta y cafetera -->
    <g transform="translate(380 420)"><rect width="520" height="26" fill="#d9d9d9" ${O}/><path d="M30 26 L60 130 M490 26 L460 130 M60 26 L30 130 M460 26 L490 130" stroke="${INK}" stroke-width="6"/>
      <g transform="translate(40 -46)"><rect width="70" height="40" rx="8" fill="${PAL.red}" ${o2}/><path d="M6 6 Q35 -16 64 6" stroke="${INK}" stroke-width="10" fill="none"/><path d="M6 6 Q35 -16 64 6" stroke="${PAL.red}" stroke-width="5" fill="none"/></g>
      <g transform="translate(240 -30)"><rect width="90" height="30" fill="${PAL.blue}" ${o2}/><rect x="6" y="-8" width="80" height="10" fill="#fff" ${o2}/></g>
      <g transform="translate(400 -80)"><rect width="56" height="80" rx="6" fill="#444" ${o2}/><rect x="10" y="40" width="36" height="30" fill="#c96a3a" ${o2}/></g>
    </g>
    <!-- cajas de octavillas -->
    <g transform="translate(1010 480)"><rect width="110" height="80" fill="#d2a46a" ${O}/><rect x="80" y="-60" width="100" height="70" fill="#d2a46a" ${O}/><rect x="15" y="20" width="80" height="24" fill="${o.partyColor}"/></g>
    ${plant(1230, 500, 1, true)}
  `,
  // ── Calle o plaza ────────────────────────────────────────────────────
  street: (o) => `
    <rect width="1280" height="720" fill="${o.night ? '#3a3f6b' : PAL.sky}"/>
    <circle cx="1120" cy="110" r="56" fill="${o.night ? '#f3f0c8' : PAL.yellow}" ${O}/>
    ${[0, 250, 520, 780, 1030].map((x, i) => `<g transform="translate(${x} ${120 + (i % 2) * 40})"><rect width="240" height="${440 - (i % 2) * 40}" fill="${['#f2a65a', '#e2493b', '#f5c33b', '#8bc6a2', '#c79bd8'][i]}" ${O}/>${Array.from({ length: 3 }, (_, r) => Array.from({ length: 3 }, (_, q) => `<rect x="${24 + q * 72}" y="${30 + r * 100}" width="44" height="60" fill="${o.night ? '#ffe27a' : '#dff3ff'}" ${o2}/><path d="M${18 + q * 72} ${94 + r * 100} L${74 + q * 72} ${94 + r * 100}" stroke="${INK}" stroke-width="5"/>`).join('')).join('')}</g>`).join('')}
    <rect y="540" width="1280" height="180" fill="#c9c2b4"/>
    <g stroke="#a59d8d" stroke-width="3">${Array.from({ length: 14 }, (_, i) => `<path d="M${i * 100} 540 L${i * 100 - 60} 720"/>`).join('')}</g>
    <path d="M0 540 L1280 540" stroke="${INK}" stroke-width="5"/>
    <!-- farola, banco y quiosco -->
    <g transform="translate(160 260)"><rect x="-6" width="12" height="290" fill="#444" ${o2}/><path d="M-30 0 L30 0 L18 -36 L-18 -36 Z" fill="${o.night ? PAL.yellow : '#ddd'}" ${O}/></g>
    <g transform="translate(860 470)"><rect width="200" height="22" fill="${PAL.woodDark}" ${O}/><rect y="-46" width="200" height="18" fill="${PAL.woodDark}" ${O}/><path d="M20 22 L20 76 M180 22 L180 76" stroke="${INK}" stroke-width="7"/></g>
    <g transform="translate(560 380)"><rect width="150" height="170" fill="${PAL.green}" ${O}/><path d="M-20 0 L170 0 L150 -40 L0 -40 Z" fill="${PAL.red}" ${O}/><rect x="15" y="20" width="120" height="80" fill="#fff" ${o2}/><rect x="25" y="32" width="46" height="56" fill="${o.partyColor}"/><rect x="80" y="32" width="46" height="56" fill="${o.rivalColor ?? PAL.blue}"/></g>
    ${(o.unrest ?? 0) > 55 ? protesters(Math.min(14, Math.round(((o.unrest ?? 0) - 45) / 4)), 560, PAL.red) : ''}
    ${o.crowd ? protesters(o.crowd, 600, o.partyColor) : ''}
  `,
  // ── Plató de debate ──────────────────────────────────────────────────
  studio: (o) => `
    <rect width="1280" height="720" fill="#1d2552"/>
    <g opacity=".35">${Array.from({ length: 9 }, (_, i) => `<path d="M${140 * i} 0 L${140 * i + 60} 0 L${640} 520 Z" fill="#3b4aa8"/>`).join('')}</g>
    <rect x="390" y="60" width="500" height="260" rx="18" fill="#0f1433" ${O}/>
    <rect x="410" y="80" width="460" height="220" rx="10" fill="#2f6fd6" opacity=".5"/>
    <g transform="translate(560 120)">${flagSVG(o.country, 160, 106)}</g>
    <rect y="470" width="1280" height="250" fill="#2b2f5a"/>
    <path d="M0 470 L1280 470" stroke="${INK}" stroke-width="5"/>
    <!-- atriles -->
    <g transform="translate(250 420)"><path d="M0 0 L170 0 L150 170 L20 170 Z" fill="${o.partyColor}" ${O}/><rect x="20" y="40" width="130" height="30" fill="#fff" opacity=".85"/></g>
    <g transform="translate(860 420)"><path d="M0 0 L170 0 L150 170 L20 170 Z" fill="${o.rivalColor ?? PAL.blue}" ${O}/><rect x="20" y="40" width="130" height="30" fill="#fff" opacity=".85"/></g>
    <!-- público -->
    <g class="sc-audience">${Array.from({ length: 22 }, (_, i) => `<g style="animation-delay:${(i % 7) * 0.1}s"><circle cx="${30 + i * 58}" cy="${650 + (i % 2) * 18}" r="26" fill="#11152e" ${o2}/><rect x="${4 + i * 58}" y="${672 + (i % 2) * 18}" width="52" height="60" rx="10" fill="#11152e" ${o2}/></g>`).join('')}</g>
    <circle cx="80" cy="70" r="30" fill="${PAL.yellow}" opacity=".8" ${o2}/><circle cx="1200" cy="70" r="30" fill="${PAL.yellow}" opacity=".8" ${o2}/>
  `,
  // ── Despacho de gobierno ─────────────────────────────────────────────
  office: (o) => {
    const wb = o.wellbeing ?? 50;
    const nice = wb > 58;
    const shabby = wb < 42;
    return `
    <rect width="1280" height="720" fill="${nice ? '#d8c39a' : shabby ? '#cdbb9a' : '#d6c3a0'}"/>
    <g stroke="#a88a5a" stroke-width="2" opacity=".5">${Array.from({ length: 14 }, (_, i) => `<rect x="${i * 92 + 10}" y="60" width="72" height="420" fill="none"/>`).join('')}</g>
    <rect y="0" width="1280" height="40" fill="#8a5a32"/>
    <rect y="540" width="1280" height="180" fill="${nice ? '#7a2b2b' : '#8a5a32'}"/>
    ${nice ? `<ellipse cx="640" cy="640" rx="420" ry="60" fill="#c94a3a" ${O}/><ellipse cx="640" cy="640" rx="360" ry="44" fill="none" stroke="${PAL.yellow}" stroke-width="5"/>` : ''}
    <path d="M0 540 L1280 540" stroke="${INK}" stroke-width="5"/>
    <!-- ventanal con ciudad (y protestas si hay tensión) -->
    <g transform="translate(470 70)"><rect width="340" height="250" fill="${o.night ? '#2d3260' : PAL.sky}" ${O}/><g transform="translate(0 250) scale(.27 .5)">${skyline(0, !!o.night)}</g>
      ${(o.unrest ?? 0) > 55 ? `<g transform="translate(0 205) scale(.27 .3)">${protesters(10, 120, PAL.red)}</g>` : ''}
      <path d="M170 0 L170 250 M0 125 L340 125" stroke="${INK}" stroke-width="7"/><path d="M-20 0 Q30 120 0 260 L-30 260 L-30 0 Z M360 0 Q310 120 340 260 L370 260 L370 0 Z" fill="${PAL.red}" ${O}/></g>
    <!-- mapa territorial -->
    <g transform="translate(250 100)"><rect width="190" height="140" fill="#f7efd8" ${O}/><path d="M30 40 Q60 20 90 40 Q130 30 160 60 Q150 100 110 110 Q70 120 40 100 Q20 70 30 40 Z" fill="${PAL.green}" opacity=".7" ${o2}/><circle cx="90" cy="70" r="6" fill="${PAL.red}"/><circle cx="130" cy="60" r="5" fill="${PAL.blue}"/></g>
    <!-- bandera -->
    <g transform="translate(870 140)"><rect x="-4" width="8" height="380" fill="#6b4a2a" ${o2}/><g transform="translate(4 6)">${flagSVG(o.country, 110, 74)}</g></g>
    <!-- tele -->
    <g transform="translate(230 280)"><rect width="200" height="130" rx="10" fill="#222" ${O}/><rect x="12" y="12" width="176" height="106" rx="6" fill="#2f6fd6" ${o2}/><rect x="12" y="92" width="176" height="26" fill="${PAL.red}"/><rect x="70" y="130" width="60" height="30" fill="#444" ${o2}/><rect x="40" y="160" width="120" height="12" fill="#444" ${o2}/></g>
    <!-- puerta -->
    <g transform="translate(30 170)"><rect width="150" height="370" fill="#6b3a1a" ${O}/><rect x="18" y="20" width="114" height="150" fill="#8a5a32" ${o2}/><rect x="18" y="190" width="114" height="160" fill="#8a5a32" ${o2}/><circle cx="130" cy="200" r="9" fill="${PAL.yellow}" ${o2}/></g>
    <!-- estantería decorativa -->
    <g transform="translate(1000 200)"><rect width="190" height="340" fill="#7a4a24" ${O}/>${[0, 1, 2, 3].map((r) => `<rect x="10" y="${20 + r * 80}" width="170" height="64" fill="#5a3418"/>${[0, 1, 2, 3, 4, 5].map((b) => `<rect x="${16 + b * 27}" y="${30 + r * 80 + (b % 2) * 6}" width="22" height="${54 - (b % 2) * 6}" fill="${[PAL.red, PAL.blue, PAL.yellow, PAL.green, PAL.purple, PAL.teal][(b + r) % 6]}" stroke="${INK}" stroke-width="2"/>`).join('')}`).join('')}</g>
    <!-- escritorio con teléfono y carpetas -->
    <g transform="translate(470 440)"><rect width="480" height="40" fill="${PAL.woodDark}" ${O}/><rect x="20" y="40" width="440" height="110" fill="#6b3a1a" ${O}/><rect x="60" y="60" width="140" height="70" fill="#7a4a24" ${o2}/><rect x="260" y="60" width="140" height="70" fill="#7a4a24" ${o2}/>
      <g transform="translate(250 -46)"><rect width="74" height="44" rx="8" fill="#222" ${o2}/><path d="M6 6 Q37 -18 68 6" stroke="${INK}" stroke-width="11" fill="none"/><path d="M6 6 Q37 -18 68 6" stroke="#444" stroke-width="6" fill="none"/></g>
      <g transform="translate(60 -26)"><rect width="120" height="26" fill="#fff" ${o2}/><rect x="6" y="-10" width="110" height="12" fill="#eee" ${o2}/></g>
      <g transform="translate(360 -34)"><rect width="80" height="34" fill="${PAL.yellow}" ${o2}/><rect x="0" y="-8" width="40" height="10" fill="${PAL.yellow}" ${o2}/></g>
    </g>
    <!-- sillón -->
    <g transform="translate(650 300)"><rect width="120" height="150" rx="20" fill="${nice ? '#7a2b2b' : '#444'}" ${O}/></g>
    ${plant(1200, 500, 1.2, shabby)}${nice ? plant(380, 500, 1) : ''}
    ${shabby ? `<path d="M300 40 L320 120 L290 160" stroke="${INK}" stroke-width="3" fill="none"/><rect x="1080" y="470" width="60" height="70" fill="#8fd3f4" opacity=".6" ${o2}/>` : ''}
  `;
  },
  // ── Parlamento ───────────────────────────────────────────────────────
  parliament: (o) => {
    const seats = o.seats ?? [];
    const flat: string[] = [];
    for (const [col, n] of seats) for (let i = 0; i < n; i++) flat.push(col);
    const total = flat.length || 1;
    const rows = 8;
    const dots: string[] = [];
    // Hemiciclo: reparto por filas proporcional al radio
    const radii = Array.from({ length: rows }, (_, r) => 170 + r * 34);
    const sumR = radii.reduce((a, b) => a + b, 0);
    const perRow = radii.map((r) => Math.round((total * r) / sumR));
    perRow[rows - 1] += total - perRow.reduce((a, b) => a + b, 0);
    const pts: { a: number; r: number }[] = [];
    radii.forEach((r, ri) => { for (let k = 0; k < perRow[ri]; k++) pts.push({ a: Math.PI * (1 - (k + 0.5) / perRow[ri]), r }); });
    pts.sort((p, q) => q.a - p.a);
    pts.forEach((p, i) => {
      const x = 640 + Math.cos(p.a) * p.r * 1.45;
      const y = 560 - Math.sin(p.a) * p.r;
      const v = o.seatVotes?.[i];
      const sz = total > 400 ? 6 : 8;
      dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${sz}" fill="${flat[i]}" stroke="${v === 'yes' ? '#fff' : v === 'no' ? INK : 'none'}" stroke-width="${v ? 3 : 0}" opacity="${v === 'abstain' ? 0.35 : 1}"/>`);
    });
    return `
      <rect width="1280" height="720" fill="#5a2430"/>
      <path d="M0 0 L1280 0 L1280 80 Q640 160 0 80 Z" fill="#7a2b3a" ${O}/>
      <g opacity=".3" fill="#d8a85a">${Array.from({ length: 10 }, (_, i) => `<rect x="${60 + i * 125}" y="120" width="20" height="300"/>`).join('')}</g>
      <rect y="560" width="1280" height="160" fill="#3a1820"/>
      <path d="M140 560 A500 400 0 0 1 1140 560" fill="#6b2a36" ${O}/>
      ${dots.join('')}
      <g transform="translate(560 560)"><rect width="160" height="90" fill="${PAL.woodDark}" ${O}/><rect x="40" y="-30" width="80" height="30" fill="${PAL.wood}" ${O}/></g>
      <g transform="translate(600 30)">${flagSVG(o.country, 80, 54)}</g>
    `;
  },
};
