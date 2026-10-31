// Cadenas de eventos de varias etapas. Las etapas posteriores son `scheduledOnly`:
// solo aparecen si una decisión anterior las programa (efecto `chain`).
import type { GameEvent } from '../../core/types';
import { c, chain, d, flag, g, t } from '../helpers';
import { ev } from './build';

export const CHAIN_EVENTS: GameEvent[] = [
  // ── Cadena 1: el favor del empresario (campaña → mandato) ──────────────
  ev({
    id: 'tycoon_offer', category: 'corruption', chain: { id: 'tycoon', stage: 1, of: 3 }, hotspot: 'door', speaker: 'tycoon', kind: 'main', scheduledOnly: true,
    conditions: { phases: ['campaign'] },
    title: t('Una visita con maletín', 'A visit with a briefcase'),
    text: t('«Mi fundación quiere apoyar la democracia. Concretamente, la suya. Nada de papeles: entre amigos no hacen falta.»', '"My foundation wants to support democracy. Specifically, yours. No paperwork: friends do not need it."'),
    detail: t('El dinero irá a una caja paralela, fuera del presupuesto de campaña declarado. Sirve para anuncios y favores. No es gratis.', 'The money goes to a parallel fund, outside the declared campaign budget. It buys ads and favours. It is not free.'),
    choices: [
      { id: 'accept', label: t('Aceptar la «donación»', 'Accept the "donation"'), tags: ['corrupt'], mood: 'happy',
        result: t('El maletín pesa. La conciencia, también, pero menos.', 'The briefcase is heavy. Your conscience too, but less.'),
        effects: [d('privateFunds', 6), d('funds', 3), d('suspicion', 6), c('tycoon', 20), flag('took_tycoon_money'), { favor: { creditor: 'tycoon', demand: 'contract', dueIn: 3 } }, { unlock: 'corruption' }] },
      { id: 'legal', label: t('Solo una donación legal y declarada', 'Only a legal, declared donation'), tags: ['negotiate'], mood: 'talk',
        result: t('Firma de mala gana. Pequeña, limpia y aburrida.', 'He signs reluctantly. Small, clean and boring.'),
        effects: [d('funds', 2), c('tycoon', -5), d('credibility', 1)] },
      { id: 'reject', label: t('Echarle con cámaras delante', 'Throw him out in front of cameras'), tags: ['reject'], mood: 'angry',
        result: t('Titular: «El candidato que dijo no». Él no olvidará el portazo.', 'Headline: "The candidate who said no". He will not forget the slammed door.'),
        effects: [c('tycoon', -30), d('credibility', 4), d('popularity', 2), flag('rejected_tycoon'), chain('tycoon_revenge', 4)] },
    ],
  }),
  ev({
    id: 'tycoon_collect', category: 'corruption', chain: { id: 'tycoon', stage: 2, of: 3 }, hotspot: 'phone', speaker: 'tycoon', kind: 'main', scheduledOnly: true,
    conditions: { flags: ['took_tycoon_money'] },
    title: t('Llega la factura', 'The bill arrives'),
    text: t('«¿Se acuerda de mi fundación? Hay un contrato de autopistas. Sería una pena que lo ganara alguien sin… sensibilidad democrática.»', '"Remember my foundation? There is a motorway contract. Shame if someone without… democratic sensitivity won it."'),
    choices: [
      { id: 'pay', label: t('Adjudicarle el contrato', 'Award him the contract'), tags: ['corrupt'], mood: 'nervous',
        result: t('Firma. La autopista tendrá tres carriles y cuatro sobrecostes.', 'Signed. The motorway will have three lanes and four cost overruns.'),
        effects: [d('integrity', -6), d('suspicion', 9), d('treasury', -2), d('economy', 2), c('tycoon', 15), { clearFavor: 'contract' }, flag('paid_tycoon'), chain('tycoon_memoir', 5)] },
      { id: 'stall', label: t('Darle largas', 'Stall him'), tags: ['delay'], mood: 'nervous',
        result: t('«Esperaré», dice. Suena a amenaza con lazo.', '"I will wait," he says. It sounds like a threat with a bow on it.'),
        effects: [c('tycoon', -10), d('suspicion', 2), flag('stalled_tycoon'), chain('tycoon_memoir', 4)] },
      { id: 'refuse', label: t('Negarte y concursar limpio', 'Refuse and run a clean tender'), tags: ['reject'], mood: 'angry',
        result: t('Cuelga. Diez minutos después, una redacción recibe un sobre.', 'He hangs up. Ten minutes later, a newsroom receives an envelope.'),
        effects: [c('tycoon', -35), d('evidence', 14, 0, t('El empresario filtra la donación irregular.', 'The tycoon leaks the irregular donation.')), d('integrity', 3), { refuseFavor: 'contract' }, flag('refused_tycoon')] },
    ],
  }),
  ev({
    id: 'tycoon_memoir', category: 'corruption', chain: { id: 'tycoon', stage: 3, of: 3 }, hotspot: 'tv', speaker: 'journalist', kind: 'main', scheduledOnly: true,
    conditions: {},
    title: t('El empresario, detenido', 'The tycoon arrested'),
    text: t('Detienen a tu viejo benefactor por otra trama. En el furgón grita: «¡Si caigo yo, no caigo solo!».', 'Your old benefactor is arrested over another scheme. From the van he shouts: "If I go down, I do not go alone!"'),
    choices: [
      { id: 'help', label: t('Mover hilos para ayudarle', 'Pull strings to help him'), tags: ['corrupt', 'authoritarian'], mood: 'nervous',
        result: t('El caso se ralentiza. Tu nombre aparece en una agenda que nadie debía leer.', 'The case slows down. Your name appears in a diary nobody was meant to read.'),
        effects: [d('integrity', -10), d('suspicion', 12), c('tycoon', 20)] },
      { id: 'justice', label: t('Que actúe la justicia', 'Let justice run its course'), tags: ['reject'], mood: 'idle',
        result: t('Él canta. Tú esperas que desafine.', 'He sings. You hope he is off-key.'),
        effects: [d('evidence', 16, 0, t('Declaración del empresario detenido.', 'Statement by the arrested tycoon.')), c('tycoon', -40), d('integrity', 2)] },
      { id: 'confess', label: t('Adelantarte y confesar en directo', 'Get ahead of it: confess on air'), tags: ['transparent'], mood: 'sad',
        result: t('Te tiembla la voz. A parte del país le parece valiente; a otra, delictivo.', 'Your voice shakes. Part of the country finds it brave; another part, criminal.'),
        effects: [d('popularity', -8), d('evidence', -20), d('suspicion', -15), d('credibility', 6), d('integrity', 4), flag('confessed')] },
    ],
  }),
  ev({
    id: 'tycoon_revenge', category: 'media', chain: { id: 'tycoon', stage: 2, of: 2 }, hotspot: 'tv', speaker: 'tycoon', scheduledOnly: true,
    conditions: { flags: ['rejected_tycoon'] },
    title: t('Campaña de desprestigio', 'Smear campaign'),
    text: t('Los medios del empresario al que echaste publican que «comes cruasanes con cuchillo y tenedor». Y cosas peores.', 'Media owned by the tycoon you threw out report that you "eat croissants with a knife and fork". And worse.'),
    choices: [
      { id: 'sue', label: t('Querella por difamación', 'Sue for defamation'), tags: ['investigate'], result: t('Tardará años. El titular, no.', 'It will take years. The headline will not.'), effects: [d('integrity', 2), d('popularity', -1)] },
      { id: 'counter', label: t('Responder con humor en redes', 'Hit back with humour online'), tags: ['negotiate'], result: t('Te comes un cruasán con las manos en directo. Funciona.', 'You eat a croissant by hand live. It works.'), effects: [d('popularity', 3), g('youth', 3)] },
      { id: 'ignore', label: t('Ignorarlo', 'Ignore it'), tags: ['delay'], result: t('El bulo se queda en el aire un par de semanas.', 'The hoax lingers for a couple of weeks.'), effects: [d('popularity', -3)] },
    ],
  }),

  // ── Cadena 2: huelga ────────────────────────────────────────────────────
  ev({
    id: 'union_warning', category: 'labor', chain: { id: 'strike', stage: 1, of: 3 }, hotspot: 'phone', speaker: 'unionist',
    conditions: { minRound: 2, maxRound: 7 }, weight: 1.3,
    title: t('Aviso del sindicato', 'Union warning'),
    text: t('«Los precios suben en ascensor y los sueldos por la escalera. O hablamos, o paramos.»', '"Prices take the lift and wages take the stairs. Either we talk, or we stop."'),
    choices: [
      { id: 'meet', label: t('Abrir una mesa de negociación', 'Open a negotiating table'), tags: ['negotiate'], result: t('Café de máquina y tres horas de reunión. Hay principio de acuerdo.', 'Vending-machine coffee and a three-hour meeting. There is a draft deal.'), effects: [c('unionist', 10), d('treasury', -1), d('unrest', -5), g('workers', 3)] },
      { id: 'later', label: t('Prometer hablar «más adelante»', 'Promise to talk "later"'), tags: ['delay'], result: t('«Más adelante» suena a nunca en el idioma sindical.', '"Later" sounds like never in union language.'), effects: [c('unionist', -5), chain('strike_main', 2)] },
      { id: 'ignore', label: t('No ceder a presiones', 'Do not yield to pressure'), tags: ['reject'], result: t('Cuelgan. Se oye a alguien pidiendo pintura roja.', 'They hang up. Someone can be heard asking for red paint.'), effects: [c('unionist', -12), g('business', 2), chain('strike_main', 1)] },
    ],
  }),
  ev({
    id: 'strike_main', category: 'labor', chain: { id: 'strike', stage: 2, of: 3 }, hotspot: 'tv', speaker: 'unionist', kind: 'main', scheduledOnly: true,
    title: t('Huelga', 'Strike'),
    text: t('Transportes, fábricas y comedores escolares paran. Tu ministro llega en patinete y lo graban.', 'Transport, factories and school canteens stop. Your minister arrives on a scooter and gets filmed.'),
    choices: [
      { id: 'pact', label: t('Pacto salarial', 'Wage pact'), tags: ['concede'], result: t('Se firma en la madrugada. Todos dicen haber ganado.', 'Signed at dawn. Everyone claims victory.'), effects: [d('treasury', -3), g('workers', 8), g('business', -4), d('unrest', -12), d('economy', -1), c('unionist', 15), flag('social_pact')] },
      { id: 'hard', label: t('Servicios mínimos máximos', 'Maximum minimum services'), tags: ['authoritarian'], result: t('Los trenes circulan vacíos y los piquetes, llenos.', 'Trains run empty and picket lines full.'), effects: [d('unrest', 8), c('unionist', -20), g('business', 4), g('workers', -6), d('integrity', -2), chain('general_strike', 2)] },
      { id: 'wait', label: t('Esperar a que se cansen', 'Wait for them to tire'), tags: ['delay'], result: t('No se cansan. La economía, sí.', 'They do not tire. The economy does.'), effects: [d('economy', -4), d('unrest', 5), d('popularity', -3)] },
    ],
  }),
  ev({
    id: 'general_strike', category: 'labor', chain: { id: 'strike', stage: 3, of: 3 }, hotspot: 'map', speaker: 'unionist', kind: 'main', scheduledOnly: true,
    title: t('Huelga general', 'General strike'),
    text: t('El país entero se para. Hasta el loro del ministerio se niega a hablar.', 'The whole country stops. Even the ministry parrot refuses to talk.'),
    choices: [
      { id: 'concede', label: t('Ceder casi todo', 'Concede almost everything'), tags: ['concede'], result: t('Fin de la huelga. Tu economista se encierra en el baño.', 'Strike over. Your economist locks herself in the bathroom.'), effects: [d('treasury', -4), g('workers', 10), d('unrest', -15), c('economist', -10), d('credibility', -2)] },
      { id: 'mediate', label: t('Mediador independiente', 'Independent mediator'), tags: ['negotiate'], result: t('Un catedrático jubilado consigue lo imposible: que todos se aburran a la vez.', 'A retired professor achieves the impossible: boring everyone at once.'), effects: [d('treasury', -2), d('unrest', -8), d('economy', -2)], risk: { chance: 0.35, effects: [d('unrest', 6)], text: t('La mediación fracasa a la tercera sesión.', 'Mediation fails at the third session.') } },
      { id: 'decree', label: t('Decreto de emergencia laboral', 'Labour emergency decree'), tags: ['authoritarian'], result: t('La huelga termina por decreto. La democracia, un poco también.', 'The strike ends by decree. So does a bit of democracy.'), effects: [d('integrity', -10), d('unrest', 4), c('unionist', -30), d('economy', 2), c('journalist', -10)] },
    ],
  }),

  // ── Cadena 3: crisis de vivienda ───────────────────────────────────────
  ev({
    id: 'housing_protest', category: 'housing', chain: { id: 'housing', stage: 1, of: 3 }, hotspot: 'tv', speaker: 'citizenB', weight: 1.6,
    conditions: { minRound: 2, unlocked: ['housing'], stats: { housing: [0, 48] } },
    title: t('Acampada por la vivienda', 'Housing camp-out'),
    text: t('Cientos de inquilinos acampan en la plaza principal con un lema: «Ni casa ni caso».', 'Hundreds of renters camp in the main square with a slogan: "No home, no hope".'),
    variants: { es: { text: t('Inquilinos acampan en la Puerta del Sol con un lema: «Ni casa ni caso».', 'Renters camp in Puerta del Sol with a slogan: "No home, no hope".') } },
    choices: [
      { id: 'visit', label: t('Ir a escucharles', 'Go and listen to them'), tags: ['negotiate'], result: t('Te dan un café en vaso de yogur. Te comprometes a algo concreto.', 'They give you coffee in a yoghurt pot. You commit to something concrete.'), effects: [g('youth', 4), c('citizenB', 10), flag('met_tenants'), chain('housing_eviction', 2)] },
      { id: 'clear', label: t('Desalojar la plaza', 'Clear the square'), tags: ['authoritarian'], result: t('Imágenes de tiendas de campaña volando. Malas imágenes.', 'Images of flying tents. Bad images.'), effects: [g('youth', -8), g('urban', -4), d('integrity', -3), g('pensioners', 2), c('citizenB', -15)] },
      { id: 'promise', label: t('Anunciar una ley «inminente»', 'Announce an "imminent" law'), tags: ['delay'], result: t('Aplauden con escepticismo, que es un aplauso más lento.', 'They applaud sceptically, which is slower applause.'), effects: [d('popularity', 2), flag('housing_law_promised'), chain('housing_eviction', 2)] },
    ],
  }),
  ev({
    id: 'housing_eviction', category: 'housing', chain: { id: 'housing', stage: 2, of: 3 }, hotspot: 'phone', speaker: 'citizenA', kind: 'main', scheduledOnly: true,
    title: t('Un desahucio viral', 'A viral eviction'),
    text: t('Desahucian a la vecina de Doña Pura, 87 años y un canario. El vídeo lleva tres millones de visitas.', 'Doña Pura’s 87-year-old neighbour is evicted, along with her canary. The video has three million views.'),
    choices: [
      { id: 'moratorium', label: t('Moratoria urgente de desahucios', 'Urgent eviction moratorium'), tags: ['concede'], result: t('La vecina vuelve a casa. Los fondos de inversión, a sus abogados.', 'The neighbour goes home. Investment funds go to their lawyers.'), effects: [d('housing', 3), g('youth', 4), g('pensioners', 4), g('business', -6), c('citizenA', 15), flag('eviction_moratorium')] },
      { id: 'rehouse', label: t('Realojo prioritario y plan público', 'Priority rehousing and public plan'), tags: ['negotiate'], cost: { treasury: 2 }, result: t('Más lento, más caro, más sólido.', 'Slower, pricier, sturdier.'), effects: [d('treasury', -2), d('housing', 4, 2), c('citizenA', 8), g('workers', 2)] },
      { id: 'judicial', label: t('«Es un asunto judicial»', '"It is a judicial matter"'), tags: ['reject'], result: t('Frase correcta, momento incorrecto.', 'Correct sentence, wrong moment.'), effects: [d('popularity', -4), g('youth', -5), c('citizenA', -20), c('citizenB', -10), chain('housing_bubble', 3)] },
    ],
  }),
  ev({
    id: 'housing_bubble', category: 'housing', chain: { id: 'housing', stage: 3, of: 3 }, hotspot: 'desk', speaker: 'economist', kind: 'main',
    conditions: { minRound: 6, unlocked: ['housing'], stats: { housing: [0, 45] } }, weight: 0.8,
    title: t('El precio del ladrillo', 'The price of bricks'),
    text: t('Los precios vuelven a dispararse. Tu economista habla de «burbuja» y tu socio de «oportunidad».', 'Prices soar again. Your economist says "bubble" and your partner says "opportunity".'),
    choices: [
      { id: 'tighten', label: t('Endurecer hipotecas', 'Tighten mortgage rules'), tags: ['reject'], result: t('Se enfría el mercado y algún sueño de propietario.', 'The market cools, and a few homeowner dreams.'), effects: [d('economy', -2), d('housing', 3, 1), g('youth', -2), c('economist', 8)] },
      { id: 'subsidy', label: t('Ayudas a la compra', 'Purchase subsidies'), tags: ['concede'], cost: { treasury: 3 }, result: t('Más compradores, mismos pisos: el precio sube otra vez.', 'More buyers, same flats: prices rise again.'), effects: [d('treasury', -3), g('youth', 5), d('housing', -2, 2)] },
      { id: 'tax_empty', label: t('Recargo a pisos vacíos', 'Surcharge on empty flats'), tags: ['negotiate'], result: t('Aparecen pisos como setas tras la lluvia.', 'Flats appear like mushrooms after the rain.'), effects: [d('housing', 5, 1), g('business', -4), g('urban', 3), d('treasury', 1)] },
    ],
  }),

  // ── Cadena 4: Varnia (crisis diplomática → amenaza → invasión ficticia) ─
  ev({
    id: 'varnia_incident', category: 'diplomacy', chain: { id: 'varnia', stage: 1, of: 5 }, hotspot: 'tv', speaker: 'journalist',
    conditions: { minRound: 5, maxRound: 8, unlocked: ['foreign'] }, weight: 1.5,
    title: t('Incidente con Varnia', 'Incident with Varnia'),
    text: t('Un patrullero de la República de Varnia (país ficticio) «se perdió» en tus aguas. Llevaba pancartas impresas.', 'A patrol boat from the Republic of Varnia (a fictional country) "got lost" in your waters. It carried pre-printed banners.'),
    detail: t('Varnia es un país inventado para este escenario alternativo.', 'Varnia is a country invented for this alternative scenario.'),
    choices: [
      { id: 'protest', label: t('Nota de protesta formal', 'Formal note of protest'), tags: ['negotiate'], result: t('Varnia responde con otra nota, más larga.', 'Varnia replies with a longer note.'), effects: [d('diplomacy', 2)] },
      { id: 'loud', label: t('Exigir disculpas en directo', 'Demand an apology on air'), tags: ['authoritarian'], result: t('Sube tu popularidad y la temperatura en la frontera.', 'Your popularity rises, and so does the border temperature.'), effects: [d('popularity', 3), d('diplomacy', -6), flag('varnia_tension')] },
      { id: 'quiet', label: t('Canal discreto con su embajada', 'Quiet back-channel with their embassy'), tags: ['investigate'], result: t('Te enteras de que en Varnia también hay elecciones. Y de que su líder necesita un enemigo.', 'You learn Varnia also has elections. And its leader needs an enemy.'), effects: [d('diplomacy', 4), d('popularity', -1), flag('varnia_intel')] },
    ],
  }),
  ev({
    id: 'varnia_crisis', category: 'diplomacy', chain: { id: 'varnia', stage: 2, of: 5 }, hotspot: 'phone', speaker: 'partner', kind: 'main',
    conditions: { minRound: 6, maxRound: 9, unlocked: ['foreign'], flags: ['varnia_tension'] }, weight: 2,
    title: t('Crisis diplomática', 'Diplomatic crisis'),
    text: t('Varnia expulsa a tu embajador y corta el gas «por mantenimiento». Mantenimiento indefinido.', 'Varnia expels your ambassador and cuts gas supplies "for maintenance". Indefinite maintenance.'),
    choices: [
      { id: 'allies', label: t('Sanciones junto a los aliados', 'Sanctions together with allies'), tags: ['negotiate'], result: t('Frente común. La factura energética sube, pero no estás solo.', 'A united front. Energy bills rise, but you are not alone.'), effects: [d('economy', -3), d('diplomacy', 4), g('rural', -2)] },
      { id: 'escalate', label: t('Escalar la retórica', 'Escalate the rhetoric'), tags: ['authoritarian'], result: t('Tu discurso es un éxito en casa y un regalo para el líder varnio.', 'Your speech is a hit at home and a gift to the Varnian leader.'), effects: [d('popularity', 4), d('diplomacy', -8), flag('varnia_escalated')] },
      { id: 'summit', label: t('Proponer una cumbre', 'Propose a summit'), tags: ['concede'], result: t('Te llaman blando. La cumbre, sin embargo, se celebra.', 'They call you soft. The summit, however, happens.'), effects: [d('diplomacy', 6), d('popularity', -2), c('opposition', -5), flag('varnia_summit')] },
    ],
  }),
  ev({
    id: 'varnia_threat', category: 'security', chain: { id: 'varnia', stage: 3, of: 5 }, hotspot: 'map', speaker: 'advisor', kind: 'main',
    conditions: { minRound: 8, maxRound: 10, flags: ['varnia_tension'], notFlags: ['varnia_summit'], stats: { diplomacy: [0, 50] } }, weight: 3,
    title: t('Amenaza de invasión', 'Invasion threat'),
    text: t('Satélites muestran tropas varnias junto a la frontera. Su televisión emite mapas con tu territorio coloreado de otro color.', 'Satellites show Varnian troops at the border. Their TV airs maps with your territory in a different colour.'),
    choices: [
      { id: 'defend', label: t('Preparar la defensa y proteger a civiles', 'Prepare defence and protect civilians'), tags: ['negotiate'], cost: { treasury: 3 }, result: t('Refugios, reservas y planes. Nadie quiere usarlos.', 'Shelters, reserves and plans. Nobody wants to use them.'), effects: [d('treasury', -3), d('security', 4), flag('defence_ready')] },
      { id: 'guarantee', label: t('Pedir garantías a los aliados', 'Ask allies for guarantees'), tags: ['investigate'], result: t('Los aliados prometen «firmeza». En su idioma, depende.', 'Allies promise "firmness". In their language, it depends.'), effects: [d('diplomacy', 5), flag('allied_guarantee')] },
      { id: 'appease', label: t('Hacer concesiones comerciales', 'Offer trade concessions'), tags: ['concede'], result: t('Varnia retira tropas… unos kilómetros.', 'Varnia withdraws its troops… a few kilometres.'), effects: [d('popularity', -6), d('economy', -2), d('diplomacy', 3), flag('appeased'), { special: 'crisis_resolved' }] },
    ],
  }),
  ev({
    id: 'varnia_invasion', category: 'security', chain: { id: 'varnia', stage: 4, of: 5 }, hotspot: 'map', speaker: 'advisor', kind: 'main',
    conditions: { minRound: 9, maxRound: 11, flags: ['varnia_escalated'], notFlags: ['appeased', 'allied_guarantee'] }, weight: 5,
    title: t('Invasión varnia', 'Varnian invasion'),
    text: t('Varnia ocupa una zona fronteriza deshabitada y planta una bandera. La población huye de los pueblos cercanos.', 'Varnia occupies an uninhabited border area and plants a flag. People flee nearby villages.'),
    detail: t('Rama excepcional del escenario alternativo. Se resuelve con decisiones abstractas, no con combate.', 'An exceptional branch of the alternative scenario. It is resolved through abstract decisions, not combat.'),
    choices: [
      { id: 'humanitarian', label: t('Prioridad humanitaria y coalición diplomática', 'Humanitarian priority and diplomatic coalition'), tags: ['negotiate'], cost: { treasury: 3 }, result: t('Acoges a los desplazados y sumas aliados. Varnia queda aislada.', 'You shelter the displaced and gather allies. Varnia is isolated.'), effects: [d('treasury', -3), d('diplomacy', 8), d('popularity', 4), chain('varnia_peace', 1), flag('invasion_diplomatic')] },
      { id: 'economic', label: t('Bloqueo económico total', 'Total economic blockade'), tags: ['reject'], result: t('A Varnia le duele. A ti, también.', 'It hurts Varnia. It hurts you too.'), effects: [d('economy', -5), d('diplomacy', 3), chain('varnia_peace', 2), flag('invasion_economic')] },
      { id: 'deploy', label: t('Despliegue defensivo disuasorio', 'Deterrent defensive deployment'), tags: ['authoritarian'], cost: { treasury: 4 }, result: t('Tus tropas se plantan en la línea. Nadie dispara. Todos sudan.', 'Your troops hold the line. Nobody fires. Everyone sweats.'), effects: [d('treasury', -4), d('security', 3), d('popularity', 5), d('integrity', -3), chain('varnia_peace', 1), flag('invasion_deployed')], risk: { chance: 0.3, effects: [d('popularity', -6), d('wellbeing', -4)], text: t('Un incidente en la línea causa heridos y pánico.', 'An incident on the line causes injuries and panic.') } },
    ],
  }),
  ev({
    id: 'varnia_peace', category: 'diplomacy', chain: { id: 'varnia', stage: 5, of: 5 }, hotspot: 'tv', speaker: 'partner', kind: 'main', scheduledOnly: true,
    title: t('Conversaciones de paz', 'Peace talks'),
    text: t('Varnia acepta negociar en un país neutral famoso por sus relojes. Te piden una salida digna para su líder.', 'Varnia agrees to talks in a neutral country famous for clocks. They ask for a dignified exit for their leader.'),
    choices: [
      { id: 'dignified', label: t('Concederle una salida digna', 'Grant him a dignified exit'), tags: ['concede'], result: t('Se retiran. Él lo llama «victoria». Tú, «paz».', 'They withdraw. He calls it "victory". You call it "peace".'), effects: [d('diplomacy', 6), d('popularity', 2), { special: 'crisis_resolved' }, flag('peace_signed')] },
      { id: 'reparations', label: t('Exigir reparaciones', 'Demand reparations'), tags: ['reject'], result: t('Negociación larga. Ganas dinero y un enemigo eterno.', 'Long negotiation. You gain money and an eternal enemy.'), effects: [d('treasury', 3), d('diplomacy', -2), d('popularity', 3), { special: 'crisis_resolved' }] },
      { id: 'walkout', label: t('Levantarte de la mesa', 'Walk out of the talks'), tags: ['authoritarian'], result: t('Titulares heroicos. Frontera congelada.', 'Heroic headlines. A frozen border.'), effects: [d('popularity', 3), d('diplomacy', -6), d('economy', -2), { special: 'crisis_failed' }] },
    ],
  }),

  // ── Cadena 5: investigación por corrupción (la programa el motor) ──────
  ev({
    id: 'press_investigation', category: 'corruption', chain: { id: 'probe', stage: 1, of: 3 }, hotspot: 'phone', speaker: 'journalist', kind: 'main', scheduledOnly: true,
    title: t('Preguntas incómodas', 'Awkward questions'),
    text: t('«Tengo facturas de una fundación con su logo. ¿Quiere comentar antes de que publique?»', '"I have invoices from a foundation with your logo. Care to comment before I publish?"'),
    choices: [
      { id: 'transparent', label: t('Abrir las cuentas', 'Open the books'), tags: ['transparent'], result: t('Duele hoy, protege mañana.', 'It hurts today, protects tomorrow.'), effects: [d('popularity', -3), d('suspicion', -10), d('credibility', 3), c('journalist', 10)] },
      { id: 'deny', label: t('Negarlo todo', 'Deny everything'), tags: ['lie'], result: t('«Lo veremos», responde. Tú también lo verás.', '"We will see," she replies. You will too.'), effects: [d('credibility', -3), d('suspicion', 4)], risk: { chance: 0.4, effects: [d('evidence', 10)], text: t('Publica un audio que contradice tu desmentido.', 'She publishes audio contradicting your denial.') } },
      { id: 'discredit', label: t('Acusarla de activista', 'Accuse her of being an activist'), tags: ['authoritarian'], result: t('Tus fieles la insultan en redes. Sus lectores se multiplican.', 'Your followers insult her online. Her readership multiplies.'), effects: [c('journalist', -25), d('integrity', -4), d('popularity', 1), d('evidence', 4)] },
    ],
  }),
  ev({
    id: 'scandal_leak', category: 'corruption', chain: { id: 'probe', stage: 2, of: 3 }, hotspot: 'tv', speaker: 'journalist', kind: 'main', scheduledOnly: true,
    title: t('Escándalo de corrupción', 'Corruption scandal'),
    text: t('Portada: «La caja B del Gobierno». Hay hojas de cálculo, mensajes y un pato de goma que nadie sabe explicar.', 'Front page: "The government’s slush fund". There are spreadsheets, messages and a rubber duck nobody can explain.'),
    choices: [
      { id: 'scapegoat', label: t('Culpar a tu asesora', 'Blame your adviser'), tags: ['lie'], result: t('Ella dimite. Tú respiras. Ella escribe un libro.', 'She resigns. You breathe. She writes a book.'), effects: [c('advisor', -40), d('evidence', -8), d('popularity', -2), flag('scapegoat')] },
      { id: 'cooperate', label: t('Pedir perdón y colaborar', 'Apologise and cooperate'), tags: ['transparent'], result: t('Pierdes apoyos y ganas algo de respeto.', 'You lose support and gain some respect.'), effects: [d('popularity', -6), d('integrity', 4), d('suspicion', -15), d('credibility', 4)] },
      { id: 'attack', label: t('Denunciar una conspiración judicial', 'Denounce a judicial conspiracy'), tags: ['authoritarian'], result: t('Tus bases se movilizan. Los jueces, también.', 'Your base mobilises. So do the judges.'), effects: [d('integrity', -8), d('popularity', 2), d('evidence', 6), flag('attacked_judges')] },
    ],
  }),
  ev({
    id: 'judicial_charges', category: 'corruption', chain: { id: 'probe', stage: 3, of: 3 }, hotspot: 'door', speaker: 'opposition', kind: 'main', scheduledOnly: true,
    title: t('Imputación', 'Formal charges'),
    text: t('Un juez te cita como investigado. La oposición prepara {fall}.', 'A judge summons you as a suspect. The opposition is preparing {fall}.'),
    choices: [
      { id: 'fight', label: t('Resistir y afrontar la votación', 'Hold on and face the vote'), tags: ['reject'], result: t('Cuentas apoyos uno a uno, como quien cuenta monedas.', 'You count supporters one by one, like coins.'), effects: [{ special: 'fall_vote' }] },
      { id: 'resign', label: t('Dimitir', 'Resign'), tags: ['concede'], result: t('Te vas con una rueda de prensa digna y una mudanza indigna.', 'You leave with a dignified press conference and an undignified move.'), effects: [{ special: 'resign' }] },
      { id: 'buy', label: t('Comprar apoyos con la caja paralela', 'Buy support with the parallel fund'), tags: ['corrupt'], requires: { stats: { privateFunds: [4, 999] } }, cost: { privateFunds: 4 }, result: t('Algunos votos cambian de bando. Las pruebas, también: a la fiscalía.', 'Some votes switch sides. So does evidence: to the prosecutor.'), effects: [d('privateFunds', -4), d('evidence', 10), { loyalty: { party: 'all', delta: 25 } }, { special: 'fall_vote' }] },
    ],
  }),

  // ── Cadena 6: conflicto dentro del gobierno ────────────────────────────
  ev({
    id: 'cabinet_clash', category: 'internal', chain: { id: 'cabinet', stage: 1, of: 3 }, hotspot: 'door', speaker: 'economist', kind: 'main',
    conditions: { minRound: 3, maxRound: 9 }, weight: 1.2,
    title: t('Conflicto en el Gobierno', 'Cabinet conflict'),
    text: t('Tu economista y tu socio se gritan en el pasillo: ella quiere recortar, él quiere inaugurar.', 'Your economist and your partner shout in the corridor: she wants cuts, he wants ribbon-cuttings.'),
    choices: [
      { id: 'economist', label: t('Dar la razón a Economía', 'Back the economist'), tags: ['reject'], result: t('Ella sonríe; él toma nota en una libreta muy gorda.', 'She smiles; he takes notes in a very thick notebook.'), effects: [c('economist', 12), c('partner', -14), { loyalty: { party: 'partners', delta: -12 } }, d('debt', -2), chain('minister_threat', 2)] },
      { id: 'partner', label: t('Dar la razón al socio', 'Back the partner'), tags: ['concede'], cost: { treasury: 2 }, result: t('Inauguras una rotonda. La economista, una carpeta de dimisión.', 'You open a roundabout. The economist opens a resignation folder.'), effects: [c('partner', 12), c('economist', -14), d('treasury', -2), { loyalty: { party: 'partners', delta: 10 } }, chain('minister_threat', 2)] },
      { id: 'split', label: t('Partir la diferencia', 'Split the difference'), tags: ['negotiate'], result: t('Nadie queda contento. Por eso funciona.', 'Nobody is happy. That is why it works.'), effects: [c('partner', -3), c('economist', -3), d('credibility', 1)] },
    ],
  }),
  ev({
    id: 'minister_threat', category: 'internal', chain: { id: 'cabinet', stage: 2, of: 3 }, hotspot: 'door', speaker: 'economist', kind: 'main', scheduledOnly: true,
    title: t('Amenaza de dimisión', 'Resignation threat'),
    text: t('«O se me escucha, o me voy. Y me llevo el pendrive con las cuentas reales.»', '"Either I am heard or I leave. And I take the USB stick with the real accounts."'),
    choices: [
      { id: 'concede', label: t('Darle más poder', 'Give her more power'), tags: ['concede'], result: t('Se queda, con un despacho más grande y menos paciencia.', 'She stays, with a bigger office and less patience.'), effects: [c('economist', 15), c('partner', -5), d('debt', -2)] },
      { id: 'accept', label: t('Aceptar la dimisión', 'Accept the resignation'), tags: ['reject'], result: t('Se va. Su sustituto confunde déficit con deuda en directo.', 'She leaves. Her replacement confuses deficit and debt on live TV.'), effects: [d('economy', -3), flag('lost_economist'), chain('leaked_audio', 2)] },
      { id: 'reshuffle', label: t('Remodelar el Gobierno entero', 'Reshuffle the whole cabinet'), tags: ['negotiate'], result: t('Caras nuevas, problemas viejos, foto bonita.', 'New faces, old problems, nice photo.'), effects: [d('popularity', 2), c('economist', -5), c('partner', -5), d('credibility', -1)] },
    ],
  }),
  ev({
    id: 'leaked_audio', category: 'internal', chain: { id: 'cabinet', stage: 3, of: 3 }, hotspot: 'tv', speaker: 'journalist', scheduledOnly: true,
    title: t('El audio del Consejo', 'The cabinet audio'),
    text: t('Se filtra un audio en el que alguien de tu equipo llama «ganado» a los votantes. Suena tu risa de fondo.', 'An audio leaks where someone on your team calls voters "cattle". Your laugh is heard in the background.'),
    choices: [
      { id: 'apologise', label: t('Pedir perdón sin excusas', 'Apologise without excuses'), tags: ['transparent'], result: t('Disculpa sincera. Aun así, duele.', 'Sincere apology. It still stings.'), effects: [d('popularity', -3), d('credibility', 2)] },
      { id: 'deny', label: t('Decir que es inteligencia artificial', 'Claim it is AI-generated'), tags: ['lie'], result: t('Un forense digital lo desmiente en dos horas.', 'A digital forensics expert debunks it in two hours.'), effects: [d('popularity', -1), d('credibility', -5), d('suspicion', 3)] },
      { id: 'fire', label: t('Cesar al autor', 'Fire the author'), tags: ['reject'], result: t('Cesado. Tu risa sigue en el audio.', 'Fired. Your laugh is still in the audio.'), effects: [d('popularity', -2), d('integrity', 1)] },
    ],
  }),

  // ── Cadena 7: referéndum (adaptado al país) ────────────────────────────
  ev({
    id: 'referendum_petition', category: 'institutions', chain: { id: 'referendum', stage: 1, of: 2 }, hotspot: 'folder', speaker: 'citizenC', kind: 'main',
    conditions: { minRound: 4, maxRound: 9 }, weight: 1,
    title: t('Un millón de firmas', 'A million signatures'),
    text: t('Una plataforma ciudadana pide votar la semana laboral de cuatro días. Tu asesora dice «peligro»; tu ego dice «plató».', 'A citizens’ platform demands a vote on the four-day week. Your adviser says "danger"; your ego says "TV time".'),
    variants: {
      es: { text: t('Una plataforma pide un referéndum consultivo sobre la semana de cuatro días. Necesitas que el Congreso lo autorice.', 'A platform demands a consultative referendum on the four-day week. Congress must authorise it.') },
      us: { title: t('Iniciativas estatales', 'State ballot initiatives'), text: t('No hay referéndum nacional: varios estados votarán la semana de cuatro días. ¿Te implicas?', 'There is no national referendum: several states will vote on the four-day week. Do you get involved?') },
      br: { text: t('Una plataforma pide un plebiscito sobre la semana de cuatro días. El Congreso debe convocarlo.', 'A platform demands a plebiscite on the four-day week. Congress must call it.') },
    },
    choices: [
      { id: 'call', label: t('Impulsar la consulta y hacer campaña a favor', 'Back the vote and campaign for it'), tags: ['support'], result: t('Te juegas tu prestigio a una papeleta.', 'You stake your prestige on one ballot.'), effects: [{ special: 'referendum' }, flag('referendum_yes')] },
      { id: 'neutral', label: t('Permitirla y mantenerte neutral', 'Allow it and stay neutral'), tags: ['delay'], result: t('Neutralidad: el deporte nacional de los gobiernos.', 'Neutrality: the national sport of governments.'), effects: [{ special: 'referendum' }, flag('referendum_neutral')] },
      { id: 'block', label: t('Bloquearla', 'Block it'), tags: ['reject'], result: t('Un millón de personas acaban de cambiar su foto de perfil contra ti.', 'A million people just changed their profile picture against you.'), effects: [d('credibility', -3), g('youth', -5), g('workers', -3), g('business', 4), d('integrity', -2)] },
    ],
  }),
  ev({
    id: 'referendum_result', category: 'institutions', chain: { id: 'referendum', stage: 2, of: 2 }, hotspot: 'tv', speaker: 'journalist', kind: 'main', scheduledOnly: true,
    title: t('Noche de consulta', 'Referendum night'),
    text: t('Resultado: {refResult}. Ahora toca decidir qué hacer con él.', 'Result: {refResult}. Now you must decide what to do with it.'),
    choices: [
      { id: 'implement', label: t('Aplicarlo de forma gradual', 'Implement it gradually'), tags: ['concede'], result: t('Pruebas piloto, sectores voluntarios, menos ojeras.', 'Pilot schemes, voluntary sectors, fewer dark circles.'), effects: [g('workers', 4), g('youth', 4), g('business', -4), d('economy', -1), d('wellbeing', 2, 2)] },
      { id: 'shelve', label: t('Guardarlo en un cajón', 'Shelve it'), tags: ['delay'], result: t('El cajón ya tiene mucha compañía.', 'That drawer already has plenty of company.'), effects: [d('credibility', -4), g('workers', -3)] },
      { id: 'reinterpret', label: t('Reinterpretar el resultado', 'Reinterpret the result'), tags: ['lie'], result: t('«Cuatro días» significa «cuatro días de debate». Brillante y terrible.', '"Four days" means "four days of debate". Brilliant and terrible.'), effects: [d('credibility', -6), d('integrity', -3), d('popularity', -2)] },
    ],
  }),
];
