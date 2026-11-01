// Partidas reproducibles de la historia de la promesa de vivienda.
// Mismo país, misma semilla y misma promesa en la radio; cambia solo la decisión de gobierno.
// Uso: npm run housing [-- carpeta-de-salida]
// Escribe un informe en Markdown y guarda partidas listas para «Continuar» (las usan las pruebas e2e).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { playBot } from '../src/core/bot';
import { revenue, spending } from '../src/core/government';
import { housingDebateView, housingOutcome, resolveHousingDefense, blockersText } from '../src/core/housingStory';
import { startDebate } from '../src/core/debate';
import { SAVE_VERSION } from '../src/core/state';
import type { CountryId, GameState, HousingMode, L } from '../src/core/types';
import { POLICY_BY_ID } from '../src/data/policies';
import { HOUSING_DEBATE } from '../src/data/housingStory';

const NAMES: Record<CountryId, string> = { es: 'Charo Vidal', us: 'Kim Parker', br: 'Cida Rocha' };
const outDir = resolve(process.argv[2] ?? 'test-results/housing');
mkdirSync(outDir, { recursive: true });

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const r1 = (n: number) => Math.round(n * 10) / 10;
const es = (x: L) => x.es;

/** Busca una semilla en la que el robot honesto gana la campaña y llega a la decisión de vivienda. */
function findSeed(country: CountryId, option: number, from = 1): number {
  for (let seed = from; seed < from + 400; seed++) {
    const r = playBot(seed, country, 'honest', { orientation: 'left', candidate: 'impecable', housingOption: option, housingMode: 'full', stopAtReelection: true });
    if (r.state.housing?.offeredRound !== undefined && r.state.phase === 'reelection') return seed;
  }
  throw new Error(`Sin semilla válida para ${country}`);
}

interface Run { mode: HousingMode; state: GameState; final: GameState; defense: ReturnType<typeof resolveHousingDefense>; view: NonNullable<ReturnType<typeof housingDebateView>> }

function run(country: CountryId, seed: number, option: number, mode: HousingMode, defense = 0): Run {
  const r = playBot(seed, country, 'honest', { orientation: 'left', candidate: 'impecable', housingOption: option, housingMode: mode, housingFunding: 'investment', stopAtReelection: true });
  const state = r.state;
  state.name = NAMES[country];
  // Partida guardada justo antes del debate de reelección
  writeFileSync(join(outDir, `${country}-${mode}.json`), JSON.stringify({ version: SAVE_VERSION, savedAt: Date.now(), screen: 'reelection', state }));
  const final = clone(state);
  startDebate(final, 'reelection', false);
  const view = housingDebateView(final)!;
  const d = resolveHousingDefense(final, defense);
  return { mode, state, final, defense: d, view };
}

const lines: string[] = [];
const p = (s = '') => lines.push(s);
p('# Historia de la promesa de vivienda: partidas reproducibles');
p();
p(`Generado con \`npm run housing\` (${new Date().toISOString().slice(0, 10)}). Robot «honesto», orientación izquierda, candidatura «impecable». Misma semilla y misma respuesta en la radio; solo cambia la decisión de gobierno.`);

