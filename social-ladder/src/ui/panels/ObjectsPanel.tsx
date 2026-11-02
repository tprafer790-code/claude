import { useState } from 'react';
import { money } from '../../core/bignum';
import { COMBOS } from '../../data/combos';
import { ITEMS, ITEM_BY_ID, SLOTS } from '../../data/items';
import { RANKS } from '../../data/ranks';
import { t } from '../../i18n';
import { Icon } from '../components/Icon';
import { effectText } from '../effectText';
import { useEngine } from '../hooks';
import { isFresh } from '../../fx/fresh';

type Sub = 'shop' | 'inventory' | 'combos';

const REQUIRED_FOR: Record<string, string> = Object.fromEntries(RANKS.filter((r) => r.requiresItem).map((r) => [r.requiresItem!, r.name]));

export function ObjectsPanel() {
  const engine = useEngine();
  const s = engine.state;
  const [sub, setSub] = useState<Sub>('shop');
  const missing = engine.rankProgress().missingItem;

  const shop = engine
    .shopItems()
    .filter((i) => !s.items[i.id] && i.rankReq <= s.rankIndex + 3)
    .sort((a, b) => a.price - b.price);
  const owned = ITEMS.filter((i) => s.items[i.id]);
  const discovered = Object.keys(s.discoveredCombos).length;

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="subtabs">
          <button className={sub === 'shop' ? 'on' : ''} onClick={() => setSub('shop')}>{t('shop')}</button>
          <button className={sub === 'inventory' ? 'on' : ''} onClick={() => setSub('inventory')}>{t('inventory')} ({owned.length})</button>
          <button className={sub === 'combos' ? 'on' : ''} onClick={() => setSub('combos')}>{t('combinations')} ({discovered}/{COMBOS.length})</button>
        </div>
      </div>

      {sub === 'shop' && (
        <ul className="cards">
          {shop.map((it) => {
            const lockedByRank = s.rankIndex < it.rankReq;
            const afford = s.money.gte(it.price);
            const req = REQUIRED_FOR[it.id];
            return (
              <li key={it.id} data-fx={`item:${it.id}`} className={`card item rarity-${it.rarity} ${missing === it.id ? 'needed' : ''} ${afford && !lockedByRank ? 'afford' : ''} ${isFresh(`item:${it.id}`) ? 'fresh' : ''}`}>
                <button className="card-main" disabled={lockedByRank || !afford} onClick={() => engine.buyItem(it.id)}>
                  <Icon id={lockedByRank ? 'lock' : it.icon} size={36} />
                  <div className="card-info">
                    <div className="card-title">
                      {lockedByRank ? '???' : it.name} {it.slot && <span className="tag">{SLOTS.find((x) => x.id === it.slot)?.name}</span>} {req && <span className="tag status">{t('statusSymbol')}</span>}
                    </div>
                    <div className="card-desc">{lockedByRank ? t('unlocksAt', { rank: RANKS[it.rankReq].name }) : it.desc}</div>
                    {!lockedByRank && <div className="card-meta">{it.effects.map((e) => effectText(e, true)).join(' · ')}{req ? ` · ${t('requiredFor', { rank: req })}` : ''}</div>}
                  </div>
                  <div className="card-side">
                    <div className={`price ${afford ? '' : 'no'}`}>{money(it.price)}</div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {sub === 'inventory' && (
        <>
          <p className="hint">{t('slotHint')}</p>
          <div className="slots">
            {SLOTS.map((slot) => {
              const eq = s.equipped[slot.id];
              const it = eq ? ITEM_BY_ID[eq] : null;
              return (
                <div key={slot.id} className={`slot ${it ? 'filled' : ''}`}>
                  <span className="slot-name">{slot.name}</span>
                  {it ? <Icon id={it.icon} size={30} /> : <span className="slot-empty">{t('emptySlot')}</span>}
                  <span className="slot-item">{it?.name ?? ''}</span>
                </div>
              );
            })}
          </div>
          <ul className="cards compact">
            {owned.map((it) => {
              const isEq = it.slot && s.equipped[it.slot] === it.id;
              return (
                <li key={it.id} className={`card item rarity-${it.rarity}`}>
                  <div className="card-main">
                    <Icon id={it.icon} size={30} />
                    <div className="card-info">
                      <div className="card-title">
                        {it.name} {it.unobtainableInShop && <span className="tag rare">{t('tagHeirloom')}</span>}
                      </div>
                      <div className="card-meta">{it.effects.map((e) => effectText(e, true)).join(' · ')}</div>
                    </div>
                    <div className="card-side">
                      {it.slot ? (
                        isEq ? <span className="tag on">{t('equipped')}</span> : <button className="btn small" onClick={() => engine.equip(it.id)}>{t('equip')}</button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {sub === 'combos' && (
        <ul className="cards compact">
          {COMBOS.map((c) => {
            const found = !!s.discoveredCombos[c.id];
            const active = c.items.every((i) => s.items[i]);
            return (
              <li key={c.id} className={`card combo ${found ? 'found' : ''}`}>
                <div className="card-main">
                  <Icon id={found ? 'star' : 'lock'} size={30} />
                  <div className="card-info">
                    <div className="card-title">
                      {found ? c.name : '???'} {found && !active && <span className="tag">{t('tagInactive')}</span>}
                    </div>
                    <div className="card-desc">{found ? c.desc : `“${c.hint}”`}</div>
                    {found && <div className="card-meta">{c.items.map((i) => ITEM_BY_ID[i]?.name).join(' + ')}</div>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
