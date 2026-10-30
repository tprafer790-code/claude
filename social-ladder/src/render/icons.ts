import type { IconId } from '../data/types';
import { P } from './palette';

/**
 * 10×10 pixel icons for the interface, using the master palette.
 * Each character maps to a palette color; '.' is transparent.
 */
const KEY: Record<string, string> = {
  k: P.ink, w: P.white, y: P.gold, Y: P.goldDark, s: P.sun, g: P.green, G: P.grassDark, b: P.blue, B: P.navy,
  r: P.red, R: P.brickDark, o: P.orange, c: P.cardboard, C: P.cardboardDark, d: P.wood, e: P.steel, E: P.concrete,
  a: P.asphalt, p: P.purple, i: P.pink, t: P.teal, l: P.glass, L: P.glassDark, m: P.cream, n: P.skin, x: P.coral, q: P.plum,
};

export const ICONS: Record<IconId, string[]> = {
  can: ['...kkkk...', '..keeeek..', '..kEEEEk..', '..krrrrk..', '..krwwrk..', '..krrrrk..', '..krrrrk..', '..kEEEEk..', '..keeeek..', '...kkkk...'],
  guitar: ['.......kk.', '......kdk.', '.....kdk..', '....kdk...', '.kkkdk....', 'kooodk....', 'kokoook...', 'kooooook..', '.kooook...', '..kkkk....'],
  tools: ['kk......kk', 'kek....kek', '.kek..kek.', '..kekkek..', '...keek...', '...kddk...', '..kdkkdk..', '.kdk..kdk.', 'kdk....kdk', 'kk......kk'],
  backpack: ['...kkkk...', '..k....k..', '.kkkkkkkk.', 'koooooook.', 'kossssook.', 'koooooook.', 'kokkkkook.', 'kooooooko.', 'koooooook.', '.kkkkkkkk.'],
  moon: ['...kkkk...', '..kmmmk...', '.kmmek....', 'kmmmk.....', 'kmemk.....', 'kmmmk.....', 'kmmmmk....', '.kmmmmkkk.', '..kmmmmmk.', '...kkkkk..'],
  truck: ['..........', 'kkkkkkk...', 'kmmmmmkkk.', 'kmrrmmklk.', 'kmmmmmkllk', 'kmmmmmkook', 'kkkkkkkkkk', '.kak..kak.', '.kek..kek.', '..k....k..'],
  house: ['....kk....', '...krrk...', '..krrrrk..', '.krrrrrrk.', 'kkkkkkkkkk', '.kmmmmmmk.', '.kmlkmdmk.', '.kmlkmdmk.', '.kmmmmdmk.', '.kkkkkkkk.'],
  store: ['kkkkkkkkkk', 'krwrwrwrwk', 'kkkkkkkkkk', '.kmmmmmmk.', '.kllkmddk.', '.kllkmddk.', '.kmmmmddk.', '.kmmmmddk.', '.kmmmmddk.', '.kkkkkkkk.'],
  chart: ['k.........', 'k......gg.', 'k.....g...', 'k....g....', 'k.g.g.....', 'k..g......', 'k.........', 'k.b.b.b.b.', 'k.b.b.b.b.', 'kkkkkkkkkk'],
  rocket: ['....kk....', '...kwwk...', '...kwwk...', '..kwllwk..', '..kwwwwk..', '..kwwwwk..', '.krkwwkrk.', '.krkwwkrk.', '...kook...', '....ss....'],
  tower: ['....kk....', '...kyyk...', '...klLk...', '..kllLLk..', '..klLlLk..', '..kllLLk..', '..klLlLk..', '..kllLLk..', '..klLlLk..', '.kkkkkkkk.'],
  ship: ['....k.....', '....kk....', '....krk...', '....kkkk..', '..kkkkkkk.', 'kbbbbbbbbk', '.kwwwwwwk.', '..kkkkkk..', 'llllllllll', '.l..l..l..'],
  bank: ['....kk....', '..kkyykk..', 'kkyyyyyykk', 'kkkkkkkkkk', '.kw.kw.kw.', '.kw.kw.kw.', '.kw.kw.kw.', '.kw.kw.kw.', 'kkkkkkkkkk', 'kyyyyyyyyk'],
  tv: ['..k....k..', '...k..k...', 'kkkkkkkkkk', 'klllllllak', 'klwlllllak', 'kllllllaek', 'kllllllaak', 'kkkkkkkkkk', '..k....k..', '..........'],
  planet: ['...kkkk...', '..kppppk..', '.kpippppk.', 'kkkkkkkkkk', 'kypppppyyk', 'kkkkkkkkkk', '.kppppipk.', '..kppppk..', '...kkkk...', '..........'],
  island: ['..g..g....', '.gggggg...', '...dd.....', '...d......', '...d......', '..dd......', '.kccccck..', 'lkcccccckl', 'llkkkkkkll', 'llllllllll'],
  cloud: ['..........', '...kkk....', '..kwwwk...', '.kwwwwwkk.', 'kwwwwwwwwk', 'kwwwwwwwwk', '.kkkkkkkk.', '..b..b..b.', '.b..b..b..', '..........'],
  crown: ['..........', 'k...kk...k', 'kk.kyyk.kk', 'kykkyykkyk', 'kyyyyyyyyk', 'kyryybyryk', 'kyyyyyyyyk', 'kYYYYYYYYk', 'kkkkkkkkkk', '..........'],
  gem: ['..........', '..kkkkkk..', '.kttwttwk.', 'kttttttttk', 'kkkkkkkkkk', '.kttttttk.', '..kttttk..', '...kttk...', '....kk....', '..........'],
  mattress: ['..........', '..........', '..........', 'kkkkkkkkkk', 'kccCccCcck', 'kcccccccck', 'kCCCCCCCCk', 'kkkkkkkkkk', '..........', '..........'],
  phone: ['..kkkkkk..', '..kaaaak..', '..klllak..', '..klwlak..', '..kllkak..', '..klklak..', '..kkllak..', '..kaaaak..', '..kakkak..', '..kkkkkk..'],
  bike: ['..........', '......kk..', '..kkk.k...', '...krrrk..', '..kr..rk..', '.kkk.kkk..', 'k...kk...k', 'k.e.k.e..k', 'k...k....k', '.kkk..kkk.'],
  car: ['..........', '...kkkk...', '..kxllxk..', '.kxxllxxk.', 'kxxxxxxxxk', 'kxsxxxxxsk', 'kkkkkkkkkk', '.kek..kek.', '..k....k..', '..........'],
  jacket: ['..kk..kk..', '.kddkkddk.', 'kddddddddk', 'kdddkkdddk', 'kddkmmkddk', 'kddkmmkddk', 'kddkmmkddk', 'kddkmmkddk', 'kddkmmkddk', 'kkkkkkkkkk'],
  coffee: ['...e.e....', '....e.e...', '..........', 'kkkkkkkk..', 'kmmmmmmkkk', 'kdddddmk.k', 'kdddddmk.k', 'kmmmmmmkkk', '.kmmmmk...', '..kkkk....'],
  laptop: ['..........', '.kkkkkkkk.', '.kllllllk.', '.klwlllLk.', '.kllllllk.', '.kllllLLk.', '.kkkkkkkk.', 'keeeeeeeek', 'kEEEEEEEEk', 'kkkkkkkkkk'],
  watch: ['...kkkk...', '...kyyk...', '..kkkkkk..', '.kyywwyyk.', '.kywkwwyk.', '.kywwkwyk.', '.kyywwyyk.', '..kkkkkk..', '...kyyk...', '...kkkk...'],
  chair: ['..kkkkkk..', '..krrrrk..', '..krkkrk..', '..krrrrk..', '..krrrrk..', '.kkkkkkkk.', '.krrrrrrk.', '..kkkkkk..', '....kk....', '..kkkkkk..'],
  card: ['..........', 'kkkkkkkkkk', 'kyyyyyyyyk', 'kkkkkkkkkk', 'kyyyyyyyyk', 'kysyyyyyyk', 'kyyyykkkyk', 'kyyyyyyyyk', 'kkkkkkkkkk', '..........'],
  cap: ['..kkkkkk..', '.kekeekek.', 'keekkkkeek', 'kekyyyykek', 'kekyrrykek', 'kekyrrykek', 'kekyyyykek', 'keekkkkeek', '.kekeekek.', '..kkkkkk..'],
  book: ['..........', '.kkkkkkkk.', '.kbbbbbbmk', '.kbyyyybmk', '.kbbbbbbmk', '.kbbbbbbmk', '.kbbbbbbmk', '.kbbbbbbmk', '.kkkkkkkkk', '..........'],
  suit: ['..kk..kk..', '.kBBkkBBk.', 'kBBBkwkBBk', 'kBBkwrwkBk', 'kBBkwrwkBk', 'kBBkwrwkBk', 'kBBBkrkBBk', 'kBBBBkBBBk', 'kBBBBkBBBk', 'kkkkkkkkkk'],
  wine: ['....kk....', '....kk....', '....kk....', '...kRRk...', '..kRRRRk..', '..kRiRRk..', '..kRRRRk..', '..kRRRRk..', '..kRRRRk..', '..kkkkkk..'],
  jet: ['..........', 'k.........', 'kk........', 'kwk.......', 'kwwkkkkkk.', 'kwwwlwlwwk', '.kkwwwwwwk', '....kwwk..', '....kkk...', '..........'],
  yacht: ['....k.....', '....kk....', '...kwwk...', '..kwlwlk..', '.kkkkkkkk.', 'kwwwwwwwwk', '.kBBBBBBk.', '..kkkkkk..', 'llllllllll', '.l..l..l..'],
  art: ['kkkkkkkkkk', 'kyyyyyyyyk', 'kylllllsyk', 'kylllllllk', 'kygllllllk', 'kyggglllyk', 'kygggggyyk', 'kyyyyyyyyk', 'kkkkkkkkkk', '..........'],
  toilet: ['.kkkk.....', '.kyyk.....', '.kyyk.....', '.kyykkkkk.', '.kyyyyyyyk', '.kyykkkkyk', '.kyyyyyyyk', '..kyyyyyk.', '...kyyyk..', '..kkkkkkk.'],
  satellite: ['k.......k.', 'lk.....kl.', 'llk...kll.', 'lllkkklll.', '...keek...', '...keek...', 'lllkkklll.', 'llk.k.kll.', 'lk..k..kl.', 'k...s...k.'],
  duck: ['..........', '....kkk...', '...kyyyk..', '...kykyko.', '...kyyykoo', 'kk..kyyk..', 'kykkyyyyk.', 'kyyyyyyyk.', '.kyyyyyk..', '..kkkkk...'],
  coin: ['...kkkk...', '..kyyyyk..', '.kyssyyYk.', 'kyyskkyyYk', 'kyykyyyyYk', 'kyyyykyyYk', 'kyykkyyyYk', '.kyyyyyYk.', '..kYYYYk..', '...kkkk...'],
  box: ['..........', '.kkkkkkkk.', 'kccCCCCcck', 'kkkkkkkkkk', 'kccccCcCck', 'kcccccCcck', 'kccccccCck', 'kcccccccck', 'kkkkkkkkkk', '..........'],
  star: ['....kk....', '....ky....', '...kssk...', 'kkkkssskkk', 'kysssssssk', '.kysssssk.', '..kssssk..', '.ksskkssk.', '.kskk.ksk.', '.kk....kk.'],
  cursor: ['k.........', 'kk........', 'kwk.......', 'kwwk......', 'kwwwk.....', 'kwwwwk....', 'kwwwwwk...', 'kwwkkkkk..', 'kwk.......', 'kk........'],
  brain: ['..kkkkkk..', '.kiiiixik.', 'kixiiiixik', 'kiiixiiiik', 'kixiiixiik', 'kiiiixiiik', '.kixiiiik.', '..kkkkkk..', '...kiik...', '...kkkk...'],
  key: ['..kkk.....', '.kyyyk....', 'kyk.kyk...', 'kyk.kyk...', '.kyyyk....', '..kyk.....', '..kyk.....', '..kyykk...', '..kyk.....', '..kyykk...'],
  trophy: ['kkkkkkkkkk', 'kysyyyyyyk', 'kysyyyyyyk', '.kyyyyyyk.', '..kyyyyk..', '...kyyk...', '....kk....', '...kyyk...', '..kkkkkk..', '..kYYYYk..'],
  lock: ['...kkkk...', '..kk..kk..', '..k....k..', '.kkkkkkkk.', '.keeeeeek.', '.keekkeek.', '.keekkeek.', '.keeeeeek.', '.kEEEEEEk.', '.kkkkkkkk.'],
  pigeon: ['..........', '......kk..', '.....keko.', '.kk..keek.', 'keekkeeek.', 'keeeeeetk.', '.keeeeek..', '..kkkkk...', '...o.o....', '..........'],
  cat: ['k.k....k.k', 'kokk..kkok', 'kooooooook', 'kokooookok', 'kooooooook', '.kooxxook.', '..kooook..', '.koooooook', '.kooooook.', '.kk.kk.kk.'],
  scroll: ['.kkkkkkkk.', 'kmmmmmmmmk', '.kmmmmmmk.', '.kmkkkkmk.', '.kmmmmmmk.', '.kmkkkmmk.', '.kmmmmmmk.', '.kmkkkkmk.', 'kmmmmmmmmk', '.kkkkkkkk.'],
};

const cache = new Map<string, string>();

/** Returns a data URL for an icon, rendered at `scale` pixels per pixel. */
export function iconUrl(id: IconId, scale = 3): string {
  const key = `${id}@${scale}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const rows = ICONS[id] ?? ICONS.box;
  const c = document.createElement('canvas');
  c.width = 10 * scale;
  c.height = 10 * scale;
  const ctx = c.getContext('2d')!;
  rows.forEach((row, y) => {
    for (let x = 0; x < 10; x++) {
      const col = KEY[row[x]];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  });
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}
