import type { IconId } from './types';

/** Active abilities unlocked by social rank (secondary actions next to the main button). */
export interface AbilityDef {
  id: string;
  name: string;
  desc: string;
  icon: IconId;
  rankReq: number;
  cooldown: number;
  kind: 'clickBuff' | 'incomeBuff' | 'instantIncome';
  mult?: number;
  duration?: number;
  seconds?: number;
}

export const ABILITIES: AbilityDef[] = [
  { id: 'double_shift', name: 'Double Shift', icon: 'coffee', rankReq: 8, cooldown: 90, kind: 'clickBuff', mult: 3, duration: 12, desc: 'Clicks ×3 for 12 seconds.' },
  { id: 'hustle', name: 'Side Hustle', icon: 'tools', rankReq: 16, cooldown: 300, kind: 'instantIncome', seconds: 90, desc: 'Instantly earn 90 seconds of income.' },
  { id: 'market_timing', name: 'Market Timing', icon: 'chart', rankReq: 31, cooldown: 600, kind: 'incomeBuff', mult: 2, duration: 45, desc: 'All income ×2 for 45 seconds.' },
  { id: 'power_move', name: 'Power Move', icon: 'crown', rankReq: 44, cooldown: 900, kind: 'clickBuff', mult: 15, duration: 15, desc: 'Clicks ×15 for 15 seconds.' },
];
