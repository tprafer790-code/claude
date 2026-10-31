// Debate televisado: leer el gesto del rival, elegir carta, reloj opcional, público en vivo.
import { sfx } from '../../audio/audio';
import { debateOver, debateTell, finishDebate, playCard, startDebate } from '../../core/debate';
import type { DebateCard } from '../../core/types';
import { CARD_HINTS, CARD_NAMES, TOPIC_NAMES } from '../../data/debate';
import { TUNING } from '../../data/tuning';
import { t, tl, type UIKey } from '../../i18n';
import { logEvent } from '../../telemetry/playtestLog';
import { btn, h, svgEl } from '../dom';
import { UI_ICONS } from '../icons';
import { ctx } from '../router';

const CARDS: DebateCard[] = ['data', 'story', 'attack', 'deflect', 'promise'];

export async function runDebate(kind: 'campaign' | 'reelection'): Promise<void> {
  const app = ctx.app;
  const s = app.s!;
  app.clearLayer();
  app.setScene('studio');
  const me = app.candidateActor(17, { size: 14 });
  const rival = app.castActor('opposition', 69, { flip: true, size: 14 });
  const rivalName = app.castName('opposition');
  app.renderHud();
  if (!s.debate || s.debate.kind !== kind || debateOver(s)) {
    const mode = await app.dialog({
      speaker: 'advisor', title: t('debateTitle'), text: t('debateIntro', { rounds: kind === 'campaign' ? TUNING.debateRounds : TUNING.debateRematchRounds, rival: rivalName }),
      kicker: t('debateChooseMode'),
      choices: [
        { label: t('debateTimed', { s: TUNING.debateTurnSeconds }), cls: app.settings.debateTimed ? 'rec' : '' },
        { label: t('debateUntimed'), cls: !app.settings.debateTimed ? 'rec' : '' },
      ],
    });
    startDebate(s, kind, mode === 0);
    app.save(kind === 'campaign' ? 'campaign' : 'reelection');
  }
  const d = s.debate!;
  const meter = h('div', { class: 'audience', role: 'meter', 'aria-label': t('debateAudience'), 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('span', { class: 'lbl' }, t('debateAudience')), h('i', { class: 'fill' }));
  const setMeter = () => { (meter.querySelector('.fill') as HTMLElement).style.width = `${d.audience}%`; meter.setAttribute('aria-valuenow', String(Math.round(d.audience))); };
  app.layer.append(meter);
  setMeter();

  while (!debateOver(s)) {
    const move = d.moves[d.round];
    rival.mood('talk');
    const tell = tl(debateTell(s, rivalName));
    const card = await pickCard(tell, t('debateTurn', { n: d.round + 1, total: d.rounds, topic: tl(TOPIC_NAMES[move.topic]) }), d.timed);
    rival.mood('idle');
    const r = playCard(s, card);
    setMeter();
    me.mood(r.verdict === 'great' || r.verdict === 'good' ? 'happy' : r.verdict === 'bad' ? 'nervous' : 'talk');
    rival.mood(r.verdict === 'great' ? 'angry' : r.verdict === 'bad' ? 'happy' : 'idle');
    if (r.delta >= 3) sfx.cheer(); else if (r.delta < 0) sfx.boo();
    logEvent('debate_turn', { move: r.move, card, delta: r.delta });
    app.save(kind === 'campaign' ? 'campaign' : 'reelection');
    await app.say('player', tl(r.line), { kicker: t(`verdict_${r.verdict}` as UIKey) });
    me.mood('idle'); rival.mood('idle');
  }
  const won = d.audience >= 50;
  const deltas = finishDebate(s);
  me.mood(won ? 'happy' : 'sad'); rival.mood(won ? 'angry' : 'happy');
  if (won) sfx.fanfare(); else sfx.sad();
  app.save(kind === 'campaign' ? 'campaign' : 'reelection');
  app.renderHud();
  await app.say('advisor', won ? t('debateWon') : t('debateLost'), { extra: app.deltaList(deltas) });
  meter.remove();
}

function pickCard(tell: string, kicker: string, timed: boolean): Promise<DebateCard | null> {
  const app = ctx.app;
  const s = app.s!;
  const d = s.debate!;
  return new Promise((resolve) => {
    let left = TUNING.debateTurnSeconds;
    let timer = 0;
    let paused = false;
    const timeEl = h('div', { class: 'timer', 'aria-live': 'off' }, svgEl(UI_ICONS.clock, 'ic'), h('b', null, t('timeLeft', { s: left })), h('i', { class: 'bar', style: '--v:100%' }));
    const finish = (c: DebateCard | null) => { window.clearInterval(timer); app.pauseListeners = app.pauseListeners.filter((f) => f !== onPause); p.remove(); resolve(c); };
    const onPause = (v: boolean) => { paused = v; };
    const cards = h('div', { class: 'debate-cards' }, CARDS.map((c, i) => btn(
      h('span', { class: 'lbl' }, tl(CARD_NAMES[c]), h('small', null, tl(CARD_HINTS[c])), h('em', { class: 'uses' }, t('uses', { n: d.uses[c] }))),
      () => finish(c), { cls: `choice dcard dcard-${c}`, disabled: d.uses[c] <= 0, key: String(i + 1) })));
    const p = app.panel('dialog debate modal', h('div', { class: 'dlg-body' }, h('div', { class: 'kicker' }, kicker), h('p', { class: 'dlg-text tell' }, tell), timed ? timeEl : null, h('div', { class: 'choices show' }, cards)));
    if (timed) {
      app.pauseListeners.push(onPause);
      timer = window.setInterval(() => {
        if (paused) return;
        left -= 1;
        if (left <= 3 && left > 0) sfx.tick();
        (timeEl.querySelector('b') as HTMLElement).textContent = t('timeLeft', { s: Math.max(0, left) });
        (timeEl.querySelector('.bar') as HTMLElement).style.setProperty('--v', `${(left / TUNING.debateTurnSeconds) * 100}%`);
        if (left <= 0) finish(null);
      }, 1000);
    }
  });
}
