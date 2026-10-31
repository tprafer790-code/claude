// Punto de entrada: monta la interfaz, la capa de plataforma y (solo en desarrollo) las herramientas.
import './styles/main.css';
import './styles/characters.css';
import { adPause } from './audio/audio';
import { initPlatform, loadingFinished, preventScrollKeys } from './platform/poki';
import { initLog } from './telemetry/playtestLog';
import { App } from './ui/app';
import { ctx, R } from './ui/router';
import './ui/screens/menu';
import './ui/screens/setup';
import './ui/screens/campaign';
import './ui/screens/election';
import './ui/screens/government';
import './ui/screens/ending';

async function boot() {
  const root = document.getElementById('app')!;
  initLog();
  preventScrollKeys();
  const app = new App(root);
  ctx.app = app;
  app.onPauseMenu = () => R.pauseMenu();
  await initPlatform({
    pause: () => app.blockForAd(true),
    resume: () => { app.blockForAd(false); adPause(false); },
  });
  document.getElementById('boot')?.remove();
  loadingFinished();
  R.title();
  if (import.meta.env.DEV) {
    const m = await import('./dev/devtools');
    m.installDevtools(app);
  }
}

void boot();
