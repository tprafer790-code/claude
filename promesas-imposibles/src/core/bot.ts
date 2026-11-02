// Jugador automático para pruebas y balance. NO sustituye pruebas con personas.
import { PROGRAMME } from '../data/campaign';
import { EVENT_BY_ID } from '../data/events';
import { GROUPS } from '../data/tuning';
import { actionsForDay, applyPlan, beatPending, canAfford, currentBeat, doAction, endDay, nextStreetTalk, resolveInterview, resolveStreet, startCampaign, type CampaignAction } from './campaign';
import { debateOver, finishDebate, playCard, startDebate } from './debate';
import { runElection } from './election';
import { computeEnding } from './endings';
import { eventView, resolveEvent } from './events';
import { availablePolicies, billTally, closeRound, concludeFormation, startFormation, startRound, submitBill, submitBudget, type BudgetPlan } from './government';
import { resolveHousing } from './housingDecision';
import { housingDebatePending, housingOutcome, makeHousingPromise, resolveHousingDefense } from './housingStory';
import { finalElection, startReelection } from './reelection';
import { nextRaw } from './rng';
import { createState } from './state';
import type { AgendaItem, CandidateId, Choice, CountryId, DebateCard, EndingResult, GameState, Orientation, Stance } from './types';
import { DEBATE_TABLE } from '../data/debate';
import type { Concession } from './parliament';

export type Strategy = 'random' | 'honest' | 'corrupt' | 'populist' | 'technocrat' | 'authoritarian';

export interface BotResult {
  seed: number; country: CountryId; strategy: Strategy; ending: EndingResult; wonCampaign: boolean; rounds: number;
  stats: GameState['stats']; events: string[]; decisions: number; state: GameState;
}

class BotRng { constructor(public s: number) {} next() { const [v, n] = nextRaw(this.s); this.s = n; return v; } pick<T>(a: T[]): T { return a[Math.floor(this.next() * a.length)]; } }

function choose(bot: BotRng, strat: Strategy, choices: (Choice & { available: boolean })[]): Choice {
  const av = choices.filter((c) => c.available);
  const score = (c: Choice) => {
    const tags = c.tags ?? [];
    const sum = (stat: string) => c.effects.filter((e) => e.stat === stat && !e.delay).reduce((a, e) => a + (e.delta ?? 0), 0);
    switch (strat) {
      case 'honest': return (tags.includes('transparent') ? 3 : 0) + (tags.includes('negotiate') ? 2 : 0) - (tags.includes('corrupt') || tags.includes('lie') ? 5 : 0) - (tags.includes('authoritarian') ? 4 : 0) + bot.next();
      case 'corrupt': return (tags.includes('corrupt') ? 5 : 0) + (tags.includes('lie') ? 2 : 0) + sum('popularity') * 0.3 + bot.next();
      case 'authoritarian': return (tags.includes('authoritarian') ? 5 : 0) + sum('popularity') * 0.2 + bot.next();
      case 'populist': return sum('popularity') + c.effects.filter((e) => e.sat).reduce((a, e) => a + (e.sat ?? 0) * 0.3, 0) + bot.next() * 0.5;
      case 'technocrat': return sum('wellbeing') * 2 + sum('economy') + sum('services') * 0.5 + sum('jobs') * 0.5 + sum('housing') * 0.5 + sum('integrity') * 0.5 - sum('debt') * 0.3 + bot.next() * 0.5;
      default: return bot.next();
    }
  };
  return av.sort((a, b) => score(b) - score(a))[0];
}

export interface BotOpts { candidate?: CandidateId; orientation?: Orientation; housingOption?: number; housingMode?: 'full' | 'negotiated' | 'postpone'; housingFunding?: 'services' | 'security' | 'investment' | 'deficit'; housingDefense?: number; stopAtReelection?: boolean }

