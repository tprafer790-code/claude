import type { StageDef, StageId } from './types';

export const STAGES: StageDef[] = [
  { id: 'survival', index: 0, name: 'Survival', tagline: 'The Pavement Years', accent: '#ff9f43', accentDark: '#8a3f0a', action: 'SCAVENGE', actionHint: 'Dig through the city for anything of value' },
  { id: 'working', index: 1, name: 'Working Class', tagline: 'Clock In, Clock Out', accent: '#168bff', accentDark: '#0a3f80', action: 'WORK SHIFT', actionHint: 'Put in the hours' },
  { id: 'lowerMiddle', index: 2, name: 'Lower Middle Class', tagline: 'Payments Due Monthly', accent: '#39f56a', accentDark: '#137a30', action: 'HUSTLE', actionHint: 'Side jobs, flips and favors' },
  { id: 'middle', index: 3, name: 'Middle Class', tagline: 'Lawns and Lanyards', accent: '#22e6e0', accentDark: '#0b6f6c', action: 'NEGOTIATE', actionHint: 'Close deals, raise prices' },
  { id: 'wealth', index: 4, name: 'Wealth', tagline: 'Money Talks', accent: '#a855f7', accentDark: '#4e1d8a', action: 'INVEST', actionHint: 'Your money works so you do not have to' },
  { id: 'extreme', index: 5, name: 'Extreme Wealth', tagline: 'Rules Are Suggestions', accent: '#ffe44d', accentDark: '#8a6a00', action: 'ACQUIRE', actionHint: 'Buy whatever you are looking at' },
  { id: 'absurd', index: 6, name: 'Absurd Social Power', tagline: 'Above Everyone', accent: '#ff3dad', accentDark: '#7a1050', action: 'DOMINATE', actionHint: 'Markets move when you blink' },
  { id: 'cosmic', index: 7, name: 'Beyond the Ladder', tagline: 'Is This Still Economics?', accent: '#b9f3ff', accentDark: '#2a4aa0', action: 'TRANSCEND', actionHint: 'Reality is a line item' },
];

export const STAGE_BY_ID: Record<StageId, StageDef> = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<StageId, StageDef>;
