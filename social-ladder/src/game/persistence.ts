import { Decimal } from '../core/bignum';
import { createInitialState, SAVE_VERSION, type GameState } from './state';

export const SAVE_KEY = 'the-social-ladder:save';
export const BACKUP_KEY = 'the-social-ladder:save-backup';

const DECIMAL_PATHS: ReadonlyArray<readonly string[]> = [['money'], ['earnedThisLife'], ['lifetimeEarned'], ['stats', 'bestLifeEarned'], ['rival', 'worth'], ['league', 'earned'], ['league', 'ref']];

/** Storage abstraction so persistence can be tested without a browser. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function serialize(state: GameState): string {
  const plain = structuredCloneSafe(state) as Record<string, unknown>;
  for (const path of DECIMAL_PATHS) setPath(plain, path, (getPath(state, path) as Decimal).toString());
  return JSON.stringify(plain);
}

/**
 * Parses a save, merging onto a fresh state so missing fields (from older
 * versions) get defaults. Throws on malformed input.
 */
export function deserialize(json: string): GameState {
  const raw = JSON.parse(json) as Record<string, unknown>;
  if (!raw || typeof raw !== 'object') throw new Error('Invalid save');
  const migrated = migrate(raw);
  const base = createInitialState(typeof migrated.createdAt === 'number' ? migrated.createdAt : Date.now());
  const merged = deepMerge(base as unknown as Record<string, unknown>, migrated) as unknown as GameState;
  for (const path of DECIMAL_PATHS) {
    const v = getPath(merged, path);
    let d: Decimal;
    try {
      d = new Decimal(v as string);
    } catch {
      d = new Decimal(0);
    }
    if (!Number.isFinite(d.mantissa) || Number.isNaN(d.exponent) || d.lt(0)) d = new Decimal(0);
    setPath(merged as unknown as Record<string, unknown>, path, d);
  }
  merged.version = SAVE_VERSION;
  if (!Number.isFinite(merged.rankIndex) || merged.rankIndex < 0) merged.rankIndex = 0;
  return merged;
}

function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  const version = typeof raw.version === 'number' ? raw.version : 0;
  // Future migrations: if (version < 2) { ... }
  void version;
  return raw;
}

export function saveTo(store: KeyValueStore, state: GameState, now = Date.now()) {
  state.lastSavedAt = now;
  const data = serialize(state);
  const prev = store.getItem(SAVE_KEY);
  if (prev) store.setItem(BACKUP_KEY, prev);
  store.setItem(SAVE_KEY, data);
}

export function loadFrom(store: KeyValueStore): { state: GameState; recovered: boolean } | null {
  const data = store.getItem(SAVE_KEY);
  if (data) {
    try {
      return { state: deserialize(data), recovered: false };
    } catch {
      const backup = store.getItem(BACKUP_KEY);
      if (backup) {
        try {
          return { state: deserialize(backup), recovered: true };
        } catch {
          /* fall through */
        }
      }
    }
  }
  return null;
}

export function exportSave(state: GameState): string {
  const bytes = new TextEncoder().encode(serialize(state));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

export function importSave(code: string): GameState {
  const bin = atob(code.trim());
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return deserialize(new TextDecoder().decode(bytes));
}

// ——— helpers ———
function structuredCloneSafe(state: GameState): unknown {
  return JSON.parse(JSON.stringify(state, (_k, v) => (v instanceof Decimal ? v.toString() : v)));
}
function getPath(obj: unknown, path: readonly string[]): unknown {
  return path.reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], obj);
}
function setPath(obj: Record<string, unknown>, path: readonly string[], value: unknown) {
  let o = obj;
  for (let i = 0; i < path.length - 1; i++) o = o[path[i]] as Record<string, unknown>;
  o[path[path.length - 1]] = value;
}
function deepMerge(base: Record<string, unknown>, over: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const k of Object.keys(over)) {
    const b = base[k];
    const v = over[k];
    if (v === undefined) continue;
    if (b && typeof b === 'object' && !Array.isArray(b) && !(b instanceof Decimal) && v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = deepMerge(b as Record<string, unknown>, v as Record<string, unknown>);
    } else out[k] = v;
  }
  return out;
}
