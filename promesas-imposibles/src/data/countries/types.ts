import type { CastId, GroupId, L, Orientation, Party, StatId } from '../../core/types';

export interface Region {
  id: string;
  name: L;
  /** Escaños (España), compromisarios (EE. UU.) o peso poblacional (Brasil) */
  seats: number;
  /** Desplazamiento ideológico local (+ derecha) */
  shift: number;
  /** Multiplicadores de tamaño de grupo en la región */
  mix?: Partial<Record<GroupId, number>>;
  /** Partidos regionales que solo concurren aquí */
  regionalParties?: string[];
  /** Posición en el mapa (0-100) */
  x: number;
  y: number;
}

export type RoundSlot = 'budget' | 'bill' | 'event' | 'opposition' | 'crisis' | 'midterm' | 'reelection';

export interface Chamber { id: string; name: L; size: number }

export interface CountryDef {
  id: 'es' | 'us' | 'br';
  name: L;
  adjective: L;
  system: 'parliamentary' | 'presidential-us' | 'presidential-br';
  titles: {
    /** Cargo al que aspira el jugador */
    leader: L;
    candidate: L;
    headOfState: L;
    legislature: L;
    fastTrack: L; // decreto-ley / orden ejecutiva / medida provisional
    fall: L; // moción de censura / impeachment
    vote: L; // referéndum / iniciativa / plebiscito
  };
  chambers: Chamber[];
  /** Cámara que decide la investidura / mayoría de gobierno */
  mainChamber: string;
  groupSizes: Record<GroupId, number>;
  baseTurnout: number;
  /** 0-1: cuánto afecta la movilización a la participación */
  turnoutSensitivity: number;
  compulsory: boolean;
  regions: Region[];
  /** Partidos ficticios. Se construyen según la orientación del jugador. */
  parties: (o: Orientation) => Party[];
  roundPlan: RoundSlot[];
  startStats: Partial<Record<StatId, number>>;
  /** Ingresos base por ronda (puntos de presupuesto) */
  revenueBase: number;
  castNames: Record<CastId, string>;
  /** Simplificaciones que el juego hace y explica */
  rules: L[];
  /** Instantánea real fechada (solo contexto, nunca mecánica) */
  reality: { date: string; lines: L[]; sources: string[] };
  flag: { kind: 'es' | 'us' | 'br' };
  /** Ajuste fino del centro ideológico para que izquierda y derecha partan igualadas (ver scripts/symmetry.ts) */
  calibration?: number;
}
