// Modelo electoral explicable. Cada grupo se divide en tres subsegmentos
// ideológicos; cada subsegmento reparte su voto con softmax sobre utilidades.
import { country } from '../data/countries';
import type { CountryDef, Region } from '../data/countries/types';
import { GROUPS, GROUP_IDEOLOGY, TUNING } from '../data/tuning';
import { randRange } from './rng';
import { clamp, playerLean } from './state';
import type { ElectionFactor, ElectionResult, GameState, GroupId, L, Party } from './types';

export type FactorKey = 'satisfaction' | 'credibility' | 'momentum' | 'popularity' | 'scandal' | 'record' | 'mobilization' | 'noise';
export const FACTOR_LABELS: Record<FactorKey, L> = {
  satisfaction: { es: 'Satisfacción de los grupos', en: 'Group satisfaction' },
  credibility: { es: 'Credibilidad y promesas', en: 'Credibility and promises' },
  momentum: { es: 'Impulso de campaña y debate', en: 'Campaign and debate momentum' },
  popularity: { es: 'Popularidad', en: 'Popularity' },
  scandal: { es: 'Escándalos y pruebas', en: 'Scandals and evidence' },
  record: { es: 'Balance de gestión (calidad de vida, economía)', en: 'Track record (quality of life, economy)' },
  mobilization: { es: 'Movilización de tu electorado', en: 'Turnout of your voters' },
  noise: { es: 'Imprevistos de la noche electoral', en: 'Election-night surprises' },
};

const SEGMENTS: [number, number][] = [[-1, 0.3], [0, 0.4], [1, 0.3]];

interface Ctx { s: GameState; c: CountryDef; parties: Party[]; noise: number; groupNoise: Record<GroupId, number>; off: Set<FactorKey>; reelection: boolean; center: number; enthusiasm: number }

export function electionParties(s: GameState): Party[] {
  const lean = playerLean(s);
  return country(s.country).parties(s.orientation).map((p) => (p.isPlayer ? { ...p, lean } : p));
}

/** Utilidad de un partido para un subsegmento. */
function utility(ctx: Ctx, p: Party, g: GroupId, x: number, region: Region | null, legislative: boolean): number {
  const { s, off } = ctx;
  const xx = x - ctx.center + (region?.shift ?? 0);
  // Mezcla de proximidad y dirección: los extremos de cada lado premian la claridad
  let u = -0.75 * Math.abs(xx - p.lean) + 0.3 * xx * p.lean;
  if (p.isPlayer || p.faction === 'player') {
    const own = p.isPlayer ? 1 : 0.85;
    let v = 0;
    if (!off.has('satisfaction')) v += 1.2 * (s.groups[g].sat - 50) / 50;
    if (!off.has('credibility')) v += 0.6 * (s.stats.credibility - 50) / 50;
    if (!off.has('momentum')) v += 0.5 * s.stats.momentum / 20;
    if (!off.has('popularity')) v += 0.6 * (s.stats.popularity - 50) / 50;
    if (!off.has('scandal')) v -= 1.0 * (s.stats.evidence / 100) + 0.3 * (s.stats.suspicion / 100);
    if (ctx.reelection && !off.has('record')) v += 0.6 * (s.stats.wellbeing - 50) / 50 + 0.35 * (s.stats.economy - 50) / 50;
    if (!off.has('noise')) v += ctx.noise + ctx.groupNoise[g];
    u += v * own;
  } else if (p.isRival || p.faction === 'rival') {
    u += (p.isRival ? 1 : 0.85) * (ctx.reelection ? TUNING.rivalReelectionBonus : TUNING.rivalCampaignBonus);
  } else {
    u -= 0.35; // partidos pequeños
  }
  if (p.regional) u += region?.regionalParties?.includes(p.id) ? 1.1 : -99;
  if (p.pragmatic) u += legislative ? 1.0 : -1.3;
  return u;
}

function shares(ctx: Ctx, list: Party[], g: GroupId, x: number, region: Region | null, legislative: boolean): number[] {
  const us = list.map((p) => utility(ctx, p, g, x, region, legislative) / TUNING.voteTemperature);
  const m = Math.max(...us);
  const ex = us.map((u) => Math.exp(u - m));
  const tot = ex.reduce((a, b) => a + b, 0);
  return ex.map((e) => e / tot);
}

