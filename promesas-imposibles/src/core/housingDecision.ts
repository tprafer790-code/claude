// Decisión de gobierno sobre la promesa de vivienda: cumplirla, negociarla o aplazarla,
// con la votación y el presupuesto reales de la partida.
import { country } from '../data/countries';
import { HOUSING_DECISION } from '../data/housingStory';
import { POLICY_BY_ID } from '../data/policies';
import { applyOffers, billTally, LINE_COST, passPolicy, revenue, spending, totalRounds } from './government';
import { attemptFrom, blockersText, fill, markPassed, storyVars } from './housingStory';
import type { Concession, Tally } from './parliament';
import { applyEffects, changeStat, partyDef, uid } from './state';
import type { BudgetLine, DeltaRec, Effect, GameState, HousingMode, L } from './types';

export const CUT_LINES: BudgetLine[] = ['services', 'security', 'investment'];
/** A qué indicador afecta cada partida y hacia dónde tiende (misma fórmula que closeRound). */
export function lineTarget(line: BudgetLine, level: number): { stat: 'services' | 'security' | 'economy' | 'housing'; target: number } {
  if (line === 'services') return { stat: 'services', target: 32 + level * 16 };
  if (line === 'security') return { stat: 'security', target: 34 + level * 15 };
  if (line === 'housing') return { stat: 'housing', target: 30 + level * 15 };
  return { stat: 'economy', target: 42 + level * 5 };
}

export type Funding = BudgetLine | 'deficit';

export interface HousingForecast {
  policyId: string;
  upfront: number;
  upkeep: number;
  housingMax: boolean;
  balanceNow: number;
  /** Saldo por ronda con cada forma de financiarla */
  balanceWith: Partial<Record<Funding, number>>;
  cutOptions: { line: BudgetLine; from: number; to: number; stat: string; target: number }[];
  defaultFunding: Funding;
  full: Tally;
  nego: Tally;
  negoOffers: Record<string, Concession[]>;
  negoRounds: number;
  negoUpfront: number;
}

/** Concesiones de enmienda para todos los que no votarían sí. */
function amendOffers(s: GameState, base: Tally): Record<string, Concession[]> {
  const offers: Record<string, Concession[]> = {};
  for (const v of base.votes) if (v.vote !== 'yes' && !partyDef(s, v.id)?.isPlayer) offers[v.id] = ['amend'];
  return offers;
}

export function housingForecast(s: GameState): HousingForecast {
  const h = s.housing!;
  const p = POLICY_BY_ID[h.policy];
  const lines = s.budget.lines;
  const housingMax = lines.housing >= 3;
  const full = billTally(s, p.id);
  const negoOffers = amendOffers(s, full);
  const nego = billTally(s, p.id, negoOffers);
  const rev = revenue(s);
  const balanceNow = Math.round((rev - spending(s)) * 10) / 10;
  const extraUpkeep = p.upkeep;
  const balanceWith: Partial<Record<Funding, number>> = {};
  for (const f of [...CUT_LINES, 'deficit'] as Funding[]) {
    const next = { ...lines };
    if (!housingMax) next.housing += 1;
    if (f !== 'deficit' && !housingMax) next[f] -= 1;
    balanceWith[f] = Math.round((rev - spending(s, next) - extraUpkeep) * 10) / 10;
  }
  const cutOptions = CUT_LINES.filter((l) => lines[l] > 0).map((l) => { const tg = lineTarget(l, lines[l] - 1); return { line: l, from: lines[l], to: lines[l] - 1, stat: tg.stat, target: tg.target }; });
  // Por defecto se recorta la partida más holgada; si no hay, déficit.
  const defaultFunding: Funding = housingMax ? 'deficit' : cutOptions.length ? [...cutOptions].sort((a, b) => b.from - a.from || CUT_LINES.indexOf(b.line) - CUT_LINES.indexOf(a.line))[0].line : 'deficit';
  return {
    policyId: p.id, upfront: p.upfront, upkeep: p.upkeep, housingMax, balanceNow, balanceWith, cutOptions, defaultFunding,
    full, nego, negoOffers, negoRounds: Math.max(1, totalRounds(s) - s.round + 1), negoUpfront: Math.ceil(p.upfront / 2),
  };
}

function snapshot(s: GameState) {
  return { treasury: Math.round(s.stats.treasury * 10) / 10, balance: Math.round((revenue(s) - spending(s)) * 10) / 10, housing: Math.round(s.stats.housing * 10) / 10, lines: { ...s.budget.lines } };
}

export interface HousingResult { mode: HousingMode; passed: boolean | null; tally?: Tally; deltas: DeltaRec[]; text: L; advisor: L }

