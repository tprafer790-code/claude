// Piezas compartidas: diálogo de evento con costes, riesgo y consecuencias.
import { sfx } from '../../audio/audio';
import { eventView, resolveEvent } from '../../core/events';
import type { AgendaItem, Choice as EvChoice } from '../../core/types';
import { EVENT_BY_ID } from '../../data/events';
import { num, t, tl, type UIKey } from '../../i18n';
import { logEvent } from '../../telemetry/playtestLog';
import type { Actor } from '../app';
import { h } from '../dom';
import { ctx } from '../router';

export function costText(c: EvChoice['cost']): string {
  if (!c) return '';
  const parts: string[] = [];
  if (c.treasury) parts.push(`${num(c.treasury)} ${t('stat_treasury').toLowerCase()}`);
  if (c.privateFunds) parts.push(`${num(c.privateFunds)} ${t('stat_privateFunds').toLowerCase()}`);
  if (c.funds) parts.push(`${num(c.funds)} ${t('stat_funds').toLowerCase()}`);
  return parts.length ? t('cost', { c: parts.join(', ') }) : '';
}

/** Muestra un evento, resuelve la elección y enseña las consecuencias. Devuelve los especiales. */
export async function eventDialog(item: AgendaItem, actor?: Actor | null): Promise<string[]> {
  const app = ctx.app;
  const s = app.s!;
  const e = EVENT_BY_ID[item.eventId!];
  const v = eventView(s, e.id, item);
  const kicker = [item.main ? t('mainDecision') : t('shortEvent'), v.chain ? t('chainStage', { n: v.chain.stage, total: v.chain.of }) : ''].filter(Boolean).join(' · ');
  if (item.main) sfx.phone();
  const idx = await app.dialog({
    speaker: v.speaker, actor, kicker, title: tl(v.title), text: tl(v.text), detail: v.detail ? tl(v.detail) : undefined,
    choices: v.choices.map((c) => ({ label: tl(c.label), sub: [costText(c.cost), !c.available ? t('unavailable') : ''].filter(Boolean).join(' · ') || undefined, disabled: !c.available, cls: c.tags?.includes('corrupt') ? 'shady' : c.tags?.includes('authoritarian') ? 'shady' : '' })),
  });
  const ch = v.choices[idx];
  const r = resolveEvent(s, item, ch.id);
  logEvent('decision', { id: e.id, choice: ch.id, round: s.round });
  app.renderHud();
  const sum = r.deltas.reduce((a, d) => a + (d.stat && ['debt', 'suspicion', 'evidence', 'unrest'].includes(d.stat) ? -d.delta : d.delta), 0);
  if (sum > 0) sfx.good(); else if (sum < -2) sfx.bad();
  actor?.mood(r.mood ?? (sum >= 0 ? 'happy' : 'angry'));
  const extra = h('div', null,
    r.riskText ? h('p', { class: 'risk' }, h('b', null, `${t('riskHappened')}: `), tl(r.riskText)) : null,
    ...r.extra.map((x) => h('p', { class: 'note' }, tl(x))),
    h('h4', null, t('consequences')),
    app.deltaList(r.deltas));
  await app.say(v.speaker, tl(r.text), { extra, kicker: tl(v.title) });
  actor?.mood('idle');
  return r.specials;
}

export function groupName(g: string): string { return t(`group_${g}` as UIKey); }
