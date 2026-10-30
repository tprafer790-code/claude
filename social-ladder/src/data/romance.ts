/**
 * Romantic encounters: an adult you meet invites you home. The night itself
 * fades to black; only the consequences are shown. Protection is the safe
 * choice; going without boosts income a lot but may bring a child and child
 * support.
 */
export const ROMANCE = {
  /** Encounters start once you have some status or a ride, from this rank. */
  minRank: 8,
  minStatus: 3,
  /** Seconds of play between encounters (random within range). */
  every: [420, 720] as const,
  /** Income bonus for the rest of the life. */
  safeIncome: 1.01,
  wildIncome: 1.3,
  /** Chance of a child without protection. */
  childChance: 0.3,
  /** Seconds until the baby arrives ("nine months later"). */
  pregnancySeconds: 90,
  /** Each child: permanent income penalty this life... */
  childIncome: 0.9,
  /** ...and a payment every this many seconds of play... */
  supportEvery: 120,
  /** ...of this fraction of your cash, or at least this many seconds of income. */
  supportCashFraction: 0.08,
  supportMinSeconds: 60,
} as const;

export interface PartnerDef {
  id: string;
  name: string;
  /** How you met. Always two adults. */
  text: string;
}

export const PARTNERS: PartnerDef[] = [
  { id: 'lucia', name: 'Lucía, 34', text: 'You meet Lucía, a 34-year-old architect, at a charity dinner. She laughs at all your jokes, even the bad ones. At midnight she invites you up for "a last drink".' },
  { id: 'marta', name: 'Marta, 29', text: 'Marta, 29, a firefighter, rescues your cat from a tree. Over coffee there is a spark that is not a fire hazard. She invites you to her place.' },
  { id: 'elena', name: 'Elena, 41', text: 'Elena, 41, a divorce lawyer, sits next to you at the bar. "I know a good investment when I see one," she says, and takes you home.' },
  { id: 'carmen', name: 'Carmen, 38', text: 'Carmen, 38, a chef, sends a dish to your table "from the kitchen". After closing, the kitchen is not the only thing that is hot. Her flat is around the corner.' },
  { id: 'sofia', name: 'Sofía, 31', text: 'Sofía, 31, beats you at padel and asks for a rematch. At her place. The rematch is not padel.' },
];

export const PARTNER_BY_ID: Record<string, PartnerDef> = Object.fromEntries(PARTNERS.map((p) => [p.id, p]));
