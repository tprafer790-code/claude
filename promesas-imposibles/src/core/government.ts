// Formación de gobierno, rondas de mandato, presupuesto, leyes y vía rápida.
import { country } from '../data/countries';
import { EVENT_BY_ID } from '../data/events';
import { POLICIES, POLICY_BY_ID } from '../data/policies';
import { GROUPS, TUNING } from '../data/tuning';
import { evalCond } from './conditions';
import { runMidterm } from './election';
import { makeItem, pickEvent } from './events';
import { CONCESSION_COST, Concession, partyDefs, policyLean, seatParties, Tally, voteOn } from './parliament';
import { chance, randRange } from './rng';
import { addFlag, applyEffects, avgSatisfaction, changeStat, clamp, groupTarget, hasFlag, partyDef, playerLean, recompute, SECTORS, uid } from './state';
import type { DeltaRec, ElectionResult, GameState, L, Policy, RoundReport, StatId, SystemId } from './types';

/** Desbloqueo progresivo de sistemas por ronda. */
export const UNLOCKS: Record<number, SystemId[]> = {
  1: ['budget'], 2: ['laws'], 3: ['housing', 'jobs', 'pacts'], 6: ['debt', 'foreign', 'security', 'institutions'],
};

// ── Formación ──────────────────────────────────────────────────────────
export function startFormation(s: GameState, res: ElectionResult): void {
  seatParties(s, res.seats);
  s.phase = 'formation';
  s.stats.popularity = clamp(res.playerShare * 1.1);
}

export function formationTally(s: GameState, offers: Record<string, Concession[]>): Tally {
  return voteOn(s, playerLean(s), { concessions: offers, kind: 'investiture' });
}

export function offerCost(offers: Record<string, Concession[]>): { treasury: number; privateFunds: number } {
  let treasury = 0; let privateFunds = 0;
  for (const list of Object.values(offers)) for (const c of list) { treasury += CONCESSION_COST[c].treasury ?? 0; privateFunds += CONCESSION_COST[c].privateFunds ?? 0; }
  return { treasury, privateFunds };
}

/** Cierra la formación. En España exige investidura; en EE. UU./Brasil fija la base aliada. */
export function concludeFormation(s: GameState, offers: Record<string, Concession[]>): { ok: boolean; tally: Tally; text: L } {
  const c = country(s.country);
  const tally = formationTally(s, offers);
  const ok = c.system !== 'parliamentary' || tally.passes;
  if (!ok) return { ok, tally, text: { es: 'La investidura fracasa.', en: 'The investiture vote fails.' } };
  applyOffers(s, offers);
  for (const v of tally.votes) {
    const ps = s.parties.find((p) => p.id === v.id)!;
    const def = partyDef(s, v.id)!;
    if (offers[v.id]?.includes('ministry')) ps.inGovernment = true;
    if (v.vote === 'yes' && !def.isPlayer) ps.loyalty = clamp(ps.loyalty + 15, -100, 100);
  }
  s.phase = 'government';
  s.round = 0;
  addFlag(s, 'governing');
  startRound(s);
  const text: L = c.system === 'parliamentary'
    ? { es: `Investidura aprobada con ${tally.byChamber.congress.yes} síes.`, en: `Investiture approved with ${tally.byChamber.congress.yes} yes votes.` }
    : { es: 'Toma de posesión. Empieza el mandato.', en: 'Inauguration. The term begins.' };
  return { ok, tally, text };
}

function applyOffers(s: GameState, offers: Record<string, Concession[]>): void {
  for (const [pid, list] of Object.entries(offers)) {
    const ps = s.parties.find((p) => p.id === pid);
    if (!ps) continue;
    for (const c of list) {
      if (c === 'invest') changeStat(s, 'treasury', -2);
      if (c === 'bribe') { changeStat(s, 'privateFunds', -3); changeStat(s, 'suspicion', 8); }
      if (c === 'ministry' && partyDef(s, pid)?.pragmatic) changeStat(s, 'integrity', -1);
      if (c === 'amend') ps.demands.push(`amend_${s.round}`);
      ps.loyalty = clamp(ps.loyalty + 8, -100, 100);
    }
  }
}

// ── Rondas ─────────────────────────────────────────────────────────────
export function slotFor(s: GameState, round = s.round) { return country(s.country).roundPlan[round - 1] ?? 'event'; }
export function totalRounds(s: GameState) { return country(s.country).roundPlan.length; }

