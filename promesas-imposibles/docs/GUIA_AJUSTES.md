# Guía de ajustes

Todo el contenido y casi todo el equilibrio están en datos editables. Después de cualquier cambio, ejecuta:

```bash
npm run validate     # referencias, textos ES/EN, mínimos del encargo
npm test             # invariantes y partidas completas con robot
npm run simulate     # tasas de victoria y finales por país y estrategia
npm run symmetry     # equilibrio izquierda/derecha
```

## 1. Duración y ritmo

| Qué | Dónde | Efecto |
|---|---|---|
| Jornadas de campaña y acciones por jornada | `TUNING.campaignDays`, `TUNING.actionsPerDay` (`src/data/tuning.ts`) | Duración de la campaña |
| Hito de cada jornada (voluntarios, empresario, entrevista, debate) | `DAY_BEATS` (`src/core/campaign.ts`) | Orden de la campaña |
| Rondas de mandato y tipo de cada ronda | `roundPlan` de cada país (`src/data/countries/*.ts`) | Duración del gobierno (10–14 rondas; la última debe ser `reelection`) |
| Eventos cortos por ronda | `TUNING.shortEventsPerRound`, `TUNING.secondShortEventChance` | Densidad de la ronda |
| Turnos del debate y segundos por turno | `TUNING.debateRounds`, `debateRematchRounds`, `debateTurnSeconds` | Duración y presión del debate |
| Pausas publicitarias | `TUNING.adBreakEveryRounds` y el límite de 60 s en `src/platform/poki.ts` | Frecuencia de anuncios |

## 2. Dificultad

| Qué | Dónde | Notas |
|---|---|---|
| Multiplicador de efectos negativos | `TUNING.difficulty` | 1,0 por defecto |
| Ventaja del rival en campaña / en la reelección | `TUNING.rivalCampaignBonus` (0,2), `TUNING.rivalReelectionBonus` (0,7) | Subir la segunda hace la reelección más difícil |
| Azar electoral | `TUNING.electionNoise`, `TUNING.groupNoise` | Ruido acotado; se muestra como factor «Imprevistos» |
| Dispersión del voto | `TUNING.voteTemperature` | Mayor = más voto a terceros partidos |
| Regla de victoria en España | `compute()` en `src/core/election.ts` | Mayoría de bloque sin quedar muy por detrás del rival, o primera fuerza con +15 % de escaños |
| Corrupción | `TUNING.evidencePerSuspicion`, `TUNING.evidenceThresholds` (25/55/80), `TUNING.suspicionDecay` | Probabilidad y umbrales de investigación |

## 3. Economía y sectores

- Ingresos: `revenueBase` de cada país y `TAX_FACTOR` en `src/core/government.ts`.
- Coste de cada línea de presupuesto: `LINE_COST`. Objetivos de cada sector según su financiación: `closeRound()` (`services: 32 + 16·nivel`, etc.).
- Velocidad de convergencia: `TUNING.sectorDrift`, `satisfactionDrift`, `popularityDrift`.
- Peso de cada sector en la calidad de vida: `TUNING.wellbeingWeights`.
- Intereses de cada grupo social (se solapan a propósito): `GROUP_INTERESTS`. Ideología media y dispersión: `GROUP_IDEOLOGY`.

## 4. Equilibrio ideológico

Cada país tiene un centro ideológico calculado a partir de sus grupos y regiones (`ideologyCenter()`), más un ajuste fino `calibration` en `src/data/countries/*.ts` (España 0,05; EE. UU. 0,015; Brasil −0,015). Se eligió con una búsqueda en rejilla para que la misma estrategia gane por igual desde la izquierda y desde la derecha. Si cambias partidos, regiones o grupos, vuelve a ejecutar `npm run symmetry` y corrige `calibration` (positivo favorece a la izquierda, negativo a la derecha).

## 5. Contenido

- **Eventos:** `src/data/events/` (`chains.ts` para cadenas, `standalone.ts`, `national.ts`). Cada evento declara condiciones (`conditions`), opciones (`choices`), efectos inmediatos o diferidos (`delay`), continuación (`chain`), repetición (`repeat`) y variantes por país (`variants`). `scheduledOnly: true` hace que solo aparezca si otra decisión lo programa.
- **Políticas:** `src/data/policies.ts` (coste inicial y por ronda, retraso, ganadores, perdedores, riesgo, orientación).
- **Debate:** tabla de eficacia `DEBATE_TABLE` y frases por candidatura en `src/data/debate.ts`.
- **Finales:** `src/data/endings.ts`; se evalúan en orden y gana el primero que cumple su condición.
- **Textos de interfaz:** `src/i18n/strings.ts`. Para añadir un idioma, añade la clave a `Lang` y una traducción a cada entrada; si falta, se usa el inglés.
- **Aspecto de personajes:** `CharSpec` en `src/art/characters.ts`. **Escenarios y posición de los objetos interactivos:** `src/art/scenes.ts` (`HOTSPOTS`; el tercio derecho de la sede y del despacho queda libre para la agenda lateral).

## 6. Modo desarrollo

`npm run dev` y pulsa la tecla `º` (o el botón «DEV»). Permite crear partidas en cualquier país, saltar a campaña, debate, elección, gobierno o reelección, avanzar rondas, lanzar cualquier evento, editar indicadores, forzar el modo sin almacenamiento, probar cualquier final y ver la semilla, los efectos pendientes y el registro de decisiones. No se incluye en `npm run build` ni en `npm run build:poki`.
