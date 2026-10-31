// Debate televisado: turnos, cartas, lectura del rival y reacción del público.
import { CARD_USES, DEBATE_TABLE, DEBATE_TIMEOUT, MOVE_TELLS, QUIPS } from '../data/debate';
import { TUNING } from '../data/tuning';
import { pickWeighted, rand } from './rng';
import { changeStat, clamp, hasFlag } from './state';
import type { AxisId, DebateCard, DebateMove, DeltaRec, GameState, L } from './types';

const MOVES: DebateMove[] = ['attack', 'stat', 'story', 'promise'];
const AXES: AxisId[] = ['taxes', 'services', 'housing', 'jobs', 'security', 'environment'];

export function startDebate(s: GameState, kind: 'campaign' | 'reelection', timed: boolean): void {
  const rounds = kind === 'campaign' ? TUNING.debateRounds : TUNING.debateRematchRounds;
  const topics = [...AXES].sort(() => rand(s) - 0.5).slice(0, rounds);
  const moves = topics.map((topic) => ({ topic, type: pickWeighted(s, MOVES, () => 1)! }));
  // En la revancha, el rival ataca más si rompiste promesas
  if (kind === 'reelection' && s.promises.some((p) => p.status === 'broken')) moves[0].type = 'attack';
  s.debate = { round: 0, rounds, audience: 50, hypocrisy: 0, log: [], timed, moves, uses: { data: CARD_USES, story: CARD_USES, attack: CARD_USES, deflect: CARD_USES, promise: CARD_USES }, kind };
}

export function debateTell(s: GameState, rivalName: string): L {
  const d = s.debate!;
  const m = d.moves[d.round];
  const opts = MOVE_TELLS[m.type];
  const tell = opts[(d.round + s.seed) % opts.length];
  return { es: tell.es.replace('{rival}', rivalName), en: tell.en.replace('{rival}', rivalName) };
}

/** Juega una carta. `null` = se acabó el tiempo. */
export function playCard(s: GameState, card: DebateCard | null): { delta: number; line: L; move: DebateMove; verdict: 'great' | 'good' | 'meh' | 'bad' } {
  const d = s.debate!;
  const m = d.moves[d.round];
  let delta: number;
  let line: L;
  if (card === null) {
    delta = DEBATE_TIMEOUT;
    line = { es: '«Eh… bueno… como decía mi abuela…» Te has quedado en blanco.', en: '"Uh… well… as my grandma used to say…" You went blank.' };
  } else {
    d.uses[card] = Math.max(0, d.uses[card] - 1);
    delta = DEBATE_TABLE[m.type][card];
    if (card === 'data' && s.stats.credibility >= 60) delta += 2;
    if (card === 'data' && hasFlag(s, 'lied_interview')) delta -= 4;
    if (card === 'promise') {
      const p = s.promises.find((x) => x.axis === m.topic);
      if (p) delta += 3;
      if (p?.status === 'kept') delta += 3;
      if (p?.status === 'broken') { delta -= 6; d.hypocrisy += 1; }
    }
    if (card === 'attack' && s.stats.evidence > 30) delta -= 3; // quien tiene rabo de paja…
    line = QUIPS[s.candidate][card];
  }
  d.audience = clamp(d.audience + delta * 1.4);
  d.log.push({ topic: m.topic, opp: m.type, card: card ?? 'timeout', delta, line });
  d.round += 1;
  const verdict = delta >= 8 ? 'great' : delta >= 3 ? 'good' : delta >= 0 ? 'meh' : 'bad';
  return { delta, line, move: m.type, verdict };
}

export function debateOver(s: GameState): boolean { return !!s.debate && s.debate.round >= s.debate.rounds; }

/** Cierra el debate y traslada el resultado a impulso y popularidad. */
export function finishDebate(s: GameState): DeltaRec[] {
  const d = s.debate!;
  const score = d.audience - 50;
  const why: L = { es: 'Resultado del debate televisado', en: 'Televised debate result' };
  const out: DeltaRec[] = [
    { stat: 'momentum', delta: changeStat(s, 'momentum', score / 5), why },
    { stat: 'popularity', delta: changeStat(s, 'popularity', score / 9), why },
  ];
  if (d.hypocrisy > 0) out.push({ stat: 'credibility', delta: changeStat(s, 'credibility', -3 * d.hypocrisy), why: { es: 'Te recordaron promesas rotas en directo', en: 'Broken promises were thrown at you live' } });
  s.flags.push(score >= 0 ? `debate_won_${d.kind}` : `debate_lost_${d.kind}`);
  return out;
}