export function startRound(s: GameState): void {
  s.round += 1;
  s.agenda = [];
  s.roundReport = undefined;
  for (const sys of UNLOCKS[s.round] ?? []) if (!s.unlocked.includes(sys)) s.unlocked.push(sys);
  // Consecuencias diferidas que vencen
  const due = s.deferred.filter((d) => d.round <= s.round);
  s.deferred = s.deferred.filter((d) => d.round > s.round);
  for (const d of due) {
    const r = applyEffects(s, d.effects, d.source, d.why);
    s.log.push({ round: s.round, phase: s.phase, text: d.why, deltas: r.deltas, weight: 1 });
  }
  // Favores que vencen
  for (const f of s.favors) {
    if (f.status !== 'open' || f.dueRound > s.round || s.flags.includes(`favor_sched_${f.id}`)) continue;
    addFlag(s, `favor_sched_${f.id}`);
    s.scheduled.push({ event: f.demand === 'contract' ? 'tycoon_collect' : 'favor_due', round: s.round });
  }
  // Investigación: umbrales de pruebas
  const th = TUNING.evidenceThresholds;
  const ev = s.stats.evidence;
  if (ev >= th.press && !hasFlag(s, 'probe1')) { addFlag(s, 'probe1'); s.scheduled.push({ event: 'press_investigation', round: s.round }); addUnlock(s, 'corruption'); }
  if (ev >= th.judicial && !hasFlag(s, 'probe2')) { addFlag(s, 'probe2'); s.scheduled.push({ event: 'scandal_leak', round: s.round }); }
  if (ev >= th.charges && !hasFlag(s, 'probe3')) { addFlag(s, 'probe3'); s.scheduled.push({ event: 'judicial_charges', round: s.round }); }

  const slot = slotFor(s);
  if (slot === 'reelection') { s.phase = 'reelection'; return; }

  const scheduled = s.scheduled.filter((x) => x.round <= s.round);
  s.scheduled = s.scheduled.filter((x) => x.round > s.round);
  const items = [] as GameState['agenda'];
  let main = false;
  if (slot === 'budget') { items.push({ uid: uid(s, 'budget'), type: 'budget', hotspot: 'desk', resolved: false, main: true }); main = true; }
  else if (slot === 'bill') { items.push({ uid: uid(s, 'bill'), type: 'bill', hotspot: 'desk', resolved: false, main: true }); main = true; }
  else if (slot === 'opposition') {
    const id = s.orientation === 'left' ? 'opp_bill_taxcut' : 'opp_bill_wage';
    if (!s.eventHistory[id]) { items.push(makeItem(s, EVENT_BY_ID[id], true)); main = true; }
  }
  // Eventos programados por cadenas tienen prioridad
  for (const sc of scheduled) {
    const e = EVENT_BY_ID[sc.event];
    if (!e || s.eventHistory[e.id]?.count >= e.repeat.max) continue;
    if (!evalCond(s, { ...e.conditions, minRound: undefined, maxRound: undefined, phases: undefined })) continue;
    if (items.length >= 3) { s.scheduled.push({ event: sc.event, round: s.round + 1 }); continue; }
    const isMain = e.kind === 'main' && !main;
    items.push(makeItem(s, e, isMain));
    if (isMain) main = true;
  }
  if (slot === 'crisis') {
    // Crisis final combinada: dos decisiones principales
    for (let i = 0; i < 2 && items.filter((x) => x.main).length < 2; i++) {
      const e = pickEvent(s, 'main', items.map((x) => EVENT_BY_ID[x.eventId ?? '']?.category).filter(Boolean) as string[]);
      if (e) { const it = makeItem(s, e, true); items.push(it); s.agenda = items; }
    }
    addFlag(s, 'final_crisis');
    main = true;
  }
  if (!main) {
    s.agenda = items;
    const e = pickEvent(s, 'main');
    if (e) items.push(makeItem(s, e, true));
    else items.push({ uid: uid(s, 'bill'), type: 'bill', hotspot: 'desk', resolved: false, main: true });
  }
  s.agenda = items;
  // Eventos cortos (1-2), sin saturar
  const nShort = items.length >= 3 ? 0 : chance(s, TUNING.secondShortEventChance) && items.length < 2 ? 2 : 1;
  const lastCats = s.log.filter((l) => l.round === s.round - 1).map(() => '');
  for (let i = 0; i < nShort; i++) {
    const cats = items.map((x) => EVENT_BY_ID[x.eventId ?? '']?.category).filter(Boolean) as string[];
    const e = pickEvent(s, 'short', [...cats, ...lastCats]);
    if (e) { items.push(makeItem(s, e, false)); s.agenda = items; }
  }
  s.agenda = items;
}

