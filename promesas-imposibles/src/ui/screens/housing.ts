// Interfaz de la historia de la promesa de vivienda: llamada de radio, corcho,
// decisión en el despacho y rendición de cuentas en el debate de reelección.
import { sfx } from '../../audio/audio';
import { CUT_LINES, housingForecast, lineName, resolveHousing, type Funding } from '../../core/housingDecision';
import { callOptions, fill, housingDebateView, housingOutcome, housingStatusText, makeHousingPromise, resolveHousingDefense, storyVars } from '../../core/housingStory';
import type { Tally } from '../../core/parliament';
import type { L } from '../../core/types';
import { country } from '../../data/countries';
import { HOUSING_CALL, HOUSING_DEBATE, HOUSING_DECISION } from '../../data/housingStory';
import { POLICY_BY_ID } from '../../data/policies';
import { num, signed, t, tl, type UIKey } from '../../i18n';
import { logEvent } from '../../telemetry/playtestLog';
import type { Actor } from '../app';
import { btn, h, svgEl } from '../dom';
import { ctx } from '../router';

/** Momento en que se pulsó «Nueva partida» (para medir cuánto se tarda en registrar la promesa). */
let newGameAt = 0;
export function markNewGame(): void { newGameAt = performance.now(); }

const v = () => storyVars(ctx.app.s!);
const fl = (x: L, extra: Record<string, string | number | L> = {}) => tl(fill(x, { ...v(), ...extra }));

// ── Corcho de la sede ────────────────────────────────────────────────────
/** Tarjeta clavada en el corcho de la sede con la promesa de la radio. */
export function corkNote(animate = false): void {
  const app = ctx.app;
  const s = app.s;
  if (!s?.housing || app.world.dataset.scene !== 'hq') return;
  app.world.querySelector('.cork-note')?.remove();
  const opt = callOptions(s)[s.housing.option];
  const out = s.housing.offeredRound !== undefined ? housingOutcome(s) : null;
  const stamp = out === 'working' ? t('corkKept') : out === 'waiting' ? t('corkWaiting') : out === 'rejected' ? t('corkRejected') : s.housing.stage === 'postponed' ? t('corkPostponed') : '';
  const note = h('div', { class: `cork-note${animate ? ' pinning' : ''}`, role: 'img', 'aria-label': `${tl(HOUSING_CALL.corkTitle)}: ${tl(opt.short)}. ${fl(HOUSING_CALL.corkLine)}${stamp ? `. ${stamp}` : ''}` },
    h('i', { class: 'pin', 'aria-hidden': 'true' }),
    h('b', null, tl(HOUSING_CALL.corkTitle)),
    h('span', null, tl(opt.short)),
    h('small', null, fl(HOUSING_CALL.corkLine)),
    stamp ? h('em', { class: `stamp st-${out ?? 'postponed'}` }, stamp) : null);
  app.world.append(note);
}

/** Cinta con las palabras exactas del candidato. */
function tapeBox(kicker: string, quote: L, who: string): HTMLElement {
  return h('figure', { class: 'tape' },
    h('figcaption', null, svgEl('<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 16h10" stroke="currentColor" stroke-width="2"/></svg>', 'ic'), kicker),
    h('blockquote', null, `«${tl(quote)}»`),
    h('p', { class: 'who' }, `— ${who}`));
}

