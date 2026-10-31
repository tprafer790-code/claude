// Herramientas de desarrollo. Solo se cargan con `import.meta.env.DEV` (excluidas de producción).
// Atajo: tecla º / ` o el botón «DEV». Permiten saltar fases, lanzar eventos, editar indicadores,
// cambiar de país, ver efectos pendientes, probar finales y consultar semilla y decisiones.
import { startCampaign } from '../core/campaign';
import { runElection } from '../core/election';
import { computeEnding } from '../core/endings';
import { makeItem } from '../core/events';
import { closeRound, concludeFormation, startFormation, startRound } from '../core/government';
import { createState, recompute } from '../core/state';
import type { CountryId, StatId } from '../core/types';
import { PROGRAMME } from '../data/campaign';
import { ENDINGS } from '../data/endings';
import { EVENTS } from '../data/events';
import { forceNoStorage } from '../save/storage';
import type { App } from '../ui/app';
import { btn, h } from '../ui/dom';
import { R } from '../ui/router';

export function installDevtools(app: App): void {
  const toggle = h('button', { class: 'dev-toggle', type: 'button' }, 'DEV');
  document.body.append(toggle);
  const panel = h('div', { class: 'dev-panel hidden scroll' });
  document.body.append(panel);
  const open = () => { panel.classList.toggle('hidden'); if (!panel.classList.contains('hidden')) draw(); };
  toggle.addEventListener('click', open);
  window.addEventListener('keydown', (e) => { if (e.key === '`' || e.key === 'º') open(); });
  (window as unknown as { __app: App }).__app = app;

  const ensure = (country: CountryId = app.s?.country ?? 'es') => {
    if (!app.s) {
      app.s = createState({ seed: 12345, country, candidate: 'hippie', name: 'Dev', orientation: 'left', lang: app.lang });
      for (const q of PROGRAMME) app.s.promises.push({ axis: q.axis, stance: -1, status: 'pending', round: 0 });
    }
    return app.s;
  };

  function draw() {
    const s = app.s;
    const statInputs = s ? (Object.keys(s.stats) as StatId[]).map((k) => {
      const i = h('input', { type: 'number', value: Math.round(s.stats[k]), style: 'width:4.5em' }) as HTMLInputElement;
      i.addEventListener('change', () => { s.stats[k] = Number(i.value); recompute(s); app.renderHud(); });
      return h('label', { class: 'dev-stat' }, k, i);
    }) : [];
    const evSel = h('select', null, EVENTS.map((e) => h('option', { value: e.id }, `${e.id} (${e.kind})`))) as HTMLSelectElement;
    const endSel = h('select', null, ENDINGS.map((e) => h('option', { value: e.id }, e.id))) as HTMLSelectElement;
    panel.replaceChildren(
      h('h3', null, 'Dev'),
      h('p', null, s ? `seed ${s.seed} · rng ${s.rng} · ${s.country} · ${s.phase} · ronda ${s.round} · día ${s.campaignDay}` : 'sin partida'),
      h('div', { class: 'row' },
        ...(['es', 'us', 'br'] as CountryId[]).map((c) => btn(`Nueva ${c}`, () => { app.s = null; ensure(c); startCampaign(app.s!); app.save('campaign'); R.campaign(); draw(); }, { cls: 'small' }))),
      h('div', { class: 'row' },
        btn('→ Campaña día 4', () => { const st = ensure(); if (st.phase === 'setup') startCampaign(st); st.campaignDay = 4; st.flags.push('plan_done'); st.eventHistory.tycoon_offer = { count: 1, last: 0 }; R.campaign(); }, { cls: 'small' }),
        btn('→ Debate', () => { const st = ensure(); if (st.phase === 'setup') startCampaign(st); st.campaignDay = 5; st.flags.push('plan_done', 'interview_done'); st.eventHistory.tycoon_offer = { count: 1, last: 0 }; R.campaign(); }, { cls: 'small' }),
        btn('→ Elección', () => { const st = ensure(); if (st.phase === 'setup') startCampaign(st); R.election(); }, { cls: 'small' }),
        btn('→ Gobierno', () => { const st = ensure(); if (st.phase === 'setup') startCampaign(st); const r = runElection(st, 'campaign'); startFormation(st, r); const off: Record<string, never[]> = {}; concludeFormation(st, off); if (st.phase !== 'government') { st.phase = 'government'; st.round = 0; startRound(st); } R.office(); }, { cls: 'small' }),
        btn('Ronda +1', () => { const st = ensure(); if (st.phase !== 'government') return; st.agenda.forEach((a) => (a.resolved = true)); closeRound(st); startRound(st); R.office(); draw(); }, { cls: 'small' }),
        btn('→ Reelección', () => { const st = ensure(); st.phase = 'reelection'; R.reelection(); }, { cls: 'small' })),
      h('div', { class: 'row' }, evSel, btn('Lanzar evento', () => { const st = ensure(); const e = EVENTS.find((x) => x.id === evSel.value)!; if (st.phase !== 'government') return; st.agenda.push(makeItem(st, e, e.kind === 'main')); R.office(); }, { cls: 'small' })),
      h('div', { class: 'row' }, endSel, btn('Probar final', () => { const st = ensure(); const def = ENDINGS.find((x) => x.id === endSel.value)!; const r = computeEnding(st, 'term', true); st.ending = { ...r, id: def.id, title: def.title, text: def.text }; st.phase = 'ending'; R.ending(); }, { cls: 'small' })),
      h('div', { class: 'row' }, btn('Sin almacenamiento', () => forceNoStorage(), { cls: 'small' }), btn('Cerrar', open, { cls: 'small' })),
      h('details', { open: true }, h('summary', null, 'Indicadores'), h('div', { class: 'dev-stats' }, statInputs)),
      h('details', null, h('summary', null, `Efectos pendientes (${s?.deferred.length ?? 0}) · programados (${s?.scheduled.length ?? 0})`),
        h('pre', null, s ? JSON.stringify({ deferred: s.deferred.map((d) => ({ round: d.round, source: d.source, effects: d.effects })), scheduled: s.scheduled, favors: s.favors }, null, 1) : '')),
      h('details', null, h('summary', null, `Decisiones (${s?.decisions.length ?? 0})`), h('pre', null, s ? s.decisions.map((d) => `R${d.round} ${d.id} → ${d.choice} (${Math.round(d.impact)})`).join('\n') : '')),
    );
  }
}
