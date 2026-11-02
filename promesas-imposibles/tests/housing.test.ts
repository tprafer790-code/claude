// Pruebas de la historia de la promesa de vivienda (sin interfaz). npm test
import { describe, expect, it } from 'vitest';
import { playBot } from '../src/core/bot';
import { startCampaign } from '../src/core/campaign';
import { startDebate } from '../src/core/debate';
import { runElection } from '../src/core/election';
import { computeEnding } from '../src/core/endings';
import { closeRound, concludeFormation, startFormation, startRound, submitBill, totalRounds } from '../src/core/government';
import { housingForecast, resolveHousing } from '../src/core/housingDecision';
import { callOptions, fill, housingDebateView, housingOutcome, housingRetakeable, makeHousingPromise, resolveHousingDefense, storyVars } from '../src/core/housingStory';
import { createState, partyDef } from '../src/core/state';
import type { CountryId, GameState, L } from '../src/core/types';
import { PROGRAMME } from '../src/data/campaign';
import { HOUSING_CALL, HOUSING_DEBATE, HOUSING_DECISION, HOUSING_EPILOGUE } from '../src/data/housingStory';

const COUNTRIES: CountryId[] = ['es', 'us', 'br'];

/** Partida que entra en la sede: la llamada registra la promesa de vivienda y el resto del programa. */
function withCall(c: CountryId, option: number, seed = 7): GameState {
  const s = createState({ seed, country: c, candidate: 'veterano', name: 'Test', orientation: 'left', lang: 'es' });
  makeHousingPromise(s, option, 1234);
  for (const q of PROGRAMME) if (q.axis !== 'housing') s.promises.push({ axis: q.axis, stance: -1, status: 'pending', round: 0 });
  startCampaign(s);
  return s;
}

/** Lleva la partida al gobierno y avanza hasta que la promesa vuelve al despacho. */
function toHousingRound(c: CountryId, option = 0, seed = 7, friendly = true): GameState {
  const s = withCall(c, option, seed);
  s.stats.momentum = 30; s.stats.popularity = 60;
  for (const g of Object.values(s.groups)) { g.sat = 70; g.mob = 0.8; }
  const r = runElection(s, 'campaign');
  startFormation(s, r);
  const offers: Record<string, ('amend' | 'ministry')[]> = {};
  for (const p of s.parties) offers[p.id] = friendly ? ['amend', 'ministry'] : [];
  const f = concludeFormation(s, offers);
  if (!f.ok) { s.phase = 'government'; s.round = 0; startRound(s); }
  for (let guard = 0; guard < 6 && !s.agenda.some((a) => a.type === 'housing'); guard++) {
    for (const it of s.agenda) it.resolved = true;
    closeRound(s); startRound(s);
  }
  return s;
}

describe('1. la llamada de radio', () => {
  it('ocupa el hueco de vivienda del programa y guarda las palabras exactas', () => {
    const s = withCall('es', 1);
    expect(s.promises.filter((p) => p.axis === 'housing')).toHaveLength(1);
    expect(s.promises.find((p) => p.axis === 'housing')!.stance).toBe(0);
    expect(s.promises).toHaveLength(6);
    expect(s.housing!.policy).toBe('rent_aid');
    expect(s.housing!.quote.es).toContain('ayuda directa');
    expect(s.housing!.promisedAfterMs).toBe(1234);
    expect(s.decisions.some((d) => d.label.es.includes('En la radio'))).toBe(true);
  });
  it('cada opción tiene un coste o renuncia y una política distinta', () => {
    const opts = callOptions(withCall('us', 0));
    expect(new Set(opts.map((o) => o.policy)).size).toBe(3);
    for (const o of opts) expect(o.tradeoff.es.length).toBeGreaterThan(40);
    expect(opts[0].quote.en).toContain('240 dollars');
  });
});