function addUnlock(s: GameState, sys: SystemId) { if (!s.unlocked.includes(sys)) s.unlocked.push(sys); }

export function roundComplete(s: GameState): boolean { return s.agenda.every((a) => a.resolved); }

// ── Presupuesto ────────────────────────────────────────────────────────
export type BudgetPlan = { tax: number; lines: GameState['budget']['lines'] };
const TAX_FACTOR = [0.85, 1, 1.15];
export const LINE_COST = 1.5;

export function upkeep(s: GameState): number { return s.passed.reduce((a, id) => a + (POLICY_BY_ID[id]?.upkeep ?? 0), 0); }
export function revenue(s: GameState, tax = s.budget.tax): number {
  const c = country(s.country);
  return Math.round((c.revenueBase * (0.7 + s.stats.economy / 170) * TAX_FACTOR[tax] - s.stats.debt * 0.035) * 10) / 10;
}
export function spending(s: GameState, lines = s.budget.lines): number {
  return Math.round((Object.values(lines).reduce((a, b) => a + b, 0) * LINE_COST + upkeep(s)) * 10) / 10;
}
export function budgetLean(plan: BudgetPlan): number {
  const l = plan.lines;
  return clamp((1 - plan.tax) * 0.8 + ((l.security + l.investment) - (l.services + l.housing)) * 0.25, -2, 2);
}
export function budgetPreview(s: GameState, plan: BudgetPlan, offers: Record<string, Concession[]> = {}) {
  const rev = revenue(s, plan.tax); const sp = spending(s, plan.lines);
  return { revenue: rev, spending: sp, balance: Math.round((rev - sp) * 10) / 10, tally: voteOn(s, budgetLean(plan), { concessions: offers, kind: 'budget', fiscal: true }) };
}

export function submitBudget(s: GameState, plan: BudgetPlan, offers: Record<string, Concession[]>): { passed: boolean; tally: Tally; text: L; deltas: DeltaRec[] } {
  const c = country(s.country);
  const prev = budgetPreview(s, plan, offers);
  applyOffers(s, offers);
  const deltas: DeltaRec[] = [];
  const item = s.agenda.find((a) => a.type === 'budget' && !a.resolved);
  if (item) item.resolved = true;
  const why: L = { es: 'Presupuesto', en: 'Budget' };
  if (prev.tally.passes) {
    const old = s.budget;
    s.budget = { tax: plan.tax, lines: { ...plan.lines }, approved: true, prorogued: false };
    if (plan.tax > old.tax) { deltas.push({ group: 'business', delta: -5, why }); s.groups.business.sat = clamp(s.groups.business.sat - 5); }
    if (plan.tax < old.tax) { deltas.push({ group: 'business', delta: 5, why }); s.groups.business.sat = clamp(s.groups.business.sat + 5); s.groups.public.sat = clamp(s.groups.public.sat - 3); }
    s.decisions.push({ round: s.round, id: 'budget', choice: `t${plan.tax}`, impact: 5, label: { es: 'Presupuesto aprobado', en: 'Budget passed' } });
    return { passed: true, tally: prev.tally, deltas, text: { es: 'Presupuesto aprobado. Ahora toca cumplirlo.', en: 'Budget passed. Now you must deliver it.' } };
  }
  s.budget.prorogued = true;
  deltas.push({ stat: 'popularity', delta: changeStat(s, 'popularity', -3), why });
  const fail: L = c.system === 'parliamentary'
    ? { es: 'Presupuesto rechazado: se prorrogan las cuentas anteriores.', en: 'Budget rejected: the previous accounts are extended.' }
    : c.system === 'presidential-us'
      ? { es: 'Presupuesto bloqueado en el Congreso: amenaza de cierre de la Administración.', en: 'Budget blocked in Congress: shutdown looming.' }
      : { es: 'Presupuesto rechazado: el Congreso exige más enmiendas.', en: 'Budget rejected: Congress demands more earmarks.' };
  s.scheduled.push({ event: c.system === 'parliamentary' ? 'es_budget_prorogued' : c.system === 'presidential-us' ? 'us_shutdown' : 'br_emendas', round: s.round + 1 });
  s.decisions.push({ round: s.round, id: 'budget', choice: 'fail', impact: 6, label: { es: 'Presupuesto rechazado', en: 'Budget rejected' } });
  return { passed: false, tally: prev.tally, deltas, text: fail };
}

