// Historia de la primera promesa de vivienda: la llamada de radio, la decisión de gobierno
// y la rendición de cuentas en el debate de reelección. Todos los textos, en ES y EN.
// Variables: {name} candidatura, {caller} oyente, {advisor} asesora, {radio} emisora,
// {rise} subida del alquiler, {legislature} parlamento, {blockers} partidos que la frenaron,
// {rounds} rondas, {quote} palabras exactas, {short} promesa abreviada.
import type { CountryId, HousingOutcome, HousingPolicyId, L, Stance } from '../core/types';
import { t } from './helpers';

/** Sabor local de la llamada en cada país. */
export const HOUSING_FLAVOR: Record<CountryId, { radio: L; rise: L }> = {
  es: { radio: t('Radio Arrabal', 'Radio Arrabal'), rise: t('180 euros', '180 euros') },
  us: { radio: t('KMNS Main Street Radio', 'KMNS Main Street Radio'), rise: t('240 dólares', '240 dollars') },
  br: { radio: t('Rádio Periferia FM', 'Rádio Periferia FM'), rise: t('600 reales', '600 reais') },
};

export interface CallOption {
  policy: HousingPolicyId;
  stance: Stance;
  /** Lo que dice el candidato en directo: se guarda palabra por palabra. */
  quote: L;
  /** Promesa abreviada para el corcho */
  short: L;
  /** Coste o renuncia, en lenguaje llano */
  tradeoff: L;
  /** Respuesta de la oyente */
  reply: L;
}

export const HOUSING_CALL = {
  advisorIntro: t('¡{name}, rápido! Te paso una llamada de {radio}. Estás en directo, así que sonríe con la voz.', '{name}, quick! I am patching through a call from {radio}. You are live, so smile with your voice.'),
  kicker: t('Promesa 1 de 6 · En directo en {radio}', 'Promise 1 of 6 · Live on {radio}'),
  callerLine: t(
    'Hola, buenas. Soy {caller}. Llevo seis años en el mismo piso y este mes el casero me sube {rise}. Dice que es «el mercado». Yo trabajo de noche en un hospital y no me llega. Si usted gana, ¿qué haría? En concreto, por favor, que estoy en el descanso.',
    'Hi there. I am {caller}. I have lived in the same flat for six years and this month my landlord is raising the rent by {rise}. He says it is "the market". I work night shifts at a hospital and it does not add up. If you win, what would you do? Specifically, please, I am on my break.'),
  options: [
    {
      policy: 'rent_cap', stance: -1,
      quote: t('Si gano, topo los alquileres el primer año. Su casero no le podrá volver a subir {rise} de golpe.', 'If I win, I cap rents in year one. Your landlord will never again be able to hike it by {rise} overnight.'),
      short: t('Topar los alquileres', 'Cap rents'),
      tradeoff: t('Tope a los alquileres · No cuesta dinero público, pero los caseros se enfadarán y parte de los pisos puede salir del mercado.', 'Rent cap · Costs no public money, but landlords will be furious and some flats may leave the market.'),
      reply: t('¿De golpe, nunca más? Me lo apunto. Bueno, me lo apunto yo y lo apunta toda la radio.', 'Never again overnight? I am writing that down. Well, I am, and so is the whole radio station.'),
    },
    {
      policy: 'rent_aid', stance: 0,
      quote: t('Si gano, le pagamos una parte del alquiler: una ayuda directa todos los meses, desde el primer año.', 'If I win, we pay part of your rent: a direct allowance every month, from year one.'),
      short: t('Una ayuda directa al alquiler', 'A direct rent allowance'),
      tradeoff: t('Ayuda al alquiler · Cuesta dinero público cada ronda, y parte de la ayuda puede acabar en el bolsillo del casero.', 'Rent allowance · Costs public money every round, and part of it may end up in the landlord\'s pocket.'),
      reply: t('Una ayuda… vale. Mientras no se la quede mi casero, que también escucha la radio.', 'An allowance… fine. As long as my landlord does not pocket it. He listens to the radio too.'),
    },
    {
      policy: 'land_free', stance: 1,
      quote: t('Si gano, libero suelo para que se construyan muchos más pisos. Con más oferta, su alquiler bajará.', 'If I win, I free up land so many more homes get built. With more supply, your rent will come down.'),
      short: t('Liberar suelo para construir', 'Free up land to build'),
      tradeoff: t('Liberar suelo · Más pisos sin gastar dinero público, pero tardan años en llegar y se urbaniza suelo verde.', 'Free up land · More homes without public money, but they take years and green land gets built on.'),
      reply: t('¿Y cuánto se tarda en hacer esos pisos? Lo digo porque la subida la pago el mes que viene.', 'And how long do those homes take to build? I ask because I pay the increase next month.'),
    },
  ] as CallOption[],
  pinned: t('{advisor} clava una tarjeta en el corcho de la sede.', '{advisor} pins a card on the campaign corkboard.'),
  advisorPin: t('Apuntado en el corcho. Lo del corcho es simbólico; lo de la radio está grabado.', 'Pinned on the corkboard. The corkboard is symbolic. The radio is recorded.'),
  corkTitle: t('VIVIENDA', 'HOUSING'),
  corkLine: t('Prometido a {caller}, en directo', 'Promised to {caller}, live on air'),
  afterCall: t('Bien. Esa ya está, y la has dicho tú con tu voz. Quedan cinco promesas: esas las preparamos aquí, sin micrófono.', 'Good. That one is done, in your own voice. Five promises left: we prepare those here, off the air.'),
};

