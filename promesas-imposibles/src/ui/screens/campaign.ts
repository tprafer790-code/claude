// Campaña: sede con objetos interactivos, acciones limitadas, calle, voluntarios, entrevista.
import { sfx } from '../../audio/audio';
import { actionsForDay, applyPlan, beatPending, canAfford, currentBeat, doAction, endDay, interviewQuestion, nextStreetTalk, PLAN_POINTS, resolveInterview, resolveStreet, type CampaignAction } from '../../core/campaign';
import { runElection } from '../../core/election';
import { computeEnding } from '../../core/endings';
import { startFormation } from '../../core/government';
import type { AgendaItem, GroupId, Outcome } from '../../core/types';
import { INTERVIEW_ANSWERS } from '../../data/campaign';
import { GROUPS, TUNING } from '../../data/tuning';
import { num, t, tl, type UIKey } from '../../i18n';
import { logEvent, logState } from '../../telemetry/playtestLog';
import type { Actor } from '../app';
import { btn, h } from '../dom';
import { ctx, R } from '../router';
import { runDebate } from './debate';
import { infoPanel } from './info';
import { costText, eventDialog } from './shared';

const ACTIONS: CampaignAction[] = ['street', 'rally', 'canvass', 'ads', 'fundraise', 'darkads'];

R.campaign = () => {
  const app = ctx.app;
  const s = app.s!;
  app.clearLayer();
  app.setScene('hq');
  const player = app.candidateActor(30);
  app.castActor('advisor', 50, { flip: true });
  app.enableWalking(player);
  const beat = currentBeat(s);
  const pending = beatPending(s);
  const left = s.actionsLeft;
  const hudTag = [t('campaignDay', { d: s.campaignDay, total: TUNING.campaignDays }), ' · ', t('actionsLeft', { n: left })];
  app.renderHud(hudTag);
  const can = (a: CampaignAction) => left > 0 && canAfford(s, a) && (a !== 'darkads' || s.stats.privateFunds >= 3);
  const beatLabel = pending && beat !== 'none' && beat !== 'final' ? t(`beat_${beat}` as UIKey) : undefined;
  app.setHotspots([
    { id: 'door', label: t('hs_door'), badge: pending && beat === 'tycoon' ? beatLabel : undefined, info: t('act_street'), onUse: () => (pending && beat === 'tycoon' ? tycoon() : can('street') ? street() : app.toast(t('noActions'))) },
    { id: 'map', label: t('hs_map'), badge: pending && beat === 'plan' ? beatLabel : undefined, info: `${t('act_rally')} / ${t('act_canvass')}`, onUse: () => (pending && beat === 'plan' ? plan() : pickAction(['rally', 'canvass'])) },
    { id: 'tv', label: t('hs_tv'), badge: pending && (beat === 'interview' || beat === 'debate') ? beatLabel : undefined, info: t('act_ads'), onUse: () => (pending && beat === 'interview' ? interview() : pending && beat === 'debate' ? debate() : pickAction(['ads'])) },
    { id: 'phone', label: t('hs_phone'), info: t('act_fundraise'), onUse: () => pickAction(['fundraise', 'darkads']) },
    { id: 'folder', label: t('hs_folder'), info: t('promisesTitle'), onUse: () => infoPanel('folder') },
    { id: 'desk', label: t('hs_desk'), info: s.campaignDay >= TUNING.campaignDays ? t('toElection') : t('endDay'), onUse: () => finishDay() },
  ]);
  // Agenda accesible (misma funcionalidad que los objetos del escenario)
  const list = h('div', { class: 'agenda-list' },
    pending && beatLabel ? btn(beatLabel, () => (beat === 'plan' ? plan() : beat === 'tycoon' ? tycoon() : beat === 'interview' ? interview() : debate()), { cls: 'primary beat', key: '1' }) : null,
    ...ACTIONS.filter((a) => a !== 'darkads' || s.stats.privateFunds >= 3).map((a, i) => btn(h('span', { class: 'lbl' }, t(`act_${a}` as UIKey), h('small', null, t(`act_${a}_d` as UIKey))), () => (a === 'street' ? street() : pickAction([a])), { disabled: !can(a), key: String(i + (pending && beatLabel ? 2 : 1)), cls: a === 'darkads' ? 'shady' : '' })),
    btn(s.campaignDay >= TUNING.campaignDays ? t('toElection') : t('endDay'), () => finishDay(), { cls: 'end', disabled: pending }));
  app.panel('agenda side', h('h3', null, t('agenda')), list, h('p', { class: 'fine' }, t('walkHint')));
};

