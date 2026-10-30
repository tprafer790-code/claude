import type { EventAction, EventChoice, EventOutcome } from './events';
import { FAMILY } from '../edition';

/**
 * Moral dilemmas: dark-humour yes/no pop-ups that interrupt play. Most trade
 * money for status or status for money. Status points change how much net
 * worth each promotion needs, so "easy money" makes the ladder steeper.
 * Money is expressed in seconds of income, like events.
 */
export interface DilemmaDef {
  id: string;
  title: string;
  text: string;
  minRank: number;
  maxRank?: number;
  weight: number;
  once?: boolean;
  yes: EventChoice;
  no: EventChoice;
}

const ok = (text: string, ...actions: EventAction[]): EventOutcome => ({ chance: 1, text, actions });
const odds = (chance: number, text: string, ...actions: EventAction[]): EventOutcome => ({ chance, text, actions });
const status = (add: number): EventAction => ({ type: 'status', add });

const CLASSIC_DILEMMAS: DilemmaDef[] = [
  {
    id: 'kidnap', title: 'Kidnap a Child?', minRank: 0, maxRank: 37, weight: 10,
    text: 'A posh kid is lost in the park. His watch is worth more than your whole life. A man in sunglasses whispers: "His parents would pay anything."',
    yes: { label: 'YES, kidnap him', hint: 'Huge ransom. -3 status: every promotion will cost much more.', outcomes: [
      odds(3, 'The parents pay without a fuss. The kid asks if you can kidnap him again next weekend.', { type: 'money', seconds: 900, capFraction: 0.3 }, status(-3)),
      odds(1, 'The parents pay... and call the police.', { type: 'money', seconds: 900, capFraction: 0.3 }, status(-3), { type: 'delayed', seconds: 60, label: 'Police investigation', outcomes: [
        odds(1, 'They found your fingerprints on the swing. Bail is not cheap.', { type: 'money', fraction: -0.35 }),
        odds(1, 'They blame the butler. You walk free.'),
      ] }),
    ] },
    no: { label: 'NO, take him home', hint: '+1 status. Maybe a tip.', outcomes: [
      odds(3, 'You walk him home. His parents thank you and give you an expired yoghurt.', status(1), { type: 'money', seconds: 30 }),
      odds(1, 'They are millionaires! A reward, and your photo in the newspaper.', status(2), { type: 'money', seconds: 300 }),
    ] },
  },
  {
    id: 'kidney', title: 'Sell a Kidney?', minRank: 0, maxRank: 22, weight: 7, once: true,
    text: 'A clinic with no sign and very clean gloves offers good money for "the spare one".',
    yes: { label: 'YES, sell it', hint: 'Lots of money now. Clicks -15% for the rest of this life.', outcomes: [
      ok('You wake up in a bathtub full of ice and banknotes. Mostly banknotes.', { type: 'money', seconds: 600, capFraction: 0.2 }, { type: 'permanent', effect: { kind: 'clickMult', value: 0.85 }, label: 'One kidney short' }),
    ] },
    no: { label: 'NO, keep both', hint: 'Nothing happens. Your kidneys thank you.', outcomes: [ok('You keep both kidneys. One of them sends you a thank-you card.')] },
  },
  {
    id: 'grandma_flat', title: "Rent Out Grandma's Flat?", minRank: 8, maxRank: 30, weight: 8,
    text: 'Tourists pay a fortune for "authentic local experiences". Grandma is very authentic. She is also still living there.',
    yes: { label: 'YES, list it', hint: 'Income ×2 for 120s. -1 status.', outcomes: [
      ok('Five stars: "The old lady in the kitchen was a lovely touch." Grandma is not speaking to you.', { type: 'buff', target: 'income', mult: 2, seconds: 120, label: 'Tourist flat' }, status(-1)),
    ] },
    no: { label: 'NO, visit her', hint: '+1 status and a home-cooked boost.', outcomes: [
      ok('Grandma makes croquettes. You feel unstoppable.', status(1), { type: 'buff', target: 'click', mult: 2, seconds: 60, label: 'Croquettes' }),
    ] },
  },
  {
    id: 'crypto', title: 'Launch Your Own Coin?', minRank: 16, maxRank: 37, weight: 7,
    text: 'Your cousin has the logo, the website and the meme. All you need is to say "to the moon" with a straight face. $SMOKE is ready.',
    yes: { label: 'YES, to the moon', hint: '2 in 3: a fortune. 1 in 3: it crashes with you inside. -2 status either way.', outcomes: [
      odds(2, 'It rockets. You sell at the top and block everyone who bought.', { type: 'money', seconds: 600, capFraction: 0.25 }, status(-2)),
      odds(1, 'It crashes in 10 minutes. Somehow you bought the most.', { type: 'money', fraction: -0.2 }, status(-2)),
    ] },
    no: { label: 'NO, keep my dignity', hint: '+1 status.', outcomes: [ok('Your cousin calls you a dinosaur. Next week he is on the news. Not in a good way.', status(1))] },
  },
  {
    id: 'reality', title: 'Join a Reality Show?', minRank: 8, maxRank: 43, weight: 6,
    text: 'Three months on a desert island, eating coconuts on prime-time TV. Fame is guaranteed. Dignity is not.',
    yes: { label: 'YES, I want fame', hint: '+2 status, but income ×0.5 for 120s while you are away.', outcomes: [
      ok('You cry in every episode and win the public vote. Everyone knows your name. Your businesses miss you.', status(2), { type: 'buff', target: 'income', mult: 0.5, seconds: 120, label: 'On the island' }),
    ] },
    no: { label: 'NO, keep working', hint: 'Nothing changes.', outcomes: [ok('You spare the nation the sight of you in swimwear. Nobody thanks you.')] },
  },
  {
    id: 'master', title: 'Buy an Express Master?', minRank: 16, maxRank: 37, weight: 6, once: true,
    text: 'A public university offers a master degree with no classes, no exams and no questions. Delivered in a week.',
    yes: { label: 'YES, buy it', hint: 'Costs 120s of income. +2 status... unless a journalist digs.', costSeconds: 120, outcomes: [
      ok('Framed above your desk. You start every sentence with "As an expert...".', status(2), { type: 'delayed', seconds: 90, label: 'Journalist on the case', outcomes: [
        odds(2, 'Nobody checks. Nobody ever does.'),
        odds(1, 'A newspaper asks for your thesis. You do not have one. Scandal.', status(-3)),
      ] }),
    ] },
    no: { label: 'NO, I will study', hint: 'Nothing happens.', outcomes: [ok('You open a book. You close the book. It was a good effort.')] },
  },
  {
    id: 'charity', title: 'Donate to Charity?', minRank: 8, weight: 6,
    text: 'A volunteer with a clipboard and a very sincere smile blocks the pavement.',
    yes: { label: 'YES, donate', hint: 'Costs 90s of income. +2 status.', costSeconds: 90, outcomes: [ok('You donate and post it on every social network. Twice.', status(2))] },
    no: { label: 'NO, I pay taxes', hint: 'Nothing happens.', outcomes: [ok('You say you already give through your taxes. You know that is not true.')] },
  },
  {
    id: 'tax_haven', title: 'Move Money to a Tax Haven?', minRank: 31, weight: 7, once: true,
    text: 'Your adviser opens a map of tiny islands. "Sunny weather, zero taxes and banks that forget your name."',
    yes: { label: 'YES, offshore', hint: 'Income ×1.15 this life. -2 status. The Treasury might notice.', outcomes: [
      ok('A company in the Caymans with a dog as its director. Brilliant.', { type: 'permanent', effect: { kind: 'incomeMult', value: 1.15 }, label: 'Cayman company' }, status(-2), { type: 'delayed', seconds: 120, label: 'Tax inspection', outcomes: [
        odds(1, 'The Treasury knocks on the door. A fine, and a photo in handcuffs.', { type: 'money', fraction: -0.3 }, status(-1)),
        odds(2, 'Nobody notices. The dog is promoted.'),
      ] }),
    ] },
    no: { label: 'NO, pay my taxes', hint: '+1 status.', outcomes: [ok('You pay your taxes. Your tax adviser cries quietly.', status(1))] },
  },
  {
    id: 'coaching', title: 'Sell a "Get Rich" Course?', minRank: 16, maxRank: 43, weight: 6,
    text: 'You are not rich yet, but you have a rented sports car and a ring light. That is 90% of a coaching career.',
    yes: { label: 'YES, sell smoke', hint: 'Money now. -1 status.', outcomes: [ok('"Step one: sell a course. Step two: there is no step two." It sells out.', { type: 'money', seconds: 400, capFraction: 0.2 }, status(-1))] },
    no: { label: 'NO, give back the car', hint: 'Nothing happens.', outcomes: [ok('You return the sports car. The ring light stays. You have standards, not that many.')] },
  },
  {
    id: 'stray_cat', title: 'Adopt a Stray Cat?', minRank: 0, weight: 5, once: true,
    text: 'A one-eyed cat has followed you for three blocks. It looks at you as if it knows something about the stock market.',
    yes: { label: 'YES, adopt him', hint: 'Costs 20s of income. +1 status and +2% crit chance this life.', costSeconds: 20, outcomes: [ok('You name him "Dividend". Since then, luck follows you.', status(1), { type: 'permanent', effect: { kind: 'critChance', value: 0.02 }, label: 'Lucky cat' })] },
    no: { label: 'NO, keep walking', hint: 'The cat will remember this.', outcomes: [ok('The cat stares at you with contempt. It tells every cat in the city.', status(-1))] },
  },
  {
    id: 'snitch', title: 'Report Your Boss to the Treasury?', minRank: 8, maxRank: 30, weight: 6,
    text: 'Your boss pays everyone in cash and drives a car that costs more than the office. You have photos.',
    yes: { label: 'YES, report him', hint: 'A reward. -1 status: nobody likes a snitch.', outcomes: [ok('The Treasury pays a reward. Your colleagues stop inviting you to coffee.', { type: 'money', seconds: 300, capFraction: 0.15 }, status(-1))] },
    no: { label: 'NO, look away', hint: 'Nothing happens.', outcomes: [ok('You delete the photos. Your boss winks at you. It is unsettling.')] },
  },
  {
    id: 'rezoning', title: 'Accept a Rezoning?', minRank: 23, weight: 6, once: true,
    text: 'A councillor offers to turn your field of weeds into building land. He only asks for "a small contribution to the cause".',
    yes: { label: 'YES, contribute', hint: 'Costs 60s of income. Income ×1.2 this life. -2 status.', costSeconds: 60, outcomes: [ok('Cranes appear overnight. So does the councillor, with a new watch.', { type: 'permanent', effect: { kind: 'incomeMult', value: 1.2 }, label: 'Rezoned land' }, status(-2))] },
    no: { label: 'NO, report it', hint: '+1 status.', outcomes: [ok('You report it. The councillor is promoted to minister. Of course.', status(1))] },
  },
  {
    id: 'football_club', title: 'Buy a Bankrupt Football Club?', minRank: 38, weight: 5, once: true,
    text: 'A historic club is about to go bust. The fans would carry you on their shoulders. Or throw things at you.',
    yes: { label: 'YES, save the club', hint: 'Costs 300s of income. +3 status.', costSeconds: 300, outcomes: [ok('The stadium chants your name. You do not know the rules, but you wave a scarf.', status(3))] },
    no: { label: 'NO, I prefer golf', hint: 'Nothing happens.', outcomes: [ok('The club is bought by an oil state. They name the stadium after a petrol station.')] },
  },
  {
    id: 'small_country', title: 'Buy a Small Country?', minRank: 44, weight: 5, once: true,
    text: 'An island nation is on sale. It comes with a flag, an anthem and a seat at the UN.',
    yes: { label: 'YES, buy it', hint: 'Costs 600s of income. +4 status.', costSeconds: 600, outcomes: [ok('You name yourself president for life. You sing the anthem yourself, badly.', status(4))] },
    no: { label: 'NO, too small', hint: 'Nothing happens.', outcomes: [ok('You wait for a bigger one to go on sale. Patience is a virtue of the rich.')] },
  },
  {
    id: 'clone', title: 'Clone Yourself?', minRank: 51, weight: 5, once: true,
    text: 'A lab offers you a perfect clone to work for you around the clock. The paperwork says "minor personality differences".',
    yes: { label: 'YES, clone me', hint: 'Clicks ×1.5 this life. -2 status: people like your clone more.', outcomes: [ok('The clone works twice as hard and is much nicer. Your friends now call him instead.', { type: 'permanent', effect: { kind: 'clickMult', value: 1.5 }, label: 'Clone' }, status(-2))] },
    no: { label: 'NO, one of me is enough', hint: 'Nothing happens.', outcomes: [ok('The world sighs with relief.')] },
  },
];