/** Decisión en el despacho cuando se abre el área de vivienda. */
export const HOUSING_DECISION = {
  itemTitle: t('La promesa a {caller}', 'The promise to {caller}'),
  recall: t('Se abre el área de vivienda. ¿Te acuerdas de {caller}? Llamó a {radio} en la primera semana de campaña y le dijiste esto:', 'Housing is now on the table. Remember {caller}? She called {radio} in the first week of the campaign and you told her this:'),
  recallRetake: t('La tarjeta de {caller} sigue en el corcho. Esto es lo que le dijiste en {radio}:', '{caller}\'s card is still on the corkboard. This is what you told her on {radio}:'),
  title: t('La promesa a {caller}', 'The promise to {caller}'),
  hint: t('Elige cómo responder a lo que prometiste. Antes de confirmar verás lo que cuesta, qué compite por esos recursos y cómo votaría hoy {legislature}.', 'Choose how to follow through. Before confirming you will see what it costs, what competes for those resources and how {legislature} would vote today.'),
  fullTitle: t('Cumplirla entera', 'Deliver it in full'),
  fullDesc: t('La ley tal como la prometiste, y una partida más de vivienda en el presupuesto para aplicarla (inspección, gestión y obras).', 'The law exactly as promised, plus one more housing budget line to implement it (inspections, admin and works).'),
  negoTitle: t('Negociarla', 'Negotiate it'),
  negoDesc: t('Ofreces enmiendas a los indecisos. La ley sale con el 75 % de su fuerza y entra en vigor después de las elecciones, dentro de {rounds} rondas. No toca el presupuesto.', 'You offer amendments to the undecided. The law keeps 75% of its strength and takes effect after the election, in {rounds} rounds. The budget stays as it is.'),
  postponeTitle: t('Aplazarla', 'Postpone it'),
  postponeDesc: t('No se vota ahora. La tarjeta sigue en el corcho y podrás retomarla en otra ronda de leyes.', 'No vote now. The card stays on the corkboard and you can bring it back in another law round.'),
  needs: t('Necesita', 'Needs'),
  competes: t('Compite con', 'Competes with'),
  forecast: t('Votación prevista hoy', 'Vote forecast today'),
  upfrontNow: t('{n} de tesorería ahora (tienes {have})', '{n} treasury now (you have {have})'),
  perRound: t('{n} por ronda', '{n} per round'),
  lawUpkeep: t('ley: {n} por ronda', 'law: {n} per round'),
  lineCost: t('partida de vivienda: +{n} por ronda', 'housing line: +{n} per round'),
  majority: t('mayoría en {legislature}', 'a majority in {legislature}'),
  balanceNow: t('Saldo por ronda: {from} → {to}', 'Balance per round: {from} → {to}'),
  cutLine: t('{line}: de {from} a {to}. {sector} tenderá a {target}.', '{line}: from {from} to {to}. {sector} will drift towards {target}.'),
  deficit: t('Sin recortar nada: lo que falte se pagará con deuda.', 'Cutting nothing: any shortfall is paid with debt.'),
  housingMax: t('La partida de vivienda ya está al máximo: no hace falta recortar nada.', 'The housing line is already at its maximum: nothing needs cutting.'),
  fundWith: t('Financiar recortando', 'Fund it by cutting'),
  deficitOpt: t('Déficit', 'Deficit'),
  negoCompetes: t('El calendario: los socios piden retrasar la entrada en vigor hasta después de las elecciones.', 'The timetable: partners want it to take effect only after the election.'),
  postponeCompetesBill: t('Este turno legislativo queda libre para otra ley.', 'This law slot is freed for another bill.'),
  postponeCompetes: t('Nada esta ronda. {caller} seguirá esperando.', 'Nothing this round. {caller} keeps waiting.'),
  passes: t('Saldría adelante: sí {yes}, no {no}', 'It would pass: yes {yes}, no {no}'),
  fails: t('No saldría: sí {yes}, no {no}', 'It would fail: yes {yes}, no {no}'),
  confirmFull: t('Cumplirla y votar', 'Deliver and vote'),
  confirmNego: t('Negociar y votar', 'Negotiate and vote'),
  confirmPostpone: t('Aplazarla', 'Postpone'),
  // Resultados
  passedFull: t('Aprobada en {legislature}: sí {yes}, no {no}.', 'Passed in {legislature}: yes {yes}, no {no}.'),
  passedFullBudget: t('La partida de vivienda sube a {h}. {line} baja a {cut}.', 'The housing line rises to {h}. {line} drops to {cut}.'),
  passedFullDeficit: t('La partida de vivienda sube a {h}, financiada con déficit.', 'The housing line rises to {h}, financed with a deficit.'),
  passedNego: t('Aprobada con enmiendas: sí {yes}, no {no}. Entra en vigor dentro de {rounds} rondas.', 'Passed with amendments: yes {yes}, no {no}. It takes effect in {rounds} rounds.'),
  rejected: t('{legislature} la rechaza: sí {yes}, no {no}. La han bloqueado: {blockers}.', '{legislature} rejects it: yes {yes}, no {no}. Blocked by: {blockers}.'),
  advisorFull: t('Cumplida. {caller} todavía no lo sabe, pero {radio} ya lo está contando.', 'Delivered. {caller} does not know yet, but {radio} is already reporting it.'),
  advisorNego: t('Técnicamente, cumplida. Prácticamente, la tarjeta sigue en el corcho hasta que entre en vigor.', 'Technically, delivered. Practically, the card stays on the corkboard until it takes effect.'),
  advisorRejected: t('Queda constancia de que lo intentaste. Y de quién lo impidió. Las dos cosas se pueden contar en un debate.', 'There is a record that you tried. And of who stopped it. Both can be told in a debate.'),
  advisorPostponed: t('Aplazada. Le he puesto otra chincheta a la tarjeta para que no se caiga.', 'Postponed. I added another pin to the card so it does not fall off.'),
  noBlockers: t('nadie en concreto: faltaron votos a favor', 'nobody in particular: there were not enough yes votes'),
  retakeCard: t('Retomar la promesa a {caller}', 'Bring back the promise to {caller}'),
  retakeNote: t('Pendiente desde la ronda {r}', 'Pending since round {r}'),
  folderLine: t('Promesa en la radio a {caller}: «{quote}»', 'Radio promise to {caller}: "{quote}"'),
  stage_promised: t('Pendiente: aún no ha llegado al despacho.', 'Pending: it has not reached the office yet.'),
  stage_postponed: t('Aplazada en la ronda {r}.', 'Postponed in round {r}.'),
  stage_rejected: t('Rechazada en la ronda {r}. La bloquearon: {blockers}.', 'Rejected in round {r}. Blocked by: {blockers}.'),
  stage_passed: t('Aprobada en la ronda {r}.', 'Passed in round {r}.'),
  stage_waiting: t('Aprobada en la ronda {r}; sus efectos llegan en la ronda {e}.', 'Passed in round {r}; its effects arrive in round {e}.'),
};

