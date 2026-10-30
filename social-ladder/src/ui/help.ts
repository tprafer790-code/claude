import { PARTY_BY_ID } from '../data/parties';
import { STATUS_DANGER } from '../data/social';
import type { GameState } from '../game/state';
import type { StringKey } from '../i18n';

/**
 * One-time explanations shown as things unlock, in this order. Each is shown
 * once (remembered in permanent flags) when its condition first holds.
 */
export interface HelpTopic {
  id: string;
  title: StringKey;
  text: StringKey;
  when: (s: GameState) => boolean;
}

const party = (s: GameState) => (s.government.party ? PARTY_BY_ID[s.government.party] : null);

export const HELP: HelpTopic[] = [
  { id: 'jail', title: 'help_jail_t', text: 'help_jail', when: (s) => s.status <= -35 },
  { id: 'health', title: 'help_health_t', text: 'help_health', when: (s) => s.status <= STATUS_DANGER },
  { id: 'government', title: 'help_government_t', text: 'help_government', when: (s) => !!s.government.party },
  { id: 'hacienda', title: 'help_hacienda_t', text: 'help_hacienda', when: (s) => !!s.government.party && s.stats.playSeconds >= 20 },
  { id: 'taxrisk', title: 'help_taxrisk_t', text: 'help_taxrisk', when: (s) => s.tax.risk >= 35 },
  { id: 'happenings', title: 'help_happenings_t', text: 'help_happenings', when: (s) => !!s.government.party && s.government.happeningIn < 5 },
  { id: 'okupa', title: 'help_okupa_t', text: 'help_okupa', when: (s) => s.government.okupa },
  { id: 'aid', title: 'help_aid_t', text: 'help_aid', when: (s) => !!party(s)?.aid },
  { id: 'status', title: 'help_status_t', text: 'help_status', when: (s) => s.status !== 0 },
  { id: 'rival', title: 'help_rival_t', text: 'help_rival', when: (s) => s.stats.totalClicks >= 30 },
  { id: 'vault', title: 'help_vault_t', text: 'help_vault', when: (s) => s.vault.clicks >= 60 || s.vault.opened > 0 },
  { id: 'dilemma', title: 'help_dilemma_t', text: 'help_dilemma', when: (s) => Object.keys(s.seenDilemmas).length > 0 },
  { id: 'inflation', title: 'help_inflation_t', text: 'help_inflation', when: (s) => s.government.subsidies >= 5 },
  { id: 'casino', title: 'help_casino_t', text: 'help_casino', when: (s) => s.rankIndex >= 4 },
  { id: 'chests', title: 'help_chests_t', text: 'help_chests', when: (s) => s.chests.common + s.chests.rare + s.chests.legendary > 0 },
  { id: 'league', title: 'help_league_t', text: 'help_league', when: (s) => s.stats.playSeconds >= 240 && !!s.league.week },
  { id: 'children', title: 'help_children_t', text: 'help_children', when: (s) => s.family.children > 0 },
];

export function nextHelp(s: GameState): HelpTopic | null {
  return HELP.find((h) => !s.flags[`help_${h.id}`] && h.when(s)) ?? null;
}
