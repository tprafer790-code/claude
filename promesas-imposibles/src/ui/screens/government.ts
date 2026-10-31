// Formación de gobierno, despacho por rondas, presupuesto, leyes, informe y reelección.
import { sfx } from '../../audio/audio';
import { canAfford, doAction, type CampaignAction } from '../../core/campaign';
import { debateOver } from '../../core/debate';
import { computeEnding } from '../../core/endings';
import { availablePolicies, billTally, budgetPreview, closeRound, concludeFormation, formationTally, LINE_COST, offerCost, roundComplete, startRound, submitBill, submitBudget, totalRounds, UNLOCKS, upkeep, type BudgetPlan } from '../../core/government';
import { partyDefs, type Concession, type Tally } from '../../core/parliament';
import { finalElection, startReelection } from '../../core/reelection';
import type { AgendaItem, GroupId, HotspotId, Policy } from '../../core/types';
import { country } from '../../data/countries';
import { EVENT_BY_ID } from '../../data/events';
import { GROUPS, TUNING } from '../../data/tuning';
import { num, signed, t, tl, type UIKey } from '../../i18n';
import { gameplayStop } from '../../platform/poki';
import { logEvent, logState } from '../../telemetry/playtestLog';
import { btn, h } from '../dom';
import { ctx, R } from '../router';
import { runDebate } from './debate';
import { infoPanel } from './info';
import { eventDialog } from './shared';

type Offers = Record<string, Concession[]>;

// ── Negociación (formación, presupuesto, leyes) ──────────────────────────
function negotiation(tally: (o: Offers) => Tally, offers: Offers, allowed: Concession[], onChange: () => void): HTMLElement {
  const app = ctx.app;
  const s = app.s!;
  const c = country(s.country);
  const defs = partyDefs(s);
  const wrap = h('div', { class: 'nego' });
  const draw = () => {
    const tl_ = tally(offers);
    const cost = offerCost(offers);
    const rows = tl_.votes.map((v) => {
      const p = defs.find((d) => d.id === v.id)!;
      const seats = c.chambers.map((ch) => v.seats[ch.id] ?? 0).join(' / ');
      const conc = p.isPlayer ? h('span', { class: 'muted small' }, t('yourParty')) : h('div', { class: 'conc' }, allowed.filter((k) => k !== 'bribe' || s.stats.privateFunds >= 3).map((k) => {
        const on = offers[v.id]?.includes(k);
        return btn(t(`conc_${k}` as UIKey), () => {
          const list = offers[v.id] ?? [];
          offers[v.id] = on ? list.filter((x) => x !== k) : [...list, k];
          draw(); onChange();
        }, { cls: `small tog${on ? ' on' : ''}${k === 'bribe' ? ' shady' : ''}`, aria: `${p.short}: ${t(`conc_${k}` as UIKey)}${on ? ` (${t('on')})` : ''}` });
      }));
      return h('tr', { class: `v-${v.vote}` },
        h('td', null, h('i', { class: 'sw', style: `background:${p.color}` }), h('b', null, p.short), h('small', null, ` ${tl(p.name)}`)),
        h('td', null, seats),
        h('td', null, h('span', { class: `vote ${v.vote}` }, t(`vote_${v.vote}` as UIKey)), h('small', null, tl(v.reason))),
        h('td', null, conc));
    });
    const sums = c.chambers.map((ch) => { const b = tl_.byChamber[ch.id]; return h('li', null, t('tallyNeed', { chamber: tl(ch.name), yes: b.yes, no: b.no, abs: b.abstain, need: b.need })); });
    const afford = cost.treasury <= s.stats.treasury && cost.privateFunds <= s.stats.privateFunds;
    wrap.replaceChildren(
      h('table', { class: 'parties' }, h('tbody', null, rows)),
      h('ul', { class: 'tally' }, sums),
      h('p', { class: `verdict ${tl_.passes ? 'up' : 'down'}` }, tl_.passes ? t('passes') : t('fails'), ' · ', h('small', null, tl(tl_.rule))),
      cost.treasury || cost.privateFunds ? h('p', { class: afford ? 'small' : 'warn' }, t('cost', { c: [cost.treasury ? `${cost.treasury} ${t('stat_treasury').toLowerCase()}` : '', cost.privateFunds ? `${cost.privateFunds} ${t('stat_privateFunds').toLowerCase()}` : ''].filter(Boolean).join(', ') })) : '');
    wrap.dataset.affordable = afford ? '1' : '0';
  };
  draw();
  return wrap;
}

