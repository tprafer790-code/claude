// Validación de datos editables: referencias, completitud, idiomas y requisitos mínimos de contenido.
// Uso: npm run validate  (sale con código 1 si hay errores)
import type { Choice, Cond, Effect, GameEvent, L } from '../src/core/types';
import { CAST } from '../src/data/cast';
import { INTERVIEW, INTERVIEW_ANSWERS, PROGRAMME, STREET } from '../src/data/campaign';
import { COUNTRIES } from '../src/data/countries';
import { CARD_HINTS, CARD_NAMES, MOVE_TELLS, QUIPS } from '../src/data/debate';
import { ENDINGS } from '../src/data/endings';
import { EVENTS, EVENT_BY_ID } from '../src/data/events';
import { POLICIES, POLICY_BY_ID } from '../src/data/policies';
import { UI } from '../src/i18n/strings';

const errors: string[] = [];
const warnings: string[] = [];
const err = (m: string) => errors.push(m);
const warn = (m: string) => warnings.push(m);

const HOTSPOTS = ['phone', 'desk', 'tv', 'door', 'folder', 'map'];
const SYSTEMS = ['promises', 'budget', 'laws', 'pacts', 'housing', 'jobs', 'debt', 'foreign', 'security', 'institutions', 'corruption'];
/** Eventos que el motor programa por código (no por efecto `chain`). */
const CODE_EVENTS = ['tycoon_offer', 'tycoon_collect', 'favor_due', 'press_investigation', 'scandal_leak', 'judicial_charges', 'es_budget_prorogued', 'us_shutdown', 'br_emendas', 'us_court_order', 'referendum_result', 'opp_bill_taxcut', 'opp_bill_wage'];
/** Marcas que pone el motor por código. */
const CODE_FLAGS = ['governing', 'probe1', 'probe2', 'probe3', 'plan_done', 'interview_done', 'debate_won_campaign', 'debate_lost_campaign', 'debate_won_reelection', 'debate_lost_reelection', 'removed', 'survived_fall', 'resigned', 'autocrat', 'final_crisis', 'midterm_done', 'reelection_started', 'lied_interview', 'election_done'];

function checkL(where: string, x: L | undefined, optional = false) {
  if (!x) { if (!optional) err(`${where}: texto ausente`); return; }
  if (!x.es?.trim()) err(`${where}: falta el texto en español`);
  if (!x.en?.trim()) err(`${where}: falta el texto en inglés`);
  const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
  if (x.es && x.en && ph(x.es) !== ph(x.en)) err(`${where}: marcadores distintos entre idiomas (${ph(x.es)} / ${ph(x.en)})`);
}

// Recoge marcas puestas por efectos y usadas por condiciones
const setFlags = new Set<string>(CODE_FLAGS);
const usedFlags: [string, string][] = [];
const effectsOf = (e: GameEvent): Effect[] => e.choices.flatMap((c) => [...c.effects, ...(c.risk?.effects ?? [])]);
for (const e of EVENTS) for (const ef of effectsOf(e)) if (ef.flag) setFlags.add(ef.flag);
for (const p of POLICIES) for (const ef of [...p.immediate, ...p.delayed, ...(p.risk?.effects ?? [])]) if (ef.flag) setFlags.add(ef.flag);
for (const a of INTERVIEW_ANSWERS) for (const ef of a.effects as readonly Effect[]) if (ef.flag) setFlags.add(ef.flag);
const condFlags = (where: string, c?: Cond) => { for (const f of [...(c?.flags ?? []), ...(c?.notFlags ?? [])]) usedFlags.push([where, f]); };

function checkEffects(where: string, list: Effect[]) {
  for (const ef of list) {
    if (ef.chain && !EVENT_BY_ID[ef.chain.event]) err(`${where}: encadena a un evento inexistente «${ef.chain.event}»`);
    if (ef.passPolicy && !POLICY_BY_ID[ef.passPolicy]) err(`${where}: aprueba una política inexistente «${ef.passPolicy}»`);
    if (ef.unlock && !SYSTEMS.includes(ef.unlock)) err(`${where}: desbloquea un sistema desconocido «${ef.unlock}»`);
    if (ef.cast && !CAST[ef.cast]) err(`${where}: personaje desconocido «${ef.cast}»`);
    if (ef.favor && !CAST[ef.favor.creditor]) err(`${where}: acreedor desconocido`);
    if (ef.why) checkL(`${where} (causa)`, ef.why);
  }
}

