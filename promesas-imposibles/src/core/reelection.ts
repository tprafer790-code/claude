// Minicampaña final del mandato: dos acciones, debate de revancha y elecciones.
import { computeEnding } from './endings';
import { runElection } from './election';
import { startDebate } from './debate';
import { addFlag } from './state';
import type { ElectionResult, GameState } from './types';

export const REELECTION_ACTIONS = 2;

export function startReelection(s: GameState): void {
  s.phase = 'reelection';
  s.actionsLeft = REELECTION_ACTIONS;
  s.stats.momentum = 0;
  s.stats.funds = Math.max(s.stats.funds, 6);
  addFlag(s, 'reelection_started');
}

export function startRematch(s: GameState, timed: boolean): void { startDebate(s, 'reelection', timed); }

export function finalElection(s: GameState): ElectionResult {
  const res = runElection(s, 'reelection');
  s.ending = computeEnding(s, 'term', res.executive.won);
  s.phase = 'ending';
  return res;
}
