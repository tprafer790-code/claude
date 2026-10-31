// Tipos compartidos del motor. Sin dependencias de DOM.

export type Lang = 'es' | 'en';
/** Texto localizado. Todo el contenido narrativo usa este tipo. */
export type L = { es: string; en: string };

export type CountryId = 'es' | 'us' | 'br';
export type CandidateId = 'hippie' | 'impecable' | 'veterano' | 'influencer';
export type Orientation = 'left' | 'right';

export type IndicatorId = 'popularity' | 'wellbeing' | 'economy' | 'support' | 'integrity';
export type DetailId =
  | 'treasury' | 'debt' | 'jobs' | 'housing' | 'services' | 'security' | 'environment'
  | 'diplomacy' | 'credibility' | 'suspicion' | 'evidence' | 'privateFunds'
  | 'momentum' | 'funds' | 'unrest';
export type StatId = IndicatorId | DetailId;

export type GroupId = 'youth' | 'pensioners' | 'workers' | 'business' | 'rural' | 'urban' | 'public';
export type CastId =
  | 'advisor' | 'economist' | 'partner' | 'opposition' | 'journalist'
  | 'unionist' | 'tycoon' | 'citizenA' | 'citizenB' | 'citizenC';

export type AxisId = 'taxes' | 'services' | 'housing' | 'jobs' | 'security' | 'environment';
/** -1 = enfoque de izquierdas, 0 = mixto, 1 = enfoque de derechas */
export type Stance = -1 | 0 | 1;

export type SystemId = 'promises' | 'budget' | 'laws' | 'pacts' | 'housing' | 'jobs' | 'debt' | 'foreign' | 'security' | 'institutions' | 'corruption';
export type HotspotId = 'phone' | 'desk' | 'tv' | 'door' | 'folder' | 'map';
export type SceneId = 'hq' | 'street' | 'studio' | 'office' | 'parliament';

export type Phase =
  | 'setup' | 'campaign' | 'debate' | 'election' | 'formation'
  | 'government' | 'reelection' | 'ending';

export type DebateMove = 'attack' | 'stat' | 'story' | 'promise';
export type DebateCard = 'data' | 'story' | 'attack' | 'deflect' | 'promise';
export type Mood = 'idle' | 'talk' | 'happy' | 'angry' | 'nervous' | 'sad';

/** Un efecto atómico. Si `delay` > 0 se agenda como consecuencia diferida. */
export interface Effect {
  stat?: StatId;
  delta?: number;
  group?: GroupId;
  sat?: number; // cambio de satisfacción del grupo
  cast?: CastId;
  trust?: number;
  flag?: string;
  unflag?: string;
  /** Cumple o rompe la promesa del eje indicado. 'match' se resuelve con la postura del jugador. */
  promise?: { axis: AxisId; stance: Stance };
  favor?: { creditor: CastId; demand: string; dueIn: number };
  clearFavor?: string;
  refuseFavor?: string;
  chain?: { event: string; in: number };
  loyalty?: { party: string | 'partners' | 'all'; delta: number };
  unlock?: SystemId;
  /** Aprueba una política del catálogo (p. ej. ley de la oposición) */
  passPolicy?: string;
  /** Acciones especiales resueltas por el motor */
  special?: 'fall_vote' | 'resign' | 'referendum' | 'crisis_resolved' | 'crisis_failed' | 'postpone_election' | 'revert_fast';
  delay?: number;
  /** Texto de causa mostrado en el informe de ronda. */
  why?: L;
}

export interface Cond {
  minRound?: number;
  maxRound?: number;
  flags?: string[];
  notFlags?: string[];
  stats?: Partial<Record<StatId, [number, number]>>;
  unlocked?: SystemId[];
  countries?: CountryId[];
  phases?: Phase[];
  castTrust?: Partial<Record<CastId, [number, number]>>;
  hasFavorFrom?: CastId;
  orientation?: Orientation;
  /** El jugador tiene una promesa con esa postura en ese eje */
  promise?: { axis: AxisId; stance?: Stance };
}

export type ChoiceTag = 'negotiate' | 'reject' | 'concede' | 'investigate' | 'delay' | 'corrupt' | 'lie' | 'authoritarian' | 'support' | 'transparent';

export interface Choice {
  id: string;
  label: L;
  /** Línea de reacción tras elegir. */
  result: L;
  effects: Effect[];
  requires?: Cond;
  tags?: ChoiceTag[];
  /** Coste de tesorería o fondos privados mostrado en el botón. */
  cost?: { treasury?: number; privateFunds?: number; funds?: number };
  /** Riesgo con probabilidad (0-1) */
  risk?: { chance: number; effects: Effect[]; text: L };
  mood?: Mood;
}

export interface EventVariant { title?: L; text?: L; choices?: Record<string, Partial<Pick<Choice, 'label' | 'result'>>> }

export interface GameEvent {
  id: string;
  kind: 'main' | 'short';
  category: 'economy' | 'social' | 'housing' | 'labor' | 'corruption' | 'diplomacy' | 'disaster' | 'internal' | 'institutions' | 'media' | 'parliament' | 'security' | 'campaign';
  chain?: { id: string; stage: number; of: number };
  hotspot: HotspotId;
  speaker: CastId;
  title: L;
  text: L;
  detail?: L;
  conditions: Cond;
  weight: number;
  repeat: { max: number; cooldown: number };
  /** Eventos que no pueden coexistir en la misma partida. */
  excludes?: string[];
  variants?: Partial<Record<CountryId, EventVariant>>;
  choices: Choice[];
  /** Si true, solo aparece por encadenamiento o programación, nunca por sorteo. */
  scheduledOnly?: boolean;
}

