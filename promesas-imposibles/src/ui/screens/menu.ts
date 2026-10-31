// Pantalla de título, ajustes, pausa y aviso.
import { CANDIDATES, characterSVG } from '../../art/characters';
import { sceneSVG } from '../../art/scenes';
import { TUNING } from '../../data/tuning';
import { t } from '../../i18n';
import { gameplayStop } from '../../platform/poki';
import { hasSave, loadGame, storageAvailable } from '../../save/storage';
import { exportLog } from '../../telemetry/playtestLog';
import { btn, clear, h, svgEl } from '../dom';
import { ctx, R } from '../router';

R.title = () => {
  const app = ctx.app;
  gameplayStop();
  app.s = null;
  app.clearLayer();
  clear(app.world);
  app.world.append(svgEl(sceneSVG('street', { country: 'es', partyColor: '#e2493b', rivalColor: '#2f6fd6' }), 'scene-wrap'));
  const ids = ['hippie', 'impecable', 'veterano', 'influencer'] as const;
  ids.forEach((id, i) => {
    const a = app.actor(CANDIDATES[id], 8 + i * 22, { size: 14, flip: i >= 2 });
    a.mood((['happy', 'talk', 'nervous', 'angry'] as const)[i]);
  });
  app.renderHud();
  const lang = h('div', { class: 'lang-switch', role: 'group', 'aria-label': t('language') },
    btn('ES', () => { app.updateSettings({ lang: 'es' }); R.title(); }, { cls: app.lang === 'es' ? 'on small' : 'small' }),
    btn('EN', () => { app.updateSettings({ lang: 'en' }); R.title(); }, { cls: app.lang === 'en' ? 'on small' : 'small' }));
  const save = hasSave() ? loadGame() : null;
  app.panel('title-card',
    h('h1', { class: 'logo' }, t('title')),
    h('p', { class: 'sub' }, t('subtitle')),
    h('div', { class: 'menu-buttons' },
      save ? btn(t('continue'), () => R.resume(), { cls: 'primary big', key: '1' }) : null,
      btn(t('newGame'), () => R.setup(), { cls: save ? 'big' : 'primary big', key: save ? '2' : '1' }),
      btn(t('settings'), () => R.settings(), { key: save ? '3' : '2' }),
      btn(t('about'), () => about(), { key: save ? '4' : '3' })),
    lang,
    !storageAvailable() ? h('p', { class: 'warn' }, t('storageWarn')) : null,
    h('p', { class: 'fine' }, t('disclaimer')));
};

function about() {
  const app = ctx.app;
  app.openOverlay(h('div', { class: 'sheet scroll' },
    h('h2', null, t('about')),
    h('p', null, t('disclaimer')),
    h('p', null, t('credits')),
    btn(t('close'), () => app.closeOverlay(), { cls: 'primary' })));
}

R.settings = (onClose?: () => void) => {
  const app = ctx.app;
  const st = app.settings;
  const row = (label: string, ...ctrl: Node[]) => h('div', { class: 'set-row' }, h('span', null, label), h('div', { class: 'set-ctrl' }, ...ctrl));
  const toggle = (on: boolean, f: () => void) => btn(on ? t('on') : t('off'), () => { f(); R.settings(onClose); }, { cls: on ? 'on small' : 'small', aria: on ? t('on') : t('off') });
  const vol = h('input', { type: 'range', min: 0, max: 100, step: 5, value: Math.round(st.volume * 100), 'aria-label': t('volume') }) as HTMLInputElement;
  vol.addEventListener('input', () => app.updateSettings({ volume: Number(vol.value) / 100 }));
  const sheet = h('div', { class: 'sheet scroll' },
    h('h2', null, t('settings')),
    row(t('language'), btn('Español', () => { app.updateSettings({ lang: 'es' }); R.settings(onClose); }, { cls: st.lang === 'es' ? 'on small' : 'small' }), btn('English', () => { app.updateSettings({ lang: 'en' }); R.settings(onClose); }, { cls: st.lang === 'en' ? 'on small' : 'small' })),
    row(t('volume'), vol),
    row(t('mute'), toggle(st.muted, () => app.updateSettings({ muted: !st.muted }))),
    row(t('reducedMotion'), toggle(st.reducedMotion, () => app.updateSettings({ reducedMotion: !st.reducedMotion }))),
    row(t('textSize'), btn(t('textNormal'), () => { app.updateSettings({ textLarge: false }); R.settings(onClose); }, { cls: !st.textLarge ? 'on small' : 'small' }), btn(t('textLarge'), () => { app.updateSettings({ textLarge: true }); R.settings(onClose); }, { cls: st.textLarge ? 'on small' : 'small' })),
    row(t('debateTimer'), btn(t('timerOn', { s: TUNING.debateTurnSeconds }), () => { app.updateSettings({ debateTimed: true }); R.settings(onClose); }, { cls: st.debateTimed ? 'on small' : 'small' }), btn(t('timerOff'), () => { app.updateSettings({ debateTimed: false }); R.settings(onClose); }, { cls: !st.debateTimed ? 'on small' : 'small' })),
    !storageAvailable() ? h('p', { class: 'warn' }, t('storageWarn')) : null,
    row(t('exportLog'), btn('JSON', () => exportLog(), { cls: 'small' })),
    btn(t('close'), () => { app.closeOverlay(); if (!app.s) R.title(); else app.renderHud(); onClose?.(); }, { cls: 'primary' }));
  app.openOverlay(sheet);
};

R.pauseMenu = () => {
  const app = ctx.app;
  if (!app.paused) app.paused = true;
  app.pauseListeners.forEach((f) => f(true));
  gameplayStop();
  app.openOverlay(h('div', { class: 'sheet' },
    h('h2', null, t('paused')),
    h('div', { class: 'menu-buttons' },
      btn(t('resume'), () => app.closeOverlay(), { cls: 'primary', key: '1' }),
      btn(t('settings'), () => R.settings(() => R.pauseMenu()), { key: '2' }),
      app.s ? btn(t('quitToMenu'), () => { if (app.s) app.save(app.screen); app.overlay.classList.add('hidden'); app.paused = false; R.title(); }, { key: '3' }) : null),
    app.s ? h('p', { class: 'fine' }, t('walkHint')) : null));
};

export function portraitOf(id: keyof typeof CANDIDATES): string { return characterSVG(CANDIDATES[id], { portrait: true }); }
