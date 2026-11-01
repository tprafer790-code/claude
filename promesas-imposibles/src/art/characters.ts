// Personajes articulados de recortes de papel en SVG.
// Cabeza grande, cuerpo pequeño, ojos ovalados juntos, piezas animadas por CSS.
// Para cambiar el aspecto de un personaje, edita su CharSpec más abajo.
import type { CandidateId, CastId, CountryId } from '../core/types';
import { INK, PAL } from './palette';

export type Hair = 'long' | 'helmet' | 'bald' | 'cap' | 'bob' | 'bun' | 'curly' | 'short' | 'granny' | 'beanie' | 'slick' | 'afro';
export type Acc = 'beads' | 'tie' | 'glasses' | 'phone' | 'mug' | 'cane' | 'medals' | 'headband' | 'flower' | 'earring' | 'notebook' | 'mic' | 'chain' | 'shades' | 'vest' | 'hearing' | 'bowtie' | 'badge' | 'scarf' | 'pearls' | 'apron' | 'ferret';

export interface CharSpec {
  skin: string;
  hair: Hair;
  hairColor: string;
  top: string;
  topAccent?: string;
  bottom: string;
  shoes: string;
  brows?: 'normal' | 'bushy' | 'thin';
  browColor?: string;
  acc: Acc[];
  /** Ancho del torso (cuerpo pequeño) */
  torso?: number;
  /** Rasgos extra: bigote, barba, pecas, arrugas */
  face?: ('moustache' | 'beard' | 'freckles' | 'wrinkles' | 'stubble' | 'blush' | 'teeth')[];
  pattern?: 'tiedye' | 'stripes' | 'suit' | 'hoodie' | 'cardigan' | 'plain' | 'floral';
}

export const CANDIDATES: Record<CandidateId, CharSpec> = {
  hippie: { skin: PAL.skin[1], hair: 'long', hairColor: '#7a4a24', top: '#f08a2c', topAccent: '#8b4fc4', bottom: '#6b8fd1', shoes: '#a06a3b', acc: ['headband', 'beads', 'mug', 'flower'], face: ['beard', 'freckles'], pattern: 'tiedye' },
  impecable: { skin: PAL.skin[0], hair: 'helmet', hairColor: '#2b2b3a', top: '#25335e', topAccent: '#ffffff', bottom: '#25335e', shoes: '#111111', acc: ['tie', 'badge'], face: ['teeth'], brows: 'thin', pattern: 'suit' },
  veterano: { skin: PAL.skin[4], hair: 'bald', hairColor: '#f2f2f2', top: '#8a6d4d', topAccent: '#c94a3a', bottom: '#5b5b66', shoes: '#4a3424', acc: ['glasses', 'cane', 'medals', 'hearing'], face: ['wrinkles', 'moustache'], brows: 'bushy', browColor: '#f7f7f7', pattern: 'cardigan' },
  influencer: { skin: PAL.skin[2], hair: 'cap', hairColor: '#1d1d1d', top: '#ff4fa3', topAccent: '#34e0d0', bottom: '#2d2d3a', shoes: '#ffffff', acc: ['phone', 'chain', 'earring'], face: ['blush'], pattern: 'hoodie', torso: 78 },
};