export interface Policy {
  id: string;
  axis?: AxisId;
  stance: Stance;
  /** Política de concentración de poder (ignora ideología) */
  authoritarian?: boolean;
  name: L;
  desc: L;
  /** Coste único en tesorería al aprobarse */
  upfront: number;
  /** Coste recurrente por ronda */
  upkeep: number;
  /** Rondas hasta los efectos diferidos */
  delay: number;
  beneficiaries: GroupId[];
  harmed: GroupId[];
  immediate: Effect[];
  delayed: Effect[];
  requires: Cond;
  risk?: { chance: number; effects: Effect[]; text: L };
  /** Postura ideológica del texto (-2 izq..2 der) para calcular apoyos */
  lean: number;
  /** Puede aplicarse por vía rápida (decreto/orden/MP) */
  fastTrack: boolean;
  /** Fiscal: en EE. UU. puede ir por conciliación (51 votos) */
  fiscal: boolean;
}

export interface Promise_ {
  axis: AxisId;
  stance: Stance;
  status: 'pending' | 'kept' | 'broken';
  round: number;
}

export interface Party {
  id: string;
  name: L;
  short: string;
  lean: number; // -2..2
  color: string;
  regional?: boolean;
  /** Bloque pragmático: vende apoyo */
  pragmatic?: boolean;
  isPlayer?: boolean;
  isRival?: boolean;
  /** Para EE. UU.: facción dentro de un partido */
  faction?: 'player' | 'rival';
}

export interface PartyState {
  id: string;
  seats: Record<string, number>; // por cámara
  loyalty: number; // -100..100 hacia el jugador
  inGovernment: boolean;
  demands: string[];
}

export interface Favor { id: string; creditor: CastId; demand: string; dueRound: number; status: 'open' | 'paid' | 'refused' }

export interface Deferred { round: number; effects: Effect[]; why: L; source: string }

export interface AgendaItem {
  uid: string;
  vars?: Record<string, string>;
  type: 'event' | 'bill' | 'budget' | 'campaign' | 'opposition-bill';
  eventId?: string;
  hotspot: HotspotId;
  resolved: boolean;
  main: boolean;
}

export interface LogEntry { round: number; phase: Phase; text: L; deltas: DeltaRec[]; weight: number }
export interface DeltaRec { stat?: StatId; group?: GroupId; cast?: CastId; delta: number; why?: L }

export interface ElectionFactor { key: string; label: L; value: number }
export interface ElectionResult {
  kind: 'campaign' | 'reelection';
  shares: Record<string, number>; // partido → % voto
  turnout: number;
  seats: Record<string, Record<string, number>>; // cámara → partido → escaños
  executive: { won: boolean; detail: L; secondRound?: Record<string, number>; ev?: Record<string, number> };
  factors: ElectionFactor[];
  playerShare: number;
}

export interface DebateState {
  round: number;
  rounds: number;
  audience: number; // 0-100, 50 neutro
  hypocrisy: number;
  log: { topic: AxisId; opp: string; card: string; delta: number; line: L }[];
  timed: boolean;
  moves: { type: DebateMove; topic: AxisId }[];
  uses: Record<DebateCard, number>;
  kind: 'campaign' | 'reelection';
}

export interface GameState {
  version: number;
  seed: number;
  rng: number;
  lang: Lang;
  country: CountryId;
  candidate: CandidateId;
  name: string;
  orientation: Orientation;
  phase: Phase;
  round: number;
  campaignDay: number;
  actionsLeft: number;
  stats: Record<StatId, number>;
  groups: Record<GroupId, { sat: number; mob: number; base: number }>;
  /** Desplazamiento estructural de los sectores por políticas aprobadas */
  structural: Partial<Record<StatId, number>>;
  /** Modificadores temporales de indicadores derivados */
  mods: { wellbeing: number; support: number };
  /** Resultados guardados de referéndum */
  referendum?: { yes: number; passed: boolean; stance: 'yes' | 'neutral' };
  /** Último resultado de una votación de caída */
  fallResult?: { removed: boolean; text: L };
  cast: Record<CastId, { trust: number; memory: string[] }>;
  promises: Promise_[];
  flags: string[];
  unlocked: SystemId[];
  parties: PartyState[];
  favors: Favor[];
  deferred: Deferred[];
  agenda: AgendaItem[];
  eventHistory: Record<string, { count: number; last: number }>;
  excluded: string[];
  scheduled: { event: string; round: number }[];
  passed: string[];
  fastTracked: { policy: string; expires: number }[];
  budget: { tax: number; lines: Record<'services' | 'housing' | 'security' | 'investment', number>; approved: boolean; prorogued: boolean };
  log: LogEntry[];
  elections: ElectionResult[];
  debate?: DebateState;
  campaignPlan: Record<GroupId, number>;
  roundReport?: RoundReport;
  ending?: EndingResult;
  /** Registro de decisiones para depuración y legado */
  decisions: { round: number; id: string; choice: string; impact: number; label: L }[];
  crises: { id: string; resolved: boolean }[];
  uidCounter: number;
  startedAt: number;
}

export interface RoundReport { round: number; changes: DeltaRec[]; headline: L; notes: L[]; causes: DeltaRec[] }

export interface EndingResult {
  id: string;
  title: L;
  text: L;
  lines: L[];
  keyDecisions: L[];
  score: number;
}

export interface Outcome { text: L; deltas: DeltaRec[]; mood?: Mood; riskText?: L }
