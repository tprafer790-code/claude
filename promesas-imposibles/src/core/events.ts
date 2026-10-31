// Selección y resolución de eventos.
import { PROGRAMME } from '../data/campaign';
import { country } from '../data/countries';
import { EVENTS, EVENT_BY_ID } from '../data/events';
import { evalCond } from './conditions';
import { fallVote, voteOn } from './parliament';
import { chance, pickWeighted, randRange } from './rng';
import { addFlag, applyEffects, changeStat, clamp } from './state';
import type { AgendaItem, Choice, DeltaRec, GameEvent, GameState, L, Outcome, Promise_ } from './types';

export function promiseText(p: Pick<Promise_, 'axis' | 'stance'>): L {
  const q = PROGRAMME.find((x) => x.axis === p.axis)!;
  return q.options.find((o) => o.stance === p.stance)!.promise;
}

/** ¿Puede aparecer el evento por sorteo en este momento? */
export function isEligible(s: GameState, e: GameEvent): boolean {
  if (e.scheduledOnly) return false;
  if (s.excluded.includes(e.id)) return false;
  const h = s.eventHistory[e.id];
  if (h && (h.count >= e.repeat.max || s.round - h.last < e.repeat.cooldown)) return false;
  if (s.agenda.some((a) => a.eventId === e.id)) return false;
  if (!evalCond(s, { phases: ['government'], ...e.conditions })) return false;
  if (e.text.es.includes('{promise}') && !s.promises.some((p) => p.status === 'pending')) return false;
  return true;
}

export function pickEvent(s: GameState, kind: 'main' | 'short', avoidCategories: string[] = []): GameEvent | undefined {
  const pool = EVENTS.filter((e) => e.kind === kind && isEligible(s, e));
  return pickWeighted(s, pool, (e) => e.weight * (avoidCategories.includes(e.category) ? 0.35 : 1));
}

export function makeItem(s: GameState, e: GameEvent, main: boolean): AgendaItem {
  const vars: Record<string, string> = {};
  const pending = s.promises.filter((p) => p.status === 'pending');
  if (pending.length) {
    const p = pending[Math.floor(randRange(s, 0, pending.length))];
    vars.promiseAxis = p.axis; vars.promiseStance = String(p.stance);
  }
  s.uidCounter += 1;
  return { uid: `ev_${s.uidCounter}`, type: 'event', eventId: e.id, hotspot: e.hotspot, resolved: false, main, vars };
}

function fill(s: GameState, text: L, item?: AgendaItem): L {
  const c = country(s.country);
  const promise = item?.vars?.promiseAxis ? promiseText({ axis: item.vars.promiseAxis as Promise_['axis'], stance: Number(item.vars.promiseStance) as Promise_['stance'] }) : { es: '…', en: '…' };
  const ref = s.referendum
    ? { es: `${s.referendum.passed ? 'gana el sí' : 'gana el no'} con un ${s.referendum.passed ? s.referendum.yes : 100 - s.referendum.yes} %`, en: `${s.referendum.passed ? 'yes wins' : 'no wins'} with ${s.referendum.passed ? s.referendum.yes : 100 - s.referendum.yes}%` }
    : { es: '—', en: '—' };
  const sub = (str: string, lang: 'es' | 'en') => str
    .replace('{promise}', promise[lang])
    .replace('{fall}', c.titles.fall[lang].toLowerCase())
    .replace('{refResult}', ref[lang]);
  return { es: sub(text.es, 'es'), en: sub(text.en, 'en') };
}

export interface EventView { id: string; title: L; text: L; detail?: L; speaker: GameEvent['speaker']; chain?: GameEvent['chain']; choices: (Choice & { available: boolean })[] }

/** Vista del evento con variantes nacionales y marcadores sustituidos. */
export function eventView(s: GameState, id: string, item?: AgendaItem): EventView {
  const e = EVENT_BY_ID[id];
  const v = e.variants?.[s.country];
  const choices = e.choices.map((ch) => {
    const vc = v?.choices?.[ch.id];
    const affordable = (!ch.cost?.treasury || s.stats.treasury >= ch.cost.treasury) && (!ch.cost?.privateFunds || s.stats.privateFunds >= ch.cost.privateFunds) && (!ch.cost?.funds || s.stats.funds >= ch.cost.funds);
    return { ...ch, label: vc?.label ?? ch.label, result: fill(s, vc?.result ?? ch.result, item), available: affordable && evalCond(s, ch.requires) };
  });
  return { id, title: fill(s, v?.title ?? e.title, item), text: fill(s, v?.text ?? e.text, item), detail: e.detail, speaker: e.speaker, chain: e.chain, choices };
}

export interface ResolveResult extends Outcome { specials: string[]; extra: L[] }

