// Historia de la primera promesa de vivienda: estado, registro de votaciones y desenlace.
// Este módulo no importa government.ts (evita ciclos): la decisión de gobierno vive en housingDecision.ts.
import { country } from '../data/countries';
import { HOUSING_CALL, HOUSING_DEBATE, HOUSING_DECISION, HOUSING_EPILOGUE, HOUSING_FLAVOR } from '../data/housingStory';
import { answerProgramme } from './campaign';
import { addFlag, changeStat, clamp, partyDef } from './state';
import type { DeltaRec, GameState, HousingAttempt, HousingOutcome, L, Outcome } from './types';
import type { Tally } from './parliament';

type Vars = Record<string, L | string | number>;

/** Sustituye {variables} en un texto localizado. */
export function fill(text: L, vars: Vars): L {
  const sub = (str: string, lang: 'es' | 'en') => str.replace(/\{(\w+)\}/g, (m, k: string) => {
    const v = vars[k];
    if (v === undefined) return m;
    return typeof v === 'object' ? v[lang] : String(v);
  });
  return { es: sub(text.es, 'es'), en: sub(text.en, 'en') };
}

/** Variables comunes de la historia en esta partida. */
export function storyVars(s: GameState): Vars {
  const c = country(s.country);
  const f = HOUSING_FLAVOR[s.country];
  return { name: s.name, caller: c.castNames.caller, advisor: c.castNames.advisor, radio: f.radio, rise: f.rise, legislature: c.titles.legislature, journalist: c.castNames.journalist };
}

export function callOptions(s: GameState) {
  const v = storyVars(s);
  return HOUSING_CALL.options.map((o) => ({ ...o, quote: fill(o.quote, v), short: o.short, tradeoff: o.tradeoff, reply: fill(o.reply, v) }));
}

/** Registra la respuesta de la llamada de radio: ocupa el hueco de vivienda del programa. */
export function makeHousingPromise(s: GameState, option: number, promisedAfterMs = 0): Outcome {
  const opt = callOptions(s)[option];
  const out = answerProgramme(s, 'housing', opt.stance);
  const last = s.decisions[s.decisions.length - 1];
  if (last?.id === 'programme_housing') {
    last.impact = 6;
    last.label = fill({ es: 'En la radio, a {caller}: «{q}»', en: 'On the radio, to {caller}: "{q}"' }, { ...storyVars(s), q: opt.quote });
  }
  s.housing = { option, policy: opt.policy, stance: opt.stance, quote: opt.quote, promisedAfterMs, stage: 'promised', attempts: [] };
  addFlag(s, 'housing_call_done');
  return { text: opt.reply, deltas: out.deltas };
}

/** ¿Toca recuperar la promesa en el despacho esta ronda? */
export function housingDue(s: GameState): boolean {
  const h = s.housing;
  return !!h && h.stage === 'promised' && h.offeredRound === undefined && s.unlocked.includes('housing') && !s.passed.includes(h.policy);
}

/** ¿Se puede retomar desde una ronda de leyes? */
export function housingRetakeable(s: GameState): boolean {
  const h = s.housing;
  return !!h && (h.stage === 'postponed' || h.stage === 'rejected') && !s.passed.includes(h.policy) && s.unlocked.includes('housing');
}

/** Partidos que votaron en contra, ordenados por escaños en la cámara principal. */
export function blockersOf(s: GameState, tally: Tally): string[] {
  const main = country(s.country).mainChamber;
  return tally.votes
    .filter((v) => v.vote === 'no' && !partyDef(s, v.id)?.isPlayer)
    .sort((a, b) => (b.seats[main] ?? 0) - (a.seats[main] ?? 0))
    .map((v) => v.id);
}

export function blockersText(s: GameState, ids: string[]): L {
  if (!ids.length) return HOUSING_DECISION.noBlockers;
  const main = country(s.country).mainChamber;
  const parts = ids.map((id) => {
    const p = partyDef(s, id);
    const seats = s.parties.find((x) => x.id === id)?.seats[main] ?? 0;
    return `${p?.short ?? id} (${seats})`;
  });
  return { es: parts.join(', '), en: parts.join(', ') };
}

export function attemptFrom(s: GameState, route: HousingAttempt['route'], passed: boolean, tally?: Tally): HousingAttempt {
  const main = country(s.country).mainChamber;
  const b = tally?.byChamber[main];
  return { round: s.round, route, passed, blockers: tally && !passed ? blockersOf(s, tally) : [], yes: b?.yes ?? 0, no: b?.no ?? 0 };
}

/** Gancho: una votación de la política prometida por el circuito normal de leyes. */
export function noteHousingVote(s: GameState, policyId: string, passed: boolean, tally: Tally | undefined, route: 'bill' | 'fast'): void {
  const h = s.housing;
  if (!h || h.policy !== policyId || h.stage === 'passed') return;
  h.attempts.push(attemptFrom(s, route, passed, tally));
  if (passed) markPassed(s, 'other');
  else h.stage = 'rejected';
}

/** Gancho: la medida por vía rápida cae al no convalidarse. */
export function noteHousingFell(s: GameState, policyId: string, tally: Tally): void {
  const h = s.housing;
  if (!h || h.policy !== policyId) return;
  h.attempts.push(attemptFrom(s, 'ratify', false, tally));
  h.stage = 'rejected';
  h.passedMode = undefined;
  h.passedRound = undefined;
  h.effectsRound = undefined;
}

