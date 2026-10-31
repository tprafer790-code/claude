// Pruebas del motor (sin interfaz). npm test
import { describe, expect, it } from 'vitest';
import { playBot, type Strategy } from '../src/core/bot';
import { startCampaign } from '../src/core/campaign';
import { runElection, dhondt } from '../src/core/election';
import { isEligible, pickEvent } from '../src/core/events';
import { availablePolicies, billTally, closeRound, concludeFormation, formationTally, passPolicy, startFormation, startRound } from '../src/core/government';
import { createState } from '../src/core/state';
import type { CountryId, GameState } from '../src/core/types';
import { PROGRAMME } from '../src/data/campaign';
import { country } from '../src/data/countries';
import { EVENTS } from '../src/data/events';

const COUNTRIES: CountryId[] = ['es', 'us', 'br'];
const STRATS: Strategy[] = ['random', 'honest', 'corrupt', 'populist', 'technocrat', 'authoritarian'];

function fresh(c: CountryId = 'es', seed = 42): GameState {
  const s = createState({ seed, country: c, candidate: 'veterano', name: 'Test', orientation: 'left', lang: 'es' });
  for (const q of PROGRAMME) s.promises.push({ axis: q.axis, stance: -1, status: 'pending', round: 0 });
  startCampaign(s);
  return s;
}

/** Lleva una partida hasta el gobierno (forzando la victoria si hace falta). */
function governing(c: CountryId, seed = 7): GameState {
  const s = fresh(c, seed);
  s.stats.momentum = 30; s.stats.popularity = 60;
  for (const g of Object.values(s.groups)) { g.sat = 70; g.mob = 0.8; }
  const r = runElection(s, 'campaign');
  startFormation(s, r);
  const offers: Record<string, ('amend' | 'ministry')[]> = {};
  for (const p of s.parties) offers[p.id] = ['amend', 'ministry'];
  const f = concludeFormation(s, offers);
  if (!f.ok) { s.phase = 'government'; s.round = 0; startRound(s); }
  return s;
}

describe('reparto de escaños', () => {
  it('D’Hondt reparte exactamente los escaños y respeta el umbral', () => {
    expect(dhondt([340000, 280000, 160000, 60000, 15000], 7)).toEqual([3, 3, 1, 0, 0]);
    const r = dhondt([500, 300, 20], 10, 0.03);
    expect(r.reduce((a, b) => a + b, 0)).toBe(10);
    expect(r[2]).toBe(0);
  });
  it('las elecciones asignan todos los escaños de cada cámara', () => {
    for (const c of COUNTRIES) {
      const s = fresh(c);
      const res = runElection(s, 'campaign');
      for (const ch of country(c).chambers) {
        const total = Object.values(res.seats[ch.id] ?? {}).reduce((a, b) => a + b, 0);
        expect(total, `${c}/${ch.id}`).toBe(ch.size);
      }
      expect(res.factors.length).toBeGreaterThan(4);
    }
  });
});

describe('partidas completas con jugador automático', () => {
  for (const c of COUNTRIES) {
    for (const st of STRATS) {
      it(`${c} · ${st}: termina con un final válido e invariantes económicas`, () => {
        for (let i = 0; i < 6; i++) {
          const r = playBot(100 + i * 31, c, st);
          expect(r.ending?.id).toBeTruthy();
          expect(r.stats.treasury).toBeGreaterThanOrEqual(0);
          expect(r.stats.debt).toBeGreaterThanOrEqual(0);
          for (const [k, v] of Object.entries(r.stats)) expect(Number.isFinite(v), k).toBe(true);
          for (const [id, h] of Object.entries(r.state.eventHistory)) {
            const e = EVENTS.find((x) => x.id === id);
            if (e) expect(h.count, id).toBeLessThanOrEqual(e.repeat.max);
          }
        }
      });
    }
  }
  it('es determinista: misma semilla, misma partida', () => {
    const a = playBot(2024, 'br', 'random');
    const b = playBot(2024, 'br', 'random');
    expect(a.ending.id).toBe(b.ending.id);
    expect(a.stats).toEqual(b.stats);
    expect(a.state.decisions.map((d) => d.id)).toEqual(b.state.decisions.map((d) => d.id));
  });
  it('hay victorias y derrotas en cada país', () => {
    for (const c of COUNTRIES) {
      const ends = new Set<string>();
      for (let i = 0; i < 30; i++) ends.add(playBot(300 + i * 17, c, i % 2 ? 'honest' : 'random').ending.id);
      expect([...ends].some((e) => ['winner', 'hollow_winner', 'reformer', 'corrupt_winner'].includes(e)), c).toBe(true);
      expect([...ends].some((e) => ['campaign_lost', 'loser', 'good_loser', 'investiture_failed'].includes(e)), c).toBe(true);
    }
  });
});

describe('guardado', () => {
  it('serializar y restaurar a mitad de partida da el mismo futuro (semilla, eventos y efectos pendientes)', () => {
    const s = governing('es', 11);
    const pol = availablePolicies(s).find((p) => p.delayed.length && p.delay > 0)!;
    passPolicy(s, pol.id);
    expect(s.deferred.length).toBeGreaterThan(0);
    const copy: GameState = JSON.parse(JSON.stringify(s));
    for (const x of [s, copy]) { x.agenda.forEach((a) => (a.resolved = true)); closeRound(x); startRound(x); closeRound(x); startRound(x); }
    expect(copy.stats).toEqual(s.stats);
    expect(copy.agenda.map((a) => a.eventId ?? a.type)).toEqual(s.agenda.map((a) => a.eventId ?? a.type));
    expect(copy.rng).toBe(s.rng);
  });
});

