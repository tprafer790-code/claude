import type { StageDef, StageId } from './types';

export const STAGES: StageDef[] = [
  { id: 'survival', index: 0, name: 'Survival', tagline: 'The Pavement Years', accent: '#c8a165', accentDark: '#6b4f2a', action: 'SCAVENGE', actionHint: 'Dig through the city for anything of value' },
  { id: 'working', index: 1, name: 'Working Class', tagline: 'Clock In, Clock Out', accent: '#e07b39', accentDark: '#7a3a14', action: 'WORK SHIFT', actionHint: 'Put in the hours' },
  { id: 'lowerMiddle', index: 2, name: 'Lower Middle Class', tagline: 'Payments Due Monthly', accent: '#5fb35f', accentDark: '#2c5e2c', action: 'HUSTLE', actionHint: 'Side jobs, flips and favors' },
  { id: 'middle', index: 3, name: 'Middle Class', tagline: 'Lawns and Lanyards', accent: '#4ea3d8', accentDark: '#1f4f70', action: 'NEGOTIATE', actionHint: 'Close deals, raise prices' },
  { id: 'wealth', index: 4, name: 'Wealth', tagline: 'Money Talks', accent: '#b07ce8', accentDark: '#4e2d78', action: 'INVEST', actionHint: 'Your money works so you do not have to' },
  { id: 'extreme', index: 5, name: 'Extreme Wealth', tagline: 'Rules Are Suggestions', accent: '#f2c84b', accentDark: '#7a5a10', action: 'ACQUIRE', actionHint: 'Buy whatever you are looking at' },
  { id: 'absurd', index: 6, name: 'Absurd Social Power', tagline: 'Above Everyone', accent: '#ff5d8f', accentDark: '#7a1d3d', action: 'DOMINATE', actionHint: 'Markets move when you blink' },
  { id: 'cosmic', index: 7, name: 'Beyond the Ladder', tagline: 'Is This Still Economics?', accent: '#5ef2e0', accentDark: '#14706a', action: 'TRANSCEND', actionHint: 'Reality is a line item' },
];

export const STAGE_BY_ID: Record<StageId, StageDef> = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<StageId, StageDef>;