export function playBot(seed: number, country: CountryId, strat: Strategy, opts: BotOpts = {}): BotResult {
  const bot = new BotRng(seed ^ 0x5bd1e995);
  const orientation: Orientation = opts.orientation ?? (bot.next() < 0.5 ? 'left' : 'right');
  const s = createState({ seed, country, candidate: opts.candidate ?? bot.pick(['hippie', 'impecable', 'veterano', 'influencer']), name: 'Bot', orientation, lang: 'es' });
  const rec: Stance = orientation === 'left' ? -1 : 1;
  for (const q of PROGRAMME) {
    const st: Stance = strat === 'random' ? bot.pick([-1, 0, 1] as Stance[]) : strat === 'technocrat' ? 0 : rec;
    // La vivienda se promete en la llamada de radio (opción 0, 1 o 2 = postura -1, 0, 1)
    if (q.axis === 'housing') { makeHousingPromise(s, opts.housingOption ?? st + 1); continue; }
    s.promises.push({ axis: q.axis, stance: st, status: 'pending', round: 0 });
  }
  startCampaign(s);
  const resolveItem = (it: AgendaItem) => { const v = eventView(s, it.eventId!, it); const ch = choose(bot, strat, v.choices); resolveEvent(s, it, ch.id); };
  // Campaña
  for (;;) {
    const beat = currentBeat(s);
    if (beat === 'plan' && beatPending(s)) applyPlan(s, { [bot.pick(GROUPS)]: 3, [bot.pick(GROUPS)]: 3 });
    if (beat === 'tycoon' && beatPending(s)) resolveItem({ uid: 'tyc', type: 'event', eventId: 'tycoon_offer', hotspot: 'door', resolved: false, main: true });
    if (beat === 'interview' && beatPending(s)) resolveInterview(s, strat === 'corrupt' ? 'lie' : strat === 'populist' ? 'bold' : strat === 'honest' || strat === 'technocrat' ? 'honest' : bot.pick(['honest', 'bold', 'dodge', 'lie']));
    if (beat === 'debate' && beatPending(s)) {
      startDebate(s, 'campaign', false);
      while (!debateOver(s)) playCard(s, debateChoice(s, bot, strat));
      finishDebate(s);
    }
    s.actionsLeft = Math.min(s.actionsLeft, actionsForDay(s));
    while (s.actionsLeft > 0) {
      const acts: CampaignAction[] = ['street', 'rally', 'ads', 'canvass', 'fundraise', ...(strat === 'corrupt' ? ['darkads' as CampaignAction] : [])];
      const a = bot.pick(acts.filter((x) => canAfford(s, x)));
      if (a === 'street') { const t = nextStreetTalk(s); resolveStreet(s, t.id, Math.floor(bot.next() * t.options.length)); }
      else doAction(s, a, bot.pick(GROUPS));
    }
    if (endDay(s)) break;
  }
  const res = runElection(s, 'campaign');
  if (!res.executive.won) { s.ending = computeEnding(s, 'campaign', false); return finish(s, seed, country, strat, false); }
  startFormation(s, res);
  const offers: Record<string, Concession[]> = {};
  for (const p of s.parties) offers[p.id] = [];
  let f = concludeFormation(s, offers);
  if (!f.ok) {
    for (const v of f.tally.votes) if (v.vote !== 'yes') offers[v.id] = strat === 'corrupt' && s.stats.privateFunds >= 3 ? ['bribe'] : ['ministry', 'amend'];
    f = concludeFormation(s, offers);
    if (!f.ok) { s.ending = computeEnding(s, 'formation', false); return finish(s, seed, country, strat, true); }
  }
  // Mandato
  let guard = 0;
  while (s.phase === 'government' && guard++ < 40) {
    for (const it of s.agenda) {
      if (it.resolved || s.phase !== 'government') continue;
      if (it.type === 'budget') {
        const plan: BudgetPlan = { tax: strat === 'populist' ? 0 : 1, lines: { services: 1 + (bot.next() < 0.5 ? 1 : 0), housing: 1, security: 1, investment: strat === 'technocrat' ? 2 : 1 } };
        // Si cumplió la promesa de vivienda con una partida, la mantiene (y mantiene el recorte que la financia)
        const fund = s.housing?.passedMode === 'full' ? s.housing.funding : undefined;
        if (fund) { plan.lines.housing = Math.max(plan.lines.housing, s.budget.lines.housing); if (fund !== 'deficit' && fund !== 'none') plan.lines[fund] = Math.min(plan.lines[fund], s.budget.lines[fund]); }
        const off: Record<string, Concession[]> = {};
        if (strat !== 'random') for (const p of s.parties) off[p.id] = ['amend'];
        submitBudget(s, plan, off);
      } else if (it.type === 'bill') {
        const pol = availablePolicies(s);
        const mine = pol.filter((p) => s.promises.some((pr) => pr.axis === p.axis && pr.stance === p.stance));
        const pick = strat === 'authoritarian' ? pol.find((p) => p.authoritarian) ?? bot.pick(pol) : strat === 'honest' && mine.length ? bot.pick(mine) : strat === 'technocrat' ? pol.sort((a, b) => b.delayed.length - a.delayed.length)[0] : bot.pick(pol);
        if (!pick) { it.resolved = true; continue; }
        const tally = billTally(s, pick.id);
        const off: Record<string, Concession[]> = {};
        if (!tally.passes) for (const v of tally.votes) if (v.vote !== 'yes') off[v.id] = ['amend'];
        submitBill(s, pick.id, off, pick.fastTrack && !tally.passes && strat !== 'honest' ? 'fast' : 'vote');
      } else if (it.type === 'housing') {
        const mode = opts.housingMode ?? (strat === 'honest' || strat === 'populist' ? 'full' : strat === 'technocrat' ? 'negotiated' : strat === 'random' ? bot.pick(['full', 'negotiated', 'postpone'] as const) : 'postpone');
        resolveHousing(s, mode, opts.housingFunding ?? (strat === 'populist' ? 'deficit' : undefined));
      } else resolveItem(it);
    }
    if (s.phase !== 'government') break;
    closeRound(s);
    startRound(s);
  }
  if (s.phase === 'reelection') {
    startReelection(s);
    while (s.actionsLeft > 0) doAction(s, canAfford(s, 'rally') ? 'rally' : 'canvass', bot.pick(GROUPS));
    if (opts.stopAtReelection) return finish(s, seed, country, strat, true);
    startDebate(s, 'reelection', false);
    if (housingDebatePending(s)) {
      const o = housingOutcome(s);
      resolveHousingDefense(s, opts.housingDefense ?? (strat === 'random' ? Math.floor(bot.next() * 3) : strat === 'honest' ? (o === 'abandoned' ? 0 : o === 'working' ? 2 : 1) : 0));
    }
    while (!debateOver(s)) playCard(s, debateChoice(s, bot, strat));
    finishDebate(s);
    finalElection(s);
  } else if (!s.ending) {
    s.ending = computeEnding(s, 'term', false);
  }
  return finish(s, seed, country, strat, true);
}

function debateChoice(s: GameState, bot: BotRng, strat: Strategy): DebateCard {
  const d = s.debate!;
  const avail = (Object.keys(d.uses) as DebateCard[]).filter((c) => d.uses[c] > 0);
  if (strat === 'random') return bot.pick(avail);
  const move = d.moves[d.round].type;
  return avail.sort((a, b) => DEBATE_TABLE[move][b] - DEBATE_TABLE[move][a])[0];
}

function finish(s: GameState, seed: number, country: CountryId, strategy: Strategy, wonCampaign: boolean): BotResult {
  return { seed, country, strategy, ending: s.ending!, wonCampaign, rounds: s.round, stats: { ...s.stats }, events: Object.keys(s.eventHistory).filter((k) => EVENT_BY_ID[k]), decisions: s.decisions.length, state: s };
}
