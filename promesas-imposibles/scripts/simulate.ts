// Simulación masiva: detecta estrategias dominantes y problemas de balance.
// Uso: npm run simulate -- [partidas por combinación]
import { playBot, type Strategy } from '../src/core/bot';
import type { CountryId } from '../src/core/types';

const N = Number(process.argv[2] ?? 60);
const countries: CountryId[] = (process.argv[3]?.split(',') as CountryId[]) ?? ['es', 'us', 'br'];
const strategies: Strategy[] = ['random', 'honest', 'corrupt', 'populist', 'technocrat', 'authoritarian'];
const rows: string[] = [];
for (const c of countries) {
  for (const st of strategies) {
    const endings: Record<string, number> = {};
    let camp = 0; let wb = 0; let integ = 0; let rounds = 0; let evCount = 0;
    for (let i = 0; i < N; i++) {
      const r = playBot(1000 + i * 7919, c, st);
      endings[r.ending.id] = (endings[r.ending.id] ?? 0) + 1;
      if (r.wonCampaign) camp++;
      wb += r.stats.wellbeing; integ += r.stats.integrity; rounds += r.rounds; evCount += r.events.length;
    }
    const top = Object.entries(endings).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${Math.round((v / N) * 100)}%`).join(' ');
    rows.push(`${c.toUpperCase()} ${st.padEnd(13)} campaña ${String(Math.round((camp / N) * 100)).padStart(3)}% | bienestar ${(wb / N).toFixed(1)} | integridad ${(integ / N).toFixed(1)} | rondas ${(rounds / N).toFixed(1)} | eventos ${(evCount / N).toFixed(1)} | ${top}`);
  }
}
console.log(rows.join('\n'));
