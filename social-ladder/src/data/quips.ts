/**
 * Lines the hero says to the player in a speech bubble. Moods pick the
 * situation: `idle` when nobody has clicked for a while, `poke` when the hero
 * is tapped, `spam` during a big combo, and the rest depend on game state.
 */
export type QuipMood = 'idle' | 'any' | 'poke' | 'spam' | 'broke' | 'rich' | 'hurt' | 'shady' | 'wander' | 'back';

export interface QuipDef {
  id: string;
  mood: QuipMood;
  text: string;
}

export const QUIPS: QuipDef[] = [
  // Nobody is clicking
  { id: 'idle_navel', mood: 'idle', text: 'Give me the d*mn money and stop staring at your navel.' },
  { id: 'idle_toilet', mood: 'idle', text: 'Are you in the bathroom again...?' },
  { id: 'idle_hello', mood: 'idle', text: 'Hello? Is anyone there? I can hear you breathing.' },
  { id: 'idle_rent', mood: 'idle', text: 'Rent will not pay itself. Neither will I, apparently.' },
  { id: 'idle_phone', mood: 'idle', text: 'Put the phone down. I AM the phone.' },
  { id: 'idle_boss', mood: 'idle', text: 'If you are hiding from your boss, click quietly.' },
  { id: 'idle_coffee', mood: 'idle', text: 'Third coffee? I can see the stain from here.' },
  { id: 'idle_meme', mood: 'idle', text: 'Watching memes while I starve. Classic.' },
  { id: 'idle_sleep', mood: 'idle', text: 'Did you fall asleep on the keyboard? Again?' },
  { id: 'idle_strike', mood: 'idle', text: 'One more minute and I call the union.' },
  { id: 'idle_mum', mood: 'idle', text: 'Your mother clicks faster than this. And she uses a stylus.' },
  { id: 'idle_fridge', mood: 'idle', text: 'Open the fridge all you want, the money is in HERE.' },
  { id: 'idle_wave', mood: 'idle', text: 'I will just stand here. Being poor. For you.' },
  { id: 'idle_lottery', mood: 'idle', text: 'Waiting to win the lottery? That is not a plan.' },

  // Whenever
  { id: 'any_ladder', mood: 'any', text: 'One day I will have a balcony. With TWO plants.' },
  { id: 'any_crypto', mood: 'any', text: 'My cousin says crypto. My cousin lives with his mother.' },
  { id: 'any_landlord', mood: 'any', text: 'My landlord just raised the rent. For breathing.' },
  { id: 'any_dream', mood: 'any', text: 'I dreamt of a fixed contract. I woke up crying.' },
  { id: 'any_gym', mood: 'any', text: 'Clicking counts as cardio, right?' },
  { id: 'any_taxes', mood: 'any', text: 'Taxes are like pigeons: they always find you.' },
  { id: 'any_brunch', mood: 'any', text: 'Rich people have brunch. I have breakfast late.' },
  { id: 'any_coach', mood: 'any', text: 'A coach told me to "visualise money". I see bills. Unpaid ones.' },
  { id: 'any_pigeon', mood: 'any', text: 'That pigeon has more savings than me.' },
  { id: 'any_influencer', mood: 'any', text: 'Should I become an influencer? I influence nobody.' },
  { id: 'any_pension', mood: 'any', text: 'My pension plan is you. No pressure.' },
  { id: 'any_suit', mood: 'any', text: 'One day this outfit will be "vintage".' },

  // Tapped on the hero
  { id: 'poke_hey', mood: 'poke', text: 'Hey! Hands off the merchandise!' },
  { id: 'poke_tickles', mood: 'poke', text: 'That tickles. Do it again and invoice me.' },
  { id: 'poke_work', mood: 'poke', text: 'Poking me does not pay. The big button does.' },
  { id: 'poke_hr', mood: 'poke', text: 'Human Resources will hear about this.' },
  { id: 'poke_alive', mood: 'poke', text: 'Yes, I am alive. Barely.' },

  // Big combo
  { id: 'spam_fire', mood: 'spam', text: 'YES! MORE! MY FINGERS ARE ON FIRE!' },
  { id: 'spam_beast', mood: 'spam', text: 'You are a machine. A beautiful, greedy machine.' },
  { id: 'spam_wrist', mood: 'spam', text: 'Your wrist will hate you tomorrow. I will not.' },
  { id: 'spam_wolf', mood: 'spam', text: 'The wolf of your street!' },

  // Situational
  { id: 'broke_empty', mood: 'broke', text: 'My wallet echoes. Listen: ...nothing.' },
  { id: 'broke_dinner', mood: 'broke', text: 'Dinner tonight: the smell from the bakery.' },
  { id: 'broke_bank', mood: 'broke', text: 'The ATM laughed at me. Out loud.' },
  { id: 'rich_yacht', mood: 'rich', text: 'Should I buy a yacht or a second yacht?' },
  { id: 'rich_poor', mood: 'rich', text: 'I used to be poor. Disgusting. Never again.' },
  { id: 'rich_tax', mood: 'rich', text: 'My accountant has an accountant.' },
  { id: 'hurt_ouch', mood: 'hurt', text: 'Everything hurts. Even my bank account.' },
  { id: 'hurt_doctor', mood: 'hurt', text: 'I need a doctor. A cheap one. Is there a cheap one?' },
  { id: 'shady_hood', mood: 'shady', text: 'Why is everyone looking at me like that?' },
  { id: 'shady_lawyer', mood: 'shady', text: 'I need a lawyer. A good one. A bad one, actually.' },
  { id: 'shady_hat', mood: 'shady', text: 'Maybe I should wear a fake moustache.' },

  // Walking around the street
  { id: 'left_look', mood: 'wander', text: 'I will check if there is money over here...' },
  { id: 'right_look', mood: 'back', text: 'Nope. Not here either. Back to work.' },
];
