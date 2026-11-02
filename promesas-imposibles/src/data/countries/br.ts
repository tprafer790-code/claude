import type { CountryDef } from './types';

/** Brasil: presidencialismo de coalición, dos vueltas, voto obligatorio. */
export const BR: CountryDef = {
  id: 'br',
  name: { es: 'Brasil', en: 'Brazil' },
  adjective: { es: 'brasileña', en: 'Brazilian' },
  system: 'presidential-br',
  titles: {
    leader: { es: 'Presidencia de la República', en: 'Presidency of the Republic' },
    candidate: { es: 'candidatura presidencial', en: 'presidential campaign' },
    headOfState: { es: 'la propia Presidencia (jefatura de Estado y de Gobierno)', en: 'the President (head of state and government)' },
    legislature: { es: 'Congreso Nacional (Cámara y Senado)', en: 'National Congress (Chamber and Senate)' },
    fastTrack: { es: 'Medida provisional (caduca si no se vota)', en: 'Provisional measure (expires unless voted)' },
    fall: { es: 'Impeachment', en: 'Impeachment' },
    vote: { es: 'Plebiscito convocado por el Congreso', en: 'Plebiscite called by Congress' },
  },
  chambers: [
    { id: 'camara', name: { es: 'Cámara', en: 'Chamber' }, size: 513 },
    { id: 'senado', name: { es: 'Senado', en: 'Senate' }, size: 81 },
  ],
  mainChamber: 'camara',
  groupSizes: { youth: 0.17, pensioners: 0.14, workers: 0.27, business: 0.09, rural: 0.13, urban: 0.11, public: 0.09 },
  baseTurnout: 0.79,
  turnoutSensitivity: 0.2,
  compulsory: true,
  regions: [
    { id: 'n', name: { es: 'Norte', en: 'North' }, seats: 9, shift: 0.25, mix: { rural: 1.5 }, x: 40, y: 22 },
    { id: 'ne', name: { es: 'Nordeste', en: 'Northeast' }, seats: 27, shift: -0.6, mix: { workers: 1.3, rural: 1.2 }, x: 78, y: 32 },
    { id: 'co', name: { es: 'Centro-Oeste', en: 'Center-West' }, seats: 8, shift: 0.55, mix: { rural: 1.6, business: 1.3 }, x: 48, y: 52 },
    { id: 'se', name: { es: 'Sudeste', en: 'Southeast' }, seats: 42, shift: 0.15, mix: { urban: 1.4, business: 1.1 }, x: 66, y: 66 },
    { id: 's', name: { es: 'Sur', en: 'South' }, seats: 14, shift: 0.45, x: 54, y: 84 },
  ],
  parties: (o) => [
    { id: 'mpb', name: { es: 'Movimiento Pueblo Brasileño', en: 'Brazilian People Movement' }, short: 'MPB', lean: -0.9, color: '#d8342c', isPlayer: o === 'left', isRival: o === 'right' },
    { id: 'anb', name: { es: 'Alianza Nueva Bandera', en: 'New Banner Alliance' }, short: 'ANB', lean: 1.0, color: '#2a7a3f', isPlayer: o === 'right', isRival: o === 'left' },
    { id: 'cp', name: { es: 'Centro Pragmático', en: 'Pragmatic Center' }, short: 'CP', lean: 0.35, color: '#e2a51b', pragmatic: true },
    { id: 'rv', name: { es: 'Red Verde Popular', en: 'Popular Green Network' }, short: 'RVP', lean: -1.6, color: '#3aa35b' },
    { id: 'of', name: { es: 'Orden y Familia', en: 'Order & Family' }, short: 'OyF', lean: 1.7, color: '#2c4fa3' },
  ],
  roundPlan: ['budget', 'bill', 'event', 'bill', 'budget', 'opposition', 'event', 'bill', 'budget', 'event', 'crisis', 'reelection'],
  startStats: { jobs: 46, services: 42, security: 38, environment: 50, debt: 76, unrest: 34, housing: 36 },
  revenueBase: 12,
  castNames: {
    advisor: 'Renata Albuquerque', economist: 'Otávio Lins', partner: 'Dep. Juvenal Pires', opposition: 'Augusto Vasconcelos',
    journalist: 'Bia Tavares', unionist: 'Zé Ferreira', tycoon: 'Dr. Heitor Macedo',
    citizenA: 'Dona Cida', citizenB: 'Kauã', citizenC: 'Seu Raimundo', caller: 'Rosângela Prado',
  },
  rules: [
    { es: 'Si nadie supera el 50 % de los votos válidos, hay segunda vuelta entre los dos primeros.', en: 'If nobody wins over 50% of valid votes, the top two go to a runoff.' },
    { es: 'El voto es obligatorio: la movilización pesa poco y el voto nulo pesa más.', en: 'Voting is compulsory: mobilization matters little, protest blank votes matter more.' },
    { es: 'El Congreso está fragmentado: el Centro Pragmático (ficticio) vende su apoyo por ministerios y enmiendas.', en: 'Congress is fragmented: the fictional Pragmatic Center sells support for ministries and earmarks.' },
    { es: 'Una medida provisional actúa ya, pero caduca en dos rondas si el Congreso no la aprueba.', en: 'A provisional measure acts now but expires in two rounds unless Congress approves it.' },
    { es: 'Las 27 unidades federativas se agrupan en 5 regiones.', en: 'The 27 federative units are grouped into 5 regions.' },
  ],
  reality: {
    date: '2026-10-31',
    lines: [
      { es: 'Presidente (jefe de Estado y de Gobierno): Lula (PT), reelegido el 25-oct-2026 con el 51,79 % frente a Flávio Bolsonaro (PL), 48,21 %.', en: 'President (head of state and government): Lula (PT), re-elected on 25 Oct 2026 with 51.79% against Flávio Bolsonaro (PL), 48.21%.' },
      { es: 'Primera vuelta (4-oct-2026): Flávio Bolsonaro 47,03 %, Lula 45,16 %.', en: 'First round (4 Oct 2026): Flávio Bolsonaro 47.03%, Lula 45.16%.' },
      { es: 'El candidato derrotado anunció que pediría la anulación; el real cayó en torno al 10 % en futuros.', en: 'The defeated candidate said he would seek annulment; the real fell about 10% in futures.' },
      { es: 'Congreso fragmentado; el llamado centrão negocia apoyos a cambio de cargos y enmiendas.', en: 'Fragmented Congress; the so-called centrão trades support for posts and earmarks.' },
    ],
    sources: ['infomoney.com.br (25/26-oct-2026)'],
  },
  flag: { kind: 'br' },
  calibration: -0.015,
};