describe('gobierno', () => {
  it('las consecuencias diferidas se aplican en su ronda', () => {
    const s = governing('us', 5);
    const pol = availablePolicies(s).find((p) => p.delayed.length && p.delay > 0)!;
    passPolicy(s, pol.id);
    const due = s.deferred.filter((d) => d.source === pol.id);
    expect(due.length).toBeGreaterThan(0);
    const target = due[0].round;
    while (s.round < target && s.phase === 'government') { s.agenda.forEach((a) => (a.resolved = true)); closeRound(s); startRound(s); }
    expect(s.deferred.filter((d) => d.source === pol.id && d.round <= s.round)).toHaveLength(0);
  });
  it('las concesiones cambian votos: una ley puede pasar o fracasar', () => {
    for (const c of COUNTRIES) {
      const s = governing(c, 3);
      s.unlocked.push('laws', 'housing', 'jobs', 'pacts', 'debt', 'foreign', 'security', 'institutions');
      s.stats.popularity = 35;
      for (const p of s.parties) { p.loyalty = -10; p.inGovernment = false; }
      // Parlamento sin mayoría propia: el jugador tiene el 40 % de cada cámara y el rival el resto que sobre
      const defs = country(c).parties(s.orientation);
      for (const ch of country(c).chambers) {
        const me = s.parties.find((p) => defs.find((d) => d.id === p.id)?.isPlayer || defs.find((d) => d.id === p.id)?.faction === 'player')!;
        const rival = s.parties.find((p) => defs.find((d) => d.id === p.id)?.isRival)!;
        const others = s.parties.filter((p) => p !== me && p !== rival).reduce((a, p) => a + (p.seats[ch.id] ?? 0), 0);
        const mine = s.parties.filter((p) => defs.find((d) => d.id === p.id)?.faction === 'player' && p !== me);
        mine.forEach((p) => (p.seats[ch.id] = 0));
        me.seats[ch.id] = Math.floor(ch.size * 0.4);
        rival.seats[ch.id] = Math.max(0, ch.size - me.seats[ch.id] - others);
      }
      const pols = availablePolicies(s);
      const none = pols.map((p) => billTally(s, p.id).passes);
      const all: Record<string, ('amend' | 'invest' | 'bribe')[]> = {};
      for (const p of s.parties) all[p.id] = ['amend', 'invest', 'bribe'];
      const withC = pols.map((p) => billTally(s, p.id, all).passes);
      expect(withC.filter(Boolean).length, c).toBeGreaterThanOrEqual(none.filter(Boolean).length);
      expect(new Set([...none, ...withC]).size, `${c}: hay leyes que pasan y que no`).toBe(2);
    }
  });
  it('en España las concesiones pueden decidir una investidura', () => {
    const s = fresh('es', 9);
    const r = runElection(s, 'campaign');
    startFormation(s, r);
    const empty: Record<string, never[]> = {};
    const base = formationTally(s, empty).byChamber.congress.yes;
    const offers: Record<string, ('ministry' | 'invest')[]> = {};
    for (const p of s.parties) offers[p.id] = ['ministry', 'invest'];
    expect(formationTally(s, offers).byChamber.congress.yes).toBeGreaterThanOrEqual(base);
  });
  it('las pruebas acumuladas abren una investigación periodística', () => {
    const s = governing('br', 13);
    s.stats.evidence = 30;
    s.agenda.forEach((a) => (a.resolved = true));
    closeRound(s); startRound(s);
    expect(s.flags).toContain('probe1');
    expect(s.agenda.some((a) => a.eventId === 'press_investigation') || s.scheduled.some((x) => x.event === 'press_investigation')).toBe(true);
  });
  it('la crisis internacional es rara, avisa antes y solo se elige si se cumplen sus condiciones', () => {
    const s = governing('es', 21);
    const incident = EVENTS.find((e) => e.id === 'varnia_incident')!;
    const invasion = EVENTS.find((e) => e.id === 'varnia_invasion')!;
    s.round = 10;
    expect(isEligible(s, invasion)).toBe(false); // sin escalada previa no hay invasión
    s.flags.push('varnia_escalated');
    s.unlocked.push('foreign');
    expect(isEligible(s, invasion)).toBe(true);
    expect(incident.chain?.stage).toBe(1);
    let seen = 0;
    for (let i = 0; i < 200; i++) if (playBot(7000 + i * 13, 'es', 'random').state.eventHistory.varnia_invasion) seen++;
    expect(seen).toBeLessThan(40); // rara
  });
  it('el selector de eventos respeta país y condiciones', () => {
    const s = governing('us', 2);
    for (let i = 0; i < 40; i++) {
      const e = pickEvent(s, i % 2 ? 'short' : 'main');
      if (!e) continue;
      expect(isEligible(s, e)).toBe(true);
      if (e.conditions.countries) expect(e.conditions.countries).toContain('us');
    }
  });
});
