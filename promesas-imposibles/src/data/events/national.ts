// Eventos con reglas institucionales propias de cada país.
import type { GameEvent } from '../../core/types';
import { c, d, flag, g, t } from '../helpers';
import { ev } from './build';

export const NATIONAL_EVENTS: GameEvent[] = [
  ev({
    id: 'es_regional_financing', category: 'parliament', hotspot: 'door', speaker: 'partner', kind: 'main', weight: 1.4,
    conditions: { countries: ['es'], minRound: 3, maxRound: 9 },
    title: t('Financiación autonómica', 'Regional financing'),
    text: t('Coalició Mediterrània exige un nuevo sistema de financiación «singular». El resto de regiones exige ser igual de singulares.', 'Coalició Mediterrània demands a "unique" financing system. Every other region demands to be equally unique.'),
    choices: [
      { id: 'grant', label: t('Concedérsela', 'Grant it'), tags: ['concede'], cost: { treasury: 2 }, result: t('Socios felices; barones regionales en pie de guerra.', 'Happy partners; regional barons on the warpath.'), effects: [d('treasury', -2), { loyalty: { party: 'cm', delta: 30 } }, g('rural', -3), c('opposition', -8)] },
      { id: 'general', label: t('Reforma para todas las regiones', 'Reform for all regions'), tags: ['negotiate'], cost: { treasury: 3 }, result: t('Caro y lento, pero nadie se siente agraviado del todo.', 'Costly and slow, but nobody feels entirely wronged.'), effects: [d('treasury', -3), { loyalty: { party: 'all', delta: 6 } }, d('integrity', 2)] },
      { id: 'refuse', label: t('Negarte', 'Refuse'), tags: ['reject'], result: t('Coherencia territorial, aritmética parlamentaria rota.', 'Territorial consistency, broken parliamentary arithmetic.'), effects: [{ loyalty: { party: 'cm', delta: -30 } }, g('rural', 2)] },
    ],
  }),
  ev({
    id: 'es_budget_prorogued', category: 'parliament', hotspot: 'desk', speaker: 'economist', scheduledOnly: true,
    conditions: { countries: ['es'] },
    title: t('Presupuestos prorrogados', 'Budget extended'),
    text: t('Sin presupuesto nuevo, se prorrogan los del año pasado. Tu programa, en pausa; tu economista, en modo «te lo dije».', 'With no new budget, last year’s is extended. Your programme is on hold; your economist is in "told you so" mode.'),
    choices: [
      { id: 'decrees', label: t('Gobernar a base de decretos', 'Govern by decree'), tags: ['authoritarian'], result: t('Funciona hasta la próxima convalidación.', 'Works until the next ratification vote.'), effects: [d('integrity', -3), d('support', -4)] },
      { id: 'early', label: t('Insinuar un adelanto electoral', 'Hint at an early election'), tags: ['delay'], result: t('Tus socios se ponen nerviosos. Era la idea.', 'Your partners get nervous. That was the idea.'), effects: [{ loyalty: { party: 'partners', delta: 10 } }, d('credibility', -1)] },
      { id: 'accept', label: t('Asumir la prórroga', 'Accept the extension'), tags: ['concede'], result: t('Gestionar con lo que hay. Muy de aquí.', 'Making do with what there is. Very local.'), effects: [d('popularity', -2)] },
    ],
  }),
  ev({
    id: 'us_shutdown', category: 'parliament', hotspot: 'tv', speaker: 'opposition', kind: 'main', scheduledOnly: true,
    conditions: { countries: ['us'] },
    title: t('Cierre de la Administración', 'Government shutdown'),
    text: t('Sin acuerdo presupuestario, cierran parques nacionales y oficinas federales. Los osos celebran.', 'Without a budget deal, national parks and federal offices close. The bears celebrate.'),
    choices: [
      { id: 'cave', label: t('Ceder a la oposición', 'Cave to the opposition'), tags: ['concede'], result: t('Reabre todo. Tu ala dura te llama traidor.', 'Everything reopens. Your hardliners call you a traitor.'), effects: [d('popularity', 1), { loyalty: { party: 'partners', delta: -10 } }, c('opposition', 5)] },
      { id: 'blame', label: t('Culpar al Congreso en horario de máxima audiencia', 'Blame Congress in prime time'), tags: ['reject'], result: t('Funciona una semana. Luego todos culpan a todos.', 'Works for a week. Then everyone blames everyone.'), effects: [d('popularity', -2), d('economy', -3), d('unrest', 4)] },
      { id: 'short', label: t('Acordar una prórroga de seis semanas', 'Agree a six-week stopgap'), tags: ['negotiate'], result: t('Pateas la lata. La lata vuelve.', 'You kick the can. The can comes back.'), effects: [d('economy', -1), d('credibility', -1)] },
    ],
  }),
  ev({
    id: 'us_court_order', category: 'institutions', hotspot: 'tv', speaker: 'journalist', scheduledOnly: true,
    conditions: { countries: ['us'] },
    title: t('Un juez bloquea tu orden ejecutiva', 'A judge blocks your executive order'),
    text: t('Un tribunal federal suspende tu orden ejecutiva. Tus asesores proponen «ignorar al juez con elegancia».', 'A federal court suspends your executive order. Your aides suggest "ignoring the judge elegantly".'),
    choices: [
      { id: 'comply', label: t('Acatar y legislar', 'Comply and legislate'), tags: ['concede'], result: t('Pierdes la medida, ganas respeto institucional.', 'You lose the measure, gain institutional respect.'), effects: [d('integrity', 3)] },
      { id: 'appeal', label: t('Recurrir al Supremo', 'Appeal to the Supreme Court'), tags: ['negotiate'], result: t('Meses de litigio. Mientras, nada.', 'Months of litigation. Meanwhile, nothing.'), effects: [d('popularity', -1)] },
      { id: 'defy', label: t('Desafiar la sentencia', 'Defy the ruling'), tags: ['authoritarian'], result: t('Crisis constitucional en directo.', 'A live constitutional crisis.'), effects: [d('integrity', -14), d('popularity', 2), flag('defied_courts'), c('journalist', -15)] },
    ],
  }),
  ev({
    id: 'br_emendas', category: 'parliament', hotspot: 'door', speaker: 'partner', kind: 'main', weight: 1.6,
    conditions: { countries: ['br'], minRound: 2, maxRound: 10 }, repeat: { max: 2, cooldown: 4 },
    title: t('El Centro Pragmático pasa la cuenta', 'The Pragmatic Center sends the bill'),
    text: t('El diputado Juvenal Pires quiere enmiendas para «obras en las bases». Las bases, casualmente, son su ciudad.', 'Deputy Juvenal Pires wants earmarks for "grassroots works". The grassroots happen to be his hometown.'),
    choices: [
      { id: 'pay', label: t('Liberar las enmiendas', 'Release the earmarks'), tags: ['concede'], cost: { treasury: 3 }, result: t('Inauguras una plaza con su nombre. Y su estatua.', 'You open a square bearing his name. And his statue.'), effects: [d('treasury', -3), { loyalty: { party: 'cp', delta: 25 } }, d('integrity', -2)] },
      { id: 'ministry', label: t('Ofrecerle un ministerio', 'Offer him a ministry'), tags: ['negotiate'], result: t('Acepta el Ministerio de Asuntos Diversos. Recién creado.', 'He accepts the brand-new Ministry of Miscellaneous Affairs.'), effects: [{ loyalty: { party: 'cp', delta: 18 } }, d('integrity', -3), d('credibility', -2)] },
      { id: 'refuse', label: t('Negarte', 'Refuse'), tags: ['reject'], result: t('«Entonces tendremos que reflexionar», dice. Reflexionar cuesta votos.', '"Then we must reflect," he says. Reflecting costs votes.'), effects: [{ loyalty: { party: 'cp', delta: -30 } }, d('integrity', 2)] },
    ],
  }),
  ev({
    id: 'br_amazon', category: 'disaster', hotspot: 'map', speaker: 'journalist', kind: 'main', weight: 1.2,
    conditions: { countries: ['br'], minRound: 3 },
    title: t('Incendios en la Amazonia', 'Amazon fires'),
    text: t('Los focos de incendio se multiplican. El mundo mira, los ganaderos también.', 'Fire hotspots multiply. The world is watching, and so are cattle ranchers.'),
    choices: [
      { id: 'enforce', label: t('Reforzar la fiscalización', 'Step up enforcement'), tags: ['reject'], cost: { treasury: 2 }, result: t('Bajan los focos. Sube el enfado en el agro.', 'Hotspots drop. Anger rises in agribusiness.'), effects: [d('treasury', -2), d('environment', 6), d('diplomacy', 5), g('rural', -6)] },
      { id: 'fund', label: t('Pedir un fondo internacional', 'Ask for an international fund'), tags: ['negotiate'], result: t('Llega dinero extranjero y alguna lección no pedida.', 'Foreign money arrives, with unsolicited lectures.'), effects: [d('treasury', 2), d('diplomacy', 3), d('environment', 3)] },
      { id: 'sovereignty', label: t('«La Amazonia es nuestra»', '"The Amazon is ours"'), tags: ['authoritarian'], result: t('Aplausos en casa, sanciones fuera.', 'Applause at home, sanctions abroad.'), effects: [d('popularity', 3), d('diplomacy', -8), d('environment', -5), g('rural', 4)] },
    ],
  }),
  ev({
    id: 'censure_threat', category: 'parliament', hotspot: 'door', speaker: 'opposition', kind: 'main', weight: 3,
    conditions: { countries: ['es'], minRound: 4, stats: { support: [0, 18] } }, repeat: { max: 1, cooldown: 99 },
    title: t('Moción de censura', 'Motion of no confidence'),
    text: t('Gonzalo Arriaga registra una moción de censura con candidato alternativo. Necesita 176 votos.', 'Gonzalo Arriaga files a motion of no confidence with an alternative candidate. He needs 176 votes.'),
    choices: [
      { id: 'fight', label: t('Defenderte en la tribuna', 'Defend yourself at the rostrum'), tags: ['reject'], result: t('Tu mejor discurso en meses. Ahora, a contar.', 'Your best speech in months. Now, count.'), effects: [{ special: 'fall_vote' }] },
      { id: 'deal', label: t('Comprar tiempo con concesiones', 'Buy time with concessions'), tags: ['concede'], cost: { treasury: 3 }, result: t('Tus socios exprimen el momento.', 'Your partners squeeze the moment.'), effects: [d('treasury', -3), { loyalty: { party: 'all', delta: 20 } }, d('credibility', -2), { special: 'fall_vote' }] },
    ],
  }),
];