// ── Formación ────────────────────────────────────────────────────────────
let formationAttempts = 0;
R.formation = () => {
  const app = ctx.app;
  const s = app.s!;
  const c = country(s.country);
  const defs = partyDefs(s);
  app.clearLayer();
  app.setScene('parliament', { seats: s.parties.map((ps) => [defs.find((d) => d.id === ps.id)!.color, ps.seats[c.mainChamber] ?? 0] as [string, number]).sort((a, b) => (defs.find((d) => d.color === a[0])?.lean ?? 0) - (defs.find((d) => d.color === b[0])?.lean ?? 0)) });
  app.renderHud();
  const offers: Offers = {};
  for (const p of s.parties) offers[p.id] = [];
  const parl = c.system === 'parliamentary';
  let confirm: HTMLButtonElement;
  const nego = negotiation((o) => formationTally(s, o), offers, ['amend', 'invest', 'ministry', 'bribe'], () => { confirm.disabled = nego.dataset.affordable !== '1'; });
  confirm = btn(parl ? t('callVote') : t('takeOffice'), () => {
    const r = concludeFormation(s, offers);
    formationAttempts += 1;
    logEvent('formation', { ok: r.ok, attempt: formationAttempts, offers });
    if (r.ok) {
      formationAttempts = 0;
      sfx.fanfare();
      logState('phase', s);
      app.save('office');
      void app.say('advisor', tl(r.text)).then(() => R.office());
    } else if (formationAttempts >= 2) {
      formationAttempts = 0;
      sfx.sad();
      s.ending = computeEnding(s, 'formation', false);
      s.phase = 'ending';
      app.save('ending');
      void app.say('advisor', t('formationFailed')).then(() => R.ending());
    } else {
      sfx.bad();
      app.toast(tl(r.text));
      R.formation();
    }
  }, { cls: 'primary', key: '1' });
  confirm.disabled = nego.dataset.affordable !== '1';
  app.panel('formation modal scroll wide',
    h('h2', null, t('formationTitle')),
    h('p', { class: 'hint' }, parl ? t('formationHintEs') : t('formationHintPres')),
    parl ? h('p', { class: 'small muted' }, t('formationRetry', { n: formationAttempts + 1 })) : null,
    nego, confirm);
};

// ── Despacho ─────────────────────────────────────────────────────────────
const HOTSPOT_ORDER: HotspotId[] = ['phone', 'desk', 'tv', 'door', 'folder', 'map'];

R.office = () => {
  const app = ctx.app;
  const s = app.s!;
  if (s.phase === 'ending') { R.ending(); return; }
  if (s.phase === 'reelection') { R.reelection(); return; }
  if (roundComplete(s) && s.roundReport) { R.report(); return; }
  app.clearLayer();
  app.setScene('office');
  const player = app.candidateActor(40);
  app.enableWalking(player);
  app.renderHud([t('roundN', { n: s.round, total: totalRounds(s) })]);
  const items = s.agenda.filter((a) => !a.resolved);
  const byHs = new Map<HotspotId, AgendaItem[]>();
  for (const it of items) byHs.set(it.hotspot, [...(byHs.get(it.hotspot) ?? []), it]);
  app.setHotspots(HOTSPOT_ORDER.map((id) => {
    const list = byHs.get(id) ?? [];
    const it = list[0];
    return { id, label: t(`hs_${id}` as UIKey), badge: it ? (it.main ? t('mainDecision') : t('shortEvent')) : undefined, info: it ? undefined : t(`hsInfo_${id}` as UIKey), onUse: () => (it ? void openItem(it) : infoPanel(id)) };
  }));
  const list = h('div', { class: 'agenda-list' },
    ...items.map((it, i) => btn(h('span', { class: 'lbl' }, itemTitle(it), h('small', null, `${t(`hs_${it.hotspot}` as UIKey)} · ${it.main ? t('mainDecision') : t('shortEvent')}`)), () => void openItem(it), { cls: it.main ? 'primary' : '', key: String(i + 1) })),
    btn(t('closeRound'), () => endRound(), { cls: 'end', disabled: items.length > 0, key: items.length ? undefined : '1' }),
    items.length ? h('p', { class: 'fine' }, t('closeRoundFirst')) : null);
  app.panel('agenda side', h('h3', null, t('agenda')), list, h('p', { class: 'fine' }, t('officeHint')));
};