/** Reparto secundario: misma gramática visual. Varía ligeramente por país. */
export function castSpec(id: CastId, country: CountryId): CharSpec {
  const skinShift = country === 'br' ? 1 : 0;
  const s = (i: number) => PAL.skin[(i + skinShift) % PAL.skin.length];
  switch (id) {
    case 'advisor': return { skin: s(0), hair: 'bob', hairColor: '#c2402f', top: '#3fa45b', topAccent: '#ffffff', bottom: '#2a2a3a', shoes: '#2a2a2a', acc: ['notebook', 'glasses'], pattern: 'plain' };
    case 'economist': return { skin: s(4), hair: 'bun', hairColor: '#4b3a2a', top: '#7c8aa5', topAccent: '#ffffff', bottom: '#3d4660', shoes: '#222', acc: ['glasses', 'pearls'], brows: 'thin', pattern: 'suit' };
    case 'partner': return { skin: s(1), hair: 'slick', hairColor: '#6b6b6b', top: '#e9b11c', topAccent: '#2a2230', bottom: '#4a4a55', shoes: '#3a2a1a', acc: ['bowtie'], face: ['stubble'], pattern: 'suit' };
    case 'opposition': return { skin: s(0), hair: 'slick', hairColor: '#c9a35b', top: '#7a2b2b', topAccent: '#ffffff', bottom: '#2b2b33', shoes: '#111', acc: ['tie', 'badge'], face: ['teeth'], brows: 'thin', pattern: 'suit', torso: 74 };
    case 'journalist': return { skin: s(2), hair: 'curly', hairColor: '#2b1d14', top: '#22a6a0', topAccent: '#f5c33b', bottom: '#33334a', shoes: '#c94a3a', acc: ['mic', 'glasses'], pattern: 'stripes' };
    case 'unionist': return { skin: s(1), hair: 'short', hairColor: '#3b2a1e', top: '#d8463a', topAccent: '#f5c33b', bottom: '#3d5a8a', shoes: '#3a2a1a', acc: ['vest', 'badge'], face: ['moustache', 'stubble'], brows: 'bushy', pattern: 'plain', torso: 82 };
    case 'tycoon': return { skin: s(0), hair: 'slick', hairColor: '#e8e8e8', top: '#1d1d24', topAccent: '#f5c33b', bottom: '#1d1d24', shoes: '#6b3a1a', acc: ['shades', 'chain'], face: ['teeth'], pattern: 'suit', torso: 86 };
    case 'citizenA': return { skin: s(4), hair: 'granny', hairColor: '#dcdcf0', top: '#9b5fc0', topAccent: '#f27aa6', bottom: '#5a4a6a', shoes: '#3a2a3a', acc: ['pearls', 'glasses'], face: ['wrinkles', 'blush'], pattern: 'floral' };
    case 'citizenB': return { skin: s(3), hair: 'beanie', hairColor: '#2a6fd6', top: '#5a5a66', topAccent: '#f5c33b', bottom: '#3a5a8a', shoes: '#eeeeee', acc: ['ferret'], face: ['stubble'], pattern: 'hoodie' };
    case 'caller': return { skin: s(3), hair: 'long', hairColor: '#5a3220', top: '#f27aa6', topAccent: '#ffffff', bottom: '#3a4a6a', shoes: '#c94a3a', acc: ['phone', 'scarf'], face: ['freckles'], pattern: 'cardigan' };
    case 'citizenC': return { skin: s(2), hair: 'afro', hairColor: '#2b1d14', top: '#f5c33b', topAccent: '#e2493b', bottom: '#3a3a4a', shoes: '#7a3a1a', acc: ['apron', 'earring'], pattern: 'plain' };
  }
}

const O = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

function hairBack(sp: CharSpec): string {
  const c = sp.hairColor;
  switch (sp.hair) {
    case 'long': return `<path d="M44 92 Q40 40 100 30 Q160 40 156 92 L162 170 Q150 178 140 160 L60 160 Q50 178 38 170 Z" fill="${c}" ${O}/>`;
    case 'bob': return `<path d="M42 100 Q38 34 100 30 Q162 34 158 100 L160 140 Q100 150 40 140 Z" fill="${c}" ${O}/>`;
    case 'granny': return `<g fill="${c}" ${O}><circle cx="52" cy="70" r="20"/><circle cx="148" cy="70" r="20"/><circle cx="70" cy="44" r="22"/><circle cx="130" cy="44" r="22"/><circle cx="100" cy="36" r="24"/></g>`;
    case 'afro': return `<circle cx="100" cy="74" r="76" fill="${c}" ${O}/>`;
    case 'curly': return `<g fill="${c}" ${O}><circle cx="50" cy="80" r="18"/><circle cx="150" cy="80" r="18"/><circle cx="60" cy="52" r="20"/><circle cx="140" cy="52" r="20"/><circle cx="100" cy="38" r="26"/><circle cx="46" cy="110" r="14"/><circle cx="154" cy="110" r="14"/></g>`;
    case 'bun': return `<circle cx="100" cy="26" r="20" fill="${c}" ${O}/>`;
    default: return '';
  }
}

