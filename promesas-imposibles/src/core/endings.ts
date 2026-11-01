// Cálculo del final, el legado y las decisiones que más influyeron.
import { ENDINGS, type EndingCtx } from '../data/endings';
import { housingEpilogue } from './housingStory';
import { hasFlag } from './state';
import type { EndingResult, GameState, L } from './types';

export function endingContext(s: GameState, phase: EndingCtx['phase'], won: boolean): EndingCtx {
  // Al final del mandato, las promesas pendientes cuentan como no cumplidas
  const total = s.promises.length || 1;
  const kept = s.promises.filter((p) => p.status === 'kept').length;
  return {
    phase, won,
    removed: hasFlag(s, 'removed'), resigned: hasFlag(s, 'resigned'), autocrat: hasFlag(s, 'autocrat'),
    wellbeing: s.stats.wellbeing, integrity: s.stats.integrity, evidence: s.stats.evidence, suspicion: s.stats.suspicion,
    economy: s.stats.economy, keptRatio: kept / total, popularity: s.stats.popularity,
    crisesResolved: s.crises.filter((c) => c.resolved).length, crisesFailed: s.crises.filter((c) => !c.resolved).length,
  };
}

function tier(v: number, lines: [number, L][]): L { for (const [min, l] of lines) if (v >= min) return l; return lines[lines.length - 1][1]; }

export function computeEnding(s: GameState, phase: EndingCtx['phase'], won: boolean): EndingResult {
  const ctx = endingContext(s, phase, won);
  const def = ENDINGS.find((e) => e.when(ctx))!;
  const lines: L[] = [];
  if (phase === 'term') {
    lines.push(tier(ctx.wellbeing, [
      [62, { es: 'Calidad de vida: la gente vive claramente mejor que al empezar.', en: 'Quality of life: people clearly live better than at the start.' }],
      [50, { es: 'Calidad de vida: algo mejor, sin milagros.', en: 'Quality of life: somewhat better, no miracles.' }],
      [0, { es: 'Calidad de vida: el país está peor que cuando llegaste.', en: 'Quality of life: the country is worse off than when you arrived.' }],
    ]));
    lines.push(tier(ctx.integrity, [
      [65, { es: 'Instituciones: sólidas, incluso un poco más fuertes.', en: 'Institutions: solid, even slightly stronger.' }],
      [40, { es: 'Instituciones: con abolladuras, pero en pie.', en: 'Institutions: dented, but standing.' }],
      [0, { es: 'Instituciones: tocadas. Habrá que reconstruir.', en: 'Institutions: badly damaged. Rebuilding needed.' }],
    ]));
    lines.push(tier(ctx.evidence + ctx.suspicion / 2, [
      [45, { es: 'Corrupción: tu nombre aparece en sumarios.', en: 'Corruption: your name appears in court files.' }],
      [15, { es: 'Corrupción: sombras y rumores sin condena.', en: 'Corruption: shadows and rumours, no conviction.' }],
      [0, { es: 'Corrupción: mandato limpio.', en: 'Corruption: a clean term.' }],
    ]));
    const kept = s.promises.filter((p) => p.status === 'kept').length;
    lines.push({ es: `Promesas: ${kept} de ${s.promises.length} cumplidas.`, en: `Promises: ${kept} of ${s.promises.length} kept.` });
    if (s.crises.length) lines.push({ es: `Crisis: ${ctx.crisesResolved} gestionadas, ${ctx.crisesFailed} mal resueltas.`, en: `Crises: ${ctx.crisesResolved} handled, ${ctx.crisesFailed} badly handled.` });
    if (hasFlag(s, 'peace_signed')) lines.push({ es: 'Pasarás a la historia por cerrar la crisis de Varnia sin una guerra abierta.', en: 'History will remember you for ending the Varnia crisis without open war.' });
  }
  const epi = housingEpilogue(s, phase === 'term' && !!s.housing?.offeredRound);
  if (epi) lines.push(epi);
  const keyDecisions = [...s.decisions].sort((a, b) => b.impact - a.impact).slice(0, 3).map((d) => d.label);
  const score = Math.round(ctx.wellbeing * 0.4 + ctx.integrity * 0.25 + ctx.keptRatio * 20 + (won ? 15 : 0) - ctx.evidence * 0.2);
  return { id: def.id, title: def.title, text: def.text, lines, keyDecisions, score };
}
