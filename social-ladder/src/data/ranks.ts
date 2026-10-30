import type { RankDef } from './types';

/**
 * The social ladder. Requirement = net worth earned during the current life.
 * Ranks can additionally require a status symbol (an object) to be owned.
 * Append new ranks at the end of a stage block; ids must stay stable for saves.
 */
export const RANKS: RankDef[] = [
  // STAGE 1 — SURVIVAL
  { id: 'cardboard_resident', stage: 'survival', req: '0', name: 'Cardboard Resident', desc: "Your address is 'the big box behind the bakery'. Rent is free. Ventilation is excellent." },
  { id: 'pigeon_negotiator', stage: 'survival', req: '5', name: 'Pigeon Negotiator', desc: 'You and the local pigeons have reached a fragile agreement about the breadcrumbs.' },
  { id: 'dumpster_aristocrat', stage: 'survival', req: '20', name: 'Dumpster Aristocrat', desc: 'Only the finest bins. Behind the organic grocery. You have standards now.' },
  { id: 'professional_beggar', stage: 'survival', req: '60', name: 'Professional Beggar', desc: 'You laminated your sign. Conversion rate up 40%. Marketing works.' },
  { id: 'mattress_owner', stage: 'survival', req: '150', requiresItem: 'cardboard_mattress', name: 'Mattress Owner', desc: 'Property ownership begins with something you can lie on.' },
  { id: 'bench_landlord', stage: 'survival', req: '300', name: 'Bench Landlord', desc: 'You claimed the good bench. The one next to the warm air vent. Prime real estate.' },
  { id: 'bicycle_without_chain', stage: 'survival', req: '600', requiresItem: 'chainless_bicycle', name: 'Bicycle Without a Chain', desc: "It doesn't move, but it's yours, and it looks fast standing still." },
  { id: 'unpaid_intern_of_life', stage: 'survival', req: '1000', name: 'Unpaid Intern of Life', desc: 'Tons of experience. Zero compensation. Great exposure, apparently.', bonus: [{ kind: 'clickMult', value: 1.25 }], bonusText: 'Experience finally pays: clicks ×1.25' },

  // STAGE 2 — WORKING CLASS
  { id: 'minimum_wage_survivor', stage: 'working', req: '1500', name: 'Minimum Wage Survivor', desc: 'Your first payslip. You read it three times. It did not get any bigger.' },
  { id: 'shared_room_tenant', stage: 'working', req: '2500', name: 'Shared Room Tenant', desc: 'A bed, a shelf and four roommates with very strong opinions about the fridge.' },
  { id: 'delivery_legend', stage: 'working', req: '4000', requiresItem: 'delivery_backpack', name: 'Delivery Legend', desc: 'Rain, snow, fifth floor without elevator. The food always arrives. Mostly warm.' },
  { id: 'coupon_strategist', stage: 'working', req: '6500', name: 'Coupon Strategist', desc: 'You bought 40 cans of beans because they were 2-for-1. It was a power move.' },
  { id: 'overworked_employee', stage: 'working', req: '10000', name: 'The Overworked Employee', desc: "Your boss says the team is 'like a family'. A family that works unpaid Saturdays." },
  { id: 'streaming_subscriber', stage: 'working', req: '15000', requiresItem: 'streaming_subscription', name: 'Streaming Subscriber', desc: 'You pay monthly to scroll for forty minutes and then rewatch the same show.' },
  { id: 'permanent_contract_owner', stage: 'working', req: '22000', name: 'Permanent Contract Owner', desc: 'A permanent contract! Your mother cried. The bank finally returns your calls.', bonus: [{ kind: 'offlineCapHours', value: 2 }], bonusText: 'Job security: +2h offline income cap' },
  { id: 'office_survivor', stage: 'working', req: '32000', name: 'Office Survivor', desc: 'You survived three reorganizations, two mergers and one team-building weekend.' },

  // STAGE 3 — LOWER MIDDLE CLASS
  { id: 'used_car_owner', stage: 'lowerMiddle', req: '45000', requiresItem: 'used_car', name: 'Used Car Owner', desc: "It makes a noise on left turns. You've decided that's its personality." },
  { id: 'flatpack_investor', stage: 'lowerMiddle', req: '60000', requiresItem: 'flatpack_bookshelf', name: 'Flat-Pack Furniture Investor', desc: 'You assembled it yourself. Four screws left over. It holds. For now.' },
  { id: 'gym_member', stage: 'lowerMiddle', req: '80000', name: 'Gym Membership Holder', desc: 'Your card has been scanned twice this year. Both times by accident.' },
  { id: 'mortgage_victim', stage: 'lowerMiddle', req: '105000', requiresItem: 'small_apartment', name: 'Apartment Mortgage Victim', desc: 'You own a home! Well, the bank does. You own the debt. It is a long-term relationship.' },
  { id: 'weekend_diner', stage: 'lowerMiddle', req: '135000', name: 'Weekend Restaurant Customer', desc: "You now say 'for the table' when ordering appetizers." },
  { id: 'side_hustle_guru', stage: 'lowerMiddle', req: '170000', name: 'Side Hustle Guru', desc: 'Three jobs, two apps and one podcast with a loyal audience of four.' },
  { id: 'small_business_owner', stage: 'lowerMiddle', req: '210000', name: 'Small Business Owner', desc: 'You are your own boss now. Your boss is unbelievably demanding.', bonus: [{ kind: 'incomeMult', value: 1.1 }], bonusText: 'Owner mentality: all income ×1.1' },

  // STAGE 4 — MIDDLE CLASS
  { id: 'corporate_employee', stage: 'middle', req: '260000', requiresItem: 'business_suit', name: 'Corporate Employee', desc: "You can say 'let's circle back on that' with a perfectly straight face." },
  { id: 'networking_enthusiast', stage: 'middle', req: '320000', name: 'Networking Enthusiast', desc: 'You have 500+ professional connections. You have met eleven of them.' },
  { id: 'suburban_homeowner', stage: 'middle', req: '390000', requiresItem: 'suburban_house', name: 'Suburban Homeowner', desc: 'A lawn. A fence. A neighbor who measures his grass with a ruler. You have arrived.' },
  { id: 'amateur_investor', stage: 'middle', req: '470000', name: 'Amateur Investor', desc: 'You watched one video about compound interest and now explain it at every party.' },
  { id: 'two_car_household', stage: 'middle', req: '560000', requiresItem: 'second_car', name: 'Two-Car Household', desc: 'One car to drive. One car to block the other car in the driveway.' },
  { id: 'middle_manager', stage: 'middle', req: '660000', name: 'Middle Manager', desc: 'You schedule meetings to prepare for the meetings. Productivity has never been higher.' },
  { id: 'executive', stage: 'middle', req: '780000', name: 'Executive', desc: 'A parking spot with your name on it. Literally. Someone painted it. Badly.' },
  { id: 'upper_middle_class', stage: 'middle', req: '900000', name: 'Upper Middle Class', desc: 'You have a favorite olive oil and you will tell people about it.', bonus: [{ kind: 'critChance', value: 0.01 }], bonusText: 'Refined taste: +1% critical chance' },

  // STAGE 5 — WEALTH
  { id: 'millionaire', stage: 'wealth', req: '1e6', name: 'Millionaire', desc: 'Seven digits. You checked your balance at 3 a.m. just to look at it.', bonusText: 'Unlocks REINVENTION (prestige)' },
  { id: 'successful_entrepreneur', stage: 'wealth', req: '3e6', name: 'Successful Entrepreneur', desc: 'Magazines ask about your morning routine. You invent one on the spot.' },
  { id: 'property_owner', stage: 'wealth', req: '1e7', name: 'Property Owner', desc: 'You are a landlord now. You finally understand why nobody ever fixed your heater.' },
  { id: 'wine_opinion_haver', stage: 'wealth', req: '3e7', requiresItem: 'wine_cellar', name: 'Wine Opinion Haver', desc: "You describe wines as 'cheeky'. Nobody knows what it means. Including you." },
  { id: 'multi_millionaire', stage: 'wealth', req: '1e8', name: 'Multi-Millionaire', desc: 'You have an accountant for your accountant.' },
  { id: 'business_magnate', stage: 'wealth', req: '2.5e8', name: 'Business Magnate', desc: 'Your handshake is legally binding in three countries.' },
  { id: 'luxury_lifestyle_owner', stage: 'wealth', req: '5.5e8', requiresItem: 'designer_wardrobe', name: 'Luxury Lifestyle Owner', desc: 'Your sunglasses cost more than your first apartment. You wear them indoors.', bonus: [{ kind: 'opportunityRate', value: 0.9 }], bonusText: 'Opportunities find you: 10% more often' },

  // STAGE 6 — EXTREME WEALTH
  { id: 'billionaire', stage: 'extreme', req: '1e9', name: 'Billionaire', desc: "You don't carry a wallet anymore. People just assume." },
  { id: 'yacht_week_regular', stage: 'extreme', req: '4e9', requiresItem: 'yacht', name: 'Yacht Week Regular', desc: 'You refer to the sea as "the commute".' },
  { id: 'international_investor', stage: 'extreme', req: '1.5e10', name: 'International Investor', desc: 'You own a little bit of everything, everywhere, all at once.' },
  { id: 'industrial_magnate', stage: 'extreme', req: '6e10', name: 'Industrial Magnate', desc: 'Your factories have factories.' },
  { id: 'unironic_art_collector', stage: 'extreme', req: '2e11', requiresItem: 'art_collection', name: 'Unironic Art Collector', desc: 'You paid nine figures for a banana taped to a wall. You get it. You really do.' },
  { id: 'financial_empire_owner', stage: 'extreme', req: '6e11', name: 'Financial Empire Owner', desc: 'Central banks call you to ask how they are doing.', bonus: [{ kind: 'incomeMult', value: 1.25 }], bonusText: 'Empire: all income ×1.25' },

  // STAGE 7 — ABSURD SOCIAL POWER
  { id: 'private_island_owner', stage: 'absurd', req: '1e12', requiresItem: 'private_island', name: 'Owner of a Private Island', desc: 'The island has a flag. The flag has your face on it.' },
  { id: 'global_economic_influencer', stage: 'absurd', req: '2e13', name: 'Global Economic Influencer', desc: 'You sneezed and three currencies caught a cold.' },
  { id: 'country_owner', stage: 'absurd', req: '5e14', name: 'Country Owner', desc: 'You bought a small country. The paperwork took longer than the purchase.' },
  { id: 'market_controller', stage: 'absurd', req: '1e16', name: 'Market Controller', desc: 'The stock market now opens when you wake up.' },
  { id: 'currency_founder', stage: 'absurd', req: '3e17', name: 'Founder of a Currency', desc: 'Your face is on the money. Your other face is on the coins.' },
  { id: 'weather_owner', stage: 'absurd', req: '1e19', requiresItem: 'weather_satellite', name: 'Owner of the Weather', desc: 'It is sunny wherever you go. That is a subscription feature.' },
  { id: 'the_untouchable', stage: 'absurd', req: '1e21', name: 'The Untouchable', desc: 'Nobody can compete with you. Nobody can even reach you. You started with nothing.', bonus: [{ kind: 'incomeMult', value: 2 }], bonusText: 'Untouchable: all income ×2' },

  // STAGE 8 — BEYOND THE LADDER (expansion space)
  { id: 'moon_landlord', stage: 'cosmic', req: '1e23', requiresItem: 'moon_deed', name: 'Moon Landlord', desc: 'Low gravity. High rent. Excellent views of your previous planet.' },
  { id: 'orbital_monopolist', stage: 'cosmic', req: '1e25', name: 'Orbital Monopolist', desc: 'Every satellite pays you a parking fee.' },
  { id: 'solar_shareholder', stage: 'cosmic', req: '1e27', name: 'Solar System Shareholder', desc: 'You hold a majority stake in the Sun. Dividends are paid in daylight.' },
  { id: 'galactic_tax_collector', stage: 'cosmic', req: '1e30', name: 'Galactic Tax Collector', desc: 'Even black holes file their returns on time now.' },
  { id: 'reality_owner_beta', stage: 'cosmic', req: '1e33', name: 'Owner of Reality (Beta)', desc: 'Some features are still in development. Gravity is in early access.' },
  { id: 'the_final_rung', stage: 'cosmic', req: '1e36', name: 'The Final Rung', desc: 'You look down. The ladder goes all the way to a cardboard box.' },
  { id: 'there_is_no_ladder', stage: 'cosmic', req: '1e40', name: 'There Is No Ladder', desc: 'There never was. There was only you, clicking.', bonus: [{ kind: 'incomeMult', value: 3 }], bonusText: 'Enlightenment: all income ×3' },
];

export const RANK_INDEX: Record<string, number> = Object.fromEntries(RANKS.map((r, i) => [r.id, i]));
