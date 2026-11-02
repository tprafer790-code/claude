// Preparación: país → candidatura y nombre → orientación → programa con la asesora.
import { CANDIDATES, characterSVG } from '../../art/characters';
import { flagSVG } from '../../art/scenes';
import { answerProgramme, startCampaign } from '../../core/campaign';
import { newSeed } from '../../core/rng';
import { createState } from '../../core/state';
import type { CandidateId, CountryId, Orientation, Stance } from '../../core/types';
import { PROGRAMME } from '../../data/campaign';
import { COUNTRY_ORDER, country } from '../../data/countries';
import { t, tl, type UIKey } from '../../i18n';
import { gameplayStart } from '../../platform/poki';
import { logEvent, logState } from '../../telemetry/playtestLog';
import { btn, h, svgEl } from '../dom';
import { ctx, R } from '../router';
import { corkNote, markNewGame, radioCall } from './housing';

const NAMES: Record<CountryId, string[]> = {
  es: ['Charo Vidal', 'Toni Calvo', 'Merche Lago', 'Julián Peña', 'Nuria Sanz', 'Paco Ferrer'],
  us: ['Kim Parker', 'Jo Delaney', 'Sam Holloway', 'Pat Moreno', 'Lee Whitaker', 'Robin Hayes'],
  br: ['Cida Rocha', 'Zeca Moura', 'Lúcia Brandão', 'Tião Farias', 'Bete Queiroz', 'Nando Teles'],
};
const CANDS: CandidateId[] = ['hippie', 'impecable', 'veterano', 'influencer'];
const MOODS = ['idle', 'walk', 'talk', 'happy', 'angry', 'nervous'] as const;

interface Draft { country?: CountryId; candidate?: CandidateId; name?: string; orientation?: Orientation }
let draft: Draft = {};

export function setDraft(d: Draft) { draft = { ...d }; }

R.setup = () => { draft = {}; markNewGame(); stepCountry(); };

function frame(title: string, hint: string, body: Node, foot?: Node) {
  const app = ctx.app;
  app.clearLayer();
  app.setScene('hq', { country: draft.country ?? 'es', partyColor: '#e2493b' });
  app.renderHud();
  app.panel('setup modal scroll', h('h2', null, title), h('p', { class: 'hint' }, hint), body, foot ?? null);
}

function stepCountry() {
  const cards = h('div', { class: 'cards three' }, COUNTRY_ORDER.map((id, i) => {
    const c = country(id);
    return h('article', { class: 'card country' },
      svgEl(`<svg viewBox="0 0 90 60" aria-hidden="true">${flagSVG(id)}</svg>`, 'flag'),
      h('h3', null, tl(c.name)),
      h('p', { class: 'small' }, tl(c.titles.leader)),
      h('p', { class: 'small muted' }, tl(c.rules[0])),
      h('details', null, h('summary', null, t('rulesTitle')), h('ul', null, c.rules.map((r) => h('li', null, tl(r))))),
      h('details', null, h('summary', null, t('realContext', { date: c.reality.date })),
        h('p', { class: 'small muted' }, t('realContextNote')),
        h('ul', null, c.reality.lines.map((r) => h('li', null, tl(r)))),
        h('p', { class: 'small muted' }, c.reality.sources.join(' · '))),
      btn(tl(c.name), () => { draft.country = id; logEvent('setup_country', { id }); stepCandidate(); }, { cls: 'primary', key: String(i + 1) }));
  }));
  frame(t('chooseCountry'), t('countryHint'), cards, btn(t('back'), () => R.title(), { cls: 'ghost' }));
}