const plan: { country: CountryId; option: number; modes: HousingMode[] }[] = [
  { country: 'es', option: 0, modes: ['full', 'negotiated', 'postpone'] },
  { country: 'us', option: 1, modes: ['full', 'negotiated'] },
  { country: 'br', option: 2, modes: ['full', 'negotiated'] },
];
const summary: string[] = [];
for (const { country, option, modes } of plan) {
  const seed = findSeed(country, option);
  const runs = modes.map((m) => run(country, seed, option, m, m === 'postpone' ? 0 : m === 'full' ? 2 : 0));
  const h0 = runs[0].state.housing!;
  const pol = POLICY_BY_ID[h0.policy];
  p();
  p(`## ${country.toUpperCase()} · semilla ${seed} · «${es(h0.quote)}»`);
  p();
  p(`Política prometida: **${es(pol.name)}**. La promesa se recupera en la ronda ${h0.offeredRound}.`);
  p();
  p('| | ' + runs.map((r) => ({ full: 'A · Cumplirla entera', negotiated: 'B · Negociarla', postpone: 'C · Aplazarla' }[r.mode])).join(' | ') + ' |');
  p('|---|' + runs.map(() => '---').join('|') + '|');
  const row = (label: string, f: (r: Run) => string) => p(`| ${label} | ${runs.map(f).join(' | ')} |`);
  const att = (r: Run) => r.state.housing!.attempts.filter((a) => a.round === r.state.housing!.offeredRound);
  row('Votación', (r) => { const a = att(r)[0]; return a ? `${a.passed ? 'aprobada' : 'rechazada'} (sí ${a.yes}, no ${a.no})${a.passed ? '' : ` · bloquean: ${es(blockersText(r.state, a.blockers))}`}` : 'no se vota'; });
  row('Partidas antes → después', (r) => { const b = r.state.housing!.before!; const a = r.state.housing!.after!; return `vivienda ${b.lines.housing}→${a.lines.housing}, inversión ${b.lines.investment}→${a.lines.investment}, sanidad ${b.lines.services}→${a.lines.services}, seguridad ${b.lines.security}→${a.lines.security}`; });
  row('Saldo por ronda antes → después', (r) => `${r.state.housing!.before!.balance} → ${r.state.housing!.after!.balance}`);
  row('Tesorería antes → después', (r) => `${r.state.housing!.before!.treasury} → ${r.state.housing!.after!.treasury}`);
  row('Vivienda (indicador) en la decisión', (r) => `${r.state.housing!.before!.housing}`);
  row('Vivienda al llegar a la reelección', (r) => `${r1(r.state.stats.housing)}`);
  row('Partidas en la reelección', (r) => `vivienda ${r.state.budget.lines.housing}, inversión ${r.state.budget.lines.investment}, sanidad ${r.state.budget.lines.services}, seguridad ${r.state.budget.lines.security}`);
  row('Saldo por ronda en la reelección', (r) => `${r1(revenue(r.state) - spending(r.state))}`);
  row('Deuda en la reelección', (r) => `${r1(r.state.stats.debt)}`);
  row('Desenlace para la oyente', (r) => ({ working: 'ya funciona', waiting: 'aprobada, efectos pendientes', rejected: 'rechazada', abandoned: 'abandonada' }[housingOutcome(r.state)!]));
  row('Efectos de vivienda pendientes', (r) => { const d = r.state.deferred.filter((x) => x.source === h0.policy); return d.length ? [...new Set(d.map((x) => `ronda ${x.round}`))].join(', ') : '—'; });
  for (const r of runs) {
    p();
    p(`### Intercambio final · ${({ full: 'A · Cumplirla entera', negotiated: 'B · Negociarla', postpone: 'C · Aplazarla' }[r.mode])}`);
    p();
    p(`- **Periodista:** ${es(r.view.intro)}`);
    p(`- **Grabación:** «${es(r.view.tape)}» — ${r.state.name}`);
    p(`- **Periodista:** ${es(r.view.bridge)}`);
    p(`- **Oyente:** ${es(r.view.callerLine)}`);
    if (r.view.whisper) p(`- **Asesora:** ${es(r.view.whisper)}`);
    p(`- **Opciones de defensa:** ${r.view.defenses.map((d, i) => `${i + 1}) ${es(d)}`).join(' · ')}`);
    p(`- **Defensa elegida por el robot:** ${es(r.view.defenses[r.final.housing!.debate!.defense])} → público ${r.defense.audience >= 0 ? '+' : ''}${r.defense.audience}, credibilidad ${r.final.housing!.debate!.credibility >= 0 ? '+' : ''}${r.final.housing!.debate!.credibility}`);
    p(`- **Oyente:** ${es(r.defense.reply)}`);
    p(`- **Periodista:** ${es(r.view.close)}`);
    p(`- (EN) **Listener:** ${r.view.callerLine.en}`);
  }
  summary.push(`${country}: semilla ${seed}, ${runs.map((r) => `${r.mode}=${housingOutcome(r.state)}`).join(', ')}`);
}

p();
p('## Los cuatro desenlaces');
p();
p('Textos de la oyente según lo ocurrido (la medida que ya funciona depende de la política prometida):');
p();
p(`- **Ya funciona (tope):** ${es(HOUSING_DEBATE.callerWorking.rent_cap)}`);
p(`- **Ya funciona (ayuda):** ${es(HOUSING_DEBATE.callerWorking.rent_aid)}`);
p(`- **Ya funciona (suelo):** ${es(HOUSING_DEBATE.callerWorking.land_free)}`);
p(`- **Aprobada, efectos pendientes:** ${es(HOUSING_DEBATE.callerWaiting)}`);
p(`- **Rechazada en votación:** ${es(HOUSING_DEBATE.callerRejected)}`);
p(`- **Abandonada:** ${es(HOUSING_DEBATE.callerAbandoned)}`);

writeFileSync(join(outDir, 'informe.md'), lines.join('\n'));
console.log(summary.join('\n'));
console.log(`Informe: ${join(outDir, 'informe.md')}`);
