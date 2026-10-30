import type { Effect } from './types';

/**
 * Random events & decisions. Money amounts are expressed in "seconds of
 * income" (scales with progress) and/or fractions of current money, so the
 * same event stays relevant from the street to the stratosphere.
 */
export type EventAction =
  /** `capFraction` overrides the usual reward cap (a fraction of this life's net worth). */
  | { type: 'money'; seconds?: number; fraction?: number; capFraction?: number }
  /** Adds (or removes) status points, which change how much net worth each promotion needs. */
  | { type: 'status'; add: number }
  | { type: 'buff'; target: 'income' | 'click'; mult: number; seconds: number; label: string }
  | { type: 'item'; id: string }
  | { type: 'flag'; id: string }
  | { type: 'counter'; id: string; add: number }
  | { type: 'permanent'; effect: Effect; label: string }
  | { type: 'delayed'; seconds: number; label: string; outcomes: EventOutcome[] };

export interface EventOutcome {
  /** Relative weight among the choice's outcomes. */
  chance: number;
  text: string;
  actions: EventAction[];
}

export interface EventChoice {
  label: string;
  /** Short honest summary of what the player is risking/getting. */
  hint: string;
  outcomes: EventOutcome[];
  /** Cost to pick this option, in seconds of income. */
  costSeconds?: number;
}

export interface EventDef {
  id: string;
  title: string;
  text: string;
  minRank: number;
  maxRank?: number;
  weight: number;
  rare?: boolean;
  once?: boolean;
  requiresFlag?: string;
  forbidsFlag?: string;
  choices: EventChoice[];
}

const ok = (text: string, ...actions: EventAction[]): EventOutcome => ({ chance: 1, text, actions });

