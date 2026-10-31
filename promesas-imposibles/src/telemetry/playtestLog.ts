// Registro local de pruebas. Nunca se envía: solo se guarda en este navegador y se exporta a mano.
import type { GameState } from '../core/types';

export interface PlayEvent { t: number; kind: string; data?: Record<string, unknown> }
const MAX = 2000;
const KEY = 'promesas-imposibles:playtest';
let events: PlayEvent[] = [];
let enabled = true;

export function initLog(): void {
  try { const raw = window.localStorage.getItem(KEY); if (raw) events = JSON.parse(raw); } catch { events = []; }
}
export function setLogEnabled(v: boolean): void { enabled = v; }

export function logEvent(kind: string, data?: Record<string, unknown>): void {
  if (!enabled) return;
  events.push({ t: Date.now(), kind, data });
  if (events.length > MAX) events = events.slice(-MAX);
  try { window.localStorage.setItem(KEY, JSON.stringify(events)); } catch { /* sin almacenamiento: queda en memoria */ }
}

export function logState(kind: string, s: GameState): void {
  logEvent(kind, { phase: s.phase, round: s.round, day: s.campaignDay, country: s.country, seed: s.seed, popularity: Math.round(s.stats.popularity), wellbeing: Math.round(s.stats.wellbeing) });
}

/** Resumen de sesiones: duración de partidas, fase alcanzada y abandonos. */
export function summary(): { sessions: number; finished: number; avgMinutes: number; byPhase: Record<string, number> } {
  const starts = events.filter((e) => e.kind === 'game_start');
  const ends = events.filter((e) => e.kind === 'game_end');
  const mins = ends.map((e) => Number(e.data?.minutes ?? 0)).filter((x) => x > 0);
  const byPhase: Record<string, number> = {};
  for (const e of events.filter((x) => x.kind === 'phase')) { const p = String(e.data?.phase); byPhase[p] = (byPhase[p] ?? 0) + 1; }
  return { sessions: starts.length, finished: ends.length, avgMinutes: mins.length ? Math.round((mins.reduce((a, b) => a + b, 0) / mins.length) * 10) / 10 : 0, byPhase };
}

export function exportLog(): void {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), summary: summary(), events }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `playtest-${Date.now()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
