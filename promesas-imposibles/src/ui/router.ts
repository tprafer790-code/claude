// Enrutado entre pantallas. Cada módulo de pantalla registra sus funciones aquí
// para evitar dependencias circulares.
import type { ElectionResult } from '../core/types';
import type { App } from './app';

export const ctx = { app: null as unknown as App };

export const R = {
  title: () => {},
  setup: () => {},
  programme: () => {},
  campaign: () => {},
  election: () => {},
  electionNight: (_res: ElectionResult) => {},
  formation: () => {},
  office: () => {},
  report: () => {},
  reelection: () => {},
  ending: () => {},
  resume: () => {},
  pauseMenu: () => {},
  settings: (_onClose?: () => void) => {},
} as Record<string, (...a: never[]) => void> & {
  title(): void; setup(): void; programme(): void; campaign(): void; election(): void; electionNight(res: ElectionResult): void;
  formation(): void; office(): void; report(): void; reelection(): void; ending(): void; resume(): void; pauseMenu(): void; settings(onClose?: () => void): void;
};