function itemTitle(it: AgendaItem): string {
  if (it.type === 'budget') return t('budgetTitle');
  if (it.type === 'bill') return t('billTitle');
  const e = EVENT_BY_ID[it.eventId!];
  const v = e.variants?.[ctx.app.s!.country];
  return tl(v?.title ?? e.title).replace(/\{\w+\}/g, '…');
}

async function openItem(it: AgendaItem) {
  const app = ctx.app;
  const s = app.s!;
  if (it.type === 'budget') { await budget(); }
  else if (it.type === 'bill') { await bill(); }
  else {
    app.clearLayer();
    const e = EVENT_BY_ID[it.eventId!];
    const visitor = e.speaker === 'advisor' ? null : app.castActor(e.speaker, 62, { flip: true });
    await eventDialog(it, visitor);
  }
  app.save('office');
  if (s.phase === 'ending' && !s.ending) s.ending = computeEnding(s, 'term', false);
  if (s.phase === 'ending') { app.save('ending'); R.ending(); return; }
  R.office();
}

// ── Presupuesto ──────────────────────────────────────────────────────────
function budget(): Promise<void> {
  const app = ctx.app;
  const s = app.s!;
  const plan: BudgetPlan = { tax: s.budget.tax, lines: { ...s.budget.lines } };
  const offers: Offers = {};
  for (const p of s.parties) offers[p.id] = [];
  return new Promise((resolve) => {
    const sums = h('div', { class: 'budget-sums' });
    const negoBox = h('div');
    let submit: HTMLButtonElement;
    const redraw = () => {
      const pv = budgetPreview(s, plan, offers);
      sums.replaceChildren(
        h('div', null, h('span', null, t('revenue')), h('b', null, num(pv.revenue, 1))),
        h('div', null, h('span', null, t('spending')), h('b', null, num(pv.spending, 1)), h('small', null, t('upkeepNote', { u: num(upkeep(s), 1) }))),
        h('div', { class: pv.balance >= 0 ? 'up' : 'down' }, h('span', null, t('balance')), h('b', null, signed(pv.balance, 1))));
      const nego = negotiation((o) => budgetPreview(s, plan, o).tally, offers, ['amend', 'invest', 'bribe'], () => { submit.disabled = nego.dataset.affordable !== '1'; });
      negoBox.replaceChildren(h('h3', null, t('forecast')), nego);
      if (submit) submit.disabled = nego.dataset.affordable !== '1';
    };
    const taxRow = h('div', { class: 'seg', role: 'group', 'aria-label': t('tax') });
    const drawTax = () => taxRow.replaceChildren(h('span', { class: 'nm' }, t('tax')), ...[0, 1, 2].map((v) => btn(t(`tax${v}` as UIKey), () => { plan.tax = v; drawTax(); redraw(); }, { cls: `small${plan.tax === v ? ' on' : ''}` })));
    const lines = h('div', { class: 'lines' });
    const drawLines = () => lines.replaceChildren(...(Object.keys(plan.lines) as (keyof BudgetPlan['lines'])[]).map((k) => h('div', { class: 'plan-row' },
      h('span', { class: 'nm' }, t(`line_${k}` as UIKey)),
      btn('−', () => { plan.lines[k] = Math.max(0, plan.lines[k] - 1); drawLines(); redraw(); }, { cls: 'small', disabled: plan.lines[k] <= 0, aria: `− ${t(`line_${k}` as UIKey)}` }),
      h('i', { class: 'meter', style: `--v:${(plan.lines[k] / 3) * 100}%` }),
      btn('+', () => { plan.lines[k] = Math.min(3, plan.lines[k] + 1); drawLines(); redraw(); }, { cls: 'small', disabled: plan.lines[k] >= 3, aria: `+ ${t(`line_${k}` as UIKey)}` }),
      h('small', null, `${num(plan.lines[k] * LINE_COST, 1)}`))));
    submit = btn(t('submitBudget'), async () => {
      p.remove();
      const r = submitBudget(s, plan, offers);
      logEvent('decision', { id: 'budget', passed: r.passed, plan, round: s.round });
      if (r.passed) sfx.stamp(); else sfx.bad();
      app.renderHud();
      await app.say('economist', tl(r.text), { extra: app.deltaList(r.deltas), kicker: t('budgetTitle') });
      resolve();
    }, { cls: 'primary', key: '1' });
    drawTax(); drawLines(); redraw();
    const p = app.panel('budget modal scroll wide', h('h2', null, t('budgetTitle')), h('p', { class: 'hint' }, t('budgetHint')), taxRow, lines, sums, negoBox, submit);
  });
}

