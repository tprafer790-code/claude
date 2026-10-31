// Final: legado, decisiones clave y revancha rápida.
import { sfx } from '../../audio/audio';
import { computeEnding } from '../../core/endings';
import { country } from '../../data/countries';
import { num, t, tl } from '../../i18n';
import { gameplayStart, gameplayStop } from '../../platform/poki';
import { clearSave, loadGame } from '../../save/storage';
import { logEvent } from '../../telemetry/playtestLog';
import { btn, h } from '../dom';
import { ctx, R } from '../router';
import { begin, setDraft } from './setup';

R.ending = () => {
  const app = ctx.app;
  const s = app.s!;
  if (!s.ending) s.ending = computeEnding(s, s.phase === 'formation' ? 'formation' : s.round > 0 ? 'term' : 'campaign', false);
  s.phase = 'ending';
  const e = s.ending;
  gameplayStop();
  const minutes = Math.max(1, Math.round((Date.now() - s.startedAt) / 60000));
  logEvent('game_end', { ending: e.id, minutes, round: s.round, country: s.country, seed: s.seed });
  clearSave();
  app.clearLayer();
  const good = e.score >= 50;
  app.setScene(s.round > 0 ? 'office' : 'street', { crowd: good ? 10 : 0 });
  const me = app.candidateActor(14, { size: 15 });
  me.mood(good ? 'happy' : 'sad');
  if (good) sfx.fanfare(); else sfx.sad();
  app.renderHud();
  const quick = async () => { setDraft({ country: s.country, candidate: s.candidate, name: s.name, orientation: s.orientation }); await app.adBreak(); begin(); };
  app.panel('ending modal scroll',
    h('div', { class: 'kicker' }, `${t('endingTitle')} · ${tl(country(s.country).name)}`),
    h('h2', null, tl(e.title)),
    h('p', { class: 'lead' }, tl(e.text)),
    e.lines.length ? h('ul', { class: 'legacy' }, e.lines.map((l) => h('li', null, tl(l)))) : null,
    e.keyDecisions.length ? h('div', null, h('h3', null, t('keyDecisions')), h('ol', null, e.keyDecisions.map((l) => h('li', null, tl(l))))) : null,
    h('p', { class: 'fine' }, `${t('playTime', { m: num(minutes) })} · ${t('seed', { s: s.seed })}`),
    h('div', { class: 'row' },
      btn(h('span', { class: 'lbl' }, t('playAgain'), h('small', null, t('playAgainHint'))), () => void quick(), { cls: 'primary', key: '1' }),
      btn(t('changeSetup'), () => R.setup(), { key: '2' }),
      btn(t('menu'), () => R.title(), { cls: 'ghost', key: '3' })));
};

/** Reanuda una partida guardada en la pantalla coherente con su estado. */
R.resume = () => {
  const app = ctx.app;
  const f = loadGame();
  if (!f) { R.title(); return; }
  const s = f.state;
  app.s = s;
  app.updateSettings({ lang: app.settings.lang });
  app.snapshotStats();
  logEvent('resume', { phase: s.phase, round: s.round });
  if (s.phase !== 'ending') gameplayStart();
  switch (s.phase) {
    case 'setup': return R.programme();
    case 'campaign': return R.campaign();
    case 'formation': return R.formation();
    case 'government': return R.office();
    case 'reelection': return R.reelection();
    default: return R.ending();
  }
};