// ── Leyes ──────────────────────────────────────────────────────────────
export function availablePolicies(s: GameState): Policy[] {
  return POLICIES.filter((p) => !s.passed.includes(p.id) && evalCond(s, p.requires));
}

export function billTally(s: GameState, id: string, offers: Record<string, Concession[]> = {}): Tally {
  const p = POLICY_BY_ID[id];
  return voteOn(s, policyLean(s, p), { concessions: offers, fiscal: p.fiscal, authoritarian: p.authoritarian });
}

export function passPolicy(s: GameState, id: string, weaken = 1): DeltaRec[] {
  const p = POLICY_BY_ID[id];
  if (!p || s.passed.includes(id)) return [];
  s.passed.push(id);
  const why: L = { es: `Ley: ${p.name.es}`, en: `Law: ${p.name.en}` };
  const deltas: DeltaRec[] = [];
  if (p.upfront) deltas.push({ stat: 'treasury', delta: changeStat(s, 'treasury', -p.upfront), why });
  const scale = (e: Policy['immediate'][number]) => ({ ...e, delta: e.delta ? e.delta * weaken : e.delta, sat: e.sat ? e.sat * weaken : e.sat });
  deltas.push(...applyEffects(s, p.immediate.map(scale), id, why).deltas);
  applyEffects(s, p.delayed.map((e) => ({ ...scale(e), delay: p.delay, why: e.why ?? { es: `Efecto diferido: ${p.name.es}`, en: `Delayed effect: ${p.name.en}` } })), id, why);
  if (p.axis) deltas.push(...applyEffects(s, [{ promise: { axis: p.axis, stance: p.stance } }], id, why).deltas);
  if (p.risk && chance(s, p.risk.chance)) deltas.push(...applyEffects(s, p.risk.effects, id, p.risk.text).deltas);
  return deltas;
}

export function submitBill(s: GameState, id: string, offers: Record<string, Concession[]>, mode: 'vote' | 'fast'): { passed: boolean; tally?: Tally; text: L; deltas: DeltaRec[] } {
  const p = POLICY_BY_ID[id];
  const c = country(s.country);
  const item = s.agenda.find((a) => a.type === 'bill' && !a.resolved);
  if (item) item.resolved = true;
  if (mode === 'fast') {
    const deltas = passPolicy(s, id);
    const expires = c.system === 'presidential-br' ? s.round + 2 : s.round + 1;
    s.fastTracked.push({ policy: id, expires });
    if (c.system === 'presidential-us') {
      const p2 = 0.35 + (s.stats.integrity < 50 ? 0.2 : 0) + (hasFlag(s, 'captured_courts') ? -0.25 : 0);
      if (chance(s, clamp(p2, 0.05, 0.9) as number)) s.scheduled.push({ event: 'us_court_order', round: s.round + 1 });
    }
    deltas.push({ stat: 'integrity', delta: changeStat(s, 'integrity', -1), why: c.titles.fastTrack });
    s.decisions.push({ round: s.round, id, choice: 'fast', impact: 6, label: { es: `${c.titles.fastTrack.es}: ${p.name.es}`, en: `${c.titles.fastTrack.en}: ${p.name.en}` } });
    return { passed: true, deltas, text: { es: `${c.titles.fastTrack.es} en vigor. Tendrá que superar la prueba del ${c.titles.legislature.es}.`, en: `${c.titles.fastTrack.en} in force. It must survive ${c.titles.legislature.en}.` } };
  }
  const tally = billTally(s, id, offers);
  applyOffers(s, offers);
  const weaken = Object.values(offers).some((l) => l.includes('amend')) ? 0.75 : 1;
  if (tally.passes) {
    const deltas = passPolicy(s, id, weaken);
    s.decisions.push({ round: s.round, id, choice: 'pass', impact: 6, label: { es: `Ley aprobada: ${p.name.es}`, en: `Law passed: ${p.name.en}` } });
    return { passed: true, tally, deltas, text: { es: weaken < 1 ? 'Aprobada, con enmiendas que rebajan su alcance.' : 'Aprobada.', en: weaken < 1 ? 'Passed, with amendments that water it down.' : 'Passed.' } };
  }
  const deltas = [{ stat: 'popularity' as StatId, delta: changeStat(s, 'popularity', -2), why: { es: 'Derrota parlamentaria', en: 'Parliamentary defeat' } }];
  s.decisions.push({ round: s.round, id, choice: 'fail', impact: 4, label: { es: `Ley rechazada: ${p.name.es}`, en: `Law rejected: ${p.name.en}` } });
  return { passed: false, tally, deltas, text: { es: 'Rechazada. La oposición lo celebra en el bar del Congreso.', en: 'Rejected. The opposition celebrates in the parliamentary bar.' } };
}

