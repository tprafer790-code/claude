import type { PropId } from './environments';
import type { StringKey } from '../i18n';

/**
 * Shot lists for the class-change cutscenes: one short story per social class.
 * Positions are in world pixels of the 240×135 street; `x` values are world
 * coordinates and the camera offset `cam` slides the street underneath them.
 */

export type Pose = 'idle' | 'walk' | 'cheer' | 'work' | 'sleep' | 'look' | 'hidden';
export type Transition = 'cut' | 'fade' | 'iris' | 'wipe' | 'flash';
export type Fx = 'rain' | 'night' | 'sunrise' | 'confetti' | 'coins' | 'disco' | 'smoke' | 'sparkle' | 'shake';
export type Sfx = 'whoosh' | 'coin' | 'event' | 'achievement' | 'rare' | 'secret' | 'prestige' | 'fanfare' | 'promotion';
export type CustomProp = 'bed' | 'letter' | 'coinstack' | 'keys' | 'box' | 'sold' | 'chart' | 'champagne' | 'crown' | 'rocket';

export interface PropCue {
  kind: PropId | CustomProp;
  /** Start and end position (world coords, bottom-centre of the prop). */
  from: [number, number];
  to?: [number, number];
  /** Movement window within the shot, in seconds (default: whole shot). */
  move?: [number, number];
  /** Follow the hero's hands instead of using from/to. */
  held?: boolean;
  /** Only visible inside this window. */
  show?: [number, number];
  flip?: boolean;
}

export interface Shot {
  /** Which neighbourhood is on screen, and which outfit the hero wears. */
  stage: 'from' | 'to';
  dur: number;
  enter: Transition;
  cam: { x: [number, number]; zoom: [number, number] };
  hero: {
    x: [number, number];
    /** When he walks between the two x values (default: whole shot). */
    walk?: [number, number];
    pose: Pose;
    /** Pose changes at given times, e.g. [[1.6, 'cheer']]. */
    at?: [number, Pose][];
  };
  props?: PropCue[];
  fx?: Fx[];
  sfx?: [number, Sfx][];
  /** i18n key of the caption typed under the picture. */
  caption?: Extract<StringKey, `cine${string}`>;
  /** Shows the chapter title card over this shot. */
  title?: boolean;
}

const titleShot = (x: number, extra: Partial<Shot> = {}): Shot => ({
  stage: 'to', dur: 3.8, enter: 'flash', title: true,
  cam: { x: [0, 0], zoom: [1.1, 1.45] },
  hero: { x: [x, x], pose: 'cheer' },
  fx: ['confetti'], sfx: [[0.1, 'promotion']],
  ...extra,
});

