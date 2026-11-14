import { ECONOMY } from '../../config/economy';
import { useMemo } from 'react';
import { ABILITIES } from '../../data/abilities';
import { BUSINESSES } from '../../data/businesses';
import { RANKS } from '../../data/ranks';
import { STAGE_BY_ID } from '../../data/stages';
import { applyEquipment, drawHero, HERO_PX_H, HERO_PX_W, STAGE_LOOKS } from '../../render/hero';
import { t } from '../../i18n';
import { useEngine } from '../hooks';
import { Modal } from './Modal';

/** Big celebration when the hero reaches a new social class. */
export function PromotionModal({ rankIndex, onClose }: { rankIndex: number; onClose: () => void }) {
  const engine = useEngine();
  const rank = RANKS[rankIndex];
  const stage = STAGE_BY_ID[rank.stage];
  const prevStage = STAGE_BY_ID[RANKS[Math.max(0, rankIndex - 1)].stage];

  const [before, after] = useMemo(() => {
    const draw = (stageIdx: number, frame: number) => {
      const c = document.createElement('canvas');
      c.width = HERO_PX_W;
      c.height = HERO_PX_H;
      drawHero(c.getContext('2d')!, 0, 0, applyEquipment(STAGE_LOOKS[stageIdx], engine.state.equipped), frame);
      return c.toDataURL();
    };
    return [draw(prevStage.index, 0), draw(stage.index, 4)];
  }, [stage.index, prevStage.index, engine.state.equipped]);

  const unlocks = [
    ...BUSINESSES.filter((b) => !b.secret && b.rankReq === rankIndex).map((b) => t('newBusiness', { name: b.name })),
    ...ABILITIES.filter((a) => a.rankReq === rankIndex).map((a) => t('newAbility', { name: a.name })),
    t('newAction', { name: stage.action }),
  ];

  return (
    <Modal onClose={onClose} className="promo-modal" >
      <div className="promo-rays" style={{ ['--accent' as string]: stage.accent }} />
      <small className="promo-kicker">{t('newClass')}</small>
      <h2 className="promo-stage" style={{ color: stage.accent }}>{stage.name.toUpperCase()}</h2>
      <p className="promo-tagline">“{stage.tagline}”</p>
      <div className="promo-heroes">
        <img src={before} alt="" className="hero-img before" />
        <span className="promo-arrow">▶</span>
        <img src={after} alt="" className="hero-img after" />
      </div>
      <h3 className="promo-rank">{rank.name}</h3>
      <p className="promo-desc">{rank.desc}</p>
      <div className="promo-rewards">
        <b>{t('rewards')}</b>
        <ul>
          <li>{t('rankIncome', { pct: Math.round(ECONOMY.rankIncomeBonus * 100) })}</li>
          {rank.bonusText && <li>{rank.bonusText}</li>}
          {unlocks.map((u) => (
            <li key={u}>{u}</li>
          ))}
        </ul>
      </div>
      <button className="btn primary" onClick={onClose}>
        {t('continue')}
      </button>
    </Modal>
  );
}