/** Rendición de cuentas en el debate de reelección. */
export const HOUSING_DEBATE = {
  journalistIntro: t('Antes de empezar, una grabación. {radio}, primera semana de campaña. Escuchen.', 'Before we begin, a recording. {radio}, first week of the campaign. Listen.'),
  tapeKicker: t('Grabación · {radio}', 'Recording · {radio}'),
  journalistBridge: t('Eso fue hace {rounds} rondas. Y la oyente de aquella llamada está hoy en el plató.', 'That was {rounds} rounds ago. And the listener from that call is in the studio tonight.'),
  callerWorking: {
    rent_cap: t('Hola otra vez. Pues funciona. Este año mi casero no ha podido subirme ni un céntimo y me mira como si le hubiera robado la cartera. He vuelto a comprar fresas. En enero.', 'Hello again. Well, it works. This year my landlord could not raise my rent by a cent and he looks at me like I stole his wallet. I bought strawberries again. In January.'),
    rent_aid: t('Hola otra vez. La ayuda me llega cada mes, de verdad. Mi casero subió un poco «por casualidad», pero aun así me quedo con más que antes. He arreglado la bici.', 'Hello again. The allowance arrives every month, really. My landlord raised the rent a little, "by coincidence", but I still keep more than before. I fixed my bike.'),
    land_free: t('Hola otra vez. En mi barrio hay tres grúas y los alquileres han dejado de subir. El ruido de las obras es horrible, pero es un ruido barato.', 'Hello again. There are three cranes in my neighbourhood and rents have stopped rising. The construction noise is awful, but it is cheap noise.'),
  } as Record<HousingPolicyId, L>,
  callerWaiting: t('Me dijeron que estaba aprobada. Yo la busco en el recibo y no aparece. ¿Está en camino, como los paquetes que siempre pone «en reparto»?', 'They told me it passed. I look for it on my rent bill and it is not there. Is it on its way, like those parcels that always say "out for delivery"?'),
  callerRejected: t('Vi en la tele que lo intentó y se lo tumbaron. Al menos lo intentó, que es más de lo que ha hecho mi casero con la caldera. Pero sigo pagando la subida. ¿Y ahora qué?', 'I saw on TV that you tried and they voted it down. At least you tried, which is more than my landlord ever did with the boiler. But I still pay the increase. So what now?'),
  callerAbandoned: t('Yo le llamé. Usted me contestó en directo. Luego, nada: ni ley, ni ayuda, ni una postal. ¿Se acuerda de mí o tengo que volver a llamar a la radio?', 'I called you. You answered me live on air. Then, nothing: no law, no allowance, not even a postcard. Do you remember me, or do I have to call the radio again?'),
  whisper: t('(susurrando) Técnicamente, el corcho fue la primera fase.', '(whispering) Technically, the corkboard was phase one.'),
  whisperKicker: t('Susurro entre bastidores', 'Whisper from the wings'),
  defendKicker: t('Tu turno: defiende tu gestión', 'Your turn: defend your record'),
  defenses: {
    working: [
      { label: t('Dar las gracias a quien la votó, y a ella por llamar', 'Thank those who voted for it, and her for calling'), audience: 6, credibility: 2, reply: t('Tampoco se me ponga tierno, que estamos en la tele.', 'Do not go all soft on me, we are on TV.') },
      { label: t('Presumir: «Promesa hecha, promesa cumplida»', 'Boast: "Promise made, promise kept"'), audience: 4, credibility: 0, reply: t('Tampoco se venga arriba: el ascensor de mi edificio sigue roto.', 'Do not get carried away: the lift in my building is still broken.') },
      { label: t('Reconocer lo que todavía falta', 'Admit what is still missing'), audience: 5, credibility: 3, reply: t('Mira, eso no me lo esperaba: un político que dice que falta algo.', 'Well, I did not expect that: a politician saying something is still missing.') },
    ],
    waiting: [
      { label: t('Explicar el calendario con fechas', 'Explain the timetable with dates'), audience: 2, credibility: 2, reply: t('Vale. Me apunto la fecha. Usted apúntesela también, por si acaso.', 'Fine. I am writing the date down. You write it down too, just in case.') },
      { label: t('Asegurar que llegará «muy pronto»', 'Promise it will arrive "very soon"'), audience: -3, credibility: -3, reply: t('«Muy pronto» es lo que me dice mi casero de la caldera desde hace dos inviernos.', '"Very soon" is what my landlord has said about the boiler for two winters.') },
      { label: t('Culpar a los socios que exigieron retrasarla', 'Blame the partners who demanded the delay'), audience: 0, credibility: -1, reply: t('Pues haber elegido otros socios. O haber elegido otro calendario.', 'Then you should have picked other partners. Or another timetable.') },
    ],
    rejected: [
      { label: t('Señalar quién la bloqueó: {blockers}', 'Name who blocked it: {blockers}'), audience: 4, credibility: 0, reply: t('Eso lo apunto. Y voto en consecuencia.', 'I am writing that down. And I will vote accordingly.') },
      { label: t('Asumir que no supiste reunir los votos', 'Admit you could not gather the votes'), audience: 3, credibility: 3, reply: t('Por lo menos no me echa la culpa a mí, que ya es algo.', 'At least you are not blaming me, which is something.') },
      { label: t('Prometer que la volverás a presentar', 'Promise to bring it back'), audience: 1, credibility: -1, reply: t('¿Otra promesa? En casa también tengo un corcho, y ya no caben más.', 'Another promise? I have a corkboard at home too, and it is full.') },
    ],
    abandoned: [
      { label: t('Pedir perdón, sin excusas', 'Apologise, with no excuses'), audience: -2, credibility: 3, reply: t('No me lo esperaba. No sé si le perdono, pero por lo menos me ha mirado a la cara.', 'I did not expect that. I do not know if I forgive you, but at least you looked me in the eye.') },
      { label: t('Hablar de «las circunstancias»', 'Talk about "the circumstances"'), audience: -6, credibility: -3, reply: t('Mis circunstancias son {rise} más al mes.', 'My circumstances are {rise} more a month.') },
      { label: t('Prometerlo otra vez, ahora de verdad', 'Promise it again, for real this time'), audience: -4, credibility: -4, reply: t('Eso mismo dijo la otra vez. Lo tengo grabado. Bueno, lo tiene ella.', 'That is exactly what you said last time. I have it on tape. Well, she does.') },
    ],
  } as Record<HousingOutcome, { label: L; audience: number; credibility: number; reply: L }[]>,
  journalistClose: {
    working: t('Gracias, {caller}. Vamos con el debate, que hoy empieza con un punto a favor.', 'Thank you, {caller}. On to the debate, which starts tonight with a point in your favour.'),
    waiting: t('Gracias, {caller}. Seguiremos el reparto. Empezamos.', 'Thank you, {caller}. We will keep tracking that delivery. Let us begin.'),
    rejected: t('Gracias, {caller}. Queda dicho quién votó qué. Empezamos.', 'Thank you, {caller}. It is on record who voted what. Let us begin.'),
    abandoned: t('Gracias, {caller}. La grabación se queda en el archivo. Empezamos.', 'Thank you, {caller}. The recording stays in the archive. Let us begin.'),
  } as Record<HousingOutcome, L>,
};

/** Epílogo en la pantalla final: qué significó la promesa para ella. */
export const HOUSING_EPILOGUE: Record<HousingOutcome | 'neverGoverned', L> = {
  working: t('{caller} sigue en el mismo piso. Este año ha podido ahorrar algo por primera vez desde la llamada.', '{caller} is still in the same flat. This year she managed to save something for the first time since the call.'),
  waiting: t('{caller} tiene la ley impresa y pegada en la nevera. Su recibo del alquiler todavía no se ha enterado.', '{caller} has the law printed and stuck to her fridge. Her rent bill has not heard about it yet.'),
  rejected: t('{caller} se sabe de memoria quién votó en contra. Sigue pagando la subida.', '{caller} knows by heart who voted against it. She is still paying the increase.'),
  abandoned: t('{caller} ya no llama a la radio. Ahora escucha pódcast sobre cómo hacer mudanzas baratas.', '{caller} no longer calls the radio. Now she listens to podcasts about cheap house moves.'),
  neverGoverned: t('{caller} nunca supo si habrías cumplido lo que le dijiste en la radio.', '{caller} never found out whether you would have kept what you told her on the radio.'),
};
