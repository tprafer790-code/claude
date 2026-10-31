// Campaña: programa con el asesor, acciones con recursos limitados, hitos fijos.
import { INTERVIEW, INTERVIEW_ANSWERS, PROGRAMME, STREET } from '../data/campaign';
import { EVENT_BY_ID } from '../data/events';
import { GROUPS, TUNING } from '../data/tuning';
import { promiseText } from './events';
import { rand } from './rng';
import { applyEffects, changeStat, clamp } from './state';
import type { AxisId, DeltaRec, GameState, GroupId, L, Outcome, Stance } from './types';

export type CampaignAction = 'street' | 'rally' | 'ads' | 'canvass' | 'fundraise' | 'darkads';
export const ACTION_COST: Record<CampaignAction, { funds?: number; privateFunds?: number }> = {
  street: {}, rally: { funds: 2 }, ads: { funds: 3 }, canvass: {}, fundraise: {}, darkads: { privateFunds: 3 },
};

/** Hito fijo de cada jornada (ajustable aquí). */
export type Beat = 'none' | 'plan' | 'tycoon' | 'interview' | 'debate' | 'final';
export const DAY_BEATS: Beat[] = ['none', 'plan', 'tycoon', 'interview', 'debate', 'final'];

export function answerProgramme(s: GameState, axis: AxisId, stance: Stance): Outcome {
  const q = PROGRAMME.find((x) => x.axis === axis)!;
  const opt = q.options.find((o) => o.stance === stance)!;
  s.promises = s.promises.filter((p) => p.axis !== axis);
  s.promises.push({ axis, stance, status: 'pending', round: 0 });
  const effects = Object.entries(opt.groups).map(([g, v]) => ({ group: g as GroupId, sat: v as number }));
  const recommended: Stance = s.orientation === 'left' ? -1 : 1;
  if (stance !== recommended) effects.push({ cast: 'advisor', trust: -2 } as never);
  const r = applyEffects(s, effects, `programme_${axis}`, { es: `Promesa: ${opt.promise.es}`, en: `Promise: ${opt.promise.en}` });
  s.decisions.push({ round: 0, id: `programme_${axis}`, choice: String(stance), impact: 3, label: { es: `Programa: ${opt.promise.es}`, en: `Platform: ${opt.promise.en}` } });
  return { text: opt.reaction, deltas: r.deltas };
}

export function startCampaign(s: GameState): void {
  s.phase = 'campaign';
  s.campaignDay = 1;
  s.actionsLeft = TUNING.actionsPerDay;
  // La orientación fija la base electoral inicial
  const lean = s.orientation === 'left' ? -1 : 1;
  for (const g of GROUPS) s.groups[g].mob = 0.45;
  if (lean < 0) { s.groups.workers.mob += 0.1; s.groups.public.mob += 0.1; s.groups.youth.mob += 0.05; }
  else { s.groups.business.mob += 0.1; s.groups.rural.mob += 0.1; s.groups.pensioners.mob += 0.05; }
  s.startedAt = Date.now();
}

export function currentBeat(s: GameState): Beat { return DAY_BEATS[s.campaignDay - 1] ?? 'final'; }

/** El hito de la jornada debe resolverse antes de cerrarla. */
export function beatPending(s: GameState): boolean {
  const b = currentBeat(s);
  if (b === 'tycoon') return !s.eventHistory.tycoon_offer;
  if (b === 'interview') return !s.flags.includes('interview_done');
  if (b === 'debate') return !s.flags.includes('debate_won_campaign') && !s.flags.includes('debate_lost_campaign');
  if (b === 'plan') return !s.flags.includes('plan_done');
  return false;
}

export function actionsForDay(s: GameState): number {
  const b = currentBeat(s);
  if (b === 'debate') return 0;
  if (b === 'interview' || b === 'final') return 1;
  return TUNING.actionsPerDay;
}

export function canAfford(s: GameState, a: CampaignAction): boolean {
  const c = ACTION_COST[a];
  return (!c.funds || s.stats.funds >= c.funds) && (!c.privateFunds || s.stats.privateFunds >= c.privateFunds);
}

export function nextStreetTalk(s: GameState) {
  const used = new Set(s.flags.filter((f) => f.startsWith('talk_')).map((f) => f.slice(5)));
  const pool = STREET.filter((t) => !used.has(t.id));
  const list = pool.length ? pool : STREET;
  return list[Math.floor(rand(s) * list.length)];
}

export function resolveStreet(s: GameState, talkId: string, opt: number): Outcome {
  const talk = STREET.find((t) => t.id === talkId)!;
  const o = talk.options[opt];
  s.flags.push(`talk_${talkId}`);
  const r = applyEffects(s, o.effects, talkId, talk.line);
  s.groups[talk.group].mob = clamp(s.groups[talk.group].mob + 0.04, 0, 1);
  useAction(s);
  s.decisions.push({ round: 0, id: talkId, choice: String(opt), impact: 2, label: o.label });
  return { text: o.reply, deltas: r.deltas };
}

