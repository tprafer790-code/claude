/**
 * Remembers which shop entries were unlocked a moment ago so their cards can
 * flash once. Keys look like "business:cans" or "upgrade:lu_lucky".
 */
const FRESH_MS = 1600;
const freshUntil = new Map<string, number>();
let known: Set<string> | null = null;

/** Call with every currently visible key; anything new since last time becomes fresh. */
export function trackUnlocked(keys: string[], now = performance.now()) {
  const next = new Set(keys);
  if (known) for (const k of next) if (!known.has(k)) freshUntil.set(k, now + FRESH_MS);
  known = next;
  for (const [k, until] of freshUntil) if (until < now) freshUntil.delete(k);
}

export function isFresh(key: string, now = performance.now()): boolean {
  return (freshUntil.get(key) ?? 0) > now;
}

/** Forget everything (prestige or reset makes the whole shop new again without flashing it all). */
export function resetUnlocked() {
  known = null;
  freshUntil.clear();
}