function turnout(ctx: Ctx, g: GroupId, forPlayer: boolean): number {
  const { s, c, off } = ctx;
  const mob = off.has('mobilization') ? 0.5 : s.groups[g].mob;
  const k = c.turnoutSensitivity;
  const enth = forPlayer ? ctx.enthusiasm : 1;
  return clamp(c.baseTurnout * enth * (1 + (forPlayer ? k * (mob - 0.5) * 0.9 : 0)), 0.2, 0.97);
}

/** Votos por partido en una región (o nacional si region = null). */
function regionVotes(ctx: Ctx, list: Party[], region: Region | null, legislative: boolean): { votes: number[]; cast: number; eligible: number } {
  const votes = list.map(() => 0);
  let cast = 0; let eligible = 0;
  for (const g of GROUPS) {
    const size = ctx.c.groupSizes[g] * (region?.mix?.[g] ?? 1);
    const { mean, spread } = GROUP_IDEOLOGY[g];
    for (const [off, w] of SEGMENTS) {
      const sh = shares(ctx, list, g, mean + off * spread, region, legislative);
      sh.forEach((v, i) => {
        const pl = list[i].isPlayer || list[i].faction === 'player';
        const n = size * w * v * turnout(ctx, g, pl);
        votes[i] += n; cast += n;
      });
      eligible += size * w;
    }
  }
  return { votes, cast, eligible };
}

export function dhondt(votes: number[], seats: number, threshold = 0): number[] {
  const tot = votes.reduce((a, b) => a + b, 0);
  const valid = votes.map((v) => (tot > 0 && v / tot >= threshold ? v : 0));
  const out = votes.map(() => 0);
  for (let i = 0; i < seats; i++) {
    let best = -1; let bi = 0;
    valid.forEach((v, j) => { const q = v / (out[j] + 1); if (q > best) { best = q; bi = j; } });
    if (best <= 0) break;
    out[bi] += 1;
  }
  return out;
}

interface Raw { first: number; shares: Record<string, number>; turnout: number; seats: Record<string, Record<string, number>>; won: boolean; detail: L; second?: Record<string, number>; ev?: Record<string, number>; playerShare: number }

