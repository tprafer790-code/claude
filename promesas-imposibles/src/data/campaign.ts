// Preguntas del programa (asesor de campaña), conversaciones de calle y entrevistas.
import type { AxisId, CastId, Effect, GroupId, L, Stance } from '../core/types';
import { c, d, g, t } from './helpers';

export interface ProgrammeOption { stance: Stance; label: L; promise: L; reaction: L; groups: Partial<Record<GroupId, number>> }
export interface ProgrammeQuestion { axis: AxisId; ask: { left: L; right: L }; options: ProgrammeOption[] }

/** Seis decisiones iniciales. El asesor recomienda según la orientación, pero se puede discrepar. */
export const PROGRAMME: ProgrammeQuestion[] = [
  {
    axis: 'taxes',
    ask: {
      left: t('Primera: impuestos. Nuestra gente espera que paguen más los de arriba. ¿Lo prometemos?', 'First: taxes. Our people expect the top to pay more. Do we promise it?'),
      right: t('Primera: impuestos. Nuestra gente quiere oír «bajada». ¿Lo prometemos?', 'First: taxes. Our people want to hear "cut". Do we promise it?'),
    },
    options: [
      { stance: -1, label: t('Que paguen más las grandes fortunas', 'Make great fortunes pay more'), promise: t('Gravar a las grandes fortunas', 'Tax great fortunes'), reaction: t('Los empresarios del bar de abajo han dejado de saludar.', 'The business owners downstairs stopped saying hello.'), groups: { workers: 4, public: 3, business: -6 } },
      { stance: 0, label: t('Simplificar sin subir ni bajar', 'Simplify, neither raise nor cut'), promise: t('Simplificar los impuestos', 'Simplify taxes'), reaction: t('Prudente. Aburrido. Votable.', 'Prudent. Boring. Electable.'), groups: { business: 2, urban: 2 } },
      { stance: 1, label: t('Bajar impuestos a todo el mundo', 'Cut taxes for everyone'), promise: t('Bajar el impuesto sobre la renta', 'Cut income tax'), reaction: t('Aplausos. Nadie pregunta cómo se paga.', 'Applause. Nobody asks how it is paid for.'), groups: { business: 6, workers: 2, public: -4 } },
    ],
  },
  {
    axis: 'services',
    ask: {
      left: t('Sanidad y servicios. Yo diría: más público, más plantillas.', 'Health and services. I would say: more public, more staff.'),
      right: t('Sanidad y servicios. Yo diría: libertad de elección, cheque y que compitan.', 'Health and services. I would say: freedom of choice, vouchers, competition.'),
    },
    options: [
      { stance: -1, label: t('Plan de choque en la sanidad pública', 'Emergency plan for public health'), promise: t('Reducir las listas de espera con más personal público', 'Cut waiting lists with more public staff'), reaction: t('Una enfermera del público te lanza un beso. Literal.', 'A nurse in the crowd blows you a kiss. Literally.'), groups: { pensioners: 4, public: 5 } },
      { stance: 0, label: t('Digitalizar trámites y citas', 'Digitise procedures and appointments'), promise: t('Una ventanilla única digital', 'A one-stop digital office'), reaction: t('Los jóvenes asienten. Tu abuela pregunta qué es «la nube».', 'Young people nod. Your grandmother asks what "the cloud" is.'), groups: { youth: 3, urban: 2, pensioners: -1 } },
      { stance: 1, label: t('Cheque para elegir centro privado', 'Voucher to choose private providers'), promise: t('Un cheque de servicios para elegir proveedor', 'A services voucher to choose your provider'), reaction: t('Las clínicas privadas ya imprimen carteles de bienvenida.', 'Private clinics are already printing welcome banners.'), groups: { business: 4, urban: 2, public: -5 } },
    ],
  },
  {
    axis: 'housing',
    ask: {
      left: t('Vivienda. Los alquileres están por las nubes. ¿Tope y vivienda pública?', 'Housing. Rents are sky-high. Cap and public housing?'),
      right: t('Vivienda. Los alquileres están por las nubes. ¿Más suelo y que construyan?', 'Housing. Rents are sky-high. More land and let them build?'),
    },
    options: [
      { stance: -1, label: t('Topar alquileres y construir vivienda pública', 'Cap rents and build public housing'), promise: t('Topar los alquileres', 'Cap rents'), reaction: t('Un inquilino llora. Un casero también, por otros motivos.', 'A renter cries. So does a landlord, for other reasons.'), groups: { youth: 6, urban: 3, business: -4 } },
      { stance: 0, label: t('Ayudas directas al alquiler joven', 'Direct rent aid for young people'), promise: t('Una ayuda joven al alquiler', 'A youth rent allowance'), reaction: t('Bien recibido. Los caseros ya calculan la subida.', 'Well received. Landlords are already calculating the increase.'), groups: { youth: 4 } },
      { stance: 1, label: t('Liberalizar suelo para construir más', 'Free up land to build more'), promise: t('Liberalizar el suelo', 'Deregulate land'), reaction: t('Las constructoras te mandan flores. Plantadas en un humedal.', 'Builders send you flowers. Planted in a wetland.'), groups: { business: 5, rural: 2, urban: -2 } },
    ],
  },
  {
    axis: 'jobs',
    ask: {
      left: t('Empleo. Subir el salario mínimo moviliza a los nuestros.', 'Jobs. Raising the minimum wage mobilises our base.'),
      right: t('Empleo. Una reforma flexible anima a contratar, dicen los nuestros.', 'Jobs. A flexible reform encourages hiring, our people say.'),
    },
    options: [
      { stance: -1, label: t('Subir el salario mínimo', 'Raise the minimum wage'), promise: t('Subir el salario mínimo', 'Raise the minimum wage'), reaction: t('El sindicato te invita a una paella. La pagan ellos, de momento.', 'The union invites you to lunch. They pay, for now.'), groups: { workers: 6, business: -5 } },
      { stance: 0, label: t('Formación profesional de calidad', 'Quality vocational training'), promise: t('Un gran plan de formación profesional', 'A major vocational training plan'), reaction: t('Nadie se enfada. Nadie se emociona. Así se gobierna.', 'Nobody is angry. Nobody is excited. That is governing.'), groups: { youth: 3, workers: 2 } },
      { stance: 1, label: t('Reforma laboral flexible', 'Flexible labour reform'), promise: t('Una reforma laboral flexible', 'A flexible labour reform'), reaction: t('Los sindicatos han reservado ya la plaza para la manifestación.', 'The unions have already booked the square for a protest.'), groups: { business: 6, workers: -5 } },
    ],
  },
  {
    axis: 'security',
    ask: {
      left: t('Seguridad. Te propongo prevención y mediación. No suena duro, pero funciona.', 'Security. I suggest prevention and mediation. It does not sound tough, but it works.'),
      right: t('Seguridad. Más policía en la calle. Se ve, se entiende, se vota.', 'Security. More police on the streets. People see it, get it, vote for it.'),
    },
    options: [
      { stance: -1, label: t('Prevención y mediación social', 'Prevention and social mediation'), promise: t('Invertir en prevención y mediación', 'Invest in prevention and mediation'), reaction: t('Un educador social se ofrece voluntario. Trae su propia guitarra.', 'A youth worker volunteers. Brings his own guitar.'), groups: { youth: 3, urban: 2, pensioners: -2 } },
      { stance: 0, label: t('Equilibrio: algo de cada', 'Balance: a bit of both'), promise: t('Seguridad equilibrada, sin estridencias', 'Balanced security, no theatrics'), reaction: t('Tu asesora apunta «tibio» en la libreta. Y luego lo tacha.', 'Your adviser writes "lukewarm" in her notebook. Then crosses it out.'), groups: {} },
      { stance: 1, label: t('Más policía de barrio', 'More neighbourhood police'), promise: t('Más policía de barrio', 'More neighbourhood police'), reaction: t('Los jubilados del banco del parque se sienten escuchados.', 'The pensioners on the park bench feel heard.'), groups: { pensioners: 5, business: 2, youth: -2 } },
    ],
  },
  {
    axis: 'environment',
    ask: {
      left: t('Medioambiente. Transición verde ambiciosa: los jóvenes lo piden.', 'Environment. An ambitious green transition: young people demand it.'),
      right: t('Medioambiente. Prometamos energía barata ya: la factura duele.', 'Environment. Let us promise cheap energy now: bills hurt.'),
    },
    options: [
      { stance: -1, label: t('Transición verde con ayudas', 'Green transition with subsidies'), promise: t('Una transición verde ambiciosa', 'An ambitious green transition'), reaction: t('Un estudiante se pega a tu atril. De alegría, esta vez.', 'A student glues himself to your podium. Out of joy, this time.'), groups: { youth: 6, urban: 3, rural: -4 } },
      { stance: 0, label: t('Tasa al carbono con dividendo', 'Carbon fee with dividend'), promise: t('Una tasa al carbono que devuelve el dinero', 'A carbon fee that pays people back'), reaction: t('Nadie lo entiende, pero suena justo.', 'Nobody understands it, but it sounds fair.'), groups: { urban: 2, youth: 2 } },
      { stance: 1, label: t('Energía barata ya', 'Cheap energy now'), promise: t('Bajar la factura de la luz cueste lo que cueste', 'Cut energy bills whatever it takes'), reaction: t('Los agricultores pitan con el tractor. A favor, parece.', 'Farmers honk their tractors. In favour, apparently.'), groups: { rural: 5, business: 3, youth: -5 } },
    ],
  },
];