function hairFront(sp: CharSpec): string {
  const c = sp.hairColor;
  switch (sp.hair) {
    case 'long': return `<path d="M42 84 Q52 34 100 32 Q148 34 158 84 Q130 58 100 62 Q70 58 42 84 Z" fill="${c}" ${O}/>`;
    case 'helmet': return `<path d="M38 88 Q36 30 100 28 Q166 30 162 88 Q150 60 120 54 L118 66 Q90 52 60 62 Q46 70 38 88 Z" fill="${c}" ${O}/><path d="M70 42 Q100 34 128 44" stroke="#ffffff" stroke-width="5" fill="none" opacity=".6"/>`;
    case 'bald': return `<path d="M40 96 Q34 72 46 64 Q52 86 50 104 Z" fill="${c}" ${O}/><path d="M160 96 Q166 72 154 64 Q148 86 150 104 Z" fill="${c}" ${O}/><path d="M76 44 Q100 36 124 44" stroke="#ffffff" stroke-width="4" fill="none" opacity=".5"/>`;
    case 'cap': return `<path d="M40 74 Q42 26 100 24 Q158 26 160 74 Z" fill="${sp.topAccent ?? '#222'}" ${O}/><path d="M150 66 L186 60 Q190 72 160 78 Z" fill="${sp.topAccent ?? '#222'}" ${O}/><rect x="86" y="30" width="28" height="12" rx="4" fill="#fff" ${O}/>`;
    case 'bob': return `<path d="M40 86 Q46 32 100 30 Q154 32 160 86 Q120 50 100 70 Q80 50 40 86 Z" fill="${c}" ${O}/>`;
    case 'bun': return `<path d="M40 84 Q44 34 100 32 Q156 34 160 84 Q130 56 100 58 Q70 56 40 84 Z" fill="${c}" ${O}/>`;
    case 'short': return `<path d="M40 82 Q40 30 100 28 Q160 30 160 82 Q150 52 128 50 L124 58 Q100 46 76 56 L72 50 Q50 54 40 82 Z" fill="${c}" ${O}/>`;
    case 'slick': return `<path d="M38 84 Q40 28 104 28 Q164 32 162 84 Q150 50 106 46 Q60 48 38 84 Z" fill="${c}" ${O}/><path d="M64 44 Q104 32 146 50" stroke="#fff" stroke-width="3" fill="none" opacity=".45"/>`;
    case 'beanie': return `<path d="M38 80 Q38 18 100 18 Q162 18 162 80 Z" fill="${c}" ${O}/><rect x="36" y="70" width="128" height="16" rx="7" fill="${c}" ${O}/><circle cx="100" cy="14" r="10" fill="#f5c33b" ${O}/>`;
    case 'granny': return `<path d="M46 74 Q60 40 100 40 Q140 40 154 74 Q128 60 100 62 Q72 60 46 74 Z" fill="${c}" ${O}/>`;
    case 'curly': return `<g fill="${c}" ${O}><circle cx="74" cy="48" r="14"/><circle cx="100" cy="42" r="15"/><circle cx="126" cy="48" r="14"/></g>`;
    case 'afro': return `<path d="M44 70 Q100 30 156 70" stroke="${c}" stroke-width="10" fill="none"/>`;
  }
}

function brows(sp: CharSpec): string {
  const col = sp.browColor ?? sp.hairColor;
  if (sp.brows === 'bushy') {
    return `<g class="ch-browL" style="transform-origin:84px 66px"><path d="M60 70 Q72 50 98 62 Q90 72 64 76 Z" fill="${col}" ${O}/></g>`
      + `<g class="ch-browR" style="transform-origin:116px 66px"><path d="M140 70 Q128 50 102 62 Q110 72 136 76 Z" fill="${col}" ${O}/></g>`;
  }
  const w = sp.brows === 'thin' ? 4 : 6;
  return `<g class="ch-browL" style="transform-origin:86px 68px"><path d="M72 68 L98 66" stroke="${col === '#f2f2f2' ? INK : col}" stroke-width="${w}" stroke-linecap="round"/></g>`
    + `<g class="ch-browR" style="transform-origin:114px 68px"><path d="M102 66 L128 68" stroke="${col === '#f2f2f2' ? INK : col}" stroke-width="${w}" stroke-linecap="round"/></g>`;
}

