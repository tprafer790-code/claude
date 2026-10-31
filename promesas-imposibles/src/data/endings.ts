// Finales. Se evalúan en orden: el primero cuya condición se cumple gana.
// `ctx` resume la partida; editar umbrales aquí cambia qué final aparece.
import type { L } from '../core/types';
import { t } from './helpers';

export interface EndingCtx {
  phase: 'campaign' | 'formation' | 'term';
  won: boolean; removed: boolean; resigned: boolean; autocrat: boolean;
  wellbeing: number; integrity: number; evidence: number; suspicion: number; economy: number;
  keptRatio: number; crisesResolved: number; crisesFailed: number; popularity: number;
}

export interface EndingDef { id: string; when: (c: EndingCtx) => boolean; title: L; text: L }

export const ENDINGS: EndingDef[] = [
  { id: 'campaign_lost', when: (c) => c.phase === 'campaign', title: t('Fin de campaña', 'Campaign over'), text: t('Los carteles se despegan solos. Mañana serás «aquel candidato». Pero la sede sigue alquilada un mes más.', 'The posters peel off by themselves. Tomorrow you will be "that candidate". But the office lease still has a month.') },
  { id: 'investiture_failed', when: (c) => c.phase === 'formation', title: t('Investidura fallida', 'Failed investiture'), text: t('Ganaste votos, pero no apoyos. El país irá a una repetición electoral y tú, a la historia de las notas a pie de página.', 'You won votes, not allies. The country heads for a repeat election, and you to the footnotes of history.') },
  { id: 'removed', when: (c) => c.removed, title: t('Desalojado del poder', 'Removed from power'), text: t('El Parlamento te retiró la confianza. Te llevas una planta del despacho como recuerdo; también la investigación.', 'Parliament withdrew its confidence. You take an office plant as a souvenir; also the investigation.') },
  { id: 'resigned', when: (c) => c.resigned, title: t('Dimisión', 'Resignation'), text: t('Dimitiste antes de que te echaran. Algunos lo llamarán dignidad; otros, cálculo. Ambos aciertan.', 'You resigned before being thrown out. Some will call it dignity; others, calculation. Both are right.') },
  { id: 'autocrat', when: (c) => c.autocrat || (c.won && c.integrity < 20), title: t('El sillón eterno', 'The eternal chair'), text: t('Sigues en el poder, pero ya nadie se acuerda de cómo se votaba de verdad. El país es más tuyo y menos de todos.', 'You remain in power, but nobody remembers how voting really worked. The country is more yours and less everyone’s.') },
  { id: 'jailed', when: (c) => !c.won && c.evidence >= 55, title: t('Del escaño al banquillo', 'From office to the dock'), text: t('Perdiste las elecciones y, al día siguiente, la inmunidad informal. Tu abogado ya tiene la agenda llena.', 'You lost the election and, the next day, your informal immunity. Your lawyer’s diary is already full.') },
  { id: 'reformer', when: (c) => c.won && c.wellbeing >= 58 && c.integrity >= 55, title: t('Reelección merecida', 'Deserved re-election'), text: t('Mejoraste la vida de la gente y no vendiste el alma por el camino. Rarísimo. Disfrútalo: el segundo mandato es más difícil.', 'You improved people’s lives without selling your soul. Very rare. Enjoy it: second terms are harder.') },
  { id: 'corrupt_winner', when: (c) => c.won && (c.evidence >= 35 || c.suspicion >= 40), title: t('Victoria con asterisco', 'Victory with an asterisk'), text: t('Ganaste, pero las cajas de documentos te siguen como patitos. El segundo mandato se jugará en los juzgados.', 'You won, but boxes of documents follow you like ducklings. Your second term will be played out in court.') },
  { id: 'hollow_winner', when: (c) => c.won && c.wellbeing < 50, title: t('Reelección de cartón piedra', 'Papier-mâché re-election'), text: t('Ganaste el relato, no el país. La gente te votó; sus neveras no.', 'You won the narrative, not the country. People voted for you; their fridges did not.') },
  { id: 'winner', when: (c) => c.won, title: t('Reelegido', 'Re-elected'), text: t('Otro mandato. Ni héroe ni villano: superviviente, que en política es casi un título nobiliario.', 'Another term. Neither hero nor villain: survivor, which in politics is almost a noble title.') },
  { id: 'good_loser', when: (c) => !c.won && c.wellbeing >= 56, title: t('Gobernó bien, perdió igual', 'Governed well, lost anyway'), text: t('Los datos te dan la razón; las urnas, no. Dentro de diez años, alguien dirá «aquello funcionaba».', 'The data backs you; the ballots do not. In ten years someone will say "that actually worked".') },
  { id: 'loser', when: () => true, title: t('Derrota electoral', 'Electoral defeat'), text: t('Te vas a casa. La oposición hereda tus problemas y tus carpetas. Que les aproveche.', 'You go home. The opposition inherits your problems and your folders. Bon appétit.') },
];