function stepCandidate() {
  const c = draft.country!;
  draft.name = draft.name ?? NAMES[c][Math.floor(Math.random() * NAMES[c].length)];
  const input = h('input', { type: 'text', value: draft.name, maxlength: 22, 'aria-label': t('nameLabel'), id: 'cand-name' }) as HTMLInputElement;
  input.addEventListener('input', () => { draft.name = input.value; });
  const cards = h('div', { class: 'cards four' }, CANDS.map((id, i) => {
    const preview = svgEl(characterSVG(CANDIDATES[id], { label: t(`candidate_${id}` as UIKey) }), 'actor preview');
    preview.dataset.mood = 'idle';
    let mi = 0;
    const moodLbl = h('span', { class: 'small muted' }, t('mood_idle'));
    const setMood = (m: typeof MOODS[number]) => {
      preview.classList.toggle('walking', m === 'walk');
      preview.dataset.mood = m === 'walk' ? 'idle' : m;
      moodLbl.textContent = t(`mood_${m}` as UIKey);
    };
    const card = h('article', { class: `card cand${draft.candidate === id ? ' selected' : ''}` },
      preview,
      h('h3', null, t(`candidate_${id}` as UIKey)),
      h('p', { class: 'small' }, t(`candidateDesc_${id}` as UIKey)),
      h('div', { class: 'row' }, btn(t('previewMood'), () => { mi = (mi + 1) % MOODS.length; setMood(MOODS[mi]); }, { cls: 'small ghost' }), moodLbl),
      btn(t('confirm'), () => { draft.candidate = id; draft.name = input.value.trim() || draft.name; logEvent('setup_candidate', { id }); stepSide(); }, { cls: 'primary', key: String(i + 1) }));
    return card;
  }));
  const nameRow = h('div', { class: 'name-row' }, h('label', { for: 'cand-name' }, t('nameLabel')), input,
    btn(t('randomName'), () => { input.value = NAMES[c][Math.floor(Math.random() * NAMES[c].length)]; draft.name = input.value; }, { cls: 'small ghost' }));
  frame(t('chooseCandidate'), t('candidateHint'), h('div', null, nameRow, cards), btn(t('back'), stepCountry, { cls: 'ghost' }));
}

function stepSide() {
  const opts: Orientation[] = ['left', 'right'];
  const body = h('div', { class: 'cards two' }, opts.map((o, i) => h('article', { class: `card side side-${o}` },
    h('h3', null, t(o)), h('p', null, t(`${o}Desc` as UIKey)),
    btn(t('startCampaign'), () => { draft.orientation = o; begin(); }, { cls: 'primary', key: String(i + 1) }))));
  frame(t('chooseSide'), t('sideHint'), body, btn(t('back'), stepCandidate, { cls: 'ghost' }));
}

/** Crea la partida con una semilla nueva y pasa al programa. */
export function begin(seed = testSeed() ?? newSeed()) {
  const app = ctx.app;
  app.s = createState({ seed, country: draft.country!, candidate: draft.candidate!, name: (draft.name || 'Candidata').slice(0, 22), orientation: draft.orientation!, lang: app.lang });
  logEvent('game_start', { seed, country: draft.country, candidate: draft.candidate, orientation: draft.orientation });
  app.save('programme');
  gameplayStart();
  R.programme();
}

/** Gancho de pruebas: las pruebas automáticas pueden fijar la semilla con window.__PI_SEED__. */
function testSeed(): number | undefined {
  const v = (window as unknown as { __PI_SEED__?: number }).__PI_SEED__;
  return typeof v === 'number' ? v : undefined;
}

export function currentDraft(): Draft { return draft; }

R.programme = () => { void programme(); };

async function programme() {
  const app = ctx.app;
  const s = app.s!;
  app.snapshotStats();
  // Al entrar en la sede, la asesora pasa una llamada de radio: es la promesa de vivienda
  if (!s.housing) await radioCall();
  app.clearLayer();
  app.setScene('hq');
  corkNote();
  const player = app.candidateActor(22);
  const advisor = app.castActor('advisor', 62, { flip: true });
  app.renderHud();
  if (s.promises.length <= 1) await app.say('advisor', t('programmeIntro', { name: app.castName('advisor') }), { actor: advisor });
  const rec: Stance = s.orientation === 'left' ? -1 : 1;
  const rest = PROGRAMME.filter((q) => q.axis !== 'housing');
  for (let i = 0; i < rest.length; i++) {
    const q = rest[i];
    if (s.promises.some((p) => p.axis === q.axis)) continue;
    const idx = await app.dialog({
      speaker: 'advisor', actor: advisor, kicker: t('programmeStep', { n: i + 2, total: PROGRAMME.length }), text: tl(q.ask[s.orientation]),
      choices: q.options.map((o) => ({ label: tl(o.label), sub: tl(o.promise), badge: o.stance === rec ? t('advisorRecommends') : undefined, cls: o.stance === rec ? 'rec' : '' })),
    });
    const opt = q.options[idx];
    const out = answerProgramme(s, q.axis, opt.stance);
    player.mood(opt.stance === rec ? 'happy' : 'nervous');
    advisor.mood(opt.stance === rec ? 'happy' : 'angry');
    app.save('programme');
    logEvent('decision', { id: `programme_${q.axis}`, choice: opt.stance });
    await app.say('advisor', tl(out.text), { kicker: t('promiseRecorded', { p: tl(opt.promise) }) + (opt.stance !== rec ? ` · ${t('disagree')}` : ''), extra: app.deltaList(out.deltas, 4) });
    player.mood('idle'); advisor.mood('idle');
  }
  startCampaign(s);
  logState('phase', s);
  app.save('campaign');
  R.campaign();
}
