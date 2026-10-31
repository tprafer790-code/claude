// Noche electoral: escrutinio animado, escaños en el hemiciclo y explicación de factores.
import { sfx } from '../../audio/audio';
import { electionParties } from '../../core/election';
import type { ElectionResult } from '../../core/types';
import { country } from '../../data/countries';
import { num, signed, t, tl } from '../../i18n';
import { btn, h } from '../dom';
import { ctx, R } from '../router';

R.electionNight = (res: ElectionResult) => {
  const app = ctx.app;
  const s = app.s!;
  const c = country(s.country);
  const parties = electionParties(s).sort((a, b) => a.lean - b.lean);
  const main = res.seats[c.mainChamber] ?? {};
  app.clearLayer();
  app.setScene('parliament', { seats: parties.map((p) => [p.color, main[p.id] ?? 0] as [string, number]).filter(([, n]) => n > 0) });
  app.renderHud();
  const won = res.executive.won;
  const shares = Object.entries(res.shares).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxShare = Math.max(...shares.map(([, v]) => v), 1);
  const bars = h('ul', { class: 'bars' }, shares.map(([id, v]) => {
    const p = parties.find((x) => x.id === id);
    return h('li', { class: p?.isPlayer ? 'me' : '' },
      h('span', { class: 'nm' }, p ? `${p.short} · ${tl(p.name)}` : id),
      h('i', { class: 'bar', style: `--v:${(v / maxShare) * 100}%;--c:${p?.color ?? '#888'}` }),
      h('b', null, `${num(v, 1)} %`),
      main[id] !== undefined ? h('small', null, `${main[id]} ${t('seats').toLowerCase()}`) : null);
  }));
  const extra: Node[] = [];
  if (res.executive.ev) {
    const ev = res.executive.ev;
    extra.push(h('p', { class: 'note' }, `${t('ev')}: ${Object.entries(ev).map(([k, v]) => `${k === 'player' ? s.name : k}: ${v}`).join(' · ')}`));
  }
  if (res.executive.secondRound) {
    extra.push(h('p', { class: 'note' }, `${t('secondRound')}: ${Object.entries(res.executive.secondRound).map(([k, v]) => `${parties.find((p) => p.id === k)?.short ?? k} ${num(v, 1)} %`).join(' · ')}`));
  }
  const factors = h('ul', { class: 'factors' }, res.factors.filter((f) => Math.abs(f.value) >= 0.1).map((f) => h('li', { class: f.value >= 0 ? 'up' : 'down' }, h('span', null, tl(f.label)), h('b', null, signed(f.value, 1)))));
  if (won) sfx.fanfare(); else sfx.sad();
  app.panel('night modal scroll',
    h('div', { class: 'kicker' }, res.kind === 'campaign' ? t('electionNight') : t('reelectionNight')),
    h('h2', { class: won ? 'win' : 'lose' }, won ? t('youWon') : t('youLost')),
    h('p', null, tl(res.executive.detail)),
    h('p', { class: 'small muted' }, t('turnout', { p: num(res.turnout, 1) })),
    bars, ...extra,
    h('h3', null, t('whyResult')), h('p', { class: 'small muted' }, t('whyNote')), factors,
    btn(won && res.kind === 'campaign' ? t('continueToGov') : t('seeEnding'), async () => {
      // Transición natural: posible pausa publicitaria de la plataforma (nunca obligatoria)
      await app.adBreak();
      if (won && res.kind === 'campaign') R.formation(); else R.ending();
    }, { cls: 'primary', key: '1' }));
};