function eyes(): string {
  return `<g class="ch-eyes">
    <g class="eyes-open">
      <ellipse cx="86" cy="90" rx="15" ry="18" fill="#fff" ${O}/>
      <ellipse cx="114" cy="90" rx="15" ry="18" fill="#fff" ${O}/>
      <g class="ch-pupils"><circle cx="91" cy="93" r="4" fill="${INK}"/><circle cx="109" cy="93" r="4" fill="${INK}"/></g>
    </g>
    <g class="eyes-happy"><path d="M72 94 Q86 78 100 94" fill="none" stroke="${INK}" stroke-width="4"/><path d="M100 94 Q114 78 128 94" fill="none" stroke="${INK}" stroke-width="4"/></g>
  </g>`;
}

function mouths(sp: CharSpec): string {
  const teeth = sp.face?.includes('teeth');
  const dark = '#5a1b23';
  const idle = teeth
    ? `<path d="M78 118 Q100 134 122 118 L120 124 Q100 138 80 124 Z" fill="#fff" ${O}/><path d="M86 122 L86 128 M94 124 L94 131 M102 125 L102 132 M110 124 L110 131" stroke="${INK}" stroke-width="1.5"/>`
    : `<path d="M86 122 Q100 130 114 122" fill="none" stroke="${INK}" stroke-width="4"/>`;
  return `<g class="ch-mouth">
    <g class="m m-idle">${idle}</g>
    <g class="m m-talk"><g class="m-talk-a"><ellipse cx="100" cy="124" rx="11" ry="8" fill="${dark}" ${O}/></g><g class="m-talk-b"><path d="M88 122 Q100 126 112 122" fill="none" stroke="${INK}" stroke-width="4"/></g></g>
    <g class="m m-happy"><path d="M78 114 Q100 150 122 114 Z" fill="${dark}" ${O}/><path d="M88 134 Q100 128 112 134 Q100 144 88 134" fill="#f27a8a"/>${teeth ? `<path d="M80 115 L120 115 L118 121 L82 121 Z" fill="#fff"/>` : ''}</g>
    <g class="m m-angry"><rect x="80" y="116" width="40" height="14" rx="3" fill="#fff" ${O}/><path d="M80 123 L120 123 M90 116 L90 130 M100 116 L100 130 M110 116 L110 130" stroke="${INK}" stroke-width="2"/></g>
    <g class="m m-nervous"><path d="M82 124 q4.5 -5 9 0 t9 0 t9 0 t9 0" fill="none" stroke="${INK}" stroke-width="3.5"/></g>
    <g class="m m-sad"><path d="M86 128 Q100 116 114 128" fill="none" stroke="${INK}" stroke-width="4"/></g>
  </g>`;
}

function faceExtras(sp: CharSpec): string {
  let s = '';
  const f = sp.face ?? [];
  if (f.includes('beard')) s += `<path d="M58 112 Q60 156 100 160 Q140 156 142 112 Q128 140 100 140 Q72 140 58 112 Z" fill="${sp.hairColor}" ${O}/>`;
  if (f.includes('moustache')) s += `<path d="M78 114 Q90 106 100 112 Q110 106 122 114 Q112 120 100 116 Q88 120 78 114 Z" fill="${sp.browColor ?? sp.hairColor}" ${O}/>`;
  if (f.includes('freckles')) s += `<g fill="#b5653a" opacity=".7"><circle cx="70" cy="108" r="2"/><circle cx="76" cy="113" r="2"/><circle cx="130" cy="108" r="2"/><circle cx="124" cy="113" r="2"/></g>`;
  if (f.includes('wrinkles')) s += `<g stroke="${INK}" stroke-width="2" fill="none" opacity=".55"><path d="M64 60 Q100 52 136 60"/><path d="M70 52 Q100 44 130 52"/><path d="M62 104 q6 6 0 12"/><path d="M138 104 q-6 6 0 12"/></g>`;
  if (f.includes('stubble')) s += `<path d="M66 116 Q100 152 134 116 Q130 140 100 146 Q70 140 66 116 Z" fill="${INK}" opacity=".18"/>`;
  if (f.includes('blush')) s += `<g fill="#f27aa6" opacity=".5"><ellipse cx="66" cy="112" rx="9" ry="5"/><ellipse cx="134" cy="112" rx="9" ry="5"/></g>`;
  return s;
}

