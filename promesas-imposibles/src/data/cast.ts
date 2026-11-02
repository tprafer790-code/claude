// Reparto recurrente: intereses, voz y reacciones según su memoria.
import type { CastId, L } from '../core/types';
import { t } from './helpers';

export interface CastDef {
  id: CastId;
  role: L;
  /** Qué le importa (para el jugador, visible en la ficha) */
  wants: L;
  voice: number; // tono base del balbuceo sintetizado (Hz)
  reactions: { kept: L; broken: L; betrayed: L; helped: L };
}

export const CAST: Record<CastId, CastDef> = {
  advisor: {
    id: 'advisor', role: t('Asesora de campaña', 'Campaign adviser'), wants: t('Ganar. Y que no la culpes cuando pierdas.', 'Winning. And not being blamed when you lose.'), voice: 260,
    reactions: { kept: t('Cumplir promesas: qué estrategia tan rara. Me gusta.', 'Keeping promises: what a bizarre strategy. I like it.'), broken: t('La hemeroteca es eterna, jefe.', 'The archives are forever, boss.'), betrayed: t('¿Me has echado a los leones? Apuntado.', 'You threw me to the lions? Noted.'), helped: t('Esta vez te debo una.', 'I owe you one this time.') },
  },
  economist: {
    id: 'economist', role: t('Responsable de Economía', 'Economy chief'), wants: t('Cuentas que cuadren y que alguien lea sus informes.', 'Balanced books, and someone reading her reports.'), voice: 180,
    reactions: { kept: t('Por una vez, lo prometido entraba en la hoja de cálculo.', 'For once, the promise fit the spreadsheet.'), broken: t('Te lo dije en la página 47 del informe.', 'I told you on page 47 of the report.'), betrayed: t('Mi dimisión está redactada. En tres idiomas.', 'My resignation is drafted. In three languages.'), helped: t('Gracias por defender los números.', 'Thank you for defending the numbers.') },
  },
  partner: {
    id: 'partner', role: t('Socio parlamentario', 'Parliamentary partner'), wants: t('Visibilidad, contrapartidas y no parecer tu felpudo.', 'Visibility, concessions, and not looking like your doormat.'), voice: 210,
    reactions: { kept: t('Cumples lo pactado. Qué sorpresa tan agradable.', 'You honour the pact. What a pleasant surprise.'), broken: t('Los pactos se firman con tinta, no con lápiz.', 'Pacts are signed in ink, not pencil.'), betrayed: t('Nuestros votos ya no están en tu bolsillo.', 'Our votes are no longer in your pocket.'), helped: t('Esto lo recordaremos en la próxima votación.', 'We will remember this at the next vote.') },
  },
  opposition: {
    id: 'opposition', role: t('Líder de la oposición', 'Leader of the opposition'), wants: t('Tu sillón. Y tener razón en directo.', 'Your chair. And being right on live TV.'), voice: 150,
    reactions: { kept: t('Hasta un reloj parado acierta dos veces al día.', 'Even a stopped clock is right twice a day.'), broken: t('¡Otra promesa a la papelera de reciclaje!', 'Another promise in the recycling bin!'), betrayed: t('Esto lo pagarás en las urnas.', 'You will pay for this at the ballot box.'), helped: t('Que conste que no te debo nada.', 'For the record, I owe you nothing.') },
  },
  journalist: {
    id: 'journalist', role: t('Periodista de investigación', 'Investigative journalist'), wants: t('La verdad, una exclusiva y dormir alguna noche.', 'The truth, a scoop, and sleeping some night.'), voice: 240,
    reactions: { kept: t('Comprobado. Por una vez, era verdad.', 'Fact-checked. For once, it was true.'), broken: t('Tengo el vídeo de cuando lo prometiste.', 'I have the video of when you promised it.'), betrayed: t('Intentar callarme es la mejor exclusiva.', 'Trying to silence me is the best scoop.'), helped: t('La transparencia también es noticia.', 'Transparency is news too.') },
  },
  unionist: {
    id: 'unionist', role: t('Representante sindical', 'Union representative'), wants: t('Salarios dignos y que le cojas el teléfono.', 'Decent wages, and you answering the phone.'), voice: 140,
    reactions: { kept: t('Palabra cumplida. Eso en la fábrica se respeta.', 'Word kept. That is respected at the factory.'), broken: t('Pancartas preparadas. Tenemos rotuladores de sobra.', 'Banners ready. We have plenty of markers.'), betrayed: t('Nos vemos en la calle.', 'See you on the streets.'), helped: t('Se agradece, aunque no lo diré en público.', 'Appreciated, though I will not say it in public.') },
  },
  tycoon: {
    id: 'tycoon', role: t('Empresario', 'Tycoon'), wants: t('Contratos, discreción y una foto contigo, pero no demasiado cerca.', 'Contracts, discretion, and a photo with you, not too close.'), voice: 120,
    reactions: { kept: t('Un placer hacer negocios… digo, política.', 'A pleasure doing business… I mean, politics.'), broken: t('Yo no olvido una inversión.', 'I never forget an investment.'), betrayed: t('Tengo archivos. Muchos archivos.', 'I have files. Many files.'), helped: t('Mi fundación te lo agradece.', 'My foundation thanks you.') },
  },
  citizenA: {
    id: 'citizenA', role: t('Jubilada del barrio', 'Retired neighbour'), wants: t('Que la pensión llegue a fin de mes y que le saluden.', 'A pension that lasts the month, and being greeted.'), voice: 300,
    reactions: { kept: t('¡Lo cumplió! Se lo diré a mis catorce nietos.', 'You kept it! I will tell my fourteen grandchildren.'), broken: t('Mucho prometer y poco pagar.', 'Lots of promises, little paying.'), betrayed: t('Le voté. Me arrepiento con todo el bolso.', 'I voted for you. I regret it with my whole handbag.'), helped: t('Usted es de los buenos. De momento.', 'You are one of the good ones. For now.') },
  },
  citizenB: {
    id: 'citizenB', role: t('Joven inquilino', 'Young renter'), wants: t('Un piso sin hurón y un sueldo sin «oportunidad de crecimiento».', 'A flat without a ferret and a wage without "growth opportunity".'), voice: 230,
    reactions: { kept: t('Vale, igual no todos sois iguales.', 'OK, maybe you are not all the same.'), broken: t('Lo sabía. Lo sabía.', 'I knew it. I knew it.'), betrayed: t('Me vuelvo al pueblo. Y lo voy a contar en vídeo.', 'I am moving back to the village. And posting it.'), helped: t('Esto lo comparto, para bien.', 'Sharing this, for good reasons.') },
  },
  citizenC: {
    id: 'citizenC', role: t('Pequeña comerciante', 'Small shop owner'), wants: t('Menos papeles, más clientes y la luz más barata.', 'Less paperwork, more customers, cheaper power.'), voice: 200,
    reactions: { kept: t('Le he puesto en el escaparate. Al lado de los botones.', 'I put you in the shop window. Next to the buttons.'), broken: t('Otro que vino a por la foto.', 'Another one who came for the photo.'), betrayed: t('Cierro el lunes. Gracias por nada.', 'I close on Monday. Thanks for nothing.'), helped: t('Le debo un descuento.', 'I owe you a discount.') },
  },
  caller: {
    id: 'caller', role: t('Oyente de la radio', 'Radio listener'), wants: t('Un alquiler que no suba cada vez que el casero se aburre.', 'A rent that does not go up whenever the landlord gets bored.'), voice: 280,
    reactions: { kept: t('Lo dijo en la radio y lo hizo. Lo voy a contar en el trabajo.', 'You said it on the radio and you did it. I will tell everyone at work.'), broken: t('Me acuerdo de su voz. Yo sí me acuerdo.', 'I remember your voice. I do remember.'), betrayed: t('Le llamé creyendo que escuchaba.', 'I called thinking you were listening.'), helped: t('Gracias. De verdad.', 'Thank you. Really.') },
  },
};
export const CAST_ORDER: CastId[] = ['advisor', 'economist', 'partner', 'opposition', 'journalist', 'unionist', 'tycoon', 'citizenA', 'citizenB', 'citizenC'];