export function markPassed(s: GameState, mode: 'full' | 'negotiated' | 'other'): void {
  const h = s.housing!;
  h.stage = 'passed';
  h.passedMode = mode;
  h.passedRound = s.round;
  const pending = s.deferred.filter((d) => d.source === h.policy && d.effects.some((e) => e.stat === 'housing' && (e.delta ?? 0) > 0));
  h.effectsRound = pending.length ? Math.max(...pending.map((d) => d.round)) : s.round;
}

/** Desenlace a ojos de la oyente. */
export function housingOutcome(s: GameState): HousingOutcome | null {
  const h = s.housing;
  if (!h) return null;
  if (h.stage === 'passed') {
    const pending = s.deferred.some((d) => d.source === h.policy && d.effects.some((e) => e.stat === 'housing' && (e.delta ?? 0) > 0));
    return pending ? 'waiting' : 'working';
  }
  if (h.attempts.some((a) => !a.passed)) return 'rejected';
  return 'abandoned';
}

/** Texto de estado para la carpeta de promesas. */
export function housingStatusText(s: GameState): L {
  const h = s.housing!;
  const v = storyVars(s);
  const last = h.attempts[h.attempts.length - 1];
  const out = housingOutcome(s);
  if (h.stage === 'passed') return out === 'waiting' ? fill(HOUSING_DECISION.stage_waiting, { r: h.passedRound ?? s.round, e: h.effectsRound ?? s.round }) : fill(HOUSING_DECISION.stage_passed, { r: h.passedRound ?? s.round });
  if (h.stage === 'rejected' && last) return fill(HOUSING_DECISION.stage_rejected, { ...v, r: last.round, blockers: blockersText(s, last.blockers) });
  if (h.stage === 'postponed') return fill(HOUSING_DECISION.stage_postponed, { r: h.postponedRound ?? s.round });
  return HOUSING_DECISION.stage_promised;
}

// ── Debate de reelección ─────────────────────────────────────────────────
export interface HousingDebateView {
  outcome: HousingOutcome;
  intro: L; tapeKicker: L; tape: L; bridge: L; callerLine: L; whisper: L | null;
  defenses: L[]; close: L;
}

export function housingDebateView(s: GameState): HousingDebateView | null {
  const h = s.housing;
  const outcome = housingOutcome(s);
  if (!h || !outcome) return null;
  const v: Vars = { ...storyVars(s), rounds: Math.max(1, s.round), blockers: blockersText(s, lastBlockers(s)) };
  const D = HOUSING_DEBATE;
  const callerLine = outcome === 'working' ? D.callerWorking[h.policy] : outcome === 'waiting' ? D.callerWaiting : outcome === 'rejected' ? D.callerRejected : D.callerAbandoned;
  const pendingOnCork = outcome === 'waiting' || (outcome === 'abandoned' && h.stage === 'postponed');
  return {
    outcome,
    intro: fill(D.journalistIntro, v),
    tapeKicker: fill(D.tapeKicker, v),
    tape: h.quote,
    bridge: fill(D.journalistBridge, v),
    callerLine: fill(callerLine, v),
    whisper: pendingOnCork ? D.whisper : null,
    defenses: D.defenses[outcome].map((d) => fill(d.label, v)),
    close: fill(D.journalistClose[outcome], v),
  };
}

function lastBlockers(s: GameState): string[] {
  const failed = s.housing?.attempts.filter((a) => !a.passed) ?? [];
  return failed.length ? failed[failed.length - 1].blockers : [];
}

/** Aplica la defensa elegida: mueve al público del debate y la credibilidad. */
export function resolveHousingDefense(s: GameState, idx: number): { reply: L; deltas: DeltaRec[]; audience: number } {
  const h = s.housing!;
  const outcome = housingOutcome(s)!;
  const def = HOUSING_DEBATE.defenses[outcome][idx];
  const deltas: DeltaRec[] = [];
  const why: L = { es: 'La oyente de la radio, en el debate', en: 'The radio listener, at the debate' };
  if (s.debate) s.debate.audience = clamp(s.debate.audience + def.audience * 1.4);
  if (def.credibility) deltas.push({ stat: 'credibility', delta: changeStat(s, 'credibility', def.credibility), why });
  if (def.audience) deltas.push({ cast: 'caller', delta: def.audience, why });
  s.cast.caller.trust = clamp(s.cast.caller.trust + def.audience * 2, -100, 100);
  h.debate = { outcome, defense: idx, audience: def.audience, credibility: def.credibility };
  addFlag(s, 'housing_debate_done');
  s.decisions.push({ round: s.round, id: 'housing_debate', choice: String(idx), impact: 5, label: fill({ es: 'Ante {caller}, en el debate: {d}', en: 'Facing {caller} at the debate: {d}' }, { ...storyVars(s), d: def.label }) });
  return { reply: fill(def.reply, storyVars(s)), deltas, audience: def.audience };
}

export function housingDebatePending(s: GameState): boolean {
  return !!s.housing && !s.flags.includes('housing_debate_done');
}

/** Línea de epílogo para la pantalla final. */
export function housingEpilogue(s: GameState, governed: boolean): L | null {
  if (!s.housing) return null;
  const key = governed ? housingOutcome(s)! : 'neverGoverned';
  return fill(HOUSING_EPILOGUE[key], storyVars(s));
}
