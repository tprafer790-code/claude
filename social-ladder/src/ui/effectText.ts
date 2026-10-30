import { BUSINESS_BY_ID } from '../data/businesses';
import type { Effect } from '../data/types';

const pct = (v: number) => `${v >= 1 ? '+' : ''}${Math.round((v - 1) * 100)}%`;

/** Human-readable effect description. `additive` marks object bonuses (lifestyle pool). */
export function effectText(e: Effect, additive = false): string {
  switch (e.kind) {
    case 'incomeMult': return additive ? `Income ${pct(e.value)}` : `All income ×${e.value}`;
    case 'clickMult': return additive ? `Clicks ${pct(e.value)}` : `Clicks ×${e.value}`;
    case 'businessMult': return `${BUSINESS_BY_ID[e.business]?.name ?? e.business} ×${e.value}`;
    case 'critChance': return `+${Math.round(e.value * 100)}% crit chance`;
    case 'offlineCapHours': return `+${e.value}h offline cap`;
    case 'offlineEfficiency': return `+${Math.round(e.value * 100)} pts offline efficiency`;
    case 'comboMax': return `Combo cap +${e.value}`;
    case 'opportunityRate': return `Opportunities ${Math.round((1 - e.value) * 100)}% more often`;
    case 'clickIpsPercent': return `Clicks +${Math.round(e.value * 100)}% of income/s`;
    case 'costDiscount': return `Businesses ${Math.round((1 - e.value) * 100)}% cheaper`;
  }
}