function headAcc(sp: CharSpec): string {
  let s = '';
  if (sp.acc.includes('headband')) s += `<path d="M40 74 Q100 50 160 74" stroke="${PAL.purple}" stroke-width="9" fill="none"/><path d="M40 74 Q100 50 160 74" stroke="${PAL.yellow}" stroke-width="3" stroke-dasharray="6 6" fill="none"/>`;
  if (sp.acc.includes('flower')) s += `<g transform="translate(150 64)"><circle r="7" fill="${PAL.yellow}" ${O}/><g fill="${PAL.pink}" ${O}><circle cx="0" cy="-11" r="6"/><circle cx="11" cy="0" r="6"/><circle cx="0" cy="11" r="6"/><circle cx="-11" cy="0" r="6"/></g><circle r="5" fill="${PAL.yellow}"/></g>`;
  if (sp.acc.includes('glasses')) s += `<g fill="none" stroke="${INK}" stroke-width="3.5"><circle cx="86" cy="92" r="17"/><circle cx="114" cy="92" r="17"/><path d="M69 88 L52 84 M131 88 L148 84"/></g>`;
  if (sp.acc.includes('shades')) s += `<g ${O}><path d="M66 82 L98 82 L96 100 Q82 106 68 98 Z" fill="${INK}"/><path d="M102 82 L134 82 L132 98 Q118 106 104 100 Z" fill="${INK}"/><path d="M98 86 L102 86" /></g><path d="M74 88 L84 86" stroke="#fff" stroke-width="3" opacity=".7"/>`;
  if (sp.acc.includes('earring')) s += `<circle cx="40" cy="118" r="5" fill="none" stroke="${PAL.yellow}" stroke-width="3"/>`;
  if (sp.acc.includes('hearing')) s += `<path d="M160 100 q8 4 4 14" stroke="#f2c9a0" stroke-width="6" fill="none"/><circle cx="161" cy="99" r="4" fill="#c9a07a" ${O}/>`;
  return s;
}

