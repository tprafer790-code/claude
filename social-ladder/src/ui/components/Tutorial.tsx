import { t } from '../../i18n';
import { useEngine } from '../hooks';

/** Lightweight contextual onboarding: one hint at a time, gone after the first promotions. */
export function Tutorial({ onOpen }: { onOpen: (tab: 'business' | 'objects') => void }) {
  const engine = useEngine();
  const s = engine.state;
  if (s.tutorialDone) return null;
  if (s.highestRankEver >= 6) {
    s.tutorialDone = true;
    return null;
  }
  let text: string;
  let action: (() => void) | null = null;
  const missing = engine.rankProgress().missingItem;
  if (s.stats.totalClicks < 5) text = t('tutorial1');
  else if (Object.keys(s.businesses).length === 0) {
    text = t('tutorial2');
    action = () => onOpen('business');
  }
  else if (missing) {
    text = t('tutorial4');
    action = () => onOpen('objects');
  } else text = t('tutorial3');
  return (
    <div className="tutorial" onClick={action ?? undefined} role={action ? 'button' : undefined}>
      <span className="tutorial-arrow">▲</span> {text}
    </div>
  );
}