/** Conversaciones de calle durante la campaña. */
export interface StreetTalk {
  id: string;
  speaker: CastId;
  group: GroupId;
  line: L;
  options: { label: L; reply: L; effects: Effect[] }[];
}

export const STREET: StreetTalk[] = [
  {
    id: 'st_pension', speaker: 'citizenA', group: 'pensioners',
    line: t('Joven, mi pensión no llega ni al día 20. ¿Usted qué va a hacer, aparte de hacerse la foto?', 'Young one, my pension does not last until the 20th. What will you do, apart from the photo?'),
    options: [
      { label: t('Prometer revalorizar las pensiones', 'Promise to raise pensions'), reply: t('—Eso dijeron los anteriores. Pero usted lo ha dicho más alto.', '"The last lot said that too. But you said it louder."'), effects: [g('pensioners', 6), d('treasury', -1, 0, t('Promesa improvisada de pensiones.', 'Improvised pension promise.')), d('credibility', -1)] },
      { label: t('Explicarle el plan de servicios', 'Explain your services plan'), reply: t('—No he entendido nada, pero me ha mirado a los ojos.', '"I did not understand a thing, but you looked me in the eye."'), effects: [g('pensioners', 3), d('credibility', 2)] },
      { label: t('Hacerse la foto igualmente', 'Take the photo anyway'), reply: t('La foto se hace viral: «Candidato ignora a jubilada».', 'The photo goes viral: "Candidate ignores pensioner".'), effects: [d('popularity', -2), g('pensioners', -4)] },
    ],
  },
  {
    id: 'st_rent', speaker: 'citizenB', group: 'youth',
    line: t('Comparto piso con cuatro personas y un hurón. El hurón paga más que yo.', 'I share a flat with four people and a ferret. The ferret pays more than me.'),
    options: [
      { label: t('Contar tu plan de vivienda', 'Explain your housing plan'), reply: t('—Vale, pero ¿cuándo? Tengo 34 años.', '"Fine, but when? I am 34."'), effects: [g('youth', 4), d('credibility', 1)] },
      { label: t('Invitarle a un acto de campaña', 'Invite them to a campaign event'), reply: t('Viene. Trae al hurón. El hurón se hace famoso.', 'They come. They bring the ferret. The ferret becomes famous.'), effects: [g('youth', 3), d('momentum', 2)] },
      { label: t('Aconsejarle volver con sus padres', 'Suggest moving back with their parents'), reply: t('Te graba. Ya tienes un meme nuevo.', 'They record you. You have a new meme.'), effects: [g('youth', -6), d('popularity', -2)] },
    ],
  },
  {
    id: 'st_shop', speaker: 'citizenC', group: 'business',
    line: t('Tengo una mercería desde hace treinta años. Entre la luz y los papeles, ya solo me queda el mostrador.', 'I have run a haberdashery for thirty years. Between bills and paperwork, only the counter is left.'),
    options: [
      { label: t('Prometer menos papeleo', 'Promise less red tape'), reply: t('—Si lo cumple, le cosemos la bandera gratis.', '"If you deliver, we will sew your flag for free."'), effects: [g('business', 5), d('credibility', 1)] },
      { label: t('Comprar algo para la foto', 'Buy something for the photo'), reply: t('Compras doce botones. La foto queda entrañable.', 'You buy twelve buttons. The photo is endearing.'), effects: [g('business', 2), d('popularity', 2), d('funds', -1)] },
      { label: t('Hablarle de tu plan fiscal', 'Talk about your tax plan'), reply: t('Escucha con atención. Su opinión depende de lo que prometiste.', 'Listens carefully. Their opinion depends on what you promised.'), effects: [d('credibility', 2)] },
    ],
  },
  {
    id: 'st_worker', speaker: 'unionist', group: 'workers',
    line: t('En la fábrica dicen que todos los políticos sois iguales. Yo digo que algunos sois peores. ¿Cuál es usted?', 'At the factory they say all politicians are the same. I say some are worse. Which are you?'),
    options: [
      { label: t('Comprometerte con los convenios', 'Commit to collective agreements'), reply: t('—Lo apunto. Y mire que tengo buena memoria.', '"I am writing it down. And I have a good memory."'), effects: [g('workers', 5), c('unionist', 10)] },
      { label: t('Hablar de productividad', 'Talk about productivity'), reply: t('—Productividad. Qué palabra tan bonita para «más horas».', '"Productivity. Such a nice word for \'more hours\'."'), effects: [g('workers', -2), g('business', 3), c('unionist', -5)] },
      { label: t('Ponerte el casco y posar', 'Put on a hard hat and pose'), reply: t('Te lo pones al revés. Aun así, la foto funciona.', 'You wear it backwards. Still, the photo works.'), effects: [d('popularity', 2), g('workers', 1)] },
    ],
  },
  {
    id: 'st_farmer', speaker: 'citizenC', group: 'rural',
    line: t('En mi pueblo cerraron el banco, el médico viene los martes y la cobertura, nunca.', 'In my village the bank closed, the doctor comes on Tuesdays and phone signal never does.'),
    options: [
      { label: t('Prometer un plan rural', 'Promise a rural plan'), reply: t('—Otro plan. Ya tenemos un cajón lleno.', '"Another plan. We have a whole drawer of them."'), effects: [g('rural', 4), d('credibility', -1)] },
      { label: t('Quedarte a comer en el pueblo', 'Stay for lunch in the village'), reply: t('Comes tres platos. Te ganas al pueblo y una indigestión.', 'You eat three courses. You win the village and indigestion.'), effects: [g('rural', 5), d('momentum', 1)] },
      { label: t('Hablar de la ventanilla digital', 'Talk about the digital office'), reply: t('—¿Digital? Si aquí no llega ni la radio.', '"Digital? We do not even get radio here."'), effects: [g('rural', -3)] },
    ],
  },
  {
    id: 'st_teacher', speaker: 'citizenB', group: 'public',
    line: t('Soy profe interina. Llevo once centros en seis años. Mi coche sabe más geografía que yo.', 'I am a temporary teacher. Eleven schools in six years. My car knows more geography than I do.'),
    options: [
      { label: t('Prometer estabilizar plantillas', 'Promise stable staffing'), reply: t('—Eso ya lo oí. Pero quiero creerle.', '"I have heard that before. But I want to believe you."'), effects: [g('public', 6), d('treasury', -1, 0, t('Compromiso de plantillas.', 'Staffing commitment.'))] },
      { label: t('Hablar de evaluación y méritos', 'Talk about evaluation and merit'), reply: t('—Evalúeme a mí y a mi coche, ya puestos.', '"Evaluate me and my car while you are at it."'), effects: [g('public', -3), g('business', 2)] },
      { label: t('Pedirle que se sume a la campaña', 'Ask them to join the campaign'), reply: t('Se apunta. Hace los mejores carteles que has visto.', 'They join. They make the best posters you have ever seen.'), effects: [g('public', 2), d('momentum', 2)] },
    ],
  },
  {
    id: 'st_climate', speaker: 'citizenB', group: 'urban',
    line: t('En verano mi barrio llega a 44 grados. Los árboles los plantaron en una maqueta, nunca en la calle.', 'In summer my neighbourhood hits 44 degrees. The trees were planted on a model, never on the street.'),
    options: [
      { label: t('Prometer sombra y árboles', 'Promise shade and trees'), reply: t('—Árboles de verdad, ¿eh? No de los de PowerPoint.', '"Real trees, right? Not the PowerPoint kind."'), effects: [g('urban', 4), g('youth', 2)] },
      { label: t('Hablar de aire acondicionado barato', 'Talk about cheap air conditioning'), reply: t('—Práctico. Deprimente, pero práctico.', '"Practical. Depressing, but practical."'), effects: [g('urban', 1), g('pensioners', 2)] },
      { label: t('Culpar al gobierno anterior', 'Blame the previous government'), reply: t('—Ya. ¿Y usted qué?', '"Sure. And what about you?"'), effects: [d('credibility', -2)] },
    ],
  },
];