/**
 * Family edition: the kidnapping and the organ sale are replaced by dilemmas
 * with the same timing, odds and rewards.
 */
const FAMILY_REPLACEMENTS: Record<string, DilemmaDef> = {
  kidnap: {
    id: 'fat_wallet', title: 'Keep the Fat Wallet?', minRank: 0, maxRank: 37, weight: 10,
    text: 'A wallet bursting with cash lies on a park bench. The ID inside belongs to a man with a yacht, three surnames and no idea it is gone.',
    yes: { label: 'YES, keep it', hint: 'Lots of cash. -3 status: every promotion will cost much more.', outcomes: [
      odds(3, 'Nobody saw you. The man buys another wallet. And another yacht.', { type: 'money', seconds: 900, capFraction: 0.3 }, status(-3)),
      odds(1, 'Nobody saw you... except the wallet. It had a GPS tracker.', { type: 'money', seconds: 900, capFraction: 0.3 }, status(-3), { type: 'delayed', seconds: 60, label: 'Police investigation', outcomes: [
        odds(1, 'The police follow the beeping straight to your sofa. The fine is not cheap.', { type: 'money', fraction: -0.35 }),
        odds(1, 'The tracker battery dies first. You walk free.'),
      ] }),
    ] },
    no: { label: 'NO, return it', hint: '+1 status. Maybe a tip.', outcomes: [
      odds(3, 'You return it. The owner thanks you and gives you an expired yoghurt.', status(1), { type: 'money', seconds: 30 }),
      odds(1, 'He is a millionaire! A reward, and your photo in the newspaper.', status(2), { type: 'money', seconds: 300 }),
    ] },
  },
  kidney: {
    id: 'chicken_suit', title: 'Wear the Chicken Suit Forever?', minRank: 0, maxRank: 22, weight: 7, once: true,
    text: 'A fast-food chain offers good money if you wear its giant chicken costume. Everywhere. For the rest of this life.',
    yes: { label: 'YES, cluck cluck', hint: 'Lots of money now. Clicks -15% for the rest of this life.', outcomes: [
      ok('You are rich and covered in yellow feathers. The wings are terrible for clicking.', { type: 'money', seconds: 600, capFraction: 0.2 }, { type: 'permanent', effect: { kind: 'clickMult', value: 0.85 }, label: 'Chicken wings' }),
    ] },
    no: { label: 'NO, keep my dignity', hint: 'Nothing happens. Your dignity thanks you.', outcomes: [ok('You keep your dignity. It sends you a thank-you card.')] },
  },
};

export const DILEMMAS: DilemmaDef[] = FAMILY ? CLASSIC_DILEMMAS.map((d) => FAMILY_REPLACEMENTS[d.id] ?? d) : CLASSIC_DILEMMAS;

export const DILEMMA_BY_ID: Record<string, DilemmaDef> = Object.fromEntries(DILEMMAS.map((d) => [d.id, d]));