export function doAction(s: GameState, a: CampaignAction, group?: GroupId): Outcome {
  const deltas: DeltaRec[] = [];
  const why: L = { es: 'Acción de campaña', en: 'Campaign action' };
  const add = (stat: Parameters<typeof changeStat>[1], v: number) => deltas.push({ stat, delta: changeStat(s, stat, v), why });
  let text: L;
  const used = s.flags.filter((f) => f === `act_${a}`).length;
  switch (a) {
    case 'rally': {
      add('funds', -2); add('momentum', 3);
      const g = group ?? 'workers';
      s.groups[g].mob = clamp(s.groups[g].mob + 0.15, 0, 1); s.groups[g].sat = clamp(s.groups[g].sat + 3);
      text = { es: 'Mitin lleno. Alguien ha traído un bombo y no piensa soltarlo.', en: 'Packed rally. Someone brought a bass drum and will not let it go.' };
      break;
    }
    case 'ads': add('funds', -3); add('popularity', Math.max(1, 3 - used)); add('momentum', 1);
      text = { es: 'Tu cara en todas las marquesinas. Alguien te ha pintado bigote.', en: 'Your face on every bus stop. Someone drew a moustache on you.' }; break;
    case 'canvass': {
      const g = group ?? 'youth';
      s.groups[g].mob = clamp(s.groups[g].mob + 0.1, 0, 1);
      add('momentum', 1);
      text = { es: 'Puerta a puerta. Te abren tres de cada diez. Uno te ofrece croquetas.', en: 'Door to door. Three in ten open. One offers you snacks.' };
      break;
    }
    case 'fundraise': add('funds', 3); add('momentum', -1);
      text = { es: 'Cena de recaudación. El salmón estaba frío; los cheques, calentitos.', en: 'Fundraising dinner. Cold salmon, warm cheques.' }; break;
    case 'darkads': add('privateFunds', -3); add('popularity', 4); add('suspicion', 6); add('momentum', 2);
      text = { es: 'Anuncios pagados por una «asociación de amigos del sentido común». Nadie sabe quién la financia. Aún.', en: 'Ads paid by a "friends of common sense association". Nobody knows who funds it. Yet.' }; break;
    default: text = { es: '', en: '' };
  }
  s.flags.push(`act_${a}`);
  useAction(s);
  return { text, deltas };
}

function useAction(s: GameState) { s.actionsLeft = Math.max(0, s.actionsLeft - 1); }

/** Reparto de voluntarios entre grupos (recursos limitados). */
export const PLAN_POINTS = 6;
export function applyPlan(s: GameState, alloc: Partial<Record<GroupId, number>>): Outcome {
  const total = Object.values(alloc).reduce((a, b) => a + (b ?? 0), 0);
  if (total > PLAN_POINTS) throw new Error('Plan exceeds points');
  for (const [g, v] of Object.entries(alloc) as [GroupId, number][]) {
    s.groups[g].mob = clamp(s.groups[g].mob + 0.05 * v, 0, 1);
    s.campaignPlan[g] = v;
  }
  s.flags.push('plan_done');
  return { text: { es: 'Voluntarios repartidos. Los de reparto de octavillas ya tienen ampollas.', en: 'Volunteers assigned. The leaflet team already has blisters.' }, deltas: [] };
}

export function interviewQuestion(s: GameState): { axis: AxisId; q: L } {
  const options = INTERVIEW.filter((i) => s.promises.some((p) => p.axis === i.axis));
  const i = options[Math.floor(rand(s) * options.length)] ?? INTERVIEW[0];
  const p = s.promises.find((x) => x.axis === i.axis)!;
  const pt = promiseText(p);
  return { axis: i.axis, q: { es: i.q.es.replace('{promise}', pt.es), en: i.q.en.replace('{promise}', pt.en) } };
}

export function resolveInterview(s: GameState, answerId: string): Outcome {
  const a = INTERVIEW_ANSWERS.find((x) => x.id === answerId)!;
  const r = applyEffects(s, [...a.effects], `interview_${answerId}`, { es: 'Entrevista televisada', en: 'TV interview' });
  s.flags.push('interview_done');
  useAction(s);
  s.decisions.push({ round: 0, id: 'interview', choice: answerId, impact: 3, label: a.label });
  return { text: a.result, deltas: r.deltas };
}

export function canEndDay(s: GameState): boolean { return !beatPending(s); }

/** Cierra la jornada. Devuelve true si toca la noche electoral. */
export function endDay(s: GameState): boolean {
  s.stats.momentum = s.stats.momentum * 0.75;
  if (s.campaignDay >= TUNING.campaignDays) return true;
  s.campaignDay += 1;
  s.actionsLeft = actionsForDay(s);
  return false;
}

export function tycoonEvent() { return EVENT_BY_ID.tycoon_offer; }