/** Resuelve la decisión. `funding` solo cuenta al cumplirla entera. */
export function resolveHousing(s: GameState, mode: HousingMode, funding?: Funding): HousingResult {
  const h = s.housing!;
  const p = POLICY_BY_ID[h.policy];
  const v = storyVars(s);
  const item = s.agenda.find((a) => a.type === 'housing' && !a.resolved) ?? s.agenda.find((a) => a.type === 'bill' && !a.resolved);
  const replacedBill = item?.type === 'housing' && item.vars?.replacedBill === '1';
  if (item) item.resolved = true;
  h.before = snapshot(s);

  if (mode === 'postpone') {
    h.stage = 'postponed';
    h.postponedRound = s.round;
    if (replacedBill) s.agenda.push({ uid: uid(s, 'bill'), type: 'bill', hotspot: 'desk', resolved: false, main: true });
    s.decisions.push({ round: s.round, id: 'housing_decision', choice: 'postpone', impact: 5, label: fill({ es: 'Aplazaste la promesa a {caller}', en: 'You postponed the promise to {caller}' }, v) });
    h.after = snapshot(s);
    return { mode, passed: null, deltas: [], text: HOUSING_DECISION.advisorPostponed, advisor: HOUSING_DECISION.advisorPostponed };
  }

  const fc = housingForecast(s);
  const tally = mode === 'full' ? fc.full : fc.nego;
  const main = country(s.country).mainChamber;
  const b = tally.byChamber[main];
  const vars = { ...v, yes: b.yes, no: b.no, rounds: fc.negoRounds };
  if (mode === 'negotiated') applyOffers(s, fc.negoOffers);
  h.attempts.push(attemptFrom(s, mode, tally.passes, tally));

  if (!tally.passes) {
    h.stage = 'rejected';
    const deltas: DeltaRec[] = [{ stat: 'popularity', delta: changeStat(s, 'popularity', -2), why: { es: 'Derrota parlamentaria', en: 'Parliamentary defeat' } }];
    const blockers = blockersText(s, h.attempts[h.attempts.length - 1].blockers);
    s.decisions.push({ round: s.round, id: 'housing_decision', choice: `${mode}_fail`, impact: 6, label: fill({ es: 'Te tumbaron la promesa a {caller}', en: 'The promise to {caller} was voted down' }, v) });
    h.after = snapshot(s);
    return { mode, passed: false, tally, deltas, text: fill(HOUSING_DECISION.rejected, { ...vars, blockers }), advisor: HOUSING_DECISION.advisorRejected };
  }

  let deltas: DeltaRec[];
  let text: L;
  if (mode === 'full') {
    deltas = passPolicy(s, p.id);
    const f: Funding = funding ?? fc.defaultFunding;
    const lines = s.budget.lines;
    let budgetText: L | null = null;
    if (!fc.housingMax) {
      lines.housing += 1;
      if (f !== 'deficit' && f !== 'housing' && lines[f] > 0) {
        lines[f] -= 1;
        h.funding = f;
        budgetText = fill(HOUSING_DECISION.passedFullBudget, { h: lines.housing, line: lineName(f), cut: lines[f] });
      } else {
        h.funding = 'deficit';
        budgetText = fill(HOUSING_DECISION.passedFullDeficit, { h: lines.housing });
      }
    } else h.funding = 'none';
    text = budgetText ? { es: `${fill(HOUSING_DECISION.passedFull, vars).es} ${budgetText.es}`, en: `${fill(HOUSING_DECISION.passedFull, vars).en} ${budgetText.en}` } : fill(HOUSING_DECISION.passedFull, vars);
    markPassed(s, 'full');
    s.decisions.push({ round: s.round, id: 'housing_decision', choice: 'full', impact: 7, label: fill({ es: 'Cumpliste entera la promesa a {caller}', en: 'You delivered the promise to {caller} in full' }, v) });
  } else {
    deltas = enactNegotiated(s, fc.negoRounds, fc.negoUpfront);
    text = fill(HOUSING_DECISION.passedNego, vars);
    markPassed(s, 'negotiated');
    s.decisions.push({ round: s.round, id: 'housing_decision', choice: 'negotiated', impact: 6, label: fill({ es: 'Negociaste la promesa a {caller}: llegará después de las elecciones', en: 'You negotiated the promise to {caller}: it arrives after the election' }, v) });
  }
  h.after = snapshot(s);
  return { mode, passed: true, tally, deltas, text, advisor: mode === 'full' ? fill(HOUSING_DECISION.advisorFull, v) : HOUSING_DECISION.advisorNego };
}

/** Ley pactada: al 75 % y con todos sus efectos aplazados hasta la siguiente legislatura. */
function enactNegotiated(s: GameState, rounds: number, upfront: number): DeltaRec[] {
  const h = s.housing!;
  const p = POLICY_BY_ID[h.policy];
  s.passed.push(p.id);
  const why: L = { es: `Entrada en vigor pactada: ${p.name.es}`, en: `Agreed start date: ${p.name.en}` };
  const deltas: DeltaRec[] = [];
  if (upfront) deltas.push({ stat: 'treasury', delta: changeStat(s, 'treasury', -upfront), why });
  const scale = (e: Effect): Effect => ({ ...e, delta: e.delta ? Math.round(e.delta * 0.75 * 10) / 10 : e.delta, sat: e.sat ? Math.round(e.sat * 0.75 * 10) / 10 : e.sat, delay: rounds, why: e.why ?? why });
  applyEffects(s, [...p.immediate, ...p.delayed].map(scale), p.id, why);
  deltas.push({ stat: 'credibility', delta: changeStat(s, 'credibility', 1), why: { es: 'Promesa encarrilada', en: 'Promise on track' } });
  return deltas;
}

const LINE_NAMES: Record<BudgetLine, L> = {
  services: { es: 'Sanidad y servicios', en: 'Health and services' },
  housing: { es: 'Vivienda', en: 'Housing' },
  security: { es: 'Seguridad', en: 'Security' },
  investment: { es: 'Inversión', en: 'Investment' },
};
export function lineName(l: BudgetLine): L { return LINE_NAMES[l]; }
export { LINE_COST };