describe('2. la decisión de gobierno', () => {
  for (const c of COUNTRIES) {
    it(`${c}: vuelve como decisión principal cuando se abre la vivienda`, () => {
      const s = toHousingRound(c);
      const item = s.agenda.find((a) => a.type === 'housing');
      expect(item?.main).toBe(true);
      expect(s.round).toBe(3);
      expect(s.unlocked).toContain('housing');
      if (c === 'es') { expect(item?.vars?.replacedBill).toBe('1'); expect(s.agenda.some((a) => a.type === 'bill')).toBe(false); }
    });
  }

  it('el pronóstico muestra recursos, competencia y la votación real', () => {
    const s = toHousingRound('es', 1);
    const fc = housingForecast(s);
    expect(fc.upkeep).toBe(1);
    expect(fc.cutOptions.length).toBeGreaterThan(0);
    expect(fc.full.byChamber.congress).toBeDefined();
    expect(fc.negoRounds).toBe(totalRounds(s) - s.round + 1);
    expect(fc.balanceWith.deficit!).toBeLessThan(fc.balanceNow);
  });

  it('cumplirla entera: aprueba la ley, sube la partida de vivienda y recorta la elegida', () => {
    const s = toHousingRound('es', 0);
    const before = { ...s.budget.lines };
    const r = resolveHousing(s, 'full', 'security');
    expect(r.passed).toBe(true);
    expect(s.budget.lines.housing).toBe(before.housing + 1);
    expect(s.budget.lines.security).toBe(before.security - 1);
    expect(s.passed).toContain('rent_cap');
    expect(s.promises.find((p) => p.axis === 'housing')!.status).toBe('kept');
    expect(housingOutcome(s)).toBe('working');
    expect(s.housing!.before!.lines.housing).toBe(before.housing);
    expect(s.housing!.after!.lines.housing).toBe(before.housing + 1);
  });

  it('negociarla: se aprueba con enmiendas y sus efectos llegan después de las elecciones', () => {
    const s = toHousingRound('es', 2);
    const lines = { ...s.budget.lines };
    const r = resolveHousing(s, 'negotiated');
    expect(r.passed).toBe(true);
    expect(s.budget.lines).toEqual(lines);
    expect(housingOutcome(s)).toBe('waiting');
    expect(s.deferred.filter((d) => d.source === 'land_free').every((d) => d.round > totalRounds(s))).toBe(true);
  });

  it('si el Parlamento la rechaza, registra el intento y quién la bloqueó', () => {
    const s = toHousingRound('es', 0, 7, false);
    // Minoría forzada: el partido propio pierde escaños y el resto se vuelve hostil.
    for (const p of s.parties) {
      p.loyalty = -100; p.inGovernment = false;
      if (partyDef(s, p.id)?.isPlayer) for (const k of Object.keys(p.seats)) p.seats[k] = Math.floor(p.seats[k] / 4);
    }
    s.stats.popularity = 10;
    const r = resolveHousing(s, 'full');
    expect(r.passed).toBe(false);
    const a = s.housing!.attempts[0];
    expect(a.passed).toBe(false);
    expect(a.blockers.length).toBeGreaterThan(0);
    expect(r.text.es).toContain('bloqueado');
    expect(housingOutcome(s)).toBe('rejected');
    expect(housingRetakeable(s)).toBe(true);
  });

  it('aplazarla: libera el turno legislativo y se puede retomar por el circuito normal', () => {
    const s = toHousingRound('es', 0);
    resolveHousing(s, 'postpone');
    expect(housingOutcome(s)).toBe('abandoned');
    expect(s.agenda.some((a) => a.type === 'bill' && !a.resolved)).toBe(true);
    expect(housingRetakeable(s)).toBe(true);
    const r = submitBill(s, 'rent_cap', {}, 'vote');
    expect(s.housing!.attempts.at(-1)!.route).toBe('bill');
    expect(housingOutcome(s)).toBe(r.passed ? 'working' : 'rejected');
  });
});