async function show(out: Outcome, speaker: Parameters<typeof ctx.app.say>[0] = 'advisor', actor?: Actor | null) {
  const app = ctx.app;
  app.renderHud();
  await app.say(speaker, tl(out.text), { extra: app.deltaList(out.deltas), actor });
}

async function pickAction(kinds: CampaignAction[]) {
  const app = ctx.app;
  const s = app.s!;
  const avail = kinds.filter((a) => a !== 'darkads' || s.stats.privateFunds >= 3);
  if (s.actionsLeft <= 0) { app.toast(t('noActions')); return; }
  let a = avail[0];
  if (avail.length > 1) {
    const idx = await app.dialog({ speaker: 'advisor', text: avail.map((x) => t(`act_${x}` as UIKey)).join(' · '), choices: [...avail.map((x) => ({ label: t(`act_${x}` as UIKey), sub: t(`act_${x}_d` as UIKey), disabled: !canAfford(s, x) })), { label: t('cancel'), cls: 'ghost' }] });
    if (idx >= avail.length) return;
    a = avail[idx];
  }
  if (!canAfford(s, a)) { app.toast(t('noActions')); return; }
  let group: GroupId | undefined;
  if (a === 'rally' || a === 'canvass') {
    const gi = await app.dialog({ speaker: 'advisor', text: t('chooseGroup'), choices: [...GROUPS.map((g) => ({ label: t(`group_${g}` as UIKey), sub: `${t('satisfaction')} ${num(Math.round(s.groups[g].sat))} · ${t('mobilisation')} ${num(Math.round(s.groups[g].mob * 100))} %` })), { label: t('cancel'), cls: 'ghost' }] });
    if (gi >= GROUPS.length) return;
    group = GROUPS[gi];
  }
  if (a === 'rally') { app.setScene('street', { crowd: 12 }); const p = app.candidateActor(44, { size: 15 }); p.mood('happy'); sfx.cheer(); }
  const out = doAction(s, a, group);
  logEvent('decision', { id: `act_${a}`, group });
  app.save('campaign');
  await show(out);
  R.campaign();
}

async function street() {
  const app = ctx.app;
  const s = app.s!;
  if (s.actionsLeft <= 0) { app.toast(t('noActions')); return; }
  const talk = nextStreetTalk(s);
  app.clearLayer();
  app.setScene('street');
  const p = app.candidateActor(18);
  const c = app.castActor(talk.speaker, 70, { flip: true });
  app.enableWalking(p);
  await p.walkTo(50, app.reduced);
  const idx = await app.dialog({ speaker: talk.speaker, actor: c, text: tl(talk.line), kicker: t(`group_${talk.group}` as UIKey), choices: talk.options.map((o) => ({ label: tl(o.label) })) });
  const out = resolveStreet(s, talk.id, idx);
  const good = out.deltas.reduce((a, d) => a + d.delta, 0) >= 0;
  c.mood(good ? 'happy' : 'angry');
  logEvent('decision', { id: talk.id, choice: idx });
  app.save('campaign');
  await show(out, talk.speaker, null);
  R.campaign();
}

