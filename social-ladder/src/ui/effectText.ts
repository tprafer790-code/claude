import { getLanguage, t } from '../i18n';
import { BUSINESS_BY_ID } from '../data/businesses';
import type { Effect } from '../data/types';

const pct = (v: number) => `${v >= 1 ? '+' : ''}${Math.round((v - 1) * 100)}%`;
/** Decimal multipliers in the reader's convention (1.5 / 1,5). */
const num = (v: number) => (getLanguage() === 'es' ? String(v).replace('.', ',') : String(v));

/** Human-readable effect description. `additive` marks object bonuses (lifestyle pool). */
export function effectText(e: Effect, additive = false): string {
  switch (e.kind) {
    case 'incomeMult': return additive ? t('fxIncomeAdd', { pct: pct(e.value) }) : t('fxIncomeMult', { v: num(e.value) });
    case 'clickMult': return additive ? t('fxClickAdd', { pct: pct(e.value) }) : t('fxClickMult', { v: num(e.value) });
    case 'businessMult': return `${BUSINESS_BY_ID[e.business]?.name ?? e.business} ×${num(e.value)}`;
    case 'critChance': return t('fxCrit', { v: Math.round(e.value * 100) });
    case 'offlineCapHours': return t('fxOfflineCap', { v: e.value });
    case 'offlineEfficiency': return t('fxOfflineEff', { v: Math.round(e.value * 100) });
    case 'comboMax': return t('fxCombo', { v: e.value });
    case 'opportunityRate': return t('fxOpp', { v: Math.round((1 - e.value) * 100) });
    case 'clickIpsPercent': return t('fxClickIps', { v: Math.round(e.value * 100) });
    case 'costDiscount': return t('fxDiscount', { v: Math.round((1 - e.value) * 100) });
    case 'priceMult': return t(e.value >= 1 ? 'fxPriceUp' : 'fxPriceDown', { v: Math.abs(Math.round((e.value - 1) * 100)) });
  }
}