function compute(ctx: Ctx): Raw {
  const { c, parties } = ctx;
  const pct = (v: number[], tot: number) => Object.fromEntries(parties.map((p, i) => [p.id, Math.round((v[i] / tot) * 1000) / 10]));
  if (c.system === 'parliamentary') {
    const nat = parties.map(() => 0); let cast = 0; let elig = 0;
    const seats: Record<string, number> = Object.fromEntries(parties.map((p) => [p.id, 0]));
    for (const r of c.regions) {
      const rv = regionVotes(ctx, parties, r, true);
      rv.votes.forEach((v, i) => (nat[i] += v * r.seats));
      cast += rv.cast * r.seats; elig += rv.eligible * r.seats;
      dhondt(rv.votes, r.seats, 0.03).forEach((n, i) => (seats[parties[i].id] += n));
    }
    const sh = pct(nat, cast);
    const player = parties.find((p) => p.isPlayer)!;
    const rival = parties.find((p) => p.isRival)!;
    const ps = seats[player.id];
    // Gana quien puede sumar una mayoría de bloque y no queda muy por detrás del rival
    const won = (potentialMajority(ctx, seats) && ps >= seats[rival.id] * 0.85) || ps >= seats[rival.id] * 1.15;
    return {
      first: sh[player.id], shares: sh, turnout: cast / elig, seats: { congress: seats }, won, playerShare: sh[player.id],
      detail: { es: `${ps} escaños de 350. Mayoría absoluta: 176.`, en: `${ps} seats of 350. Absolute majority: 176.` },
    };
  }
  if (c.system === 'presidential-us') {
    // Colegio Electoral: dos candidaturas por bloque
    const cand = parties.filter((p) => p.isPlayer || p.isRival);
    const ev: Record<string, number> = { player: 0, rival: 0 };
    const nat = [0, 0]; let cast = 0; let elig = 0;
    for (const r of c.regions) {
      const rv = regionVotes(ctx, cand, r, false);
      rv.votes.forEach((v, i) => (nat[i] += v * r.seats));
      cast += rv.cast * r.seats; elig += rv.eligible * r.seats;
      const pi = cand.findIndex((p) => p.isPlayer);
      if (rv.votes[pi] >= rv.votes[1 - pi]) ev.player += r.seats; else ev.rival += r.seats;
      ev[r.id] = rv.votes[pi] >= rv.votes[1 - pi] ? 1 : 0;
    }
    const pi = cand.findIndex((p) => p.isPlayer);
    const pShare = nat[pi] / cast;
    const margin = (nat[pi] - nat[1 - pi]) / cast;
    const seats = usCongress(parties, margin);
    return {
      first: Math.round(pShare * 1000) / 10, shares: { [cand[pi].id]: Math.round(pShare * 1000) / 10, [cand[1 - pi].id]: Math.round((1 - pShare) * 1000) / 10 },
      turnout: cast / elig, seats, won: ev.player >= 270, ev, playerShare: Math.round(pShare * 1000) / 10,
      detail: { es: `${ev.player} compromisarios de 538. Necesitas 270.`, en: `${ev.player} electoral votes of 538. You need 270.` },
    };
  }
  // Brasil: presidencial a dos vueltas + Congreso proporcional
  const exec = parties.filter((p) => !p.pragmatic);
  const nat = exec.map(() => 0); let cast = 0; let elig = 0;
  const leg = parties.map(() => 0);
  for (const r of c.regions) {
    const rv = regionVotes(ctx, exec, r, false);
    rv.votes.forEach((v, i) => (nat[i] += v * r.seats));
    cast += rv.cast * r.seats; elig += rv.eligible * r.seats;
    const lv = regionVotes(ctx, parties, r, true);
    lv.votes.forEach((v, i) => (leg[i] += v * r.seats));
  }
  const first = Object.fromEntries(exec.map((p, i) => [p.id, Math.round((nat[i] / cast) * 1000) / 10]));
  const pi = exec.findIndex((p) => p.isPlayer);
  const order = exec.map((p, i) => ({ p, v: nat[i] })).sort((a, b) => b.v - a.v);
  let won: boolean; let second: Record<string, number> | undefined; let pShare = nat[pi] / cast;
  if (pShare > 0.5) won = true;
  else {
    const top2 = order.slice(0, 2).map((o) => o.p);
    if (!top2.some((p) => p.isPlayer)) won = false;
    else {
      let rc = 0; const rvv = [0, 0];
      for (const r of c.regions) { const rv = regionVotes(ctx, top2, r, false); rv.votes.forEach((v, i) => (rvv[i] += v * r.seats)); rc += rv.cast * r.seats; }
      const ip = top2.findIndex((p) => p.isPlayer);
      second = { [top2[0].id]: Math.round((rvv[0] / rc) * 1000) / 10, [top2[1].id]: Math.round((rvv[1] / rc) * 1000) / 10 };
      pShare = rvv[ip] / rc;
      won = rvv[ip] > rvv[1 - ip];
    }
  }
  const legTot = leg.reduce((a, b) => a + b, 0);
  const camara = dhondt(leg, 513, 0.02); const senado = dhondt(leg, 81, 0.04);
  const seats = {
    camara: Object.fromEntries(parties.map((p, i) => [p.id, camara[i]])),
    senado: Object.fromEntries(parties.map((p, i) => [p.id, senado[i]])),
  };
  void legTot;
  return {
    first: first[exec[pi].id], shares: first, second, turnout: cast / elig, seats, won, playerShare: Math.round(pShare * 1000) / 10,
    detail: second
      ? { es: `Segunda vuelta: ${Math.round(pShare * 1000) / 10} % de los votos válidos.`, en: `Runoff: ${Math.round(pShare * 1000) / 10}% of valid votes.` }
      : { es: `Primera vuelta: ${first[exec[pi].id]} %. ${won ? 'Victoria sin segunda vuelta.' : 'Fuera de la segunda vuelta.'}`, en: `First round: ${first[exec[pi].id]}%. ${won ? 'Won outright.' : 'Out of the runoff.'}` },
  };
}

/** España: ¿puede el jugador sumar 176 con partidos ideológicamente cercanos? */
function potentialMajority(ctx: Ctx, seats: Record<string, number>): boolean {
  let sum = 0;
  for (const p of ctx.parties) {
    if (p.isRival) continue;
    const player = ctx.parties.find((x) => x.isPlayer)!;
    const d = Math.abs(p.lean - player.lean);
    if (p.isPlayer || d < 1.0 || (p.regional && d < 1.4)) sum += seats[p.id];
  }
  return sum >= 176;
}

