/**
 * "Ladder 40" — the single master palette used by every sprite, icon and
 * environment in the game. Keeping one palette is what makes the art feel
 * like one coherent 16-bit world.
 */
export const P = {
  ink: '#14101c',
  night: '#211a33',
  plum: '#3b2a4d',
  dusk: '#5e3a5c',
  rose: '#9c4f6a',
  coral: '#e0705a',
  orange: '#f29b4b',
  sun: '#ffd166',
  cream: '#fff1c9',
  white: '#fdfbf7',

  brick: '#8c3b2e',
  brickDark: '#5e2620',
  rust: '#b5643a',
  cardboard: '#c49a62',
  cardboardDark: '#8f6a3d',
  wood: '#7a5233',

  asphalt: '#3a3a48',
  concrete: '#6d6e7c',
  concreteLight: '#9a9bab',
  steel: '#b8c0cc',

  grass: '#4e9a4a',
  grassDark: '#2f6b35',
  leaf: '#7cc35b',
  sand: '#e8cf8f',

  sky1: '#7ec8f0',
  sky2: '#b7e3f7',
  sea: '#2f7fb8',
  seaDark: '#1d4f7a',
  glass: '#5fa8d3',
  glassDark: '#2d5f86',

  gold: '#f2c84b',
  goldDark: '#a37a1c',
  purple: '#7d55c7',
  pink: '#ff7aa8',
  teal: '#3fcfbd',
  red: '#d6413b',
  green: '#3fae5a',
  blue: '#3f6fd6',
  navy: '#24305e',

  skin: '#f0b98d',
  skinShade: '#c98762',
  hair: '#4a2e22',
  hairShade: '#2e1c15',
} as const;

export type PaletteKey = keyof typeof P;