async function plan() {
  const app = ctx.app;
  const s = app.s!;
  const alloc: Partial<Record<GroupId, number>> = {};
  const total = () => Object.values(alloc).reduce((a, b) => a + (b ?? 0), 0);
  await new Promise<void>((resolve) => {
    const leftEl = h('b', null, '');
    const rows = h('div', { class: 'plan-rows' });
    const draw = () => {
      rows.replaceChildren(...GROUPS.map((g) => h('div', { class: 'plan-row' },
        h('span', { class: 'nm' }, t(`group_${g}` as UIKey)),
        h('i', { class: 'meter', style: `--v:${Math.round(s.groups[g].mob * 100)}%` }),
        btn('−', () => { alloc[g] = Math.max(0, (alloc[g] ?? 0) - 1); draw(); }, { cls: 'small', disabled: !alloc[g], aria: `− ${t(`group_${g}` as UIKey)}` }),
        h('b', { class: 'n' }, String(alloc[g] ?? 0)),
        btn('+', () => { alloc[g] = (alloc[g] ?? 0) + 1; draw(); }, { cls: 'small', disabled: total() >= PLAN_POINTS, aria: `+ ${t(`group_${g}` as UIKey)}` }))));
      leftEl.textContent = t('planLeft', { n: PLAN_POINTS - total() });
      ok.disabled = total() === 0;
    };
    const ok = btn(t('confirm'), () => { p.remove(); resolve(); }, { cls: 'primary' });
    const p = app.panel('plan modal scroll', h('h2', null, t('planTitle')), h('p', { class: 'hint' }, t('planHint', { n: PLAN_POINTS })), rows, h('p', null, leftEl), ok);
    draw();
  });
  const out = applyPlan(s, alloc);
  logEvent('decision', { id: 'plan', alloc });
  app.save('campaign');
  await show(out);
  R.campaign();
}

async function tycoon() {
  const app = ctx.app;
  app.clearLayer();
  app.setScene('hq');
  app.candidateActor(60, { flip: true });
  const ty = app.castActor('tycoon', 96, { flip: true });
  sfx.stamp();
  await ty.walkTo(80, app.reduced);
  const item: AgendaItem = { uid: 'tycoon', type: 'event', eventId: 'tycoon_offer', hotspot: 'door', resolved: false, main: true };
  await eventDialog(item, ty);
  app.save('campaign');
  R.campaign();
}

async function interview() {
  const app = ctx.app;
  const s = app.s!;
  app.clearLayer();
  app.setScene('studio');
  const p = app.candidateActor(20);
  const j = app.castActor('journalist', 66, { flip: true });
  const q = interviewQuestion(s);
  const idx = await app.dialog({ speaker: 'journalist', actor: j, title: t('interviewTitle'), text: tl(q.q), choices: INTERVIEW_ANSWERS.map((a) => ({ label: tl(a.label) })) });
  const ans = INTERVIEW_ANSWERS[idx];
  const out = resolveInterview(s, ans.id);
  p.mood(ans.id === 'honest' ? 'idle' : ans.id === 'lie' ? 'nervous' : 'happy');
  logEvent('decision', { id: 'interview', choice: ans.id });
  app.save('campaign');
  await show(out, 'journalist', j);
  R.campaign();
}

async function debate() {
  await runDebate('campaign');
  R.campaign();
}

async function finishDay() {
  const app = ctx.app;
  const s = app.s!;
  if (beatPending(s)) { app.toast(t('beatFirst', { beat: t(`beat_${currentBeat(s)}` as UIKey) })); return; }
  const election = endDay(s);
  logState('day_end', s);
  if (election) { R.election(); return; }
  s.actionsLeft = Math.min(s.actionsLeft, actionsForDay(s));
  app.save('campaign');
  app.toast(t('campaignDay', { d: s.campaignDay, total: TUNING.campaignDays }));
  R.campaign();
}

/** Noche electoral de la campaña: el resultado se fija antes de mostrarse (resistente a recargas). */
R.election = () => {
  const app = ctx.app;
  const s = app.s!;
  const res = runElection(s, 'campaign');
  s.flags.push('election_done');
  if (res.executive.won) startFormation(s, res);
  else { s.ending = computeEnding(s, 'campaign', false); s.phase = 'ending'; }
  logEvent('election', { won: res.executive.won, share: res.playerShare, factors: res.factors.map((f) => [f.key, f.value]) });
  app.save(res.executive.won ? 'formation' : 'ending');
  R.electionNight(res);
};

export { costText };