// ── Eventos ──
const ids = new Set<string>();
for (const e of EVENTS) {
  const w = `evento ${e.id}`;
  if (ids.has(e.id)) err(`${w}: identificador duplicado`);
  ids.add(e.id);
  checkL(`${w} título`, e.title); checkL(`${w} texto`, e.text); checkL(`${w} detalle`, e.detail, true);
  if (!HOTSPOTS.includes(e.hotspot)) err(`${w}: objeto interactivo desconocido «${e.hotspot}»`);
  if (!CAST[e.speaker]) err(`${w}: personaje desconocido «${e.speaker}»`);
  if (e.choices.length < 2) err(`${w}: necesita al menos dos opciones`);
  if (!e.repeat || e.repeat.max < 1) err(`${w}: falta la regla de repetición`);
  condFlags(w, e.conditions);
  const cids = new Set<string>();
  for (const c of e.choices as Choice[]) {
    if (cids.has(c.id)) err(`${w}: opción duplicada ${c.id}`);
    cids.add(c.id);
    checkL(`${w}/${c.id} etiqueta`, c.label); checkL(`${w}/${c.id} resultado`, c.result);
    checkEffects(`${w}/${c.id}`, [...c.effects, ...(c.risk?.effects ?? [])]);
    if (c.risk) { checkL(`${w}/${c.id} riesgo`, c.risk.text); if (c.risk.chance <= 0 || c.risk.chance > 1) err(`${w}/${c.id}: probabilidad de riesgo fuera de rango`); }
    condFlags(`${w}/${c.id}`, c.requires);
  }
  // Opciones realmente distintas: no puede haber dos con los mismos efectos
  const sigs = e.choices.map((c) => JSON.stringify(c.effects));
  if (new Set(sigs).size !== sigs.length) warn(`${w}: hay opciones con efectos idénticos`);
  for (const [cid, v] of Object.entries(e.variants ?? {})) {
    if (!COUNTRIES[cid as keyof typeof COUNTRIES]) err(`${w}: variante de país desconocido ${cid}`);
    checkL(`${w} variante ${cid} título`, v?.title, true); checkL(`${w} variante ${cid} texto`, v?.text, true);
    for (const [ch, cv] of Object.entries(v?.choices ?? {})) {
      if (!cids.has(ch)) err(`${w}: la variante ${cid} cambia una opción inexistente ${ch}`);
      checkL(`${w} variante ${cid}/${ch} etiqueta`, cv.label, true); checkL(`${w} variante ${cid}/${ch} resultado`, cv.result, true);
    }
  }
  if (e.excludes) for (const x of e.excludes) if (!EVENT_BY_ID[x]) err(`${w}: excluye un evento inexistente ${x}`);
}
for (const id of CODE_EVENTS) if (!EVENT_BY_ID[id]) err(`El motor programa «${id}», que no existe`);

// Eventos solo programables: deben ser alcanzables
const chained = new Set<string>(CODE_EVENTS);
for (const e of EVENTS) for (const ef of effectsOf(e)) if (ef.chain) chained.add(ef.chain.event);
for (const p of POLICIES) for (const ef of [...p.immediate, ...p.delayed]) if (ef.chain) chained.add(ef.chain.event);
for (const e of EVENTS) if (e.scheduledOnly && !chained.has(e.id)) err(`evento ${e.id}: es solo programable pero nada lo programa`);

// ── Políticas ──
for (const p of POLICIES) {
  const w = `política ${p.id}`;
  checkL(`${w} nombre`, p.name); checkL(`${w} descripción`, p.desc);
  checkEffects(w, [...p.immediate, ...p.delayed, ...(p.risk?.effects ?? [])]);
  if (p.risk) checkL(`${w} riesgo`, p.risk.text);
  if (!p.beneficiaries.length && !p.harmed.length) warn(`${w}: no declara ganadores ni perdedores`);
  if (p.delay < 0) err(`${w}: retraso negativo`);
  condFlags(w, p.requires);
}

for (const [w, f] of usedFlags) if (!setFlags.has(f) && !f.startsWith('talk_') && !f.startsWith('act_')) warn(`${w}: usa la marca «${f}», que nada pone`);