function torso(sp: CharSpec): string {
  const w = sp.torso ?? 70;
  const x0 = 100 - w / 2; const x1 = 100 + w / 2;
  let s = `<path d="M${x0 + 4} 154 L${x1 - 4} 154 L${x1 + 6} 218 L${x0 - 6} 218 Z" fill="${sp.top}" ${O}/>`;
  const a = sp.topAccent ?? '#fff';
  switch (sp.pattern) {
    case 'tiedye': s += `<g opacity=".85"><circle cx="100" cy="186" r="20" fill="${a}"/><circle cx="100" cy="186" r="12" fill="${PAL.yellow}"/><circle cx="100" cy="186" r="5" fill="${PAL.green}"/></g>`; break;
    case 'suit': s += `<path d="M90 154 L100 182 L110 154 Z" fill="${a}" ${O}/><path d="M86 154 L100 196 L92 218 M114 154 L100 196 L108 218" stroke="${INK}" stroke-width="2.5" fill="none"/>`; break;
    case 'stripes': s += `<g stroke="${a}" stroke-width="5"><path d="M${x0} 172 L${x1} 172"/><path d="M${x0 - 2} 188 L${x1 + 2} 188"/><path d="M${x0 - 4} 204 L${x1 + 4} 204"/></g>`; break;
    case 'hoodie': s += `<path d="M84 154 Q100 172 116 154" fill="none" stroke="${INK}" stroke-width="3"/><rect x="82" y="190" width="36" height="16" rx="5" fill="${a}" ${O}/><path d="M92 160 L92 176 M108 160 L108 176" stroke="#fff" stroke-width="3"/>`; break;
    case 'cardigan': s += `<path d="M100 156 L100 218" stroke="${INK}" stroke-width="2.5"/><g fill="${a}"><circle cx="100" cy="172" r="3"/><circle cx="100" cy="186" r="3"/><circle cx="100" cy="200" r="3"/></g><path d="M88 154 L100 166 L112 154" fill="#fff" ${O}/>`; break;
    case 'floral': s += `<g fill="${a}"><circle cx="86" cy="172" r="5"/><circle cx="112" cy="168" r="5"/><circle cx="98" cy="196" r="5"/><circle cx="118" cy="204" r="4"/><circle cx="80" cy="206" r="4"/></g>`; break;
    default: s += `<path d="M90 154 Q100 164 110 154" fill="${a}" ${O}/>`;
  }
  if (sp.acc.includes('tie')) s += `<path d="M96 160 L104 160 L108 196 L100 206 L92 196 Z" fill="${PAL.red}" ${O}/>`;
  if (sp.acc.includes('bowtie')) s += `<path d="M86 156 L100 162 L114 156 L114 170 L100 164 L86 170 Z" fill="${PAL.red}" ${O}/>`;
  if (sp.acc.includes('beads')) s += `<path d="M82 156 Q100 186 118 156" fill="none" stroke="${PAL.teal}" stroke-width="5" stroke-dasharray="1 7" stroke-linecap="round"/>`;
  if (sp.acc.includes('chain')) s += `<path d="M84 156 Q100 190 116 156" fill="none" stroke="${PAL.yellow}" stroke-width="5"/><circle cx="100" cy="178" r="7" fill="${PAL.yellow}" ${O}/>`;
  if (sp.acc.includes('pearls')) s += `<path d="M84 156 Q100 176 116 156" fill="none" stroke="#fff" stroke-width="6" stroke-dasharray="1 6" stroke-linecap="round"/>`;
  if (sp.acc.includes('medals')) s += `<g ${O}><rect x="74" y="168" width="7" height="10" fill="${PAL.red}"/><circle cx="77.5" cy="184" r="5" fill="${PAL.yellow}"/><rect x="84" y="168" width="7" height="10" fill="${PAL.blue}"/><circle cx="87.5" cy="184" r="5" fill="#ddd"/></g>`;
  if (sp.acc.includes('badge')) s += `<circle cx="118" cy="172" r="6" fill="${PAL.yellow}" ${O}/>`;
  if (sp.acc.includes('vest')) s += `<path d="M${x0 + 2} 160 L90 160 L88 218 L${x0 - 6} 218 Z M${x1 - 2} 160 L110 160 L112 218 L${x1 + 6} 218 Z" fill="${PAL.orange}" ${O}/><path d="M${x0} 196 L90 196 M110 196 L${x1} 196" stroke="#f7f7f7" stroke-width="4"/>`;
  if (sp.acc.includes('apron')) s += `<path d="M82 170 L118 170 L120 222 L80 222 Z" fill="#fff" ${O}/><rect x="92" y="186" width="16" height="10" rx="2" fill="${PAL.red}" opacity=".6"/>`;
  if (sp.acc.includes('scarf')) s += `<path d="M82 154 Q100 166 118 154 L118 162 Q100 174 82 162 Z" fill="${PAL.red}" ${O}/>`;
  return s;
}

function arm(sp: CharSpec, side: 'L' | 'R'): string {
  const w = sp.torso ?? 70;
  const sx = side === 'L' ? 100 - w / 2 + 2 : 100 + w / 2 - 2;
  const dir = side === 'L' ? -1 : 1;
  const hx = sx + dir * 14;
  let prop = '';
  if (side === 'R') {
    if (sp.acc.includes('phone')) prop = `<g class="ch-prop"><rect x="${hx - 8}" y="190" width="16" height="26" rx="4" fill="#222" ${O}/><rect x="${hx - 5}" y="194" width="10" height="16" rx="2" fill="${PAL.teal}"/></g>`;
    if (sp.acc.includes('mug')) prop = `<g class="ch-prop"><rect x="${hx - 9}" y="194" width="18" height="18" rx="3" fill="#c96a3a" ${O}/><path d="M${hx + 9} 198 q8 4 0 10" fill="none" stroke="${INK}" stroke-width="3"/><path d="M${hx - 4} 188 q3 -5 0 -10 M${hx + 2} 188 q3 -5 0 -10" stroke="#ccc" stroke-width="2" fill="none"/></g>`;
    if (sp.acc.includes('cane')) prop = `<g class="ch-prop"><path d="M${hx} 196 L${hx + 4} 250" stroke="#6b3a1a" stroke-width="6"/><path d="M${hx} 196 q-2 -12 -12 -8" stroke="#6b3a1a" stroke-width="6" fill="none"/></g>`;
    if (sp.acc.includes('mic')) prop = `<g class="ch-prop"><rect x="${hx - 3}" y="186" width="6" height="22" fill="#333" ${O}/><circle cx="${hx}" cy="184" r="8" fill="#777" ${O}/><rect x="${hx - 7}" y="194" width="14" height="8" fill="${PAL.red}" ${O}/></g>`;
  } else {
    if (sp.acc.includes('notebook')) prop = `<g class="ch-prop"><rect x="${hx - 12}" y="186" width="20" height="26" rx="2" fill="#fff" ${O}/><path d="M${hx - 8} 194 L${hx + 4} 194 M${hx - 8} 200 L${hx + 4} 200 M${hx - 8} 206 L${hx} 206" stroke="${PAL.blue}" stroke-width="2"/></g>`;
    if (sp.acc.includes('ferret')) prop = `<g class="ch-prop"><path d="M${hx - 26} 200 Q${hx - 10} 186 ${hx + 6} 196 Q${hx + 14} 204 ${hx + 4} 210 Q${hx - 14} 214 ${hx - 26} 206 Z" fill="#d9b48a" ${O}/><circle cx="${hx + 6}" cy="198" r="2" fill="${INK}"/><path d="M${hx - 26} 204 q-10 4 -14 -4" stroke="#d9b48a" stroke-width="6" fill="none"/></g>`;
  }
  return `<g class="ch-arm${side}" style="transform-origin:${sx}px 160px">
    <path d="M${sx} 158 L${hx} 204" stroke="${INK}" stroke-width="17" stroke-linecap="round"/>
    <path d="M${sx} 158 L${hx} 204" stroke="${sp.top}" stroke-width="11" stroke-linecap="round"/>
    <circle cx="${hx}" cy="207" r="8" fill="${sp.skin}" ${O}/>${prop}
  </g>`;
}

