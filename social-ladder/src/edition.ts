/**
 * Build edition, fixed at compile time (see vite.config.ts):
 *
 * - classic: the original Spanish-flavoured satire with real-party parodies,
 *   dates, the casino and the darkest dilemmas.
 * - family: the international, family-friendly edition for web portals
 *   (Poki, CrazyGames). Fictional parties, no dates, no gambling, English first.
 *
 * Content differences live next to the classic data and are switched on
 * `FAMILY`, so the bundler drops the other edition's text.
 */
declare const __EDITION__: 'classic' | 'family';

export type Edition = 'classic' | 'family';
export const EDITION: Edition = __EDITION__;
export const FAMILY = EDITION === 'family';
