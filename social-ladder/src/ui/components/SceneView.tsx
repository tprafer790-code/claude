import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import { useEngineStatic } from '../hooks';

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
    return () => {
      cancelled = true;
      game?.destroy(true);
    };
  }, [engine]);

  return (
    <div className="scene-frame">
      <div className="scene" ref={ref} />
    </div>
  );
}