/** Aplica una elección: costes, efectos, riesgo, memoria y acciones especiales. */
export function resolveEvent(s: GameState, item: AgendaItem, choiceId: string): ResolveResult {
  const e = EVENT_BY_ID[item.eventId!];
  const view = eventView(s, e.id, item);
  const ch = view.choices.find((c) => c.id === choiceId)!;
  const deltas: DeltaRec[] = [];
  const why = view.title;
  if (ch.cost?.treasury && !ch.effects.some((x) => x.stat === 'treasury')) deltas.push({ stat: 'treasury', delta: changeStat(s, 'treasury', -ch.cost.treasury), why });
  const r = applyEffects(s, ch.effects, e.id, why);
  deltas.push(...r.deltas);
  let riskText: L | undefined;
  if (ch.risk && chance(s, ch.risk.chance)) {
    const rr = applyEffects(s, ch.risk.effects, e.id, ch.risk.text);
    deltas.push(...rr.deltas);
    riskText = ch.risk.text;
  }
  // Las promesas reaparecen: mantener la palabra en la hemeroteca la refuerza
  if (e.id === 'promise_check' && choiceId === 'spin' && item.vars?.promiseAxis) {
    const p = s.promises.find((x) => x.axis === item.vars!.promiseAxis);
    if (p) s.cast.journalist.memory.push(`spin:${p.axis}`);
  }
  const h = s.eventHistory[e.id] ?? { count: 0, last: -99 };
  s.eventHistory[e.id] = { count: h.count + 1, last: s.round };
  if (e.excludes) s.excluded.push(...e.excludes);
  item.resolved = true;
  const impact = deltas.reduce((a, d) => a + Math.abs(d.delta), 0);
  s.decisions.push({ round: s.round, id: e.id, choice: choiceId, impact, label: { es: `${view.title.es}: ${ch.label.es}`, en: `${view.title.en}: ${ch.label.en}` } });
  s.log.push({ round: s.round, phase: s.phase, text: { es: `${view.title.es} → ${ch.label.es}`, en: `${view.title.en} → ${ch.label.en}` }, deltas, weight: impact });
  if (e.category === 'disaster' || e.category === 'security' || e.id === 'strike_main' || e.id === 'general_strike') {
    const resolved = !ch.tags?.includes('delay') && !ch.tags?.includes('lie');
    s.crises.push({ id: e.id, resolved });
  }
  const extra: L[] = [];
  for (const sp of r.specials) extra.push(...handleSpecial(s, sp, choiceId));
  return { text: ch.result, deltas, mood: ch.mood, riskText, specials: r.specials, extra };
}

function handleSpecial(s: GameState, sp: string, choiceId: string): L[] {
  const c = country(s.country);
  switch (sp) {
    case 'fall_vote': {
      const res = fallVote(s);
      s.fallResult = res;
      if (res.removed) { addFlag(s, 'removed'); s.phase = 'ending'; }
      else { addFlag(s, 'survived_fall'); changeStat(s, 'evidence', -15); }
      return [res.text];
    }
    case 'resign': addFlag(s, 'resigned'); s.phase = 'ending'; return [];
    case 'crisis_resolved': s.crises.push({ id: 'varnia', resolved: true }); return [];
    case 'crisis_failed': s.crises.push({ id: 'varnia', resolved: false }); return [];
    case 'postpone_election': addFlag(s, 'autocrat'); return [];
    case 'revert_fast': {
      const last = s.fastTracked.pop();
      if (last) { s.passed = s.passed.filter((p) => p !== last.policy); s.deferred = s.deferred.filter((d) => d.source !== last.policy); }
      return [{ es: 'La medida queda anulada.', en: 'The measure is annulled.' }];
    }
    case 'referendum': {
      if (c.system !== 'presidential-us') {
        const t = voteOn(s, 0, { kind: 'law' });
        if (!t.passes) {
          changeStat(s, 'credibility', -2);
          return [{ es: `El ${c.titles.legislature.es} no autoriza la consulta.`, en: `The ${c.titles.legislature.en} does not authorise the vote.` }];
        }
      }
      const stance = choiceId === 'call' ? 'yes' : 'neutral';
      const yes = Math.round(clamp(48 + (s.groups.workers.sat - 50) * 0.25 + (s.groups.youth.sat - 50) * 0.2 - (s.groups.business.sat - 50) * 0.1 + (stance === 'yes' ? (s.stats.popularity - 45) * 0.3 : 0) + randRange(s, -6, 6), 20, 80));
      s.referendum = { yes, passed: yes > 50, stance };
      s.scheduled.push({ event: 'referendum_result', round: s.round + 2 });
      if (stance === 'yes') s.deferred.push({ round: s.round + 2, effects: yes > 50 ? [{ stat: 'popularity', delta: 4 }] : [{ stat: 'popularity', delta: -6 }, { stat: 'credibility', delta: -2 }], why: { es: 'Resultado del referéndum que impulsaste', en: 'Result of the referendum you backed' }, source: 'referendum' });
      return [{ es: 'La consulta se celebrará en dos rondas.', en: 'The vote will be held in two rounds.' }];
    }
  }
  return [];
}
