// Capa de plataforma. Funciona con el SDK de Poki o sin él (local, bloqueadores, fallos de red).
// Referencia: https://sdk.poki.com/html5/ (leída el 31-oct-2026; ver docs/POKI.md)
// Las pausas publicitarias solo se piden en transiciones naturales y nunca bloquean decisiones.

interface PokiSDKLike {
  init(): Promise<void>;
  gameLoadingFinished(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  commercialBreak(onStart?: () => void): Promise<void>;
  setDebug?(v: boolean): void;
}

declare global { interface Window { PokiSDK?: PokiSDKLike } }

type Hooks = { pause: () => void; resume: () => void };

let sdk: PokiSDKLike | null = null;
let playing = false;
let hooks: Hooks = { pause: () => {}, resume: () => {} };
let lastBreak = 0;

/** Solo en la compilación para Poki se inyecta el script del SDK. */
export const POKI_BUILD: boolean = import.meta.env.MODE === 'poki';

export async function initPlatform(h: Hooks): Promise<void> {
  hooks = h;
  if (!POKI_BUILD) return;
  const w = window.PokiSDK;
  if (!w) return; // bloqueador de anuncios o SDK no cargado: el juego sigue igual
  try {
    await Promise.race([w.init(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))]);
    sdk = w;
    if (import.meta.env.DEV) sdk.setDebug?.(true);
  } catch {
    sdk = window.PokiSDK ?? null; // Poki recomienda continuar aunque init falle
  }
}

export function loadingFinished(): void { try { sdk?.gameLoadingFinished(); } catch { /* nada */ } }

export function gameplayStart(): void {
  if (playing) return;
  playing = true;
  try { sdk?.gameplayStart(); } catch { /* nada */ }
}

export function gameplayStop(): void {
  if (!playing) return;
  playing = false;
  try { sdk?.gameplayStop(); } catch { /* nada */ }
}

/**
 * Pausa publicitaria en una transición natural. Sin SDK se resuelve al instante.
 * Silencia el audio y bloquea la entrada durante el anuncio.
 */
export async function naturalBreak(): Promise<void> {
  if (!sdk) return;
  if (Date.now() - lastBreak < 60_000) return; // no saturar
  const wasPlaying = playing;
  gameplayStop();
  try {
    await sdk.commercialBreak(() => hooks.pause());
  } catch { /* nada */ }
  lastBreak = Date.now();
  hooks.resume();
  if (wasPlaying) gameplayStart();
}

export function platformName(): string { return sdk ? 'poki' : 'local'; }

/** Evita que flechas y espacio desplacen la página que contiene el iframe. */
export function preventScrollKeys(): void {
  window.addEventListener('keydown', (e) => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  }, { passive: false });
  window.addEventListener('wheel', (e) => { if ((e.target as HTMLElement).closest?.('.scroll')) return; e.preventDefault(); }, { passive: false });
}