describe('3. la rendición de cuentas', () => {
  it('la periodista recupera las palabras exactas y la oyente reacciona según el desenlace', () => {
    const outcomes = new Set<string>();
    for (const [mode, expected] of [['full', 'working'], ['negotiated', 'waiting'], ['postpone', 'abandoned']] as const) {
      const s = toHousingRound('es', 0);
      resolveHousing(s, mode);
      startDebate(s, 'reelection', false);
      const v = housingDebateView(s)!;
      expect(v.outcome).toBe(expected);
      expect(v.tape).toEqual(s.housing!.quote);
      expect(v.defenses).toHaveLength(3);
      expect(!!v.whisper).toBe(expected !== 'working');
      outcomes.add(v.callerLine.es);
      const before = s.debate!.audience;
      const d = resolveHousingDefense(s, 0);
      expect(s.debate!.audience).not.toBe(before);
      expect(d.reply.es.length).toBeGreaterThan(10);
      expect(s.housing!.debate!.outcome).toBe(expected);
    }
    expect(outcomes.size).toBe(3);
  });

  it('el final añade un epílogo sobre la oyente', () => {
    const s = toHousingRound('es', 0);
    resolveHousing(s, 'full');
    const e = computeEnding(s, 'term', true);
    expect(e.lines.some((l) => l.es.includes('Lola Rubio'))).toBe(true);
  });
});

describe('guardado, países e idiomas', () => {
  it('guardar y continuar conserva la historia y el mismo intercambio final', () => {
    const s = toHousingRound('br', 0);
    resolveHousing(s, 'negotiated');
    const copy: GameState = JSON.parse(JSON.stringify(s));
    expect(copy.housing).toEqual(s.housing);
    startDebate(s, 'reelection', false); startDebate(copy, 'reelection', false);
    expect(housingDebateView(copy)).toEqual(housingDebateView(s));
  });

  it('las partidas del robot llegan a los cuatro desenlaces y son reproducibles', () => {
    const seen = new Set<string>();
    for (const c of COUNTRIES) for (let seed = 1; seed <= 25; seed++) {
      const r = playBot(seed, c, 'random');
      if (r.state.housing?.offeredRound !== undefined) seen.add(housingOutcome(r.state)!);
    }
    expect([...seen].sort()).toEqual(['abandoned', 'rejected', 'waiting', 'working']);
    const a = playBot(2, 'es', 'honest', { orientation: 'left', housingOption: 0, housingMode: 'full', stopAtReelection: true });
    const b = playBot(2, 'es', 'honest', { orientation: 'left', housingOption: 0, housingMode: 'full', stopAtReelection: true });
    expect(a.state.stats).toEqual(b.state.stats);
    expect(a.state.housing).toEqual(b.state.housing);
  });

  it('todos los textos existen en español e inglés y no dejan variables sin sustituir', () => {
    const all: L[] = [];
    const walk = (x: unknown) => {
      if (!x || typeof x !== 'object') return;
      if ('es' in (x as object) && 'en' in (x as object) && typeof (x as L).es === 'string') { all.push(x as L); return; }
      Object.values(x as object).forEach(walk);
    };
    walk(HOUSING_CALL); walk(HOUSING_DECISION); walk(HOUSING_DEBATE); walk(HOUSING_EPILOGUE);
    expect(all.length).toBeGreaterThan(80);
    for (const c of COUNTRIES) {
      const v = { ...storyVars(withCall(c, 0)), quote: 'q', short: 's', rounds: 3, blockers: 'X', yes: 1, no: 2, h: 2, cut: 0, line: 'L', from: 1, to: 0, target: 40, sector: 'S', n: 1, have: 3, r: 3, e: 13, d: 'd', q: 'q' };
      for (const l of all) {
        expect(l.es.trim().length, JSON.stringify(l)).toBeGreaterThan(0);
        expect(l.en.trim().length, JSON.stringify(l)).toBeGreaterThan(0);
        const f = fill(l, v);
        expect(f.es, l.es).not.toMatch(/\{\w+\}/);
        expect(f.en, l.en).not.toMatch(/\{\w+\}/);
      }
    }
  });
});
