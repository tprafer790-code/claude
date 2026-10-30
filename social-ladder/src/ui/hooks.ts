import { createContext, useContext, useSyncExternalStore } from 'react';
import type { GameEngine } from '../game/engine';

export const EngineContext = createContext<GameEngine | null>(null);

/** Subscribes the component to engine changes and returns the engine. */
export function useEngine(): GameEngine {
  const engine = useContext(EngineContext);
  if (!engine) throw new Error('EngineContext missing');
  useSyncExternalStore(
    (cb) => engine.subscribe(cb),
    () => engine.getVersion(),
  );
  return engine;
}

/** Engine without subscribing (for event handlers in static components). */
export function useEngineStatic(): GameEngine {
  const engine = useContext(EngineContext);
  if (!engine) throw new Error('EngineContext missing');
  return engine;
}
