import { useEffect, useMemo, useRef, useState } from 'react';
import { STAGES } from '../../data/stages';
import { buildLayeredStage } from '../../render/stageLayers';
import { drawLayeredWorld } from '../../render/layerDraw';
import { WORLD_H, WORLD_W } from '../../render/environments';
import { audio } from '../../audio/audio';
import { t } from '../../i18n';

/**
 * Opening title card: the player's current neighbourhood drifting by behind
 * the logo. Any key or tap starts the game (and unlocks audio).
 */
export function TitleScreen({ stageIndex, onStart }: { stageIndex: number; onStart: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [leaving, setLeaving] = useState(false);
  const stage = STAGES[stageIndex];
  const art = useMemo(() => buildLayeredStage(stageIndex)!, [stageIndex]);

  const start = () => {
    if (leaving) return;
    audio.unlock();
    audio.whoosh();
    setLeaving(true);
    window.setTimeout(onStart, 650);
  };

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      drawLayeredWorld(ctx, art, (now - t0) / 1000 * 6);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      start();
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey, { capture: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [art]);

  return (
    <div className={`title-screen ${leaving ? 'leaving' : ''}`} style={{ ['--accent' as string]: stage.accent }} onPointerDown={start} role="dialog" aria-label="THE SOCIAL LADDER">
      <canvas ref={ref} width={WORLD_W} height={WORLD_H} className="cine-canvas" />
      <div className="cine-grain" />
      <div className="title-logo">
        <span className="title-the">THE</span>
        <h1>
          <span>SOCIAL</span>
          <span>LADDER</span>
        </h1>
        <p className="title-tag">{t('tagline')}</p>
      </div>
      <div className="title-foot">
        <p className="title-press">{t(window.matchMedia('(pointer: coarse)').matches ? 'titleTap' : 'titlePress')}</p>
        <small>{t('titleProgress', { n: stageIndex + 1, stage: stage.name })}</small>
      </div>
    </div>
  );
}
