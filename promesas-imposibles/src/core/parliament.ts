// Parlamento: apoyos, votaciones, negociación, formación de gobierno y caída.
import { country } from '../data/countries';
import { clamp, partyDef, playerLean, registerSupport } from './state';
import type { GameState, L, Party, PartyState, Policy } from './types';

export type Concession = 'amend' | 'invest' | 'ministry' | 'bribe';
export const CONCESSION_COST: Record<Concession, { treasury?: number; privateFunds?: number }> = {
  amend: {}, invest: { treasury: 2 }, ministry: {}, bribe: { privateFunds: 3 },
};

export interface PartyVote { id: string; vote: 'yes' | 'no' | 'abstain'; seats: Record<string, number>; score: number; reason: L }
export interface Tally { votes: PartyVote[]; byChamber: Record<string, { yes: number; no: number; abstain: number; need: number }>; passes: boolean; rule: L }

function affinity(p: Party, lean: number): number {
  const a = 1.2 - 0.9 * Math.abs(p.lean - lean);
  return p.pragmatic ? a * 0.3 + 0.25 : a;
}

/** Puntuación de voto de un partido ante una iniciativa con cierta orientación. */
export function partyScore(s: GameState, p: Party, ps: PartyState, lean: number, concessions: Concession[] = [], authoritarian = false): { score: number; reason: L } {
  if (p.isPlayer) return { score: 3, reason: { es: 'Tu partido', en: 'Your party' } };
  let score = affinity(p, lean);
  score += ps.loyalty / 40;
  if (ps.inGovernment) score += 0.8;
  if (p.isRival) score -= 1.3;
  else if (p.faction === 'rival') score -= 0.6;
  if (p.faction === 'player' && !p.isPlayer) score += 1.1; // disciplina de partido (EE. UU.)
  if (!p.isRival) score += (s.stats.popularity - 50) / 60;
  if (authoritarian && !p.pragmatic) score -= 0.8;
  for (const c of concessions) {
    if (c === 'amend') score += 0.7;
    if (c === 'invest') score += p.pragmatic || p.regional ? 1.4 : 0.8;
    if (c === 'ministry') score += 1.1;
    if (c === 'bribe') score += 1.6;
  }
  const reason: L = score > 0.5
    ? { es: 'Le convence', en: 'Convinced' }
    : score > -0.1 ? { es: 'Duda: quiere algo a cambio', en: 'Undecided: wants something' } : { es: 'En contra', en: 'Against' };
  return { score, reason };
}

export function partyDefs(s: GameState): Party[] { return country(s.country).parties(s.orientation); }

/** Votación de una iniciativa. `kind` distingue leyes, presupuesto, convalidación… */
export function voteOn(s: GameState, lean: number, opts: { concessions?: Record<string, Concession[]>; fiscal?: boolean; authoritarian?: boolean; kind?: 'law' | 'budget' | 'investiture' } = {}): Tally {
  const c = country(s.country);
  const votes: PartyVote[] = [];
  for (const ps of s.parties) {
    const p = partyDef(s, ps.id)!;
    const { score, reason } = partyScore(s, p, ps, lean, opts.concessions?.[ps.id] ?? [], opts.authoritarian);
    const vote = score > 0.5 ? 'yes' : score > -0.1 ? 'abstain' : 'no';
    votes.push({ id: ps.id, vote, seats: ps.seats, score, reason });
  }
  const byChamber: Tally['byChamber'] = {};
  for (const ch of c.chambers) {
    const t = { yes: 0, no: 0, abstain: 0, need: 0 };
    for (const v of votes) t[v.vote] += v.seats[ch.id] ?? 0;
    byChamber[ch.id] = t;
  }
  let passes = false; let rule: L;
  if (c.system === 'parliamentary') {
    const t = byChamber.congress;
    if (opts.kind === 'investiture') {
      t.need = 176;
      passes = t.yes >= 176 || t.yes > t.no;
      rule = { es: '1.ª votación: 176 síes. 2.ª: más síes que noes.', en: '1st vote: 176 yes. 2nd: more yes than no.' };
    } else {
      t.need = t.no + 1;
      passes = t.yes > t.no;
      rule = { es: 'Mayoría simple: más síes que noes.', en: 'Simple majority: more yes than no.' };
    }
  } else if (c.system === 'presidential-us') {
    const h = byChamber.house; const sn = byChamber.senate;
    h.need = 218; sn.need = opts.fiscal || opts.kind === 'budget' ? 51 : 60;
    passes = h.yes >= 218 && sn.yes >= sn.need;
    rule = opts.fiscal || opts.kind === 'budget'
      ? { es: 'Cámara: 218. Senado: 51 (conciliación presupuestaria).', en: 'House: 218. Senate: 51 (budget reconciliation).' }
      : { es: 'Cámara: 218. Senado: 60 para superar el obstruccionismo.', en: 'House: 218. Senate: 60 to beat the filibuster.' };
  } else {
    const cm = byChamber.camara; const sn = byChamber.senado;
    cm.need = Math.max(cm.no + 1, 129); sn.need = sn.no + 1;
    passes = cm.yes > cm.no && cm.yes + cm.no >= 257 && sn.yes > sn.no;
    rule = { es: 'Cámara: más síes que noes con quórum de 257. Senado: mayoría simple.', en: 'Chamber: more yes than no with a 257 quorum. Senate: simple majority.' };
  }
  return { votes, byChamber, passes, rule: rule! };
}

