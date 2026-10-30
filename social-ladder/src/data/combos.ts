import type { Effect } from './types';

export interface ComboDef {
  id: string;
  name: string;
  /** Revealed once discovered. */
  desc: string;
  /** Cryptic hint shown in the collection while undiscovered. */
  hint: string;
  items: string[];
  effects: Effect[];
  unlockBusiness?: string;
  grantItem?: string;
}

/** Item combinations. Owning every listed item (at the same time) discovers the combo. */
export const COMBOS: ComboDef[] = [
  { id: 'fixed_it_myself', name: 'Fixed It Myself', items: ['chainless_bicycle', 'bike_chain'], effects: [{ kind: 'businessMult', business: 'cans', value: 2 }, { kind: 'businessMult', business: 'busking', value: 2 }], desc: 'Chain + chainless bicycle = a bicycle. Can Collecting and Busking ×2.', hint: 'Something is missing from something you own.' },
  { id: 'garage_entrepreneur', name: 'Garage Entrepreneur', items: ['used_laptop', 'cheap_coffee_machine', 'gaming_chair'], effects: [{ kind: 'incomeMult', value: 1.1 }], unlockBusiness: 'garage_startup', desc: 'Laptop, coffee, chair. Unlocks the secret Garage Startup business.', hint: 'Every legend starts in a garage. With caffeine. Sitting down.' },
  { id: 'remote_worker', name: 'Remote Worker', items: ['used_laptop', 'small_apartment', 'modern_smartphone'], effects: [{ kind: 'incomeMult', value: 1.15 }], desc: 'Pajama bottoms, business top. All income ×1.15.', hint: 'Work from home requires a home, and work.' },
  { id: 'night_owl', name: 'Night Owl', items: ['cheap_coffee_machine', 'streaming_subscription', 'gaming_computer'], effects: [{ kind: 'businessMult', business: 'night_shift', value: 3 }], desc: 'Who needs sleep? Night Shift Job ×3.', hint: 'Caffeine, screens and an episode that autoplays.' },
  { id: 'battlestation', name: 'Battlestation', items: ['gaming_computer', 'gaming_chair', 'modern_smartphone'], effects: [{ kind: 'clickMult', value: 1.5 }, { kind: 'comboMax', value: 30 }], desc: 'Cable management is a lifestyle. Clicks ×1.5, combo cap +30.', hint: 'A throne, a machine and a second screen in your pocket.' },
  { id: 'commuter', name: 'The Commuter', items: ['used_car', 'business_suit', 'espresso_machine'], effects: [{ kind: 'incomeMult', value: 1.15 }], desc: 'Traffic, coffee, tie. All income ×1.15.', hint: 'Coffee in hand, tie on, stuck in traffic.' },
  { id: 'dressed_for_success', name: 'Dressed for Success', items: ['business_suit', 'luxury_watch'], effects: [{ kind: 'clickMult', value: 1.5 }, { kind: 'critChance', value: 0.01 }], desc: 'Look rich, get rich. Clicks ×1.5, +1% crit.', hint: 'The suit is nothing without the wrist.' },
  { id: 'suburban_dream', name: 'Suburban Dream', items: ['suburban_house', 'second_car', 'standing_desk'], effects: [{ kind: 'incomeMult', value: 1.2 }, { kind: 'offlineCapHours', value: 2 }], desc: 'The picket fence fantasy. All income ×1.2, +2h offline cap.', hint: 'A house, two cars and a desk you stand at sometimes.' },
  { id: 'never_forget', name: 'Never Forget Your Roots', items: ['cardboard_mattress', 'penthouse'], effects: [], grantItem: 'original_box', desc: 'You kept the cardboard mattress in the penthouse. Grants The Original Box.', hint: 'Keep something from the very beginning, even at the very top.' },
  { id: 'insufferable', name: 'The Insufferable', items: ['wine_cellar', 'penthouse', 'designer_wardrobe'], effects: [{ kind: 'incomeMult', value: 1.25 }], desc: 'Beige clothes, vintage wine, private elevator. All income ×1.25.', hint: 'Beige, vintage and on the top floor.' },
  { id: 'portfolio_manager', name: 'Portfolio Manager', items: ['investment_portfolio', 'private_office', 'luxury_watch'], effects: [{ kind: 'businessMult', business: 'fund', value: 2 }], desc: 'Charts, corner office, expensive wrist. Investment Fund ×2.', hint: 'Charts look better from a corner office.' },
  { id: 'jet_lag', name: 'Jet Lag', items: ['private_jet', 'yacht'], effects: [{ kind: 'incomeMult', value: 1.3 }, { kind: 'opportunityRate', value: 0.9 }], desc: 'By air or by sea. All income ×1.3, opportunities 10% more often.', hint: 'Above the clouds and over the waves.' },
  { id: 'gallery_bathroom', name: 'Gallery Bathroom', items: ['art_collection', 'golden_toilet'], effects: [{ kind: 'clickMult', value: 2 }], desc: 'Is it art? Is it a toilet? Clicks ×2.', hint: 'Art belongs in every room. Every room.' },
  { id: 'villain_starter_pack', name: 'Definitely Not a Villain', items: ['private_island', 'skyscraper', 'weather_satellite'], effects: [{ kind: 'incomeMult', value: 1.5 }], desc: 'Island lair, tall tower, weather control. Totally normal. All income ×1.5.', hint: 'Island. Tower. Weather. Nothing suspicious.' },
  { id: 'lucky_charms', name: 'Superstitious Investor', items: ['lucky_bottle_cap', 'ancient_coin', 'rubber_duck'], effects: [{ kind: 'critChance', value: 0.03 }], desc: 'Three lucky charms. +3% critical chance.', hint: 'Luck comes in threes. One you buy, two you find.' },
  { id: 'crowned_cat', name: 'Royal Companion', items: ['self_awarded_crown', 'street_cat'], effects: [{ kind: 'incomeMult', value: 1.5 }], desc: 'The cat also wears a crown now. All income ×1.5.', hint: 'Royalty needs a companion who was there from the street.' },
  { id: 'business_card_rolodex', name: 'Old Money Connections', items: ['golden_business_card', 'luxury_watch', 'wine_cellar'], effects: [{ kind: 'opportunityRate', value: 0.85 }], desc: 'Opportunities 15% more often.', hint: 'A gift of kindness, a good watch and a good vintage.' },
];

export const COMBO_BY_ID: Record<string, ComboDef> = Object.fromEntries(COMBOS.map((c) => [c.id, c]));
