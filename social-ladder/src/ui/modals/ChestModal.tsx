import { useState } from 'react';
import type { ChestResult } from '../../game/engine';
import { t } from '../../i18n';
import { audio } from '../../audio/audio';
import { reducedMotion } from '../../fx/intensity';
import { celebrate } from '../components/Celebration';
import { ChestIcon } from '../components/Retention';
import { useEngine } from '../hooks';
import { Modal } from './Modal';

const RARITY_KEY = { common: 'chestCommon', rare: 'chestRare', legendary: 'chestLegendary' } as const;

/** Opens chests one at a time: shake, burst, prize. */
export function ChestModal({ onClose }: { onClose: () => void }) {
  const engine = useEngine();
  const c = engine.state.chests;
  const [result, setResult] = useState<ChestResult | null>(null);
  const [opening, setOpening] = useState(false);
  const reduced = reducedMotion(engine.state.settings);
  const next = c.legendary ? 'legendary' : c.rare ? 'rare' : 'common';

  const open = () => {
    if (opening || !engine.chestCount()) return;
    setResult(null);
    setOpening(true);
    audio.event();
    window.setTimeout(() => {
      const r = engine.openChest();
      setOpening(false);
      setResult(r);
      if (!r) return;
      if (r.rarity === 'legendary') {
        audio.fanfare();
        celebrate({ kind: 'rare', kicker: t('chestLegendary'), title: r.text, still: reduced });
      } else if (r.rarity === 'rare') audio.rare();
      else audio.coin();
    }, reduced ? 0 : 900);
  };

  const shown = result?.rarity ?? next;
  return (
    <Modal onClose={onClose} className={`chest-modal rarity-${shown}`}>
      <small className="vote-kicker">{t('chestKicker')}</small>
      <h2>{t(RARITY_KEY[shown])}</h2>
      <div className={`chest-stage ${opening ? 'shaking' : ''} ${result ? 'opened' : ''}`}>
        <ChestIcon rarity={shown} size={96} open={!!result} />
      </div>
      <p className="chest-result" aria-live="polite">{result ? result.text : opening ? t('chestOpening') : t('chestReady')}</p>
      <p className="chest-held">
        <span><ChestIcon rarity="common" size={16} /> {c.common}</span>
        <span><ChestIcon rarity="rare" size={16} /> {c.rare}</span>
        <span><ChestIcon rarity="legendary" size={16} /> {c.legendary}</span>
      </p>
      <div className="modal-actions">
        {engine.chestCount() > 0 && <button className="btn primary" disabled={opening} onClick={open}>{result ? t('chestOpenNext') : t('chestOpen')}</button>}
        <button className="btn" onClick={onClose}>{t('close')}</button>
      </div>
    </Modal>
  );
}