// ── Campaña, debate, reparto y finales ──
PROGRAMME.forEach((q) => { checkL(`programa ${q.axis} (izq.)`, q.ask.left); checkL(`programa ${q.axis} (der.)`, q.ask.right); q.options.forEach((o, i) => { checkL(`programa ${q.axis}/${i}`, o.label); checkL(`programa ${q.axis}/${i} promesa`, o.promise); checkL(`programa ${q.axis}/${i} reacción`, o.reaction); }); });
STREET.forEach((s) => { checkL(`calle ${s.id}`, s.line); s.options.forEach((o, i) => { checkL(`calle ${s.id}/${i}`, o.label); checkL(`calle ${s.id}/${i} respuesta`, o.reply); checkEffects(`calle ${s.id}/${i}`, o.effects); }); });
INTERVIEW.forEach((q) => checkL(`entrevista ${q.axis}`, q.q));
INTERVIEW_ANSWERS.forEach((a) => { checkL(`entrevista ${a.id}`, a.label); checkL(`entrevista ${a.id} resultado`, a.result); });
Object.entries(CARD_NAMES).forEach(([k, v]) => { checkL(`carta ${k}`, v); checkL(`pista ${k}`, CARD_HINTS[k as keyof typeof CARD_HINTS]); });
Object.entries(MOVE_TELLS).forEach(([k, v]) => v.forEach((x, i) => checkL(`gesto ${k}/${i}`, x)));
Object.entries(QUIPS).forEach(([k, v]) => Object.entries(v).forEach(([c, x]) => checkL(`frase ${k}/${c}`, x)));
Object.values(CAST).forEach((c) => { checkL(`reparto ${c.id} rol`, c.role); checkL(`reparto ${c.id} deseo`, c.wants); Object.entries(c.reactions).forEach(([k, v]) => checkL(`reparto ${c.id}/${k}`, v)); });
ENDINGS.forEach((e) => { checkL(`final ${e.id}`, e.title); checkL(`final ${e.id} texto`, e.text); });
for (const [k, v] of Object.entries(UI)) checkL(`interfaz ${k}`, v);

// ── Países ──
for (const c of Object.values(COUNTRIES)) {
  const w = `país ${c.id}`;
  checkL(`${w} nombre`, c.name);
  if (c.roundPlan.length < 10 || c.roundPlan.length > 14) err(`${w}: el mandato debe tener 10-14 rondas (tiene ${c.roundPlan.length})`);
  if (c.roundPlan[c.roundPlan.length - 1] !== 'reelection') err(`${w}: la última ronda debe ser la reelección`);
  for (const o of ['left', 'right'] as const) {
    const ps = c.parties(o);
    if (ps.filter((p) => p.isPlayer).length !== 1) err(`${w}/${o}: debe haber exactamente un partido del jugador`);
    if (ps.filter((p) => p.isRival).length !== 1) err(`${w}/${o}: debe haber exactamente un partido rival`);
    ps.forEach((p) => checkL(`${w} partido ${p.id}`, p.name));
  }
  for (const id of Object.keys(CAST)) if (!c.castNames[id as keyof typeof c.castNames]) err(`${w}: falta el nombre de ${id}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.reality.date)) err(`${w}: la instantánea real necesita fecha AAAA-MM-DD`);
  if (!c.reality.sources.length) err(`${w}: la instantánea real necesita fuentes`);
  c.reality.lines.forEach((l, i) => checkL(`${w} realidad ${i}`, l));
  c.rules.forEach((l, i) => checkL(`${w} regla ${i}`, l));
  Object.values(c.titles).forEach((l, i) => checkL(`${w} título ${i}`, l));
}

// ── Requisitos mínimos del encargo ──
const chainEvents = EVENTS.filter((e) => e.chain);
const national = EVENTS.filter((e) => e.conditions.countries?.length || e.variants);
const invasion = EVENTS.filter((e) => e.chain?.id === 'varnia');
const req: [string, boolean, string][] = [
  ['≥ 45 eventos', EVENTS.length >= 45, String(EVENTS.length)],
  ['≥ 12 eventos en cadenas', chainEvents.length >= 12, String(chainEvents.length)],
  ['variantes nacionales', national.length >= 6, String(national.length)],
  ['rama de invasión (cadena «varnia»)', invasion.length >= 3, String(invasion.length)],
  ['4 candidaturas', Object.keys(QUIPS).length === 4, String(Object.keys(QUIPS).length)],
  ['3 países jugables', Object.keys(COUNTRIES).length === 3, String(Object.keys(COUNTRIES).length)],
  ['6 preguntas de programa', PROGRAMME.length === 6, String(PROGRAMME.length)],
];
for (const [name, ok, v] of req) (ok ? console.log : err)(`${ok ? '✓' : '✗'} ${name}: ${v}`);

console.log(`\nEventos: ${EVENTS.length} · en cadenas: ${chainEvents.length} · con variantes o exclusivos de país: ${national.length} · políticas: ${POLICIES.length} · finales: ${ENDINGS.length} · textos de interfaz: ${Object.keys(UI).length}`);
if (warnings.length) console.log(`\nAvisos (${warnings.length}):\n- ${warnings.join('\n- ')}`);
if (errors.length) { console.error(`\nErrores (${errors.length}):\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log('\nValidación correcta.');
