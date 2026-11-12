import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import { useEngineStatic } from '../hooks';
import { HeroQuips } from './HeroQuips';

/** Mounts the Phaser street scene (lazy-loaded so the UI paints first). */
export function SceneView() {
  const engine = useEngineStatic();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let game: Phaser.Game | null = null;
    let cancelled = false;
    void import('../../render/StreetScene').then(({ createGame }) => {
      if (cancelled || !ref.current) return;
      game = createGame(ref.current, engine);
    });
    // The frame changes size with the layout (e.g. landscape side column), not only with the window.
    const ro = new ResizeObserver(() => game?.scale.refresh());
    if (ref.current) ro.observe(ref.current);
    return () => {
      cancelled = true;
      ro.disconnect();
      game?.destroy(true);
    };
  }, [engine]);

  return (
    <div className="scene-frame">
      <div className="scene-wrap">
        <div className="scene" ref={ref} />
        <HeroQuips />
      </div>
    </div>
  );
}
