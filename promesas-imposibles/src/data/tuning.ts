// ─────────────────────────────────────────────────────────────
//  AJUSTES CENTRALES. Cambia aquí duración, dificultad y ritmo.
//  Ver docs/GUIA_AJUSTES.md
// ─────────────────────────────────────────────────────────────
import type { GroupId, StatId } from '../core/types';

export const TUNING = {
  /** Jornadas de campaña y acciones por jornada (duración de la campaña) */
  campaignDays: 6,
  actionsPerDay: 2,
  /** Fondos de campaña iniciales */
  startFunds: 10,
  /** Rondas de mandato (se puede sobrescribir por país con roundPlan) */
  rounds: 12,
  /** Eventos cortos por ronda: [mínimo, máximo] */
  shortEventsPerRound: [1, 2] as [number, number],
  /** Probabilidad base de que una ronda traiga 2 eventos cortos en vez de 1 */
  secondShortEventChance: 0.45,
  /** Pausa publicitaria cada N rondas de gobierno (solo transiciones naturales) */
  adBreakEveryRounds: 3,

  /** DIFICULTAD: multiplica los efectos negativos de eventos y la deriva */
  difficulty: 1.0,
  /** Ruido electoral nacional máximo (± puntos de utilidad) */
  electionNoise: 0.25,
  /** Ruido por grupo */
  groupNoise: 0.15,
  /** Ventaja del partido rival: en campaña (aparato) y en la reelección (desgaste del Gobierno) */
  rivalCampaignBonus: 0.2,
  rivalReelectionBonus: 0.7,
  /** Temperatura del reparto de voto (mayor = más disperso) */
  voteTemperature: 0.55,

  /** Velocidad a la que la popularidad converge con la satisfacción media */
  popularityDrift: 0.22,
  /** Velocidad a la que la satisfacción de grupo converge con su objetivo */
  satisfactionDrift: 0.25,
  /** Velocidad a la que los sectores tienden a su nivel de financiación */
  sectorDrift: 0.18,

  /** Corrupción: probabilidad por ronda de generar pruebas = suspicion * factor */
  evidencePerSuspicion: 0.006,
  /** Umbrales de investigación */
  evidenceThresholds: { press: 25, judicial: 55, charges: 80 },
  /** Decaimiento natural de la sospecha por ronda */
  suspicionDecay: 2,

  /** Debate */
  debateRounds: 4,
  debateRematchRounds: 3,
  debateTurnSeconds: 15,

  /** Límite de indicadores principales visibles */
  maxVisibleIndicators: 5,

  /** Indicadores iniciales comunes (los países pueden sobrescribirlos) */
  startStats: {
    popularity: 35, wellbeing: 50, economy: 50, support: 0, integrity: 70,
    treasury: 20, debt: 60, jobs: 50, housing: 40, services: 50, security: 55, environment: 45,
    diplomacy: 55, credibility: 55, suspicion: 0, evidence: 0, privateFunds: 0,
    momentum: 0, funds: 10, unrest: 20,
  } as Record<StatId, number>,

  /** Peso de cada sector en la calidad de vida */
  wellbeingWeights: { services: 0.26, housing: 0.22, jobs: 0.26, security: 0.14, environment: 0.12 },
} as const;

/** Peso de la satisfacción de cada grupo en los distintos sectores. */
export const GROUP_INTERESTS: Record<GroupId, Partial<Record<StatId, number>>> = {
  youth: { housing: 0.4, jobs: 0.3, environment: 0.2, integrity: 0.1 },
  pensioners: { services: 0.5, security: 0.3, economy: 0.2 },
  workers: { jobs: 0.4, housing: 0.25, services: 0.2, economy: 0.15 },
  business: { economy: 0.55, jobs: 0.15, security: 0.15, integrity: 0.15 },
  rural: { services: 0.3, economy: 0.3, security: 0.2, environment: 0.2 },
  urban: { housing: 0.3, environment: 0.2, integrity: 0.25, services: 0.25 },
  public: { services: 0.6, jobs: 0.2, integrity: 0.2 },
};

/** Ideología media de cada grupo (-2 izquierda … 2 derecha) y dispersión interna */
export const GROUP_IDEOLOGY: Record<GroupId, { mean: number; spread: number }> = {
  youth: { mean: -0.5, spread: 1.0 },
  pensioners: { mean: 0.4, spread: 0.8 },
  workers: { mean: -0.4, spread: 0.9 },
  business: { mean: 0.8, spread: 0.7 },
  rural: { mean: 0.6, spread: 0.8 },
  urban: { mean: -0.3, spread: 0.9 },
  public: { mean: -0.5, spread: 0.8 },
};

export const GROUPS: GroupId[] = ['youth', 'pensioners', 'workers', 'business', 'rural', 'urban', 'public'];