/** EE. UU.: escaños por facción a partir del margen nacional. */
export function usCongress(parties: Party[], margin: number): Record<string, Record<string, number>> {
  const house = clamp(Math.round(217.5 + 435 * 0.95 * margin), 120, 315);
  const senate = clamp(Math.round(50 + 100 * 0.55 * margin), 35, 65);
  const out: Record<string, Record<string, number>> = { house: {}, senate: {} };
  for (const p of parties) {
    const mine = p.faction === 'player';
    const mainstream = p.isPlayer || p.isRival;
    const share = mainstream ? 0.62 : 0.38;
    const h = (mine ? house : 435 - house) * share;
    const sn = (mine ? senate : 100 - senate) * share;
    out.house[p.id] = Math.round(h); out.senate[p.id] = Math.round(sn);
  }
  fixTotal(out.house, 435); fixTotal(out.senate, 100);
  return out;
}
function fixTotal(m: Record<string, number>, total: number) {
  const keys = Object.keys(m); let diff = total - keys.reduce((a, k) => a + m[k], 0);
  let i = 0;
  while (diff !== 0 && keys.length) { const k = keys[i % keys.length]; m[k] += diff > 0 ? 1 : -1; diff += diff > 0 ? -1 : 1; i++; }
}

/** Media ideológica ponderada del país: se centra para que izquierda y derecha partan igualadas. */
export function ideologyCenter(c: CountryDef): number {
  // Incluye la composición de cada región y su desplazamiento local, ponderados por escaños o peso
  let num = 0; let den = 0;
  for (const r of c.regions) {
    let m = 0; let t = 0;
    for (const g of GROUPS) { const w = c.groupSizes[g] * (r.mix?.[g] ?? 1); m += GROUP_IDEOLOGY[g].mean * w; t += w; }
    num += (m / t + r.shift) * r.seats; den += r.seats;
  }
  return num / den + (c.calibration ?? 0);
}

/** Entusiasmo de la base: un programa tibio moviliza menos a los propios (la participación cae hasta un 12 %). */
export function enthusiasm(s: GameState, c: CountryDef): number {
  const clarity = Math.min(1, Math.abs(playerLean(s)) / 0.85);
  return 1 - (1 - clarity) * 0.12 * (c.compulsory ? 0.4 : 1);
}

/** Ejecuta unas elecciones completas con ruido acotado y explicación de factores. */
export function runElection(s: GameState, kind: 'campaign' | 'reelection'): ElectionResult {
  const c = country(s.country);
  const parties = electionParties(s);
  const noise = randRange(s, -TUNING.electionNoise, TUNING.electionNoise);
  const groupNoise = Object.fromEntries(GROUPS.map((g) => [g, randRange(s, -TUNING.groupNoise, TUNING.groupNoise)])) as Record<GroupId, number>;
  const base: Ctx = { s, c, parties, noise, groupNoise, off: new Set(), reelection: kind === 'reelection', center: ideologyCenter(c), enthusiasm: enthusiasm(s, c) };
  const raw = compute(base);
  const keys: FactorKey[] = ['satisfaction', 'credibility', 'momentum', 'popularity', 'scandal', 'mobilization', 'noise'];
  if (kind === 'reelection') keys.push('record');
  const factors: ElectionFactor[] = keys.map((k) => {
    const alt = compute({ ...base, off: new Set([k]) });
    return { key: k, label: FACTOR_LABELS[k], value: Math.round((raw.first - alt.first) * 10) / 10 };
  }).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const res: ElectionResult = {
    kind, shares: raw.shares, turnout: Math.round(raw.turnout * 1000) / 10, seats: raw.seats,
    executive: { won: raw.won, detail: raw.detail, secondRound: raw.second, ev: raw.ev }, factors, playerShare: raw.playerShare,
  };
  s.elections.push(res);
  return res;
}

/** Elecciones de mitad de mandato (EE. UU.): solo el Congreso. */
export function runMidterm(s: GameState): { house: number; senate: number } {
  const parties = electionParties(s);
  // El partido del presidente suele perder escaños: penalización estructural
  const approval = (s.stats.popularity - 50) / 100;
  const margin = clamp(approval * 0.6 - 0.035 + randRange(s, -0.02, 0.02), -0.25, 0.25);
  const seats = usCongress(parties, margin);
  for (const ps of s.parties) ps.seats = { house: seats.house[ps.id] ?? 0, senate: seats.senate[ps.id] ?? 0 };
  const mine = parties.filter((p) => p.faction === 'player').map((p) => p.id);
  return { house: mine.reduce((a, id) => a + seats.house[id], 0), senate: mine.reduce((a, id) => a + seats.senate[id], 0) };
}
