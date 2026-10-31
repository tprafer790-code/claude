// Contenido y reglas del debate televisado.
import type { CandidateId, DebateCard, DebateMove, L } from '../core/types';
import { t } from './helpers';

/** Eficacia de cada carta del jugador frente a cada jugada del rival. Ajustable. */
export const DEBATE_TABLE: Record<DebateMove, Record<DebateCard, number>> = {
  attack: { data: -4, story: 4, attack: 0, deflect: 10, promise: -3 },
  stat: { data: 9, story: 4, attack: -4, deflect: -5, promise: 0 },
  story: { data: -5, story: 2, attack: -8, deflect: 0, promise: 9 },
  promise: { data: 10, story: 0, attack: 5, deflect: -4, promise: -6 },
};
export const DEBATE_TIMEOUT = -6;
export const CARD_USES = 2;

export const CARD_NAMES: Record<DebateCard, L> = {
  data: t('Dato contundente', 'Hard fact'),
  story: t('Historia personal', 'Personal story'),
  attack: t('Ataque', 'Attack'),
  deflect: t('Réplica con humor', 'Witty comeback'),
  promise: t('Promesa del programa', 'Platform promise'),
};
export const CARD_HINTS: Record<DebateCard, L> = {
  data: t('Fuerte contra cifras y promesas vacías.', 'Strong against numbers and empty promises.'),
  story: t('Segura contra ataques y datos fríos.', 'Safe against attacks and cold numbers.'),
  attack: t('Útil ante promesas; desastrosa ante emociones.', 'Useful against promises; disastrous against emotions.'),
  deflect: t('Desactiva ataques personales.', 'Defuses personal attacks.'),
  promise: t('Brilla frente a historias emotivas. Mejor si ya lo prometiste.', 'Shines against emotional stories. Better if you already promised it.'),
};

/** Señales del rival antes de su jugada: el jugador puede leerlas. */
export const MOVE_TELLS: Record<DebateMove, L[]> = {
  attack: [t('{rival} se gira hacia ti con una sonrisa venenosa.', '{rival} turns to you with a venomous smile.'), t('{rival} saca una foto tuya antigua.', '{rival} pulls out an old photo of you.')],
  stat: [t('{rival} abre una carpeta llena de gráficos.', '{rival} opens a folder full of charts.'), t('{rival} se ajusta las gafas y carraspea: «Los datos dicen…».', '{rival} adjusts their glasses: "The data says…".')],
  story: [t('{rival} baja la voz y mira a cámara: «Ayer conocí a una madre…».', '{rival} lowers their voice, looks at the camera: "Yesterday I met a mother…".'), t('{rival} se lleva la mano al pecho.', '{rival} puts a hand on their heart.')],
  promise: [t('{rival} levanta el dedo: «Yo os prometo…».', '{rival} raises a finger: "I promise you…".'), t('{rival} anuncia «el plan más ambicioso de la historia».', '{rival} announces "the most ambitious plan in history".')],
};

export const TOPIC_NAMES: Record<string, L> = {
  taxes: t('impuestos', 'taxes'), services: t('sanidad y servicios', 'health and services'), housing: t('vivienda', 'housing'),
  jobs: t('empleo', 'jobs'), security: t('seguridad', 'security'), environment: t('medioambiente', 'environment'),
};

/** Frases propias de cada candidato al usar cada carta: personalidad, no ventajas. */
export const QUIPS: Record<CandidateId, Record<DebateCard, L>> = {
  hippie: {
    data: t('«Lo he medido con mi corazón… y con este informe del instituto de estadística.»', '"I measured it with my heart… and with this statistics office report."'),
    story: t('«En una comuna de Teruel conocí a un señor que hacía queso con amor.»', '"In a commune I met a man who made cheese with love."'),
    attack: t('«Tu aura está muy negra, colega.»', '"Your aura is really dark, buddy."'),
    deflect: t('«Respira. Inspira. Ya está, se me ha olvidado tu insulto.»', '"Breathe in. Breathe out. There, I forgot your insult."'),
    promise: t('«Prometo esto con la misma fuerza con la que planto tomates.»', '"I promise this as firmly as I plant tomatoes."'),
  },
  impecable: {
    data: t('«Tercera diapositiva, gráfico cuatro, fuente oficial. De nada.»', '"Slide three, chart four, official source. You are welcome."'),
    story: t('«Mi abuelo, que también llevaba traje, me dijo una vez…»', '"My grandfather, who also wore a suit, once told me…"'),
    attack: t('«Con todo el respeto y una sonrisa: es usted un desastre.»', '"With all due respect and a smile: you are a disaster."'),
    deflect: t('«Qué corbata tan valiente lleva hoy. Siguiente pregunta.»', '"What a brave tie you are wearing. Next question."'),
    promise: t('«Lo tengo en mi agenda. En negrita.»', '"It is in my diary. In bold."'),
  },
  veterano: {
    data: t('«En el 78 la cifra era peor. Y en el 82, ni te cuento.»', '"In ’78 the number was worse. And in ’82, don’t get me started."'),
    story: t('«Cuando yo era joven, que fue hace muchísimo…»', '"When I was young, which was a very long time ago…"'),
    attack: t('«He visto pasar a treinta como usted. Todos peinaban mejor.»', '"I have seen thirty of your kind come and go. They all had better hair."'),
    deflect: t('«¿Perdón? No le he oído. Ni le pienso oír.»', '"Pardon? I did not hear you. Nor do I intend to."'),
    promise: t('«Lo prometo, y yo prometo poco porque me queda poco.»', '"I promise it, and I do not promise much because I do not have much time."'),
  },
  influencer: {
    data: t('«Lo he verificado con mis seguidores. Y con el ministerio, vale.»', '"I fact-checked it with my followers. And the ministry, fine."'),
    story: t('«Esto me lo contó un fan en un directo a las tres de la mañana.»', '"A fan told me this on a 3 a.m. livestream."'),
    attack: t('«Bloqueado. Bueno, en sentido figurado.»', '"Blocked. Well, figuratively."'),
    deflect: t('«Esto va directo a mis historias. Gracias por el contenido.»', '"This goes straight to my stories. Thanks for the content."'),
    promise: t('«Si llegamos a un millón de votos, lo hago. Es una promesa, no un sorteo.»', '"If we hit a million votes, I will do it. It is a promise, not a giveaway."'),
  },
};