export const EVENTS: EventDef[] = [
  {
    id: 'found_wallet', title: 'A Wallet on the Sidewalk', minRank: 0, weight: 10, forbidsFlag: 'wallet_done',
    text: 'A leather wallet lies on the pavement. Inside: some cash and a business card with an embossed name.',
    choices: [
      { label: 'Return it', hint: 'No money now. Good karma is... a long-term investment?', outcomes: [ok('You call the number on the card. A polite voice thanks you and takes your name.', { type: 'flag', id: 'wallet_returned' }, { type: 'flag', id: 'wallet_done' })] },
      { label: 'Keep the cash', hint: 'Some money right now.', outcomes: [ok('You pocket the cash and drop the wallet in a mailbox. Your conscience files a complaint.', { type: 'money', seconds: 120 }, { type: 'flag', id: 'wallet_done' })] },
    ],
  },
  {
    id: 'grateful_stranger', title: 'The Grateful Stranger', minRank: 10, weight: 30, once: true, requiresFlag: 'wallet_returned',
    text: 'A sleek car stops next to you. The owner of the wallet you returned steps out. "Honest people are rare. I never forget them."',
    choices: [
      { label: 'Shake hands', hint: 'Accept the gift.', outcomes: [ok('She hands you a Golden Business Card. "Show this to anyone. Doors will open."', { type: 'item', id: 'golden_business_card' }, { type: 'money', seconds: 300 })] },
    ],
  },
  {
    id: 'suspicious_deal', title: 'A Man in a Trench Coat', minRank: 1, maxRank: 30, weight: 8,
    text: '"Psst. Watches. Definitely real. Barely stolen. I mean, barely used."',
    choices: [
      { label: 'Buy one', hint: 'Costs 45s of income. Results may vary.', costSeconds: 45, outcomes: [
        { chance: 3, text: "You got a 'Rolecks'. It ticks. Sometimes. You love it anyway.", actions: [{ type: 'item', id: 'definitely_real_watch' }] },
        { chance: 2, text: 'The box was empty. The trench coat is gone. Lesson learned.', actions: [] },
      ] },
      { label: 'Walk away', hint: 'Nothing happens. Street smarts +1.', outcomes: [ok('"Your loss, pal." You feel wiser. And still have your money.', { type: 'counter', id: 'refused_deals', add: 1 })] },
    ],
  },
  {
    id: 'inheritance', title: 'An Unexpected Inheritance', minRank: 3, weight: 5,
    text: 'A letter from a lawyer: a great-aunt you never met has left you something in her will.',
    choices: [
      { label: 'Open the envelope', hint: 'Free money. Probably.', outcomes: [
        { chance: 3, text: 'She left you a modest sum and a note: "Buy something nice. Not a boat."', actions: [{ type: 'money', seconds: 400 }] },
        { chance: 1, text: 'She left you her entire porcelain cat collection. Which a collector immediately buys.', actions: [{ type: 'money', seconds: 900 }] },
      ] },
    ],
  },
  {
    id: 'stranger_investment', title: 'An Investment Opportunity', minRank: 6, weight: 8,
    text: 'A stranger in a very clean suit: "I have a sure thing. Well. A pretty sure thing. Interested?"',
    choices: [
      { label: 'Safe bond', hint: 'Small guaranteed return in 60s. Costs 60s of income now.', costSeconds: 60, outcomes: [ok('You buy the bond. It will mature soon.', { type: 'delayed', seconds: 60, label: 'Safe bond matures', outcomes: [ok('Your bond matured. Boring, but profitable.', { type: 'money', seconds: 90 })] })] },
      { label: 'Risky venture', hint: 'Costs 10% of your cash. Could triple. Could vanish.', outcomes: [ok('You hand over the cash. "You will hear from me in two minutes."', { type: 'money', fraction: -0.1 }, { type: 'delayed', seconds: 120, label: 'Risky venture result', outcomes: [
        { chance: 45, text: 'The venture took off! Your stake tripled.', actions: [{ type: 'money', fraction: 0.3 }] },
        { chance: 55, text: 'The venture was a website selling pictures of other websites. It is gone.', actions: [] },
      ] })] },
      { label: 'Refuse', hint: 'Keep your money. Keep your sanity.', outcomes: [ok('"Your loss." The suit walks away suspiciously fast.', { type: 'counter', id: 'refused_deals', add: 1 })] },
    ],
  },
  {
    id: 'pigeon_sandwich', title: 'Sandwich Heist', minRank: 0, maxRank: 12, weight: 6,
    text: 'A pigeon steals your sandwich in broad daylight and lands on a nearby statue, staring at you.',
    choices: [
      { label: 'Chase it', hint: 'Cardio. Maybe something else.', outcomes: [
        { chance: 2, text: 'You did not catch it, but you found coins under the statue.', actions: [{ type: 'money', seconds: 60 }] },
        { chance: 1, text: 'You tripped. Your pride is hurt. Your wallet is fine.', actions: [] },
      ] },
      { label: 'Let it go', hint: 'Diplomacy.', outcomes: [ok('The pigeon nods. You feel like you have made a powerful ally.', { type: 'flag', id: 'pigeon_friend' }, { type: 'buff', target: 'click', mult: 2, seconds: 30, label: 'Pigeon Blessing' })] },
    ],
  },
  {
    id: 'stray_cat', title: 'A Cat Follows You', minRank: 2, weight: 4, once: true,
    text: 'A scruffy cat has followed you for three blocks. She sits down and looks at you like you owe her something.',
    choices: [
      { label: 'Adopt her', hint: 'A new companion. Cats are lucky, right?', outcomes: [ok('She moves in immediately and takes the best spot. You now have a cat.', { type: 'item', id: 'street_cat' })] },
      { label: 'Give her a snack', hint: 'Small kindness.', outcomes: [ok('She eats, judges you, and leaves. Maybe she will be back.', { type: 'buff', target: 'income', mult: 1.5, seconds: 60, label: 'Warm Fuzzy Feeling' })] },
    ],
  },
  {
    id: 'viral_video', title: 'You Went Viral', minRank: 4, weight: 6,
    text: 'Somebody filmed you working and posted it. Millions of views. Comments are 50% inspiring, 50% about your haircut.',
    choices: [
      { label: 'Ride the wave', hint: 'Income ×2 for 60s.', outcomes: [ok('Everyone wants a piece of you. Fifteen minutes of fame, monetized.', { type: 'buff', target: 'income', mult: 2, seconds: 60, label: 'Viral Fame' })] },
      { label: 'Sell the rights', hint: 'Cash now (3 min of income).', outcomes: [ok('A media company buys the clip. You will never see a cent of the ad revenue, but this is fine.', { type: 'money', seconds: 180 })] },
    ],
  },
  {
    id: 'wifi_password', title: "The Neighbor's WiFi", minRank: 0, maxRank: 15, weight: 5,
    text: 'The password for the café WiFi is written on the board: "Password123". Opportunity.',
    choices: [
      { label: 'Connect', hint: 'Income ×1.3 for 3 minutes.', outcomes: [ok('Blazing fast internet. You apply to twelve gigs in five minutes.', { type: 'buff', target: 'income', mult: 1.3, seconds: 180, label: 'Free WiFi' })] },
      { label: 'Buy a coffee first', hint: 'Costs 10s of income. Clicks ×2 for 3 minutes.', costSeconds: 10, outcomes: [ok('Caffeinated AND connected. Unstoppable.', { type: 'buff', target: 'click', mult: 2, seconds: 180, label: 'Café Office' })] },
    ],
  },
  {
    id: 'overtime', title: 'Overtime Offer', minRank: 8, maxRank: 30, weight: 6,
    text: '"Hey, could you stay a bit later today? And tomorrow? And maybe forever?"',
    choices: [
      { label: 'Accept', hint: 'Clicks ×3 for 45s.', outcomes: [ok('You stay. You click. The office lights turn off around you.', { type: 'buff', target: 'click', mult: 3, seconds: 45, label: 'Overtime' })] },
      { label: 'Ask for a raise first', hint: 'Small chance of a permanent raise for this life.', outcomes: [
        { chance: 1, text: 'Your boss is so surprised he says yes. +5% income for the rest of this life!', actions: [{ type: 'permanent', effect: { kind: 'incomeMult', value: 1.05 }, label: 'Raise' }] },
        { chance: 3, text: '"We will discuss it in Q4." There is no Q4. There is never a Q4.', actions: [] },
      ] },
    ],
  },
  {
    id: 'garage_sale', title: 'Garage Sale', minRank: 5, weight: 5,
    text: 'An old man is selling "mystery boxes" for cheap. One of them is humming.',
    choices: [
      { label: 'Buy a box', hint: 'Costs 30s of income. Could be junk, could be treasure.', costSeconds: 30, outcomes: [
        { chance: 2, text: 'Inside: a napkin signed by a famous economist. It says "buy low, sell high".', actions: [{ type: 'item', id: 'signed_napkin' }] },
        { chance: 3, text: 'Inside: 400 rubber bands. You sell them to an office for a small profit.', actions: [{ type: 'money', seconds: 60 }] },
        { chance: 2, text: 'Inside: a smaller box. Inside that: nothing. It was the humming box. It still hums.', actions: [] },
      ] },
      { label: 'Keep walking', hint: 'Nothing happens.', outcomes: [ok('You resist. The humming fades behind you.')] },
    ],
  },
  {
    id: 'storm_drain_coin', title: 'Something Glints', minRank: 0, maxRank: 20, weight: 2, rare: true,
    text: 'Something shiny is stuck in a storm drain. It looks old. Very old.',
    choices: [
      { label: 'Fish it out', hint: 'Get your hands dirty.', outcomes: [ok('A suspiciously ancient coin! You feel luckier already.', { type: 'item', id: 'ancient_coin' })] },
      { label: 'Ignore it', hint: 'Clean hands.', outcomes: [ok('Probably a bottle cap anyway.')] },
    ],
  },
  {
    id: 'form_27b', title: 'Bureaucracy Strikes', minRank: 16, weight: 6,
    text: 'You need Form 27-B to file Form 27-A, which is required to request Form 27-B.',
    choices: [
      { label: 'Hire a gestor', hint: 'Costs 60s of income. Problem solved.', costSeconds: 60, outcomes: [ok('A professional handles everything in an hour. Magic. Expensive magic.')] },
      { label: 'Do it yourself', hint: 'Free, but clicks ×0.5 for 40s.', outcomes: [ok('Three windows, two queues, one stamp. You survive.', { type: 'buff', target: 'click', mult: 0.5, seconds: 40, label: 'Paperwork' })] },
    ],
  },
  {
    id: 'buy_business_offer', title: 'An Offer for Your Business', minRank: 22, weight: 5,
    text: 'A competitor wants to buy one of your operations. "Name your price." You name a price. They do not blink.',
    choices: [
      { label: 'Sell a stake', hint: '10 minutes of income now, income ×0.8 for 2 minutes.', outcomes: [ok('Signed. You pocket a fat check and feel slightly less in control.', { type: 'money', seconds: 600 }, { type: 'buff', target: 'income', mult: 0.8, seconds: 120, label: 'Diluted' })] },
      { label: 'Decline', hint: 'Your rival gets nervous: income ×1.5 for 90s.', outcomes: [ok('Your refusal makes headlines. Customers flock to the business that "cannot be bought".', { type: 'buff', target: 'income', mult: 1.5, seconds: 90, label: 'Not For Sale' })] },
    ],
  },
  {
    id: 'old_acquaintance', title: 'An Old Acquaintance', minRank: 12, weight: 5,
    text: 'Someone from your street days recognizes you. "Remember me? I have a business idea. I just need a partner."',
    choices: [
      { label: 'Partner up', hint: 'Costs 2 min of income. Long-term payoff... maybe.', costSeconds: 120, outcomes: [ok('You shake hands. The idea is weird. It might work.', { type: 'delayed', seconds: 240, label: 'Partnership check-in', outcomes: [
        { chance: 3, text: 'The partnership is thriving! +8% income for the rest of this life.', actions: [{ type: 'permanent', effect: { kind: 'incomeMult', value: 1.08 }, label: 'Old Friends Inc.' }] },
        { chance: 2, text: 'The business failed, but your friend pays you back half. Friendship intact.', actions: [{ type: 'money', seconds: 60 }] },
      ] })] },
      { label: 'Wish them luck', hint: 'Nothing happens.', outcomes: [ok('"No worries! See you around." You wonder what might have been.')] },
    ],
  },
  {
    id: 'market_crash', title: 'Financial Crisis!', minRank: 31, weight: 4,
    text: 'Markets are in free fall. News anchors are using the word "unprecedented" a lot.',
    choices: [
      { label: 'Panic sell', hint: 'Get 4 min of income now. No further impact.', outcomes: [ok('You sell everything at the bottom. Classic. At least it is over.', { type: 'money', seconds: 240 })] },
      { label: 'Hold steady', hint: 'Income ×0.5 for 60s, then ×2 for 120s.', outcomes: [ok('You hold. Your stomach does not.', { type: 'buff', target: 'income', mult: 0.5, seconds: 60, label: 'Crash' }, { type: 'delayed', seconds: 60, label: 'Market recovery', outcomes: [ok('Markets recover! Your patience pays off.', { type: 'buff', target: 'income', mult: 2, seconds: 120, label: 'Recovery Rally' })] })] },
      { label: 'Buy the dip', hint: 'Costs 15% of cash. Big upside if markets recover.', outcomes: [ok('You buy while everyone sells. Bold.', { type: 'money', fraction: -0.15 }, { type: 'delayed', seconds: 90, label: 'Dip result', outcomes: [
        { chance: 7, text: 'Markets bounced back hard. You made a killing.', actions: [{ type: 'money', fraction: 0.45 }] },
        { chance: 3, text: 'The dip kept dipping. It was a cliff, actually.', actions: [] },
      ] })] },
    ],
  },
  {
    id: 'influencer_selfie', title: 'An Influencer Wants a Selfie', minRank: 31, weight: 5,
    text: '"Oh my god, you are THAT rich person! Can I get a selfie? For content?"',
    choices: [
      { label: 'Pose', hint: 'Opportunities appear immediately.', outcomes: [ok('Two million followers now know your face. Opportunities come knocking.', { type: 'buff', target: 'income', mult: 1.5, seconds: 120, label: 'Exposure' })] },
      { label: 'Charge for it', hint: 'Cash now.', outcomes: [ok('You invoice them. They pay. Content is content.', { type: 'money', seconds: 200 })] },
    ],
  },
  {
    id: 'charity_gala', title: 'Charity Gala', minRank: 36, weight: 5,
    text: 'You are invited to a charity gala. Everyone is watching to see how much you donate.',
    choices: [
      { label: 'Donate generously', hint: 'Costs 5 min of income. +10% income for the rest of this life.', costSeconds: 300, outcomes: [ok('Your donation builds a school. Your reputation builds an empire.', { type: 'permanent', effect: { kind: 'incomeMult', value: 1.1 }, label: 'Generous Reputation' })] },
      { label: 'Just attend', hint: 'Free canapés.', outcomes: [ok('You eat eleven tiny sandwiches and network aggressively.', { type: 'buff', target: 'click', mult: 3, seconds: 60, label: 'Networking' })] },
    ],
  },
  {
    id: 'hostile_takeover', title: 'Hostile Takeover Attempt', minRank: 40, weight: 4,
    text: 'A rival conglomerate is quietly buying your shares. Your lawyers are sweating through their expensive suits.',
    choices: [
      { label: 'Fight back', hint: 'Costs 3 min of income. Win big or lose some time.', costSeconds: 180, outcomes: [
        { chance: 3, text: 'You turned the tables and bought THEM. Income ×3 for 60s.', actions: [{ type: 'buff', target: 'income', mult: 3, seconds: 60, label: 'Reverse Takeover' }] },
        { chance: 1, text: 'Stalemate. Expensive stalemate.', actions: [] },
      ] },
      { label: 'Negotiate', hint: 'Safe: 5 min of income from a settlement.', outcomes: [ok('Everyone signs. Everyone smiles. Everyone hates each other.', { type: 'money', seconds: 300 })] },
    ],
  },
  {
    id: 'alien_realtor', title: 'An Unusual Realtor', minRank: 47, weight: 2, rare: true,
    text: 'A very tall realtor with very large eyes offers you "premium off-world plots". The business card is warm.',
    choices: [
      { label: 'Listen to the pitch', hint: 'Who knows.', outcomes: [ok('You do not understand the contract, but your income seems... cosmically better. Income ×5 for 60s.', { type: 'buff', target: 'income', mult: 5, seconds: 60, label: 'Off-World Deal' })] },
      { label: 'Call security', hint: 'Probably wise.', outcomes: [ok('Security arrives. The realtor is gone. Only a warm business card remains.')] },
    ],
  },
  {
    id: 'lost_tourist', title: 'A Lost Tourist', minRank: 0, weight: 6,
    text: 'A tourist with a giant map asks you for directions to the "famous old tower".',
    choices: [
      { label: 'Give directions', hint: 'Maybe a tip.', outcomes: [
        { chance: 3, text: 'The tourist is so grateful they tip you generously.', actions: [{ type: 'money', seconds: 45 }] },
        { chance: 1, text: 'You give directions to the wrong tower. They tip you anyway. Nobody will ever know.', actions: [{ type: 'money', seconds: 20 }] },
      ] },
      { label: 'Offer a guided tour', hint: 'Clicks ×2 for 60s.', outcomes: [ok('You invent most of the history on the spot. Five stars.', { type: 'buff', target: 'click', mult: 2, seconds: 60, label: 'Tour Guide' })] },
    ],
  },
  {
    id: 'tax_refund', title: 'Tax Refund', minRank: 14, weight: 4,
    text: 'The tax office made a mistake. In your favor. This has never happened to anyone before.',
    choices: [
      { label: 'Cash it immediately', hint: 'Money now.', outcomes: [ok('You cash it before anyone notices.', { type: 'money', seconds: 240 })] },
      { label: 'Report the error', hint: 'Honesty. Something good might happen.', outcomes: [
        { chance: 1, text: 'The clerk is so moved she gives you a tip about a new tax incentive: +5% income this life.', actions: [{ type: 'permanent', effect: { kind: 'incomeMult', value: 1.05 }, label: 'Tax Incentive' }] },
        { chance: 1, text: 'They thank you, take the money back, and send you a survey.', actions: [] },
      ] },
    ],
  },
  {
    id: 'startup_pitch', title: 'Startup Pitch', minRank: 26, weight: 5,
    text: 'Two founders in hoodies pitch you "Uber for houseplants". They need seed money.',
    choices: [
      { label: 'Invest', hint: 'Costs 8% of cash. Pays out in 3 minutes... or not.', outcomes: [ok('You write a check. They high-five each other. Loudly.', { type: 'money', fraction: -0.08 }, { type: 'delayed', seconds: 180, label: 'Startup exit', outcomes: [
        { chance: 3, text: 'Houseplant Uber got acquired! Your stake multiplied by 4.', actions: [{ type: 'money', fraction: 0.32 }] },
        { chance: 5, text: 'They pivoted to blockchain houseplants. Then to nothing.', actions: [] },
      ] })] },
      { label: 'Pass', hint: 'Nothing happens.', outcomes: [ok('"You will regret this!" You probably will not.')] },
    ],
  },
  {
    id: 'golden_hour', title: 'Golden Hour', minRank: 0, weight: 3,
    text: 'The light is perfect. The city is in a good mood. Everyone is spending.',
    choices: [{ label: 'Make the most of it', hint: 'Income ×2 and clicks ×2 for 30s.', outcomes: [ok('Everything you touch turns to money for a moment.', { type: 'buff', target: 'income', mult: 2, seconds: 30, label: 'Golden Hour' }, { type: 'buff', target: 'click', mult: 2, seconds: 30, label: 'Golden Touch' })] }],
  },
];

export const EVENT_BY_ID: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
