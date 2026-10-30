import { tierIncomeScale } from '../config/economy';
import type { BusinessDef } from './types';

/**
 * Passive income sources. Cost/income ratios follow a classic incremental
 * curve (each tier ~10x cost, ~6-8x income). Tune in one place.
 */
const RAW_BUSINESSES: BusinessDef[] = [
  { id: 'cans', name: 'Can Collecting', icon: 'can', baseCost: 15, baseIncome: 0.1, rankReq: 0, desc: 'Ten cents a can. The city is your oyster. A dented, recyclable oyster.', upgradeNames: ['Bigger Plastic Bag', 'Shopping Cart (Borrowed)', 'Route Optimization', 'Can Crusher Boots', 'Recycling Cartel', 'Aluminium Futures'] },
  { id: 'busking', name: 'Street Busking', icon: 'guitar', baseCost: 100, baseIncome: 1, rankReq: 2, desc: 'You know three chords. The audience knows you need the money.', upgradeNames: ['Fourth Chord', 'Tragic Backstory', 'Hat With a Logo', 'Viral Clip', 'Merch Table', 'Farewell Tour (Annual)'] },
  { id: 'odd_jobs', name: 'Odd Jobs', icon: 'tools', baseCost: 1100, baseIncome: 8, rankReq: 5, desc: 'Moving couches, walking dogs, assembling furniture nobody can assemble.', upgradeNames: ['Duct Tape Mastery', 'Business Cards', 'Five-Star Reviews', 'Truck-Owning Friend', 'Handyman Empire', 'Couch Logistics Inc.'] },
  { id: 'delivery', name: 'Delivery Gigs', icon: 'backpack', baseCost: 12000, baseIncome: 47, rankReq: 8, desc: 'Pizza, packages, mysterious envelopes. Tips not guaranteed.', upgradeNames: ['Shortcut Knowledge', 'Thermal Bag', 'Five Apps At Once', 'Electric Scooter', 'Drone Squadron', 'Teleport Beta'] },
  { id: 'night_shift', name: 'Night Shift Job', icon: 'moon', baseCost: 130000, baseIncome: 260, rankReq: 13, desc: 'Guarding an empty warehouse. Someone has to. It pays double after midnight.', upgradeNames: ['Industrial Coffee', 'Comfortable Stool', 'Second Monitor', 'Union Card', 'Night Manager', 'Owning the Night'] },
  { id: 'food_truck', name: 'Food Truck', icon: 'truck', baseCost: 1.4e6, baseIncome: 1400, rankReq: 22, desc: 'Gourmet tacos with an ironic name. The line goes around the block.', upgradeNames: ['Secret Sauce', 'Fusion Menu', 'Instagram Lighting', 'Festival Contracts', 'Truck Fleet', 'Michelin Wheel'] },
  { id: 'rentals', name: 'Rental Flats', icon: 'house', baseCost: 2e7, baseIncome: 7800, rankReq: 31, desc: "Small flats, 'cozy' listings. Every review mentions the stairs.", upgradeNames: ['Fresh Paint Over Mold', 'Smart Locks', 'Short-Term Platform', 'Luxury Rebrand', 'Neighborhood Ownership', 'City Block'] },
  { id: 'franchise', name: 'Franchise Chain', icon: 'store', baseCost: 3.3e8, baseIncome: 44000, rankReq: 34, desc: 'Same coffee shop, 400 locations, identical playlist.', upgradeNames: ['Corporate Jingle', 'Loyalty App', 'Drive-Through', 'Airport Locations', 'Global Rollout', 'Store Inside Store'] },
  { id: 'fund', name: 'Investment Fund', icon: 'chart', baseCost: 5.1e9, baseIncome: 260000, rankReq: 38, desc: 'Other people give you money. You give them charts.', upgradeNames: ['Confident Charts', 'Algorithmic Guessing', 'Quarterly Optimism', 'Hedge Hedges', 'Market Whisperer', 'Infinite Leverage'] },
  { id: 'startup', name: 'Tech Startup', icon: 'rocket', baseCost: 7.5e10, baseIncome: 1.6e6, rankReq: 41, desc: 'It is like a taxi app, but for apps. Valued at eleven billion.', upgradeNames: ['Bean Bags', 'Pivot to AI', 'Hype Keynote', 'Unicorn Status', 'Acquire Competitors', 'Platform Monopoly'] },
  { id: 'towers', name: 'Skyscraper Holdings', icon: 'tower', baseCost: 1e12, baseIncome: 1e7, rankReq: 43, desc: 'Glass towers named after yourself. Taller each time.', upgradeNames: ['Rooftop Helipad', 'Name in Gold Letters', 'Vertical Gardens', 'Cloud-Piercer', 'Skyline Rights', 'Orbital Elevator'] },
  { id: 'shipping', name: 'Global Shipping', icon: 'ship', baseCost: 1.4e13, baseIncome: 6.5e7, rankReq: 45, desc: 'If it was bought anywhere, it floated on your boat first.', upgradeNames: ['Bigger Containers', 'Canal Priority', 'Autonomous Fleet', 'Port Ownership', 'Ocean Lanes', 'Tide Contracts'] },
  { id: 'bank', name: 'Private Bank', icon: 'bank', baseCost: 1.7e14, baseIncome: 4.3e8, rankReq: 46, desc: 'Minimum deposit: one small nation. Free pen included.', upgradeNames: ['Marble Lobby', 'Exclusive Credit Card', 'Offshore Branch', 'Too Big To Fail', 'Lender of Last Resort', 'Money Printer'] },
  { id: 'media', name: 'Media Conglomerate', icon: 'tv', baseCost: 2.1e15, baseIncome: 2.9e9, rankReq: 47, desc: 'Every channel, every paper, every opinion. Mostly yours.', upgradeNames: ['Breaking News Jingle', 'Talk Show Empire', 'Streaming Wars Victory', 'Algorithm Ownership', 'Narrative Control', 'Reality Show: Reality'] },
  { id: 'space', name: 'Space Tourism', icon: 'planet', baseCost: 2.6e16, baseIncome: 2.1e10, rankReq: 49, desc: 'Eleven minutes of weightlessness. Gift shop in orbit.', upgradeNames: ['Reusable Rockets', 'Orbital Hotel', 'Zero-G Weddings', 'Mars Day Trips', 'Asteroid Mining', 'Space Elevator'] },
  { id: 'islands', name: 'Island Nations Inc.', icon: 'island', baseCost: 3.1e17, baseIncome: 1.5e11, rankReq: 50, desc: 'Archipelagos as a service. Each comes with its own national anthem.', upgradeNames: ['Artificial Islands', 'Tax Paradise Charter', 'Floating Cities', 'Island Passports', 'Continental Drift Rights', 'New Atlantis'] },
  { id: 'weather', name: 'Weather Patent Office', icon: 'cloud', baseCost: 7.1e19, baseIncome: 1.1e12, rankReq: 52, desc: 'You patented the rainbow. Licensing fees apply to every rainy day.', upgradeNames: ['Cloud Seeding', 'Sunshine Subscriptions', 'Hurricane Insurance', 'Season Franchising', 'Climate Licensing', 'Sky Ownership'] },
  { id: 'moon', name: 'Lunar Real Estate', icon: 'moon', baseCost: 1.2e22, baseIncome: 8.3e12, rankReq: 54, desc: 'Crater-view apartments. The commute is terrible, the silence is priceless.', upgradeNames: ['Dome Housing', 'Low-G Gyms', 'Earthrise Views', 'Lunar Suburbs', 'Moon Malls', 'Second Moon'] },
  { id: 'reality', name: 'Reality Subscription', icon: 'brain', baseCost: 1.9e24, baseIncome: 6.4e13, rankReq: 56, desc: 'Physics is now a monthly plan. The free tier has extra friction.', upgradeNames: ['Premium Gravity', 'Ad-Free Sunsets', 'Time Bundles', 'Causality Pro', 'Universe Family Plan', 'Existence Unlimited'] },

  // Secret business, unlocked by the "Garage Entrepreneur" combination.
  { id: 'garage_startup', name: 'Garage Startup', icon: 'laptop', baseCost: 30000, baseIncome: 160, rankReq: 0, secret: true, desc: 'A laptop, a coffee machine and a gaming chair. Every legend starts in a garage.', upgradeNames: ['Whiteboard Wall', 'Pitch Deck', 'Seed Round', 'Out of the Garage', 'IPO Bell', 'Garage Museum'] },
];

/** Effective businesses: raw income scaled per tier (see tierIncomeScale). */
export const BUSINESSES: BusinessDef[] = RAW_BUSINESSES.map((b, i) => ({
  ...b,
  baseIncome: b.baseIncome * (b.secret ? 0.3 : tierIncomeScale(i)),
}));

export const BUSINESS_BY_ID: Record<string, BusinessDef> = Object.fromEntries(BUSINESSES.map((b) => [b.id, b]));