// ── Leyes ────────────────────────────────────────────────────────────────
function policyCard(p: Policy, onPick: () => void, key: string): HTMLElement {
  const s = ctx.app.s!;
  const pr = p.axis ? s.promises.find((x) => x.axis === p.axis) : undefined;
  const tags: string[] = [];
  if (pr && pr.stance === p.stance) tags.push(t('keepsPromise'));
  else if (pr && p.stance !== 0 && pr.stance !== p.stance) tags.push(t('breaksPromise'));
  if (p.authoritarian) tags.push(t('authoritarianTag'));
  return h('article', { class: `card policy${p.authoritarian ? ' shady' : ''}` },
    h('h3', null, tl(p.name)),
    h('p', { class: 'small' }, tl(p.desc)),
    tags.length ? h('p', { class: 'tags' }, tags.map((x) => h('em', null, x))) : null,
    h('dl', { class: 'facts' },
      h('dt', null, t('upfront')), h('dd', null, num(p.upfront)),
      h('dt', null, t('upkeep')), h('dd', null, p.upkeep < 0 ? `+${num(-p.upkeep, 1)} ${t('revenue').toLowerCase()}` : num(p.upkeep, 1)),
      h('dt', null, t('delay')), h('dd', null, t('rounds', { n: p.delay })),
      h('dt', null, t('beneficiaries')), h('dd', null, p.beneficiaries.map((g) => t(`group_${g}` as UIKey)).join(', ') || '—'),
      h('dt', null, t('harmed')), h('dd', null, p.harmed.map((g) => t(`group_${g}` as UIKey)).join(', ') || '—'),
      p.risk ? h('dt', null, t('risk')) : null, p.risk ? h('dd', null, tl(p.risk.text)) : null),
    btn(t('confirm'), onPick, { cls: 'primary small', key }));
}

function bill(): Promise<void> {
  const app = ctx.app;
  const s = app.s!;
  const c = country(s.country);
  return new Promise((resolve) => {
    const pols = availablePolicies(s);
    const chooser = () => {
      const p = app.panel('bill modal scroll wide', h('h2', null, t('billTitle')), h('p', { class: 'hint' }, t('billHint')),
        pols.length ? h('div', { class: 'cards policies' }, pols.slice(0, 9).map((pol, i) => policyCard(pol, () => { p.remove(); negotiate(pol); }, String(i + 1)))) : h('p', null, t('noBills')),
        btn(t('skipBill'), () => { p.remove(); const it = s.agenda.find((a) => a.type === 'bill' && !a.resolved); if (it) it.resolved = true; logEvent('decision', { id: 'bill_skip' }); resolve(); }, { cls: 'ghost' }));
    };
    const negotiate = (pol: Policy) => {
      const offers: Offers = {};
      for (const ps of s.parties) offers[ps.id] = [];
      let vote: HTMLButtonElement;
      const nego = negotiation((o) => billTally(s, pol.id, o), offers, ['amend', 'invest', 'bribe'], () => { vote.disabled = nego.dataset.affordable !== '1'; });
      const go = async (mode: 'vote' | 'fast') => {
        p.remove();
        const r = submitBill(s, pol.id, offers, mode);
        logEvent('decision', { id: pol.id, mode, passed: r.passed, round: s.round });
        if (r.passed) sfx.stamp(); else sfx.bad();
        app.renderHud();
        await app.say('economist', tl(r.text), { extra: app.deltaList(r.deltas), kicker: tl(pol.name) });
        resolve();
      };
      vote = btn(t('voteBill'), () => void go('vote'), { cls: 'primary', key: '1' });
      vote.disabled = nego.dataset.affordable !== '1';
      const p = app.panel('bill modal scroll wide', h('h2', null, tl(pol.name)), h('p', { class: 'small' }, tl(pol.desc)), nego,
        h('div', { class: 'row' }, vote,
          pol.fastTrack ? btn(h('span', { class: 'lbl' }, t('fastTrack', { name: tl(c.titles.fastTrack) }), h('small', null, t('fastTrackNote'))), () => void go('fast'), { cls: 'shady', key: '2' }) : null,
          btn(t('chooseOther'), () => { p.remove(); chooser(); }, { cls: 'ghost', key: '3' })));
    };
    chooser();
  });
}

// ── Cierre de ronda e informe ────────────────────────────────────────────
function endRound() {
  const app = ctx.app;
  const s = app.s!;
  if (!roundComplete(s)) { app.toast(t('closeRoundFirst')); return; }
  closeRound(s);
  logState('round_end', s);
  app.save('report');
  R.report();
}

