import { createRoot } from 'react-dom/client';
import '@fontsource/press-start-2p/400.css';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import './styles/game.css';
import { Runtime } from './game/runtime';
import { App } from './ui/App';
import { fx } from './fx/FxLayer';

const runtime = new Runtime();
runtime.start();

// Exposed for debugging and automated browser tests.
(window as unknown as { __socialLadder: Runtime }).__socialLadder = runtime;
(window as unknown as { __socialLadderFx: typeof fx }).__socialLadderFx = fx;

createRoot(document.getElementById('root')!).render(<App runtime={runtime} />);
