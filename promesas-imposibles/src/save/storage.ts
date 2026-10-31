// Guardado local con respaldo en memoria cuando el almacenamiento no está disponible
// (modo privado, iframes con cookies bloqueadas, cuotas llenas…).
import { SAVE_VERSION } from '../core/state';
import type { GameState } from '../core/types';

const KEY = 'promesas-imposibles:save';
const SETTINGS_KEY = 'promesas-imposibles:settings';
const memory = new Map<string, string>();
let available: boolean | null = null;

export function storageAvailable(): boolean {
  if (available !== null) return available;
  try {
    const k = '__pi_test__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    available = true;
  } catch {
    available = false;
  }
  return available;
}

/** Fuerza el modo sin almacenamiento (pruebas y modo desarrollo). */
export function forceNoStorage(): void { available = false; }

function write(key: string, value: string): void {
  memory.set(key, value);
  if (!storageAvailable()) return;
  try { window.localStorage.setItem(key, value); } catch { available = false; }
}
function read(key: string): string | null {
  if (storageAvailable()) {
    try { const v = window.localStorage.getItem(key); if (v !== null) return v; } catch { available = false; }
  }
  return memory.get(key) ?? null;
}
function remove(key: string): void {
  memory.delete(key);
  if (!storageAvailable()) return;
  try { window.localStorage.removeItem(key); } catch { /* sin almacenamiento */ }
}

export interface SaveFile { version: number; savedAt: number; screen: string; state: GameState }

/** Guarda el estado completo: semilla, estado del generador, eventos y efectos pendientes. */
export function saveGame(state: GameState, screen: string): void {
  const file: SaveFile = { version: SAVE_VERSION, savedAt: Date.now(), screen, state };
  write(KEY, JSON.stringify(file));
}

export function loadGame(): SaveFile | null {
  const raw = read(KEY);
  if (!raw) return null;
  try {
    const f = JSON.parse(raw) as SaveFile;
    if (f.version !== SAVE_VERSION || !f.state || typeof f.state.seed !== 'number') return null;
    return f;
  } catch {
    return null;
  }
}

export function hasSave(): boolean { const f = loadGame(); return !!f && f.state.phase !== 'ending'; }
export function clearSave(): void { remove(KEY); }

export function saveSettings(v: unknown): void { write(SETTINGS_KEY, JSON.stringify(v)); }
export function loadSettings<T>(): Partial<T> {
  const raw = read(SETTINGS_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw) as Partial<T>; } catch { return {}; }
}