/** Convalidación / caducidad de medidas por vía rápida. */
function checkFastTracked(s: GameState, notes: L[]): void {
  const c = country(s.country);
  const keep: GameState['fastTracked'] = [];
  for (const f of s.fastTracked) {
    if (f.expires > s.round) { keep.push(f); continue; }
    if (c.system === 'presidential-us') continue; // las órdenes ejecutivas quedan salvo sentencia
    const p = POLICY_BY_ID[f.policy];
    const t = voteOn(s, policyLean(s, p), { fiscal: p.fiscal });
    if (t.passes) notes.push({ es: `${c.titles.legislature.es}: convalidada «${p.name.es}».`, en: `${c.titles.legislature.en}: "${p.name.en}" ratified.` });
    else {
      s.passed = s.passed.filter((x) => x !== f.policy);
      s.deferred = s.deferred.filter((d) => d.source !== f.policy);
      changeStat(s, 'popularity', -3); changeStat(s, 'credibility', -2);
      notes.push({ es: `${c.titles.legislature.es}: cae «${p.name.es}». Sus efectos pendientes se anulan.`, en: `${c.titles.legislature.en}: "${p.name.en}" falls. Its pending effects are cancelled.` });
    }
  }
  s.fastTracked = keep;
}

// ── Cierre de ronda ────────────────────────────────────────────────────
const REPORT_STATS: StatId[] = ['popularity', 'wellbeing', 'economy', 'support', 'integrity', 'treasury', 'debt', 'jobs', 'housing', 'services', 'security', 'environment', 'diplomacy', 'unrest'];

