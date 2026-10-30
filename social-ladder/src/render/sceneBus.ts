/**
 * Tiny bridge between the Phaser street and the React overlay drawn on top of
 * it (the hero's speech bubble). Kept outside the lazy scene chunk so the UI
 * can import it without pulling in Phaser.
 */
export type SceneSignal = 'poke' | 'walkOut' | 'walkBack';

/** Hero's head position as a fraction of the scene element (0–1). */
export const heroAnchor = { x: 0.35, y: 0.6, ready: false };

const listeners = new Set<(s: SceneSignal) => void>();

export function onSceneSignal(fn: (s: SceneSignal) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function sceneSignal(s: SceneSignal) {
  listeners.forEach((fn) => fn(s));
}