/** Indexed by the class being reached (STAGES index). */
export const CLASS_CUTSCENES: Record<number, Shot[]> = {
  // Survival → Working class: a job letter in the rain.
  1: [
    { stage: 'from', dur: 3.2, enter: 'fade', cam: { x: [0, 14], zoom: [1.3, 1.5] }, hero: { x: [80, 80], pose: 'sleep' },
      props: [{ kind: 'bed', from: [80, 121] }], fx: ['rain', 'night'], caption: 'cine1a' },
    { stage: 'from', dur: 3.0, enter: 'cut', cam: { x: [14, 14], zoom: [1.75, 1.95] }, hero: { x: [80, 80], pose: 'look', at: [[1.7, 'cheer']] },
      props: [{ kind: 'letter', from: [84, 30], to: [87, 112], move: [0.2, 1.6] }, { kind: 'bed', from: [80, 121] }],
      fx: ['rain', 'night'], sfx: [[0.2, 'event'], [1.7, 'achievement']], caption: 'cine1b' },
    { stage: 'to', dur: 3.4, enter: 'iris', cam: { x: [-50, 0], zoom: [1, 1.12] }, hero: { x: [40, 112], pose: 'idle' },
      fx: ['sunrise'], sfx: [[0, 'whoosh']], caption: 'cine1c' },
    titleShot(112),
  ],
  // Working → Lower middle: overtime pays for a second-hand car.
  2: [
    { stage: 'from', dur: 3.2, enter: 'fade', cam: { x: [0, 10], zoom: [1.35, 1.55] }, hero: { x: [92, 92], pose: 'work' },
      props: [{ kind: 'coinstack', from: [112, 121] }], sfx: [[0.6, 'coin'], [1.4, 'coin'], [2.2, 'coin']], caption: 'cine2a' },
    { stage: 'from', dur: 2.6, enter: 'cut', cam: { x: [10, 10], zoom: [1.8, 1.95] }, hero: { x: [92, 92], pose: 'look', at: [[1.3, 'cheer']] },
      props: [{ kind: 'keys', from: [96, 40], to: [97, 100], move: [0.1, 1.2] }], sfx: [[1.3, 'achievement']], caption: 'cine2b' },
    { stage: 'to', dur: 3.6, enter: 'wipe', cam: { x: [-30, 0], zoom: [1, 1.1] }, hero: { x: [150, 118], walk: [1.2, 3.2], pose: 'idle' },
      props: [{ kind: 'used_car', from: [-40, 121], to: [78, 121], move: [0, 1.6] }], sfx: [[0, 'whoosh']], caption: 'cine2c' },
    titleShot(118, { props: [{ kind: 'used_car', from: [78, 121] }] }),
  ],
  // Lower middle → Middle: moving day.
  3: [
    { stage: 'from', dur: 3.2, enter: 'fade', cam: { x: [0, 40], zoom: [1.2, 1.3] }, hero: { x: [70, 160], pose: 'walk' },
      props: [{ kind: 'box', from: [0, 0], held: true }], caption: 'cine3a' },
    { stage: 'to', dur: 3.6, enter: 'wipe', cam: { x: [-20, 0], zoom: [1, 1.15] }, hero: { x: [30, 104], walk: [0, 2.6], pose: 'idle' },
      props: [{ kind: 'box', from: [0, 0], held: true, show: [0, 2.8] }, { kind: 'box', from: [118, 121], show: [2.8, 9] }, { kind: 'sold', from: [150, 121], show: [0.8, 9] }],
      sfx: [[0, 'whoosh'], [0.8, 'coin'], [2.8, 'event']], caption: 'cine3b' },
    titleShot(104, { props: [{ kind: 'box', from: [118, 121] }, { kind: 'sold', from: [150, 121] }] }),
  ],
  // Middle → Wealth: the stock market goes up.
  4: [
    { stage: 'from', dur: 3.4, enter: 'fade', cam: { x: [0, 0], zoom: [1.25, 1.45] }, hero: { x: [74, 74], pose: 'look' },
      props: [{ kind: 'chart', from: [114, 104] }], sfx: [[2.6, 'rare']], caption: 'cine4a' },
    { stage: 'from', dur: 2.2, enter: 'cut', cam: { x: [0, 0], zoom: [1.9, 2.05] }, hero: { x: [74, 74], pose: 'cheer' },
      fx: ['coins', 'shake'], sfx: [[0, 'fanfare']], caption: 'cine4b' },
    { stage: 'to', dur: 3.4, enter: 'flash', cam: { x: [-30, 0], zoom: [1, 1.12] }, hero: { x: [30, 104], walk: [0.6, 3.2], pose: 'idle' },
      props: [{ kind: 'sports_car', from: [280, 121], to: [-60, 121], move: [0, 1.4] }], sfx: [[0.1, 'whoosh']], caption: 'cine4c' },
    titleShot(104),
  ],
  // Wealth → Extreme wealth: champagne and a yacht.
  5: [
    { stage: 'from', dur: 3.2, enter: 'fade', cam: { x: [0, 6], zoom: [1.5, 1.75] }, hero: { x: [96, 96], pose: 'look', at: [[1.6, 'cheer']] },
      props: [{ kind: 'champagne', from: [0, 0], held: true }], fx: ['sparkle'], sfx: [[1.6, 'achievement']], caption: 'cine5a' },
    { stage: 'to', dur: 3.6, enter: 'wipe', cam: { x: [-20, 0], zoom: [1, 1.1] }, hero: { x: [40, 100], walk: [0.4, 2.8], pose: 'idle' },
      props: [{ kind: 'yacht', from: [300, 106], to: [170, 106], move: [0, 3.2] }], fx: ['coins'], sfx: [[0, 'whoosh'], [1, 'coin']], caption: 'cine5b' },
    titleShot(100, { props: [{ kind: 'yacht', from: [170, 106] }] }),
  ],
  // Extreme → Absurd power: a self-awarded crown.
  6: [
    { stage: 'from', dur: 3.4, enter: 'fade', cam: { x: [0, 0], zoom: [1.4, 1.85] }, hero: { x: [100, 100], pose: 'look', at: [[2.3, 'cheer']] },
      props: [{ kind: 'crown', from: [100, -10], to: [100, 84], move: [0.3, 2.3] }], fx: ['sparkle'], sfx: [[0.3, 'secret'], [2.3, 'achievement']], caption: 'cine6a' },
    { stage: 'to', dur: 3.2, enter: 'flash', cam: { x: [0, 0], zoom: [1.05, 1.2] }, hero: { x: [100, 100], pose: 'cheer' },
      fx: ['disco'], sfx: [[0, 'rare']], caption: 'cine6b' },
    titleShot(100, { fx: ['confetti', 'disco'] }),
  ],
  // Absurd → Beyond the ladder: a rocket launch.
  7: [
    { stage: 'from', dur: 3.4, enter: 'fade', cam: { x: [0, 20], zoom: [1.15, 1.25] }, hero: { x: [70, 150], walk: [0.3, 2.8], pose: 'idle', at: [[2.8, 'hidden']] },
      props: [{ kind: 'rocket', from: [156, 121] }], caption: 'cine7a' },
    { stage: 'from', dur: 2.8, enter: 'cut', cam: { x: [20, 20], zoom: [1.1, 1.0] }, hero: { x: [150, 150], pose: 'hidden' },
      props: [{ kind: 'rocket', from: [156, 121], to: [156, -60], move: [0.8, 2.8] }], fx: ['smoke', 'shake'], sfx: [[0.2, 'prestige']], caption: 'cine7b' },
    { stage: 'to', dur: 3.4, enter: 'iris', cam: { x: [-30, 0], zoom: [1, 1.12] }, hero: { x: [40, 104], walk: [0.2, 2.8], pose: 'idle' },
      fx: ['sparkle'], sfx: [[0, 'whoosh']], caption: 'cine7c' },
    titleShot(104),
  ],
};

/** Fallback for any class without its own story. */
export const GENERIC_CUTSCENE: Shot[] = [
  { stage: 'from', dur: 3, enter: 'fade', cam: { x: [0, 60], zoom: [1.28, 1.1] }, hero: { x: [84, 180], walk: [0.5, 3], pose: 'idle' } },
  titleShot(84, { enter: 'wipe' }),
];
