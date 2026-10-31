import type { GameEvent } from '../../core/types';
import { CHAIN_EVENTS } from './chains';
import { STANDALONE_EVENTS } from './standalone';
import { NATIONAL_EVENTS } from './national';

export const EVENTS: GameEvent[] = [...CHAIN_EVENTS, ...STANDALONE_EVENTS, ...NATIONAL_EVENTS];
export const EVENT_BY_ID: Record<string, GameEvent> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
