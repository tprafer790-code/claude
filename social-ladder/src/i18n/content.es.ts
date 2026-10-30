import { money } from '../core/bignum';
import { SEED_MONEY } from '../data/perks';
import achievements from './es/achievements.json';
import businesses from './es/businesses.json';
import events1 from './es/events1.json';
import events2 from './es/events2.json';
import items from './es/items.json';
import ranks from './es/ranks.json';
import stages from './es/stages.json';
import upgrades from './es/upgrades.json';
import politics from './es/politics.json';
import dilemmas from './es/dilemmas.json';
import quips from './es/quips.json';

/** Spanish content, keyed by content path (see content.ts). */
export const CONTENT_ES: Record<string, string> = { ...stages, ...ranks, ...businesses, ...upgrades, ...items, ...achievements, ...events1, ...events2, ...politics, ...dilemmas, ...quips };

const n = (v: number) => v.toLocaleString('es-ES', { maximumFractionDigits: 2, minimumFractionDigits: 0 });

export const PERK_DESC_ES: Record<string, (level: number) => string> = {
  seed_money: (l) => `Empiezas cada vida con ${money(SEED_MONEY[l])}.`,
  business_school: (l) => `Todos los ingresos ×${n(1 + 0.25 * l)} (+0,25 por nivel).`,
  golden_hands: (l) => `Clics ×${Math.pow(2, l)} (×2 por nivel).`,
  assistant: (l) => `Un asistente hace clic por ti ${l} ${l === 1 ? 'vez' : 'veces'} por segundo (sin críticos ni combos).`,
  dream_shift: (l) => `Tope offline +${4 * l} h.`,
  deep_sleep: (l) => `Eficiencia offline +${10 * l} puntos.`,
  lucky_star: (l) => `Oportunidades un ${10 * l} % más frecuentes.`,
  fast_climber: (l) => `Cada rango da un +${l} % de ingresos extra.`,
  bargain_hunter: (l) => `Negocios un ${5 * l} % más baratos.`,
  event_magnet: (l) => `Eventos aleatorios un ${15 * l} % más frecuentes.`,
};

export const BUSINESS_UPGRADE_ES = {
  generic: ['Sinergia a Tope', 'Integración Vertical', 'Cambio de Paradigma', 'Eficiencia Cuántica'],
  desc: (name: string) => `Ingresos de ${name} ×2`,
};