R.report = () => {
  const app = ctx.app;
  const s = app.s!;
  const r = s.roundReport!;
  app.clearLayer();
  app.setScene('office');
  app.renderHud([t('roundN', { n: s.round, total: totalRounds(s) })]);
  const next = UNLOCKS[s.round + 1] ?? [];
  app.panel('report modal scroll',
    h('div', { class: 'kicker' }, t('reportTitle', { n: r.round })),
    h('h2', { class: 'headline' }, tl(r.headline)),
    h('h3', null, t('causes')), app.deltaList(r.causes, 6),
    h('h3', null, t('changes')), app.deltaList(r.changes, 8),
    r.notes.length ? h('div', null, h('h3', null, t('notes')), h('ul', null, r.notes.map((n) => h('li', null, tl(n))))) : null,
    next.length ? h('p', { class: 'unlock' }, t('unlockedNew', { what: next.map((x) => t(`sys_${x}` as UIKey)).join(', ') })) : null,
    btn(t('nextRound'), async () => {
      if (s.round % TUNING.adBreakEveryRounds === 0) await app.adBreak();
      startRound(s);
      app.snapshotStats();
      logState('round_start', s);
      app.save(s.phase === 'reelection' ? 'reelection' : 'office');
      if (s.phase === 'reelection') R.reelection(); else R.office();
    }, { cls: 'primary', key: '1' }));
};

// ── Reelección ───────────────────────────────────────────────────────────
R.reelection = () => {
  const app = ctx.app;
  const s = app.s!;
  if (!s.flags.includes('reelection_started')) { startReelection(s); app.save('reelection'); }
  if (s.debate?.kind === 'reelection' && debateOver(s)) { finishReelection(); return; }
  app.clearLayer();
  app.setScene('hq', { night: true });
  const player = app.candidateActor(36);
  app.castActor('advisor', 50, { flip: true });
  app.enableWalking(player);
  app.renderHud([t('reelectionTitle'), ' · ', t('actionsLeft', { n: s.actionsLeft })]);
  const acts: CampaignAction[] = ['rally', 'canvass', 'ads'];
  const act = async (a: CampaignAction) => {
    let group: GroupId | undefined;
    if (a !== 'ads') {
      const gi = await app.dialog({ speaker: 'advisor', text: t('chooseGroup'), choices: [...GROUPS.map((g) => ({ label: t(`group_${g}` as UIKey), sub: `${t('satisfaction')} ${num(Math.round(s.groups[g].sat))}` })), { label: t('cancel'), cls: 'ghost' }] });
      if (gi >= GROUPS.length) return;
      group = GROUPS[gi];
    }
    const out = doAction(s, a, group);
    app.save('reelection');
    app.renderHud();
    await app.say('advisor', tl(out.text), { extra: app.deltaList(out.deltas) });
    R.reelection();
  };
  app.setHotspots([
    { id: 'map', label: t('hs_map'), info: `${t('act_rally')} / ${t('act_canvass')}`, onUse: () => (s.actionsLeft > 0 ? void act('rally') : app.toast(t('noActions'))) },
    { id: 'tv', label: t('hs_tv'), info: s.actionsLeft > 0 ? t('act_ads') : t('goDebate'), onUse: () => (s.actionsLeft > 0 ? void act('ads') : void debate()) },
    { id: 'folder', label: t('hs_folder'), info: t('promisesTitle'), onUse: () => infoPanel('folder') },
  ]);
  const debate = async () => { await runDebate('reelection'); finishReelection(); };
  app.panel('agenda side', h('h3', null, t('reelectionTitle')), h('p', { class: 'small' }, t('reelectionHint')),
    h('div', { class: 'agenda-list' },
      ...acts.map((a, i) => btn(h('span', { class: 'lbl' }, t(`act_${a}` as UIKey), h('small', null, t(`act_${a}_d` as UIKey))), () => void act(a), { disabled: s.actionsLeft <= 0 || !canAfford(s, a), key: String(i + 1) })),
      btn(t('goDebate'), () => void debate(), { cls: 'primary', key: '4' })));
};

function finishReelection() {
  const app = ctx.app;
  const s = app.s!;
  const res = finalElection(s);
  logEvent('election', { kind: 'reelection', won: res.executive.won, share: res.playerShare });
  app.save('ending');
  gameplayStop();
  R.electionNight(res);
}
