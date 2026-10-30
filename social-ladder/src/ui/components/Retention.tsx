import type { ChestRarity } from '../../data/retention';
import { t } from '../../i18n';
import { useEngine } from '../hooks';
import { Icon } from './Icon';

const CHEST_COLORS: Record<ChestRarity, [string, string, string]> = {
  // body, trim, glow
  common: ['#9b5a2c', '#c9c9d6', '#ffe44d'],
  rare: ['#168bff', '#22e6e0', '#22e6e0'],
  legendary: ['#a855f7', '#ffe44d', '#ff3dad'],
};

/** 12×10 pixel chest, drawn with rects so it stays crisp at any size. */
export function ChestIcon({ rarity, size = 22, open = false }: { rarity: ChestRarity; size?: number; open?: boolean }) {
  const [body, trim, glow] = CHEST_COLORS[rarity];
  return (
    <svg className={`chest-icon chest-${rarity}`} width={size} height={(size * 10) / 12} viewBox="0 0 12 10" shapeRendering="crispEdges" aria-hidden="true">
      {open ? <rect x="1" y="0" width="10" height="2" fill={glow} opacity="0.9" /> : <rect x="1" y="1" width="10" height="3" fill={body} />}
      <rect x="0" y={open ? 2 : 3} width="12" height="1" fill={trim} />
      <rect x="1" y="4" width="10" height="5" fill={body} />
      <rect x="0" y="9" width="12" height="1" fill="#10152e" />
      <rect x="1" y="4" width="1" height="5" fill={trim} />
      <rect x="10" y="4" width="1" height="5" fill={trim} />
      <rect x="5" y="4" width="2" height="2" fill={glow} />
      <rect x="5" y="6" width="2" height="1" fill="#10152e" />
    </svg>
  );
}

/** Chests waiting to be opened. Hidden when there are none. */
export function ChestButton({ onOpen }: { onOpen: () => void }) {
  const engine = useEngine();
  const c = engine.state.chests;
  const total = engine.chestCount();
  if (!total) return null;
  const best: ChestRarity = c.legendary ? 'legendary' : c.rare ? 'rare' : 'common';
  return (
    <button className={`chest-btn rarity-${best}`} onClick={onOpen} title={t('chestOpenTip')}>
      <ChestIcon rarity={best} size={20} />
      <span>{t('chestPill', { n: total })}</span>
    </button>
  );
}

/** Weekly league position, always on screen. */
export function LeagueChip({ onOpen }: { onOpen: () => void }) {
  const engine = useEngine();
  if (!engine.state.league.week) return null;
  const pos = engine.leaguePosition();
  return (
    <button className={`league-chip ${pos <= 3 ? 'top' : ''}`} onClick={onOpen} title={t('leagueChipTip')}>
      <Icon id="trophy" size={16} />
      <span>{t('leagueChip', { n: pos })}</span>
    </button>
  );
}

const UNLOCK_KIND = { business: 'unlockKindBusiness', ability: 'unlockKindAbility', class: 'unlockClass', dates: 'unlockDates', prestige: 'unlockPrestige' } as const;

/** Always-visible bar with the next unlock, hidden as "???" until it is close. */
export function NextUnlockBar() {
  const engine = useEngine();
  const u = engine.nextUnlock();
  if (!u) return null;
  const pct = Math.floor(u.fraction * 100);
  const name = u.reveal && u.name ? u.name : '???';
  return (
    <div className={`next-unlock ${u.reveal ? 'reveal' : ''}`} data-tip={t('nextUnlockTip')}>
      <span className="next-unlock-tag">{t('nextUnlockLabel')}</span>
      <span className={`next-unlock-icon ${u.reveal ? '' : 'hidden'}`}>
        <Icon id={u.icon} size={16} />
      </span>
      <div className="next-unlock-bar">
        <div className="next-unlock-fill" style={{ width: `${pct}%` }} />
        <span>
          {u.name ? <><b>{t(UNLOCK_KIND[u.kind])}</b>: {name}</> : <b>{u.reveal ? t(UNLOCK_KIND[u.kind]) : t('unlockSecret')}</b>}
          {' · '}{pct} %
        </span>
      </div>
    </div>
  );
}