// ── 1. La llamada ───────────────────────────────────────────────────────
/** Maite pasa una llamada de radio al entrar en la sede. Registra la promesa de vivienda. */
export async function radioCall(): Promise<void> {
  const app = ctx.app;
  const s = app.s!;
  app.clearLayer();
  app.setScene('hq');
  app.world.classList.add('closeup');
  // Plano medio: los dos personajes grandes y enteros, con manos y caras visibles, también en vertical
  const player = app.candidateActor(4, { size: 22, bottom: 13 });
  const advisor = app.castActor('advisor', 27, { flip: true, size: 22, bottom: 13 });
  player.el.classList.add('closeup'); advisor.el.classList.add('closeup');
  const radio = h('div', { class: 'radio-set', 'aria-hidden': 'true' },
    svgEl('<svg viewBox="0 0 120 80"><rect x="6" y="18" width="108" height="56" rx="10" fill="#e2493b" stroke="#2a2230" stroke-width="4"/><circle cx="38" cy="46" r="17" fill="#2a2230"/><circle cx="38" cy="46" r="9" fill="#f5c33b"/><rect x="66" y="32" width="38" height="12" rx="3" fill="#fff8ea" stroke="#2a2230" stroke-width="3"/><circle cx="74" cy="60" r="5" fill="#2a2230"/><circle cx="94" cy="60" r="5" fill="#2a2230"/><path d="M30 18 L60 2" stroke="#2a2230" stroke-width="4"/></svg>', 'radio-ic'),
    h('span', { class: 'onair' }, t('onAir')));
  app.world.append(radio);
  app.renderHud();
  const rec = s.orientation === 'left' ? -1 : 1;
  advisor.mood('nervous');
  await app.say('advisor', fl(HOUSING_CALL.advisorIntro), { actor: advisor, kicker: fl(HOUSING_CALL.kicker), cls: 'aside' });
  advisor.mood('idle');
  radio.classList.add('live');
  player.mood('nervous');
  const opts = callOptions(s);
  const idx = await app.dialog({
    speaker: 'caller', cls: 'aside call', kicker: fl(HOUSING_CALL.kicker), role: tl(fill({ es: 'oyente de {radio}', en: '{radio} listener' }, v())),
    text: fl(HOUSING_CALL.callerLine),
    choices: opts.map((o) => ({ label: `«${tl(o.quote)}»`, sub: tl(o.tradeoff), badge: o.stance === rec ? t('advisorRecommends') : undefined, cls: o.stance === rec ? 'rec' : '' })),
  });
  radio.classList.remove('live');
  const out = makeHousingPromise(s, idx, newGameAt ? Math.round(performance.now() - newGameAt) : 0);
  logEvent('housing_promise', { option: idx, policy: s.housing!.policy, ms: s.housing!.promisedAfterMs });
  (window as unknown as { __PI_PROMISE_MS__?: number }).__PI_PROMISE_MS__ = s.housing!.promisedAfterMs;
  app.save('programme');
  player.mood('talk');
  await app.dialog({ speaker: 'caller', cls: 'aside call', text: tl(out.text), choices: [{ label: t('next') }] });
  player.mood('idle');
  sfx.stamp();
  await advisor.walkTo(36, app.reduced);
  corkNote(true);
  advisor.mood('happy');
  await app.say('advisor', fl(HOUSING_CALL.advisorPin), { actor: advisor, kicker: t('promiseRecorded', { p: tl(opts[idx].short) }), extra: app.deltaList(out.deltas, 4), cls: 'aside' });
  await app.say('advisor', fl(HOUSING_CALL.afterCall), { actor: advisor, cls: 'aside' });
  advisor.mood('idle');
  app.world.classList.remove('closeup');
}

// ── 2. La decisión de gobierno ──────────────────────────────────────────
function voteLine(s: NonNullable<typeof ctx.app.s>, tally: Tally): HTMLElement {
  const c = country(s.country);
  const b = tally.byChamber[c.mainChamber];
  const txt = fl(tally.passes ? HOUSING_DECISION.passes : HOUSING_DECISION.fails, { yes: b.yes, no: b.no });
  const extra = c.chambers.length > 1 ? c.chambers.filter((ch) => ch.id !== c.mainChamber).map((ch) => { const x = tally.byChamber[ch.id]; return ` · ${tl(ch.name)}: ${x.yes}/${x.need}`; }).join('') : '';
  return h('p', { class: `verdict ${tally.passes ? 'up' : 'down'}` }, txt + extra, h('small', null, ` · ${tl(tally.rule)}`));
}

/**
 * Decisión en el despacho: cumplir, negociar o aplazar. Con `retake`, viene de una ronda de leyes
 * (la promesa estaba aplazada o rechazada) y «Ahora no» devuelve al listado de leyes.
 * Devuelve false si se canceló el reintento.
 */
