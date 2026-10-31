// Iconos planos dibujados a mano en SVG (sin emojis ni fuentes de iconos).
import type { StatId } from '../core/types';

const W = (body: string) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const ICONS: Partial<Record<StatId, string>> = {
  popularity: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  wellbeing: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  economy: '<path d="M4 19h16M6 16V11M11 16V7M16 16v-5M20 5l-4 4-3-2-5 4"/>',
  support: '<path d="M3 20h18M5 20v-7M9 20v-7M15 20v-7M19 20v-7M2 11l10-7 10 7z"/>',
  integrity: '<path d="M12 3l8 3v6c0 4.5-3.4 7.6-8 9-4.6-1.4-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  treasury: '<rect x="3" y="7" width="18" height="12" rx="2"/><circle cx="12" cy="13" r="2.5"/><path d="M7 7V5h10v2"/>',
  debt: '<path d="M6 4h12v16l-3-2-3 2-3-2-3 2z"/><path d="M9 9h6M9 13h4"/>',
  jobs: '<rect x="3" y="8" width="18" height="11" rx="2"/><path d="M9 8V5h6v3M3 13h18"/>',
  housing: '<path d="M3 11l9-7 9 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
  services: '<path d="M12 4v16M4 12h16"/><rect x="3" y="3" width="18" height="18" rx="4"/>',
  security: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  environment: '<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15"/><path d="M5 19l7-7"/>',
  diplomacy: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  credibility: '<path d="M4 12l5 5L20 6"/>',
  suspicion: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  evidence: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  privateFunds: '<path d="M4 7h16v12H4z"/><path d="M4 7l8 6 8-6"/>',
  momentum: '<path d="M4 18l6-6 4 4 6-8"/><path d="M15 8h5v5"/>',
  funds: '<circle cx="12" cy="12" r="8"/><path d="M14.5 9c-.5-1-1.5-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.9 2.5 2.2-1.1 2-2.5 2-2.2-.6-2.7-1.6M12 6v1.5M12 16.5V18"/>',
  unrest: '<path d="M12 3v10M12 17v2"/><path d="M5 21h14L12 3z"/>',
};

export function statIcon(k: StatId): string { return W(ICONS[k] ?? '<circle cx="12" cy="12" r="6"/>'); }

export const UI_ICONS = {
  sound: W('<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9c1 1 1 5 0 6M19 7c2 2.5 2 7.5 0 10"/>'),
  mute: W('<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M17 9l5 6M22 9l-5 6"/>'),
  pause: W('<path d="M8 5v14M16 5v14"/>'),
  gear: W('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>'),
  clock: W('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
};
