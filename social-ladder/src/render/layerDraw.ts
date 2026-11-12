import { WORLD_W } from './environments';
import type { LayeredStage } from './stageLayers';

/**
 * Draws a layered stage onto a 2D canvas with the camera at `camX`, outside
 * Phaser (cutscenes, title screen). Far layers move less than near ones.
 */
export function drawLayeredWorld(ctx: CanvasRenderingContext2D, st: LayeredStage, camX: number) {
  const layer = (img: HTMLCanvasElement, f: number) => {
    const off = Math.round(-camX * f);
    const start = (((off % WORLD_W) + WORLD_W) % WORLD_W) - WORLD_W;
    for (let x = start; x < WORLD_W; x += WORLD_W) ctx.drawImage(img, x, 0);
  };
  layer(st.sky, 0.1);
  const ox = Math.round(st.scene.sky.x - camX * 0.14);
  const oy = st.scene.sky.y;
  const g = ctx.createRadialGradient(ox, oy, 2, ox, oy, 34);
  g.addColorStop(0, 'rgba(255,241,201,0.55)');
  g.addColorStop(1, 'rgba(255,241,201,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(ox - 34, oy - 34, 68, 68);
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(st.moon, ox - (st.moon.width >> 1), oy - (st.moon.height >> 1));
  layer(st.far, 0.3);
  layer(st.mid, 0.55);
  layer(st.base, 1);
}