export async function housingDecision(retake = false): Promise<boolean> {
  const app = ctx.app;
  const s = app.s!;
  const hs = s.housing!;
  const pol = POLICY_BY_ID[hs.policy];
  app.clearLayer();
  const advisor = app.castActor('advisor', 62, { flip: true });
  await app.say('advisor', fl(retake ? HOUSING_DECISION.recallRetake : HOUSING_DECISION.recall), { actor: advisor, kicker: fl(HOUSING_DECISION.itemTitle), extra: tapeBox(fl({ es: '{radio} · campaña', en: '{radio} · campaign' }), hs.quote, s.name) });
  const fc = housingForecast(s);
  const c = country(s.country);
  const choice = await new Promise<{ mode: 'full' | 'negotiated' | 'postpone' | 'cancel'; funding?: Funding }>((resolve) => {
    let funding: Funding = fc.defaultFunding;
    const fundBox = h('div', { class: 'fund' });
    const drawFund = () => {
      if (fc.housingMax) { fundBox.replaceChildren(h('p', { class: 'small' }, fl(HOUSING_DECISION.housingMax))); return; }
      const opts: Funding[] = [...fc.cutOptions.map((o) => o.line), 'deficit'];
      const sel = fc.cutOptions.find((o) => o.line === funding);
      fundBox.replaceChildren(
        h('div', { class: 'seg', role: 'group', 'aria-label': fl(HOUSING_DECISION.fundWith) }, h('span', { class: 'nm' }, fl(HOUSING_DECISION.fundWith)),
          ...opts.map((f) => btn(f === 'deficit' ? fl(HOUSING_DECISION.deficitOpt) : tl(lineName(f)), () => { funding = f; drawFund(); }, { cls: `small tog fund-opt${funding === f ? ' on' : ''}`, aria: `${fl(HOUSING_DECISION.fundWith)}: ${f === 'deficit' ? fl(HOUSING_DECISION.deficitOpt) : tl(lineName(f))}${funding === f ? ` (${t('on')})` : ''}` }))),
        h('p', { class: 'small' }, sel ? fl(HOUSING_DECISION.cutLine, { line: lineName(sel.line), from: sel.from, to: sel.to, sector: t(`stat_${sel.stat}` as UIKey), target: num(sel.target) }) : fl(HOUSING_DECISION.deficit)),
        h('p', { class: 'small' }, fl(HOUSING_DECISION.balanceNow, { from: signed(fc.balanceNow, 1), to: signed(fc.balanceWith[funding] ?? fc.balanceNow, 1) })));
    };
    drawFund();
    const needsFull = [
      pol.upfront ? fl(HOUSING_DECISION.upfrontNow, { n: num(pol.upfront), have: num(Math.round(s.stats.treasury)) }) : null,
      pol.upkeep ? fl(HOUSING_DECISION.lawUpkeep, { n: num(pol.upkeep, 1) }) : null,
      fc.housingMax ? null : fl(HOUSING_DECISION.lineCost, { n: num(1.5, 1) }),
      fl(HOUSING_DECISION.majority),
    ].filter(Boolean) as string[];
    const needsNego = [
      fc.negoUpfront ? fl(HOUSING_DECISION.upfrontNow, { n: num(fc.negoUpfront), have: num(Math.round(s.stats.treasury)) }) : null,
      pol.upkeep ? fl(HOUSING_DECISION.lawUpkeep, { n: num(pol.upkeep, 1) }) : null,
      fl(HOUSING_DECISION.majority),
    ].filter(Boolean) as string[];
    const replacedBill = s.agenda.some((a) => a.type === 'housing' && !a.resolved && a.vars?.replacedBill === '1');
    const card = (cls: string, title: string, desc: string, needs: string[] | null, competes: Node | string, tally: Tally | null, button: HTMLButtonElement) =>
      h('article', { class: `card hopt ${cls}` }, h('h3', null, title), h('p', { class: 'small' }, desc),
        needs ? h('dl', { class: 'facts' }, h('dt', null, fl(HOUSING_DECISION.needs)), h('dd', null, needs.join(' · '))) : null,
        h('dl', { class: 'facts' }, h('dt', null, fl(HOUSING_DECISION.competes)), h('dd', null, competes)),
        tally ? h('div', null, h('h4', null, fl(HOUSING_DECISION.forecast)), voteLine(s, tally)) : null,
        button);
    const afford = (n: number) => n <= s.stats.treasury;
    const bFull = btn(fl(HOUSING_DECISION.confirmFull), () => { p.remove(); resolve({ mode: 'full', funding }); }, { cls: 'primary', key: '1', disabled: !afford(pol.upfront) });
    const bNego = btn(fl(HOUSING_DECISION.confirmNego), () => { p.remove(); resolve({ mode: 'negotiated' }); }, { cls: 'primary', key: '2', disabled: !afford(fc.negoUpfront) });
    const bPost = retake
      ? btn(t('notNow'), () => { p.remove(); resolve({ mode: 'cancel' }); }, { cls: 'ghost', key: '3' })
      : btn(fl(HOUSING_DECISION.confirmPostpone), () => { p.remove(); resolve({ mode: 'postpone' }); }, { key: '3' });
    const p = app.panel('housing modal scroll wide',
      h('h2', null, fl(HOUSING_DECISION.title)),
      h('p', { class: 'hint' }, fl(HOUSING_DECISION.hint)),
      h('p', { class: 'small policy-line' }, h('b', null, tl(pol.name)), ' · ', tl(pol.desc)),
      h('div', { class: 'cards three hopts' },
        card('full', fl(HOUSING_DECISION.fullTitle), fl(HOUSING_DECISION.fullDesc), needsFull, fundBox, fc.full, bFull),
        card('nego', fl(HOUSING_DECISION.negoTitle), fl(HOUSING_DECISION.negoDesc, { rounds: fc.negoRounds }), needsNego, fl(HOUSING_DECISION.negoCompetes), fc.nego, bNego),
        card('post', retake ? t('notNow') : fl(HOUSING_DECISION.postponeTitle), fl(HOUSING_DECISION.postponeDesc), null, replacedBill ? fl(HOUSING_DECISION.postponeCompetesBill) : fl(HOUSING_DECISION.postponeCompetes), null, bPost)));
    void c;
  });
  if (choice.mode === 'cancel') return false;
  const r = resolveHousing(s, choice.mode, choice.funding);
  logEvent('decision', { id: 'housing_decision', mode: choice.mode, funding: choice.funding, passed: r.passed, round: s.round });
  app.save('office');
  app.renderHud();
  if (r.passed === true) sfx.stamp(); else if (r.passed === false) sfx.bad(); else sfx.click();
  if (r.passed !== null) await app.say('economist', tl(r.text), { kicker: tl(pol.name), extra: app.deltaList(r.deltas) });
  advisor.mood(r.passed ? 'happy' : r.passed === false ? 'sad' : 'nervous');
  await app.say('advisor', tl(fill(r.advisor, v())), { actor: advisor });
  return true;
}

