// Núcleo de la interfaz: escenario 16:9, actores, diálogos, HUD, pausa y guardado.
import { adPause, babble, setMuted, setVolume, sfx, unlockAudio } from '../audio/audio';
import { CANDIDATES, castSpec, characterSVG, type CharSpec } from '../art/characters';
import { HOTSPOTS, sceneSVG, type SceneOpts } from '../art/scenes';
import { visibleIndicators } from '../core/government';
import type { CastId, DeltaRec, GameState, HotspotId, L, Lang, Mood, SceneId, StatId } from '../core/types';
import { CAST } from '../data/cast';
import { country } from '../data/countries';
import { getLang, num, setLang, signed, t, tl, type UIKey } from '../i18n';
import { gameplayStart, gameplayStop, naturalBreak } from '../platform/poki';
import { loadSettings, saveGame, saveSettings } from '../save/storage';
import { logEvent } from '../telemetry/playtestLog';
import { btn, clear, focusFirst, h, svgEl, wait } from './dom';
import { statIcon, UI_ICONS } from './icons';

export interface Settings { lang: Lang; volume: number; muted: boolean; reducedMotion: boolean; textLarge: boolean; debateTimed: boolean }

export interface Choice { label: string; sub?: string; disabled?: boolean; cls?: string; badge?: string }

export class Actor {
  el: HTMLDivElement;
  x: number;
  constructor(public world: HTMLElement, spec: CharSpec, x: number, opts: { flip?: boolean; size?: number; label?: string; bottom?: number } = {}) {
    this.x = x;
    this.el = h('div', { class: 'actor pop', 'data-mood': 'idle', style: `left:${x}%;bottom:${opts.bottom ?? 6}%;width:${opts.size ?? 16}%` });
    this.el.innerHTML = characterSVG(spec, { flip: opts.flip, label: opts.label });
    world.append(this.el);
  }
  mood(m: Mood | 'idle'): void { this.el.dataset.mood = m; }
  face(left: boolean): void { this.el.querySelector('svg')?.classList.toggle('ch-flip', left); }
  /** Camina hasta x (% del escenario). */
  async walkTo(x: number, reduced: boolean): Promise<void> {
    const dist = Math.abs(x - this.x);
    if (dist < 0.5) return;
    this.face(x < this.x);
    this.x = x;
    if (reduced) { this.el.style.left = `${x}%`; return; }
    const ms = Math.min(1400, 120 + dist * 22);
    this.el.classList.add('walking');
    this.el.style.transition = `left ${ms}ms linear`;
    this.el.style.left = `${x}%`;
    await wait(ms);
    this.el.classList.remove('walking');
    this.el.style.transition = '';
  }
  remove(): void { this.el.remove(); }
}

type Hotspot = { id: HotspotId; x: number; y: number; label: string; badge?: string; info?: string; onUse: () => void };

export class App {
  s: GameState | null = null;
  settings: Settings;
  root: HTMLElement;
  stage: HTMLDivElement;
  world: HTMLDivElement;
  hud: HTMLDivElement;
  layer: HTMLDivElement;
  overlay: HTMLDivElement;
  toastEl: HTMLDivElement;
  player: Actor | null = null;
  hotspots: Hotspot[] = [];
  screen = 'title';
  paused = false;
  pauseListeners: ((p: boolean) => void)[] = [];
  private prevStats: Partial<Record<StatId, number>> = {};
  /** Pila de controladores de teclado de los paneles abiertos */
  private walkEnabled = false;
  private keysHeld = new Set<string>();
  private walkTimer = 0;
  onPauseMenu: () => void = () => {};

