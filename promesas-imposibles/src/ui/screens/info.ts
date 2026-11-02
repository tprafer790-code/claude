// Paneles de consulta del despacho: promesas, consecuencias pendientes, grupos, entorno, parlamento.
import { promiseText } from '../../core/events';
import { partyDefs } from '../../core/parliament';
import type { HotspotId, StatId } from '../../core/types';
import { CAST, CAST_ORDER } from '../../data/cast';
import { country } from '../../data/countries';
import { GROUPS } from '../../data/tuning';
import { num, t, tl, type UIKey } from '../../i18n';
import { btn, h, svgEl } from '../dom';
import { statIcon } from '../icons';
import { ctx } from '../router';
import { folderLines } from './housing';

export function infoPanel(kind: HotspotId): void {
  const app = ctx.app;
  const s = app.s!;
  const c = country(s.country);
  const body: Node[] = [];
  let title = '';
  if (kind === 'folder') {
    title = t('promisesTitle');
    const fh = folderLines();
    if (fh) body.push(fh);
    body.push(h('ul', { class: 'promises' }, s.promises.map((p) => h('li', { class: `pr-${p.status}` }, h('b', null, t(`promise_${p.status}` as UIKey)), ' ', tl(promiseText(p))))));
    body.push(h('h3', null, t('deferredTitle')));
    body.push(s.deferred.length ? h('ul', { class: 'deferred' }, s.deferred.slice().sort((a, b) => a.round - b.round).map((d) => h('li', null, h('b', null, d.round - s.round <= 1 ? t('deferredNext') : t('deferredIn', { n: d.round - s.round })), ' · ', tl(d.why)))) : h('p', { class: 'muted' }, t('noDeferred')));
    body.push(h('h3', null, t('favorsTitle')));
    const open = s.favors.filter((f) => f.status === 'open');
    body.push(open.length ? h('ul', null, open.map((f) => h('li', null, t('favorDue', { who: c.castNames[f.creditor], r: f.dueRound })))) : h('p', { class: 'muted' }, t('noFavors')));
  } else if (kind === 'map') {
    title = t('groupsTitle');
    body.push(h('p', { class: 'small muted' }, t('groupsNote')));
    body.push(h('ul', { class: 'groups' }, GROUPS.map((g) => h('li', null, h('span', { class: 'nm' }, t(`group_${g}` as UIKey)),
      h('span', { class: 'mini' }, t('satisfaction')), h('i', { class: 'meter', style: `--v:${s.groups[g].sat}%` }), h('b', null, num(Math.round(s.groups[g].sat))),
      h('span', { class: 'mini' }, t('mobilisation')), h('i', { class: 'meter alt', style: `--v:${s.groups[g].mob * 100}%` }), h('b', null, `${num(Math.round(s.groups[g].mob * 100))} %`)))));
  } else if (kind === 'phone') {
    title = t('castTitle');
    body.push(h('ul', { class: 'cast' }, CAST_ORDER.filter((id) => !id.startsWith('citizen')).map((id) => {
      const m = s.cast[id].memory;
      return h('li', null, h('b', null, c.castNames[id]), h('span', { class: 'muted' }, ` · ${tl(CAST[id].role)}`), h('i', { class: 'meter', style: `--v:${s.cast[id].trust}%` }), h('small', null, tl(CAST[id].wants)), m.length ? h('small', { class: 'mem' }, t('remembers', { m: m.slice(-2).join(', ') })) : null);
    })));
  } else if (kind === 'tv') {
    title = t('newsTitle');
    const items = s.log.filter((l) => l.weight > 0).slice(-6).reverse();
    body.push(h('ul', { class: 'news' }, items.map((l) => h('li', null, h('b', null, `R${l.round} `), tl(l.text)))));
    if (s.roundReport) body.push(h('p', { class: 'headline' }, tl(s.roundReport.headline)));
  } else if (kind === 'door') {
    title = t('parliamentTitle');
    const defs = partyDefs(s);
    body.push(h('table', { class: 'parties' }, h('tbody', null, s.parties.map((ps) => {
      const p = defs.find((d) => d.id === ps.id)!;
      return h('tr', null, h('td', null, h('i', { class: 'sw', style: `background:${p.color}` }), `${p.short} · ${tl(p.name)}`), h('td', null, c.chambers.map((ch) => `${ps.seats[ch.id] ?? 0}`).join(' / ')), h('td', null, p.isPlayer ? t('yourParty') : ps.inGovernment ? t('inGov') : `${t('loyalty')} ${num(Math.round(ps.loyalty))}`));
    }))));
    body.push(h('ul', { class: 'small' }, c.rules.map((r) => h('li', null, tl(r)))));
  } else {
    title = t('detailTitle');
    const keys: StatId[] = ['treasury', 'debt', 'jobs', 'housing', 'services', 'security', 'environment', 'diplomacy', 'credibility', 'unrest', ...(s.unlocked.includes('corruption') || s.stats.suspicion > 0 ? ['suspicion', 'evidence', 'privateFunds'] as StatId[] : [])];
    body.push(h('ul', { class: 'stats-grid' }, keys.map((k) => h('li', null, svgEl(statIcon(k), 'ic'), h('span', null, t(`stat_${k}` as UIKey)), h('b', null, num(Math.round(s.stats[k])))))));
  }
  const p = app.panel('info modal scroll', h('h2', null, title), ...body, btn(t('close'), () => p.remove(), { cls: 'primary', key: '1' }));
}