/** Tarjeta para retomar la promesa desde una ronda de leyes. */
export function retakeCard(onPick: () => void, key: string): HTMLElement {
  const s = ctx.app.s!;
  const hs = s.housing!;
  const pol = POLICY_BY_ID[hs.policy];
  return h('article', { class: 'card policy retake' },
    h('h3', null, fl(HOUSING_DECISION.retakeCard)),
    h('p', { class: 'small' }, `«${tl(hs.quote)}»`),
    h('p', { class: 'tags' }, h('em', null, tl(pol.name)), h('em', null, tl(housingStatusText(s)))),
    btn(t('confirm'), onPick, { cls: 'primary small', key }));
}

/** Línea de la carpeta de promesas. */
export function folderLines(): HTMLElement | null {
  const s = ctx.app.s!;
  if (!s.housing) return null;
  return h('div', { class: 'folder-housing' }, h('p', null, fl(HOUSING_DECISION.folderLine, { quote: s.housing.quote })), h('p', { class: 'small muted' }, tl(housingStatusText(s))));
}

// ── 3. La rendición de cuentas ──────────────────────────────────────────
/** En el debate de reelección: la periodista pone la grabación y vuelve la oyente. */
export async function housingDebate(me: Actor, rival: Actor): Promise<void> {
  const app = ctx.app;
  const s = app.s!;
  const view = housingDebateView(s);
  if (!view) return;
  const journalist = app.castActor('journalist', 43, { size: 13 });
  rival.mood('happy');
  await app.say('journalist', tl(view.intro), { actor: journalist, kicker: t('accountabilityKicker') });
  sfx.click();
  await app.say('journalist', tl(view.bridge), { actor: journalist, kicker: tl(view.tapeKicker), extra: tapeBox(tl(view.tapeKicker), view.tape, s.name) });
  me.mood(view.outcome === 'working' ? 'happy' : 'nervous');
  const caller = app.castActor('caller', 96, { flip: true, size: 14 });
  journalist.remove();
  await caller.walkTo(46, app.reduced);
  caller.mood(view.outcome === 'working' ? 'happy' : view.outcome === 'abandoned' ? 'angry' : view.outcome === 'rejected' ? 'sad' : 'nervous');
  await app.say('caller', tl(view.callerLine), { actor: caller, kicker: t(`outcome_${view.outcome}` as UIKey) });
  if (view.whisper) {
    await app.dialog({ speaker: 'advisor', cls: 'whisper', kicker: tl(HOUSING_DEBATE.whisperKicker), text: tl(view.whisper), choices: [{ label: t('next') }] });
  }
  const idx = await app.dialog({ speaker: 'player', kicker: tl(HOUSING_DEBATE.defendKicker), text: tl(view.callerLine), choices: view.defenses.map((d) => ({ label: tl(d) })) });
  const r = resolveHousingDefense(s, idx);
  logEvent('decision', { id: 'housing_debate', outcome: view.outcome, choice: idx });
  if (r.audience >= 3) sfx.cheer(); else if (r.audience < 0) sfx.boo();
  me.mood(r.audience >= 3 ? 'happy' : r.audience < 0 ? 'sad' : 'idle');
  caller.mood(r.audience >= 3 ? 'happy' : r.audience < 0 ? 'angry' : 'idle');
  app.save('reelection');
  await app.say('caller', tl(r.reply), { actor: caller, extra: app.deltaList(r.deltas, 3) });
  caller.remove();
  me.mood('idle'); rival.mood('idle');
  await app.say('journalist', tl(view.close), { kicker: t('debateTitle') });
}

export { CUT_LINES };