export function closeRound(s: GameState): RoundReport {
  const before = Object.fromEntries(REPORT_STATS.map((k) => [k, s.stats[k]])) as Record<StatId, number>;
  const notes: L[] = [];
  const drift: L = { es: 'Tendencia de fondo', en: 'Underlying trend' };
  // Economía: ingresos, gastos y deuda (invariante: tesorería ≥ 0, el déficit se financia con deuda)
  const rev = revenue(s); const sp = spending(s);
  const bal = rev - sp;
  const t0 = s.stats.treasury;
  if (t0 + bal >= 0) s.stats.treasury = Math.min(99, t0 + bal);
  else { s.stats.debt = clamp(s.stats.debt + (-(t0 + bal)) * 1.2, 0, 200); s.stats.treasury = 0; notes.push({ es: 'Déficit financiado con deuda.', en: 'Deficit financed with debt.' }); }
  if (bal > 0 && s.stats.treasury >= 99) s.stats.debt = clamp(s.stats.debt - bal * 0.5, 0, 200);
  // Sectores tienden a su nivel de financiación + cambios estructurales
  const L = s.budget.lines;
  const target: Partial<Record<StatId, number>> = {
    services: 32 + L.services * 16, housing: 30 + L.housing * 15, security: 34 + L.security * 15,
    jobs: 30 + s.stats.economy * 0.35 + L.investment * 3, environment: 45,
    economy: 42 + L.investment * 5 + (s.budget.tax === 0 ? 4 : s.budget.tax === 2 ? -3 : 0) - Math.max(0, s.stats.debt - 90) * 0.15,
  };
  for (const k of SECTORS) {
    const tg = clamp((target[k] ?? 50) + (s.structural[k] ?? 0));
    s.stats[k] = clamp(s.stats[k] + (tg - s.stats[k]) * TUNING.sectorDrift);
  }
  s.mods.wellbeing *= 0.8; s.mods.support *= 0.75;
  recompute(s);
  // Grupos
  for (const g of GROUPS) {
    const gs = s.groups[g];
    gs.sat = clamp(gs.sat + (groupTarget(s, g) - gs.sat) * TUNING.satisfactionDrift);
    gs.base *= 0.92;
  }
  // Popularidad: deriva hacia la satisfacción media
  const avg = avgSatisfaction(s);
  s.stats.popularity = clamp(s.stats.popularity + (avg - s.stats.popularity) * TUNING.popularityDrift - (s.stats.unrest > 60 ? 1 : 0));
  s.stats.unrest = clamp(s.stats.unrest + ((100 - avg) * 0.7 - s.stats.unrest) * 0.2);
  // Corrupción: la sospecha decae, pero puede generar pruebas
  const susp = s.stats.suspicion;
  const pEv = susp * TUNING.evidencePerSuspicion * (hasFlag(s, 'captured_courts') ? 0.5 : 1) * (hasFlag(s, 'captured_media') ? 0.7 : 1);
  if (susp > 0 && chance(s, pEv)) {
    const amount = Math.round(randRange(s, 6, 14));
    changeStat(s, 'evidence', amount);
    notes.push({ es: 'Alguien ha encontrado papeles comprometedores.', en: 'Someone found compromising papers.' });
  }
  s.stats.suspicion = clamp(susp - TUNING.suspicionDecay);
  checkFastTracked(s, notes);
  // Elecciones de mitad de mandato
  if (slotFor(s) === 'midterm') {
    const m = runMidterm(s);
    addFlag(s, 'midterm_done');
    notes.push({ es: `Elecciones de mitad de mandato: tu partido queda con ${m.house} escaños en la Cámara y ${m.senate} en el Senado.`, en: `Midterms: your party now holds ${m.house} House seats and ${m.senate} Senate seats.` });
  }
  recompute(s);
  // Informe con causas
  const changes: DeltaRec[] = [];
  for (const k of REPORT_STATS) {
    const delta = Math.round((s.stats[k] - before[k]) * 10) / 10;
    if (Math.abs(delta) >= 0.5) changes.push({ stat: k, delta, why: drift });
  }
  const roundCauses = s.log.filter((l) => l.round === s.round).flatMap((l) => l.deltas);
  const report: RoundReport = { round: s.round, changes, headline: headline(s), notes, causes: topCauses(roundCauses) };
  s.roundReport = report;
  s.log.push({ round: s.round, phase: s.phase, text: { es: `Cierre de la ronda ${s.round}`, en: `End of round ${s.round}` }, deltas: changes, weight: 0 });
  return report;
}

function topCauses(ds: DeltaRec[]): DeltaRec[] {
  return ds.filter((d) => d.stat && d.why).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 6);
}

function headline(s: GameState): L {
  if (s.stats.unrest > 65) return { es: 'Las calles hierven: el Gobierno, contra las cuerdas', en: 'Streets boil: government on the ropes' };
  if (s.stats.evidence > 40) return { es: 'La sombra de la corrupción planea sobre el Gobierno', en: 'The shadow of corruption hangs over the government' };
  if (s.stats.wellbeing > 62) return { es: 'Los ciudadanos notan la mejora… y piden más', en: 'Citizens feel the improvement… and want more' };
  if (s.stats.debt > 100) return { es: 'La deuda bate récords y los mercados fruncen el ceño', en: 'Debt breaks records and markets frown' };
  if (s.stats.popularity > 55) return { es: 'Luna de miel prolongada en las encuestas', en: 'Extended honeymoon in the polls' };
  if (s.stats.popularity < 30) return { es: 'Encuestas en caída libre', en: 'Polls in free fall' };
  return { es: 'Otra ronda en el despacho: nada se rompe del todo', en: 'Another round in office: nothing quite breaks' };
}

export function nextRound(s: GameState): void { startRound(s); }

/** El país en la etapa actual: indicadores visibles (máx. 5). */
export function visibleIndicators(s: GameState): StatId[] {
  if (s.phase === 'campaign' || s.phase === 'setup' || s.phase === 'debate' || s.phase === 'election') return ['popularity', 'funds', 'momentum', ...(s.unlocked.includes('corruption') ? ['privateFunds' as StatId] : [])];
  const out: StatId[] = ['popularity', 'wellbeing', 'economy'];
  if (s.phase !== 'formation') out.push('support');
  if (s.unlocked.includes('institutions') || s.unlocked.includes('corruption')) out.push('integrity');
  return out.slice(0, TUNING.maxVisibleIndicators);
}

export { partyDefs };
