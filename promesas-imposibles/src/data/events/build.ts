import type { GameEvent } from '../../core/types';

/** Valores por defecto: un evento corto, que aparece una vez por partida. */
export function ev(e: Partial<GameEvent> & Pick<GameEvent, 'id' | 'title' | 'text' | 'choices' | 'hotspot' | 'speaker' | 'category'>): GameEvent {
  return {
    kind: 'short',
    conditions: {},
    weight: 1,
    repeat: { max: 1, cooldown: 99 },
    ...e,
  };
}