  constructor(root: HTMLElement) {
    this.root = root;
    const def: Settings = { lang: navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en', volume: 0.6, muted: false, reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false, textLarge: false, debateTimed: true };
    this.settings = { ...def, ...loadSettings<Settings>() };
    this.stage = h('div', { class: 'stage', role: 'application', 'aria-label': t('title') });
    this.world = h('div', { class: 'world' });
    this.hud = h('div', { class: 'hud', 'aria-live': 'polite' });
    this.layer = h('div', { class: 'layer' });
    this.overlay = h('div', { class: 'overlay hidden' });
    this.toastEl = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
    this.stage.append(this.world, this.hud, this.layer, this.toastEl, this.overlay);
    root.append(this.stage);
    this.applySettings();
    this.bindInput();
    this.layout();
    window.addEventListener('resize', () => this.layout());
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.s && !this.paused) this.pause(true); });
  }

  // ── Ajustes ──────────────────────────────────────────────────────────
  applySettings(): void {
    setLang(this.settings.lang);
    setVolume(this.settings.volume);
    setMuted(this.settings.muted);
    document.body.classList.toggle('reduced-motion', this.settings.reducedMotion);
    document.body.classList.toggle('text-large', this.settings.textLarge);
    if (this.s) this.s.lang = this.settings.lang;
  }
  updateSettings(p: Partial<Settings>): void { this.settings = { ...this.settings, ...p }; saveSettings(this.settings); this.applySettings(); }
  get reduced(): boolean { return this.settings.reducedMotion; }
  get lang(): Lang { return getLang(); }

  layout(): void {
    const portrait = window.innerHeight > window.innerWidth * 1.05;
    document.body.classList.toggle('portrait', portrait);
  }

  // ── Escena ───────────────────────────────────────────────────────────
  setScene(id: SceneId, extra: Partial<SceneOpts> = {}): void {
    clear(this.world);
    this.hotspots = [];
    this.player = null;
    this.walkEnabled = false;
    const s = this.s;
    const parties = s ? country(s.country).parties(s.orientation) : [];
    const opts: SceneOpts = {
      country: s?.country ?? 'es',
      partyColor: parties.find((p) => p.isPlayer)?.color ?? '#e2493b',
      rivalColor: parties.find((p) => p.isRival)?.color ?? '#2f6fd6',
      wellbeing: s?.stats.wellbeing, unrest: s?.stats.unrest, round: s?.round,
      night: s ? (s.phase === 'campaign' && s.campaignDay >= 6) || s.round >= 11 : false,
      ...extra,
    };
    this.world.dataset.scene = id;
    this.world.append(svgEl(sceneSVG(id, opts), 'scene-wrap'));
  }

  actor(spec: CharSpec, x: number, opts: { flip?: boolean; size?: number; label?: string; bottom?: number } = {}): Actor { return new Actor(this.world, spec, x, opts); }
  candidateActor(x: number, opts: { flip?: boolean; size?: number; bottom?: number } = {}): Actor {
    const a = this.actor(CANDIDATES[this.s!.candidate], x, { ...opts, label: this.s!.name });
    a.el.classList.add('is-player');
    return a;
  }
  castActor(id: CastId, x: number, opts: { flip?: boolean; size?: number; bottom?: number } = {}): Actor { return this.actor(castSpec(id, this.s!.country), x, { ...opts, label: this.castName(id) }); }
  castName(id: CastId): string { return country(this.s!.country).castNames[id]; }

  /** Objetos interactivos visibles y con etiqueta (nunca solo al pasar el ratón). */
  setHotspots(list: Omit<Hotspot, 'x' | 'y'>[], walk = true): void {
    const scene = this.world.dataset.scene as SceneId;
    const pos = HOTSPOTS[scene] ?? {};
    this.world.querySelectorAll('.hotspot').forEach((e) => e.remove());
    this.hotspots = [];
    for (const hs of list) {
      const p = pos[hs.id];
      if (!p) continue;
      const full: Hotspot = { ...hs, x: p.x, y: p.y };
      this.hotspots.push(full);
      const b = h('button', { class: `hotspot${hs.badge ? ' has-badge' : ''}`, type: 'button', style: `left:${p.x}%;top:${p.y}%`, 'aria-label': `${hs.label}${hs.badge ? ` — ${hs.badge}` : ''}${hs.info ? ` — ${hs.info}` : ''}` },
        h('span', { class: 'hs-ring', 'aria-hidden': 'true' }),
        hs.badge ? h('span', { class: 'hs-badge', 'aria-hidden': 'true' }, '!') : null,
        h('span', { class: 'hs-label' }, hs.label, hs.badge ? h('small', null, hs.badge) : hs.info ? h('small', { class: 'info' }, hs.info) : null));
      b.addEventListener('click', (e) => { e.stopPropagation(); if (document.body.classList.contains('input-blocked') || this.layer.querySelector('.modal')) return; sfx.click(); void this.useHotspot(full); });
      this.world.append(b);
    }
    this.walkEnabled = walk && !!this.player;
  }

  async useHotspot(hs: Hotspot): Promise<void> {
    if (this.player) await this.player.walkTo(Math.max(6, Math.min(92, hs.x)), this.reduced);
    hs.onUse();
  }

  enableWalking(actor: Actor): void {
    this.player = actor;
    this.walkEnabled = true;
    this.world.onclick = (e) => {
      if (!this.walkEnabled || this.layer.querySelector('.modal')) return;
      const r = this.world.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      void actor.walkTo(Math.max(4, Math.min(94, x - 6)), this.reduced);
    };
  }

  private bindInput(): void {
    window.addEventListener('pointerdown', () => unlockAudio(), { once: false });
    window.addEventListener('keydown', (e) => {
      unlockAudio();
      if (document.body.classList.contains('input-blocked')) { e.preventDefault(); return; }
      if (e.key === 'Escape') { e.preventDefault(); if (this.overlay.classList.contains('hidden')) this.onPauseMenu(); else this.closeOverlay(); return; }
      if (!this.overlay.classList.contains('hidden')) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text') return;
      // Atajos numéricos para elegir opciones del panel superior
      if (/^[1-9]$/.test(e.key)) {
        const top = this.topPanel();
        const b = top?.querySelector<HTMLButtonElement>(`button[data-key="${e.key}"]:not([disabled])`);
        if (b) { e.preventDefault(); b.click(); return; }
      }
      if (this.walkEnabled && this.player && !this.layer.querySelector('.modal')) {
        if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(e.key)) { e.preventDefault(); this.keysHeld.add(e.key.toLowerCase().replace('arrow', '')); this.startWalkLoop(); return; }
        if ((e.key === 'Enter' || e.key === ' ' || e.key === 'e') && !(target instanceof HTMLButtonElement)) {
          const near = this.nearestHotspot();
          if (near) { e.preventDefault(); sfx.click(); near.onUse(); }
        }
      }
    });
    window.addEventListener('keyup', (e) => { this.keysHeld.delete(e.key.toLowerCase().replace('arrow', '')); });
  }

  private startWalkLoop(): void {
    if (this.walkTimer) return;
    const p = this.player!;
    p.el.classList.add('walking');
    const step = () => {
      const left = this.keysHeld.has('left') || this.keysHeld.has('a');
      const right = this.keysHeld.has('right') || this.keysHeld.has('d');
      if ((!left && !right) || !this.player || this.paused) { p.el.classList.remove('walking'); this.walkTimer = 0; this.highlightNearest(); return; }
      const dx = right ? 1.2 : -1.2;
      p.face(dx < 0);
      p.x = Math.max(3, Math.min(92, p.x + dx));
      p.el.style.left = `${p.x}%`;
      this.highlightNearest();
      this.walkTimer = window.setTimeout(step, 30);
    };
    step();
  }

  private nearestHotspot(): Hotspot | null {
    if (!this.player) return null;
    const px = this.player.x + 6;
    let best: Hotspot | null = null; let bd = 12;
    for (const hs of this.hotspots) { const d = Math.abs(hs.x - px); if (d < bd) { bd = d; best = hs; } }
    return best;
  }
  private highlightNearest(): void {
    const n = this.nearestHotspot();
    this.world.querySelectorAll('.hotspot').forEach((b, i) => b.classList.toggle('near', this.hotspots[i] === n));
  }

  // ── Paneles y diálogos ───────────────────────────────────────────────
  topPanel(): HTMLElement | null {
    const list = this.layer.querySelectorAll<HTMLElement>('.panel');
    return list[list.length - 1] ?? null;
  }
  clearLayer(): void { clear(this.layer); }

  /** Panel genérico. `modal` bloquea los objetos del escenario. */
  panel(cls: string, ...children: (Node | string | null | false | undefined)[]): HTMLDivElement {
    const p = h('div', { class: `panel ${cls}`, role: 'dialog', 'aria-modal': cls.includes('modal') ? 'true' : undefined }, ...children);
    this.layer.append(p);
    requestAnimationFrame(() => focusFirst(p));
    return p;
  }

  /**
   * Diálogo de personaje: retrato, texto con efecto máquina de escribir (saltable) y opciones.
   * Devuelve el índice elegido.
   */
  dialog(o: { speaker?: CastId | 'player' | null; name?: string; role?: string; title?: string; kicker?: string; text: string; detail?: string; choices: Choice[]; actor?: Actor | null; cls?: string; extra?: Node | null }): Promise<number> {
    return new Promise((resolve) => {
      const s = this.s;
      let portrait: HTMLElement | null = null;
      let name = o.name ?? '';
      let role = o.role ?? '';
      if (o.speaker && s) {
        if (o.speaker === 'player') { portrait = svgEl(characterSVG(CANDIDATES[s.candidate], { portrait: true }), 'portrait actor'); name = name || s.name; }
        else { portrait = svgEl(characterSVG(castSpec(o.speaker, s.country), { portrait: true }), 'portrait actor'); name = name || this.castName(o.speaker); role = role || tl(CAST[o.speaker].role); }
        portrait.dataset.mood = 'talk';
        babble(o.speaker === 'player' ? 240 : CAST[o.speaker].voice, o.text);
      }
      if (o.actor) o.actor.mood('talk');
      const textEl = h('p', { class: 'dlg-text' });
      const choicesEl = h('div', { class: 'choices' });
      let done = false;
      const finishTyping = () => {
        if (done) return;
        done = true;
        textEl.textContent = o.text;
        skipBtn.remove();
        if (portrait) portrait.dataset.mood = 'idle';
        if (o.actor) o.actor.mood('idle');
        choicesEl.classList.add('show');
      };
      const skipBtn = btn(t('skip'), finishTyping, { cls: 'skip ghost small' });
      o.choices.forEach((c, i) => {
        const b = btn(h('span', { class: 'lbl' }, c.label, c.sub ? h('small', null, c.sub) : null, c.badge ? h('em', { class: 'badge' }, c.badge) : null), () => {
          if (!done) finishTyping();
          p.remove();
          resolve(i);
        }, { cls: `choice ${c.cls ?? ''}`, disabled: c.disabled, key: String(i + 1) });
        choicesEl.append(b);
      });
      const p = this.panel(`dialog modal ${o.cls ?? ''}`,
        portrait,
        h('div', { class: 'dlg-body' },
          o.kicker ? h('div', { class: 'kicker' }, o.kicker) : null,
          o.title ? h('h2', null, o.title) : null,
          name ? h('div', { class: 'speaker' }, h('b', null, name), role ? h('span', null, ` · ${role}`) : null) : null,
          textEl,
          o.detail ? h('p', { class: 'detail' }, o.detail) : null,
          o.extra ?? null,
          skipBtn,
          choicesEl));
      p.addEventListener('click', (e) => { if (!done && !(e.target as HTMLElement).closest('button')) finishTyping(); });
      if (this.reduced || o.text.length < 4) finishTyping();
      else {
        let i = 0;
        const step = () => {
          if (done) return;
          i += 2;
          textEl.textContent = o.text.slice(0, i);
          if (i >= o.text.length) finishTyping(); else setTimeout(step, 14);
        };
        step();
      }
      requestAnimationFrame(() => (done ? focusFirst(choicesEl) : skipBtn.focus({ preventScroll: true })));
      const obs = new MutationObserver(() => { if (done) { focusFirst(choicesEl); obs.disconnect(); } });
      obs.observe(choicesEl, { attributes: true, attributeFilter: ['class'] });
    });
  }

  /** Mensaje simple con un botón. */
  async say(speaker: CastId | 'player' | null, text: string, opts: { title?: string; actor?: Actor | null; ok?: string; extra?: Node | null; kicker?: string; cls?: string } = {}): Promise<void> {
    await this.dialog({ speaker, text, title: opts.title, actor: opts.actor, kicker: opts.kicker, extra: opts.extra, cls: opts.cls, choices: [{ label: opts.ok ?? t('next') }] });
  }

  /** Lista de cambios con causa, flechas y colores (bueno/malo según el indicador). */
  deltaList(deltas: DeltaRec[], max = 8): HTMLElement {
    const s = this.s!;
    const merged = new Map<string, DeltaRec>();
    for (const d of deltas) {
      if (!d.delta || Math.abs(d.delta) < 0.05) continue;
      const k = d.stat ? `s:${d.stat}` : d.group ? `g:${d.group}` : d.cast ? `c:${d.cast}` : '';
      if (!k) continue;
      const m = merged.get(k);
      if (m) m.delta += d.delta; else merged.set(k, { ...d });
    }
    const list = [...merged.values()].filter((d) => Math.abs(d.delta) >= 0.5).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, max);
    if (!list.length) return h('p', { class: 'muted' }, t('noVisibleChange'));
    return h('ul', { class: 'deltas' }, list.map((d) => {
      const bad = d.stat && ['debt', 'suspicion', 'evidence', 'unrest'].includes(d.stat);
      const good = bad ? d.delta < 0 : d.delta > 0;
      const label = d.stat ? t(`stat_${d.stat}` as UIKey) : d.group ? t(`group_${d.group}` as UIKey) : `${this.castName(d.cast!)} (${t('cast_trust').toLowerCase()})`;
      return h('li', { class: good ? 'up' : 'down' },
        d.stat ? svgEl(statIcon(d.stat), 'ic') : h('span', { class: 'ic dot' }),
        h('span', { class: 'nm' }, label),
        h('b', null, `${d.delta > 0 ? '▲' : '▼'} ${signed(d.delta)}`),
        d.why && s ? h('small', null, tl(d.why)) : null);
    }));
  }

  // ── HUD ──────────────────────────────────────────────────────────────
  renderHud(extra: (Node | string)[] = []): void {
    clear(this.hud);
    const s = this.s;
    const right = h('div', { class: 'hud-right' },
      btn(svgEl(this.settings.muted ? UI_ICONS.mute : UI_ICONS.sound, 'ic'), () => { this.updateSettings({ muted: !this.settings.muted }); this.renderHud(extra); }, { cls: 'icon-btn', aria: this.settings.muted ? t('unmute') : t('mute'), title: this.settings.muted ? t('unmute') : t('mute') }),
      btn(svgEl(UI_ICONS.pause, 'ic'), () => this.onPauseMenu(), { cls: 'icon-btn', aria: t('pause'), title: t('pause') }));
    if (!s) { this.hud.append(h('div', { class: 'hud-left' }), right); return; }
    const inds = s.phase === 'ending' ? [] : visibleIndicators(s);
    const left = h('div', { class: 'hud-left' }, extra.length ? h('div', { class: 'hud-tag' }, ...extra) : null);
    const bar = h('ul', { class: 'indicators' });
    for (const k of inds) {
      const v = s.stats[k];
      const prev = this.prevStats[k];
      const diff = prev === undefined ? 0 : v - prev;
      const bad = ['debt', 'suspicion', 'evidence', 'unrest'].includes(k);
      const isPct = !['funds', 'privateFunds', 'momentum', 'treasury'].includes(k);
      bar.append(h('li', { class: `ind ${diff > 0.4 ? (bad ? 'down' : 'up') : diff < -0.4 ? (bad ? 'up' : 'down') : ''}`, title: t(`stat_${k}` as UIKey) },
        svgEl(statIcon(k), 'ic'),
        h('span', { class: 'nm' }, t(`stat_${k}` as UIKey)),
        h('b', null, num(Math.round(v))),
        isPct ? h('i', { class: 'meter', style: `--v:${Math.max(0, Math.min(100, v))}%` }) : null,
        Math.abs(diff) > 0.4 ? h('em', { class: 'arrow', 'aria-label': signed(diff) }, diff > 0 ? '▲' : '▼') : null));
      this.prevStats[k] = v;
    }
    left.append(bar);
    this.hud.append(left, right);
  }
  snapshotStats(): void { if (this.s) for (const k of visibleIndicators(this.s)) this.prevStats[k] = this.s.stats[k]; }

  toast(text: string): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    window.setTimeout(() => this.toastEl.classList.remove('show'), 1800);
  }

  // ── Guardado y pausa ─────────────────────────────────────────────────
  save(screen: string): void {
    if (!this.s) return;
    this.screen = screen;
    try { saveGame(this.s, screen); } catch { /* el guardado nunca debe romper la partida */ }
  }

  openOverlay(content: HTMLElement): void {
    clear(this.overlay);
    this.overlay.append(content);
    this.overlay.classList.remove('hidden');
    requestAnimationFrame(() => focusFirst(this.overlay));
  }
  closeOverlay(): void {
    this.overlay.classList.add('hidden');
    clear(this.overlay);
    if (this.paused) this.pause(false);
  }
  pause(p: boolean): void {
    this.paused = p;
    this.pauseListeners.forEach((f) => f(p));
    if (p) gameplayStop(); else if (this.s && this.s.phase !== 'ending') gameplayStart();
    if (p && this.overlay.classList.contains('hidden')) this.onPauseMenu();
  }

  /** Pausa publicitaria en una transición natural: silencia y bloquea la entrada. */
  async adBreak(): Promise<void> {
    const block = h('div', { class: 'ad-block' }, h('p', null, t('adBreak')));
    await naturalBreak().catch(() => {});
    block.remove();
  }
  blockForAd(on: boolean): void {
    adPause(on);
    document.body.classList.toggle('input-blocked', on);
    this.pauseListeners.forEach((f) => f(on));
  }

  log(kind: string, data?: Record<string, unknown>): void { logEvent(kind, data); }
}

/** Texto localizado corto para L opcional. */
export function L_(x: L | undefined): string { return tl(x); }
