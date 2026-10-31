// Comprobación de equilibrio ideológico: mismas estrategias empezando desde la izquierda y desde la derecha.
// Uso: npm run symmetry -- [partidas]
import { playBot, type Strategy } from '../src/core/bot';
import type { CountryId, Orientation } from '../src/core/types';

const N = Number(process.argv[2] ?? 40);
for (const c of ['es', 'us', 'br'] as CountryId[]) {
  for (const st of ['random', 'honest'] as Strategy[]) {
    const out: string[] = [];
    for (const o of ['left', 'right'] as Orientation[]) {
      let camp = 0; let reel = 0;
      for (let i = 0; i < N; i++) {
        const r = playBot(500 + i * 104729, c, st, { orientation: o });
        if (r.wonCampaign) camp++;
        if (['winner', 'hollow_winner', 'corrupt_winner', 'reformer'].includes(r.ending.id)) reel++;
      }
      out.push(`${o === 'left' ? 'izq' : 'der'}: campaña ${Math.round((camp / N) * 100)}% · final con victoria ${Math.round((reel / N) * 100)}%`);
    }
    console.log(`${c.toUpperCase()} ${st.padEnd(7)} ${out.join(' | ')}`);
  }
}
