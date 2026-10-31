import type { CountryId } from '../../core/types';
import { ES } from './es';
import { US } from './us';
import { BR } from './br';
import type { CountryDef } from './types';

/** Para añadir un país: crea su archivo de datos y regístralo aquí. Solo los registrados son seleccionables. */
export const COUNTRIES: Record<CountryId, CountryDef> = { es: ES, us: US, br: BR };
export const COUNTRY_ORDER: CountryId[] = ['es', 'us', 'br'];
export function country(id: CountryId): CountryDef { return COUNTRIES[id]; }
export type { CountryDef } from './types';
