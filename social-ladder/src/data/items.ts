import type { ItemDef, Slot } from './types';

export const SLOTS: { id: Slot; name: string }[] = [
  { id: 'home', name: 'Home' },
  { id: 'ride', name: 'Ride' },
  { id: 'outfit', name: 'Outfit' },
  { id: 'gadget', name: 'Gadget' },
  { id: 'accessory', name: 'Accessory' },
];

/**
 * Objects. Items with a `slot` only apply their effects while equipped
 * (one per slot). Items without a slot always apply. Every owned object
 * also adds a small collection bonus (see ECONOMY.collectionIncomeBonus).
 */
export const ITEMS: ItemDef[] = [
  // SURVIVAL
  { id: 'lucky_bottle_cap', name: 'Lucky Bottle Cap', icon: 'cap', price: 25, rankReq: 0, rarity: 'common', effects: [{ kind: 'critChance', value: 0.01 }], desc: "It says 'Try Again'. You choose to read it as encouragement." },
  { id: 'cardboard_mattress', name: 'Cardboard Mattress', icon: 'mattress', price: 60, rankReq: 2, slot: 'home', rarity: 'common', effects: [{ kind: 'clickMult', value: 1.2 }], desc: 'Sleeps like a dream. Smells like a box. Required to become a Mattress Owner.' },
  { id: 'thrift_jacket', name: 'Thrift-Store Jacket', icon: 'jacket', price: 180, rankReq: 3, slot: 'outfit', rarity: 'common', effects: [{ kind: 'clickMult', value: 1.2 }], desc: 'Three previous owners. Two of them were famous, according to the label.' },
  { id: 'broken_smartphone', name: 'Broken Smartphone', icon: 'phone', price: 220, rankReq: 3, slot: 'gadget', rarity: 'common', effects: [{ kind: 'incomeMult', value: 1.1 }], desc: 'Cracked screen. One working app: the flashlight. Good enough for gig work.' },
  { id: 'chainless_bicycle', name: 'Chainless Bicycle', icon: 'bike', price: 250, rankReq: 4, slot: 'ride', rarity: 'common', effects: [{ kind: 'businessMult', business: 'cans', value: 1.5 }, { kind: 'businessMult', business: 'busking', value: 1.5 }], desc: 'You push it everywhere. It carries the cans. Status symbol of the streets.' },
  { id: 'cheap_coffee_machine', name: 'Cheap Coffee Machine', icon: 'coffee', price: 700, rankReq: 5, rarity: 'common', effects: [{ kind: 'clickMult', value: 1.1 }], desc: 'Makes exactly one kind of coffee: brown.' },
  { id: 'bike_chain', name: 'A Bike Chain', icon: 'key', price: 900, rankReq: 6, rarity: 'common', effects: [{ kind: 'businessMult', business: 'odd_jobs', value: 1.25 }], desc: 'Finally. The missing piece. If only you had something to put it on...' },

  // WORKING CLASS
  { id: 'delivery_backpack', name: 'Delivery Backpack', icon: 'backpack', price: 1500, rankReq: 8, slot: 'accessory', rarity: 'common', effects: [{ kind: 'businessMult', business: 'delivery', value: 1.5 }, { kind: 'businessMult', business: 'odd_jobs', value: 1.2 }], desc: 'Insulated, waterproof and bright enough to be seen from space.' },
  { id: 'used_laptop', name: 'Used Laptop', icon: 'laptop', price: 2500, rankReq: 8, slot: 'gadget', rarity: 'common', effects: [{ kind: 'incomeMult', value: 1.15 }], desc: 'The battery lasts eleven minutes. The fan sounds like a jet engine.' },
  { id: 'work_uniform', name: 'Work Uniform', icon: 'suit', price: 3000, rankReq: 9, slot: 'outfit', rarity: 'common', effects: [{ kind: 'incomeMult', value: 1.1 }, { kind: 'clickMult', value: 1.1 }], desc: 'Polyester with a name tag. The name tag is spelled wrong.' },
  { id: 'secondhand_bicycle', name: 'Second-Hand Bicycle', icon: 'bike', price: 7000, rankReq: 11, slot: 'ride', rarity: 'common', effects: [{ kind: 'businessMult', business: 'delivery', value: 2 }], desc: 'A real bicycle. With a chain. Already attached. Luxury.' },
  { id: 'streaming_subscription', name: 'Streaming Subscription', icon: 'tv', price: 5000, rankReq: 12, rarity: 'common', effects: [{ kind: 'incomeMult', value: 1.05 }], desc: 'Society requires it. Required to become a Streaming Subscriber.' },
  { id: 'gaming_chair', name: 'Gaming Chair', icon: 'chair', price: 12000, rankReq: 12, rarity: 'common', effects: [{ kind: 'clickMult', value: 1.15 }, { kind: 'comboMax', value: 20 }], desc: 'Racing stripes for a chair that never moves.' },

  // LOWER MIDDLE CLASS
  { id: 'flatpack_bookshelf', name: 'Flat-Pack Bookshelf', icon: 'book', price: 15000, rankReq: 15, rarity: 'common', effects: [{ kind: 'incomeMult', value: 1.05 }], desc: 'Assembled with a tiny key and a big argument.' },
  { id: 'used_car', name: 'Used Car', icon: 'car', price: 20000, rankReq: 15, slot: 'ride', rarity: 'common', effects: [{ kind: 'businessMult', business: 'delivery', value: 1.5 }, { kind: 'businessMult', business: 'night_shift', value: 1.25 }, { kind: 'incomeMult', value: 1.1 }], desc: 'Four wheels, three working doors, one previous owner who "only drove it to church".' },
  { id: 'gym_card', name: 'Gym Membership Card', icon: 'card', price: 25000, rankReq: 16, rarity: 'common', effects: [{ kind: 'clickMult', value: 1.15 }], desc: 'Mostly used as a bookmark. The intention counts.' },
  { id: 'modern_smartphone', name: 'Modern Smartphone', icon: 'phone', price: 35000, rankReq: 16, slot: 'gadget', rarity: 'common', effects: [{ kind: 'incomeMult', value: 1.25 }, { kind: 'opportunityRate', value: 0.95 }], desc: 'Three cameras. You use them to photograph receipts.' },
  { id: 'small_apartment', name: 'Small Apartment', icon: 'house', price: 50000, rankReq: 18, slot: 'home', rarity: 'common', effects: [{ kind: 'incomeMult', value: 1.2 }, { kind: 'offlineCapHours', value: 2 }], desc: '"Cozy" (small). "Charming" (old). "Vibrant area" (loud). Yours (mortgaged).' },
  { id: 'motorcycle', name: 'Motorcycle', icon: 'bike', price: 80000, rankReq: 19, slot: 'ride', rarity: 'common', effects: [{ kind: 'incomeMult', value: 1.15 }, { kind: 'businessMult', business: 'delivery', value: 2 }], desc: 'Leather jacket sold separately. Attitude included.' },
  { id: 'gaming_computer', name: 'Gaming Computer', icon: 'laptop', price: 120000, rankReq: 20, slot: 'gadget', rarity: 'common', effects: [{ kind: 'incomeMult', value: 1.3 }, { kind: 'clickMult', value: 1.1 }], desc: 'RGB lighting increases performance by at least 30%. Scientifically.' },

  // MIDDLE CLASS
  { id: 'business_suit', name: 'Business Suit', icon: 'suit', price: 90000, rankReq: 22, slot: 'outfit', rarity: 'common', effects: [{ kind: 'clickMult', value: 1.25 }, { kind: 'incomeMult', value: 1.1 }], desc: 'Navy blue. Slim fit. Required to become a Corporate Employee.' },
  { id: 'espresso_machine', name: 'Espresso Machine', icon: 'coffee', price: 150000, rankReq: 23, rarity: 'common', effects: [{ kind: 'clickMult', value: 1.15 }], desc: 'Italian. Chrome. You now judge other people\'s coffee.' },
  { id: 'suburban_house', name: 'Suburban House', icon: 'house', price: 180000, rankReq: 24, slot: 'home', rarity: 'common', effects: [{ kind: 'incomeMult', value: 1.3 }, { kind: 'offlineCapHours', value: 2 }], desc: 'Three bedrooms, a garage, and a homeowners association with a 40-page rulebook.' },
  { id: 'second_car', name: 'Second Car', icon: 'car', price: 200000, rankReq: 26, rarity: 'common', effects: [{ kind: 'incomeMult', value: 1.1 }], desc: 'Exists mainly to be parked behind the first one.' },
  { id: 'standing_desk', name: 'Standing Desk', icon: 'chair', price: 300000, rankReq: 27, rarity: 'common', effects: [{ kind: 'incomeMult', value: 1.1 }], desc: 'You stand. Briefly. Then you sit and feel guilty.' },
  { id: 'luxury_watch', name: 'Luxury Watch', icon: 'watch', price: 400000, rankReq: 28, slot: 'accessory', rarity: 'rare', effects: [{ kind: 'critChance', value: 0.02 }, { kind: 'clickMult', value: 1.25 }], desc: 'It tells the time. It also tells everyone how much it cost.' },

  // WEALTH
  { id: 'wine_cellar', name: 'Wine Cellar', icon: 'wine', price: 1e7, rankReq: 33, rarity: 'rare', effects: [{ kind: 'incomeMult', value: 1.15 }], desc: 'Temperature controlled. Required to have Opinions About Wine.' },
  { id: 'sports_car', name: 'Sports Car', icon: 'car', price: 2e7, rankReq: 33, slot: 'ride', rarity: 'rare', effects: [{ kind: 'incomeMult', value: 1.3 }, { kind: 'opportunityRate', value: 0.9 }], desc: '0 to 100 in three seconds. 0 to the next speed bump in four.' },
  { id: 'private_office', name: 'Private Office', icon: 'store', price: 5e7, rankReq: 34, rarity: 'rare', effects: [{ kind: 'incomeMult', value: 1.2 }, { kind: 'businessMult', business: 'franchise', value: 1.5 }], desc: 'Corner office with a view of your other corner offices.' },
  { id: 'designer_wardrobe', name: 'Designer Wardrobe', icon: 'jacket', price: 1.5e8, rankReq: 35, slot: 'outfit', rarity: 'rare', effects: [{ kind: 'clickMult', value: 2 }, { kind: 'incomeMult', value: 1.1 }], desc: 'Every item is beige and costs as much as a car.' },
  { id: 'penthouse', name: 'Penthouse', icon: 'tower', price: 3e8, rankReq: 36, slot: 'home', rarity: 'rare', effects: [{ kind: 'incomeMult', value: 1.4 }, { kind: 'offlineCapHours', value: 4 }], desc: 'Top floor. Private elevator. The doorman knows your coffee order.' },
  { id: 'investment_portfolio', name: 'Investment Portfolio', icon: 'chart', price: 6e8, rankReq: 37, rarity: 'rare', effects: [{ kind: 'businessMult', business: 'fund', value: 2 }, { kind: 'businessMult', business: 'rentals', value: 1.5 }], desc: 'Diversified across everything that goes up.' },

  // EXTREME WEALTH
  { id: 'yacht', name: 'Yacht', icon: 'yacht', price: 1.5e9, rankReq: 38, rarity: 'legendary', effects: [{ kind: 'incomeMult', value: 1.3 }], desc: 'It has a smaller yacht inside it. For emergencies.' },
  { id: 'private_jet', name: 'Private Jet', icon: 'jet', price: 8e9, rankReq: 39, slot: 'ride', rarity: 'legendary', effects: [{ kind: 'incomeMult', value: 1.5 }, { kind: 'opportunityRate', value: 0.9 }], desc: 'Never wait in an airport again. Wait in a nicer airport instead.' },
  { id: 'art_collection', name: 'Art Collection', icon: 'art', price: 6e10, rankReq: 41, rarity: 'legendary', effects: [{ kind: 'incomeMult', value: 1.25 }], desc: 'Includes a blank canvas titled "Untitled (Expensive)".' },
  { id: 'golden_toilet', name: 'Golden Toilet', icon: 'toilet', price: 1.5e11, rankReq: 42, rarity: 'legendary', effects: [{ kind: 'clickMult', value: 2 }], desc: 'Cold. Uncomfortable. Priceless.' },
  { id: 'skyscraper', name: 'Skyscraper', icon: 'tower', price: 3e11, rankReq: 42, slot: 'home', rarity: 'legendary', effects: [{ kind: 'incomeMult', value: 1.5 }, { kind: 'businessMult', business: 'towers', value: 2 }], desc: 'You live on the top 30 floors. The rest is "storage".' },

  // ABSURD SOCIAL POWER
  { id: 'private_island', name: 'Private Island', icon: 'island', price: 4e11, rankReq: 43, slot: 'home', rarity: 'legendary', effects: [{ kind: 'incomeMult', value: 1.6 }, { kind: 'offlineCapHours', value: 4 }], desc: 'Comes with palm trees, a volcano (dormant) and a lair (decorative).' },
  { id: 'diamond_phone', name: 'Diamond Phone', icon: 'gem', price: 2e13, rankReq: 45, slot: 'accessory', rarity: 'legendary', effects: [{ kind: 'critChance', value: 0.03 }, { kind: 'clickMult', value: 2 }], desc: 'Weighs four kilos. Has no signal. Nobody would dare to call you anyway.' },
  { id: 'international_corporation', name: 'International Corporation', icon: 'bank', price: 5e13, rankReq: 45, rarity: 'legendary', effects: [{ kind: 'incomeMult', value: 1.5 }], desc: 'Headquartered in seven countries, taxed in none.' },
  { id: 'self_awarded_crown', name: 'Self-Awarded Crown', icon: 'crown', price: 1e15, rankReq: 47, slot: 'outfit', rarity: 'legendary', effects: [{ kind: 'clickMult', value: 3 }, { kind: 'incomeMult', value: 1.2 }], desc: 'Nobody crowned you. You crowned you. Same thing at this point.' },
  { id: 'weather_satellite', name: 'Personal Weather Satellite', icon: 'satellite', price: 3e18, rankReq: 48, slot: 'gadget', rarity: 'legendary', effects: [{ kind: 'incomeMult', value: 1.6 }, { kind: 'businessMult', business: 'weather', value: 2 }], desc: 'Sunshine on demand. Rain for your competitors.' },

  // BEYOND
  { id: 'moon_deed', name: 'Deed to the Moon', icon: 'moon', price: 3e22, rankReq: 50, rarity: 'legendary', effects: [{ kind: 'incomeMult', value: 2 }, { kind: 'businessMult', business: 'moon', value: 2 }], desc: 'Notarized. Twice. The Moon has not responded.' },
  { id: 'pocket_universe', name: 'Pocket Universe', icon: 'planet', price: 1e28, rankReq: 53, slot: 'gadget', rarity: 'legendary', effects: [{ kind: 'incomeMult', value: 2 }], desc: 'Fits in a jacket. Contains billions of galaxies. Slightly warm.' },

  // RARE & SECRET (never sold in the shop)
  { id: 'rubber_duck', name: 'Rubber Duck of Destiny', icon: 'duck', price: 0, rankReq: 0, rarity: 'secret', unobtainableInShop: true, effects: [{ kind: 'incomeMult', value: 1.1 }, { kind: 'critChance', value: 0.01 }], desc: 'A gift from the pigeons. You do not ask questions. Neither does the duck.' },
  { id: 'ancient_coin', name: 'Suspiciously Ancient Coin', icon: 'coin', price: 0, rankReq: 0, rarity: 'rare', unobtainableInShop: true, effects: [{ kind: 'incomeMult', value: 1.1 }], desc: 'Found in a storm drain. Possibly Roman. Possibly a bottle cap. Definitely lucky.' },
  { id: 'signed_napkin', name: 'Napkin Signed by an Economist', icon: 'scroll', price: 0, rankReq: 0, rarity: 'rare', unobtainableInShop: true, effects: [{ kind: 'clickMult', value: 1.5 }], desc: 'It says "buy low, sell high". Profound.' },
  { id: 'golden_business_card', name: 'Golden Business Card', icon: 'card', price: 0, rankReq: 0, rarity: 'legendary', unobtainableInShop: true, effects: [{ kind: 'incomeMult', value: 1.25 }, { kind: 'opportunityRate', value: 0.85 }], desc: 'A thank-you from a stranger whose wallet you returned. Doors open by themselves.' },
  { id: 'definitely_real_watch', name: 'Definitely Real Watch', icon: 'watch', price: 0, rankReq: 0, rarity: 'rare', unobtainableInShop: true, effects: [{ kind: 'clickMult', value: 1.05 }], desc: "The logo is spelled 'Rolecks'. It ticks. Sometimes." },
  { id: 'street_cat', name: 'Street Cat (Adopted)', icon: 'cat', price: 0, rankReq: 0, rarity: 'secret', unobtainableInShop: true, effects: [{ kind: 'critChance', value: 0.02 }], desc: 'She chose you. She sits on your paperwork. Productivity is up, somehow.' },
  { id: 'original_box', name: 'The Original Box', icon: 'box', price: 0, rankReq: 0, rarity: 'secret', unobtainableInShop: true, effects: [{ kind: 'incomeMult', value: 1.15 }], desc: 'Framed. Climate controlled. Never forget where you came from.' },
  { id: 'mystery_key', name: 'Mysterious Brass Key', icon: 'key', price: 0, rankReq: 0, rarity: 'secret', unobtainableInShop: true, effects: [{ kind: 'offlineEfficiency', value: 0.1 }], desc: 'It fits nothing you own. Yet.' },
];

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
