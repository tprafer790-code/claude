import { createRoot } from 'react-dom/client';
import '@fontsource/press-start-2p/400.css';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import './styles/game.css';
import { Runtime } from './game/runtime';
import { App } from './ui/App';
import { fx } from './fx/FxLayer';
import { PORTAL } from './edition';
import { portal } from './portal';

/**
 * Inside a portal's iframe, the wheel and the arrow/space keys must not scroll
 * the host page. Scrollable lists in the game still scroll.
 */
function keepScrollInside() {
  const scrollable = (el: Element | null): boolean => {
    for (; el && el !== document.body; el = el.parentElement) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) return true;
    }
    return false;
  };
  window.addEventListener('wheel', (e) => !scrollable(e.target as Element) && e.preventDefault(), { passive: false });
  window.addEventListener('keydown', (e) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (['ArrowUp', 'ArrowDown', ' '].includes(e.key) && !scrollable(e.target as Element)) e.preventDefault();
  });
}

async function boot() {
  await portal.init();
  portal.loadingStart();
  if (PORTAL !== 'none') keepScrollInside();

  const runtime = new Runtime();
  runtime.start();
  portal.onPause((paused) => {
    runtime.paused = paused;
    if (!paused) runtime.saveNow();
  });

  // Exposed for debugging and automated browser tests, except on the portal itself.
  if (PORTAL === 'none' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    (window as unknown as { __socialLadder: Runtime }).__socialLadder = runtime;
    (window as unknown as { __socialLadderFx: typeof fx }).__socialLadderFx = fx;
  }

  createRoot(document.getElementById('root')!).render(<App runtime={runtime} />);
  portal.loadingStop();
}

void boot();
