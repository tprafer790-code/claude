// Atajos para escribir datos de forma compacta y legible.
import type { CastId, Effect, GroupId, L, StatId } from '../core/types';

export const t = (es: string, en: string): L => ({ es, en });
/** Cambio de indicador; `delay` en rondas para efectos diferidos */
export const d = (stat: StatId, delta: number, delay = 0, why?: L): Effect => ({ stat, delta, ...(delay ? { delay } : {}), ...(why ? { why } : {}) });
/** Cambio de satisfacción de un grupo */
export const g = (group: GroupId, sat: number, delay = 0): Effect => ({ group, sat, ...(delay ? { delay } : {}) });
/** Cambio de confianza de un personaje */
export const c = (cast: CastId, trust: number): Effect => ({ cast, trust });
export const flag = (f: string): Effect => ({ flag: f });
export const unflag = (f: string): Effect => ({ unflag: f });
export const chain = (event: string, inRounds: number): Effect => ({ chain: { event, in: inRounds } });