export function policyLean(s: GameState, p: Policy): number { return p.authoritarian ? playerLean(s) : p.lean; }

/** Apoyo parlamentario (0-100): margen sobre la mayoría en una iniciativa neutra para el jugador. */
export function supportScore(s: GameState): number {
  if (!s.parties.length) return 0;
  const t = voteOn(s, playerLean(s));
  const c = country(s.country);
  let worst = 100;
  for (const ch of c.chambers) {
    const b = t.byChamber[ch.id];
    const need = c.system === 'presidential-us' && ch.id === 'senate' ? 55 : ch.size / 2;
    worst = Math.min(worst, 50 + ((b.yes - need) / ch.size) * 220);
  }
  return clamp(worst);
}
registerSupport(supportScore);

/** Inicializa los partidos con los escaños de unas elecciones. */
export function seatParties(s: GameState, seats: Record<string, Record<string, number>>): void {
  const defs = partyDefs(s);
  const prev = new Map(s.parties.map((p) => [p.id, p]));
  s.parties = defs.map((p) => {
    const old = prev.get(p.id);
    const st: PartyState = {
      id: p.id,
      seats: Object.fromEntries(Object.keys(seats).map((ch) => [ch, seats[ch][p.id] ?? 0])),
      loyalty: old?.loyalty ?? (p.isRival ? -40 : p.faction === 'player' ? 30 : 0),
      inGovernment: old?.inGovernment ?? (p.isPlayer || p.faction === 'player'),
      demands: old?.demands ?? [],
    };
    return st;
  });
}

/** Votación de caída: moción de censura (ES) o impeachment (US/BR). */
export function fallVote(s: GameState): { removed: boolean; text: L } {
  const c = country(s.country);
  const evid = s.stats.evidence;
  const against: Record<string, number> = {};
  for (const ch of c.chambers) against[ch.id] = 0;
  for (const ps of s.parties) {
    const p = partyDef(s, ps.id)!;
    if (p.isPlayer) continue;
    let score = ps.loyalty / 30 + (ps.inGovernment ? 1 : 0) - evid / 40 - (s.stats.popularity < 30 ? 0.6 : 0) + (p.faction === 'player' ? 1.2 : 0);
    if (p.isRival) score = -5;
    if (score < 0) for (const ch of c.chambers) against[ch.id] += ps.seats[ch.id] ?? 0;
  }
  if (c.system === 'parliamentary') {
    const n = against.congress;
    const removed = n >= 176;
    return { removed, text: { es: `Moción de censura: ${n} votos a favor (se necesitan 176). ${removed ? 'Prospera: hay nuevo Gobierno.' : 'Fracasa.'}`, en: `No-confidence motion: ${n} in favour (176 needed). ${removed ? 'It passes: a new government takes over.' : 'It fails.'}` } };
  }
  const [lower, upper] = c.chambers;
  const lowerNeed = c.system === 'presidential-us' ? 218 : 342;
  const upperNeed = c.system === 'presidential-us' ? 67 : 54;
  const impeached = against[lower.id] >= lowerNeed;
  const removed = impeached && against[upper.id] >= upperNeed;
  return {
    removed,
    text: {
      es: `Impeachment: ${against[lower.id]} votos en la ${lower.name.es} (necesarios ${lowerNeed}). ${impeached ? `Senado: ${against[upper.id]} (necesarios ${upperNeed}). ${removed ? 'Destitución.' : 'Absolución.'}` : 'No prospera.'}`,
      en: `Impeachment: ${against[lower.id]} votes in the ${lower.name.en} (${lowerNeed} needed). ${impeached ? `Senate: ${against[upper.id]} (${upperNeed} needed). ${removed ? 'Removed from office.' : 'Acquitted.'}` : 'It fails.'}`,
    },
  };
}