function legs(sp: CharSpec): string {
  const leg = (x: number, side: string) => `<g class="ch-leg${side}" style="transform-origin:${x + 7}px 214px">
    <rect x="${x}" y="212" width="14" height="28" fill="${sp.bottom}" ${O}/>
    <ellipse cx="${x + 7 + (side === 'L' ? -5 : 5)}" cy="244" rx="15" ry="7" fill="${sp.shoes}" ${O}/>
    ${sp.shoes === '#ffffff' ? `<path d="M${x - 4 + (side === 'L' ? -5 : 5)} 244 L${x + 16 + (side === 'L' ? -5 : 5)} 244" stroke="${PAL.pink}" stroke-width="3"/>` : ''}
  </g>`;
  return leg(80, 'L') + leg(106, 'R');
}

/** SVG completo del personaje. `portrait` recorta a cabeza y hombros. */
export function characterSVG(sp: CharSpec, opts: { portrait?: boolean; flip?: boolean; label?: string } = {}): string {
  const vb = opts.portrait ? '20 8 160 175' : '0 0 200 260';
  const head = `<g class="ch-head" style="transform-origin:100px 150px">
    ${hairBack(sp)}
    <circle cx="100" cy="92" r="62" fill="${sp.skin}" ${O}/>
    <ellipse cx="38" cy="100" rx="7" ry="11" fill="${sp.skin}" ${O}/><ellipse cx="162" cy="100" rx="7" ry="11" fill="${sp.skin}" ${O}/>
    ${faceExtras(sp)}
    ${eyes()}
    ${brows(sp)}
    ${mouths(sp)}
    ${hairFront(sp)}
    ${headAcc(sp)}
    <path class="ch-sweat" d="M150 60 Q158 74 150 80 Q142 74 150 60 Z" fill="#8fd3f4" ${O}/>
    <g class="ch-anger" stroke="${PAL.red}" stroke-width="4" fill="none"><path d="M44 40 l8 8 M52 40 l-8 8"/><path d="M148 34 l8 8 M156 34 l-8 8"/></g>
  </g>`;
  return `<svg class="ch${opts.flip ? ' ch-flip' : ''}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img"${opts.label ? ` aria-label="${opts.label}"` : ' aria-hidden="true"'}>
    <ellipse class="ch-shadow" cx="100" cy="250" rx="46" ry="8" fill="${INK}" opacity=".18"/>
    <g class="ch-root" style="transform-origin:100px 250px">
      ${legs(sp)}
      ${arm(sp, 'L')}
      <g class="ch-body">${torso(sp)}</g>
      ${arm(sp, 'R')}
      ${head}
    </g>
  </svg>`;
}