/** Preguntas del periodista en la entrevista de campaña: recuerdan tus promesas. */
export interface InterviewQ { axis: AxisId; q: L }
export const INTERVIEW: InterviewQ[] = [
  { axis: 'taxes', q: t('Usted promete «{promise}». ¿De dónde sale el dinero, exactamente?', 'You promise "{promise}". Where exactly does the money come from?') },
  { axis: 'housing', q: t('Ha prometido «{promise}». ¿Cuántas viviendas habrá el primer año? Una cifra, por favor.', 'You promised "{promise}". How many homes in year one? A number, please.') },
  { axis: 'jobs', q: t('Con «{promise}», ¿cuántos empleos se crean o se pierden? Los expertos no se ponen de acuerdo.', 'With "{promise}", how many jobs are created or lost? Experts disagree.') },
  { axis: 'environment', q: t('«{promise}». ¿Lo mantendrá cuando la factura de la luz suba en enero?', '"{promise}". Will you keep it when energy bills rise in January?') },
];
export const INTERVIEW_ANSWERS = [
  { id: 'honest', label: t('Responder con datos y matices', 'Answer with data and nuance'), effects: [d('credibility', 4), d('popularity', -1)], result: t('Aburrido para la tele, sólido para la hemeroteca.', 'Boring on TV, solid in the archives.') },
  { id: 'bold', label: t('Prometer más todavía', 'Promise even more'), effects: [d('popularity', 3), d('credibility', -3), d('momentum', 2)], result: t('El plató aplaude. Tu asesora se tapa la cara.', 'The studio applauds. Your adviser covers her face.') },
  { id: 'dodge', label: t('Cambiar de tema con una anécdota', 'Change the subject with an anecdote'), effects: [d('popularity', 1), c('journalist', -6)], result: t('La periodista apunta algo. Nunca es buena señal.', 'The journalist writes something down. Never a good sign.') },
  { id: 'lie', label: t('Inventarte una cifra convincente', 'Invent a convincing figure'), effects: [d('popularity', 3), d('suspicion', 4), { flag: 'lied_interview' }], result: t('Suena genial. Alguien en una redacción ya está comprobándolo.', 'Sounds great. Someone in a newsroom is already fact-checking it.') },
] as const;
