import { useEffect, useState } from 'react';
import type { IconId } from '../../data/types';
import { Icon } from './Icon';

export interface ToastData {
  icon: IconId;
  title: string;
  text: string;
  sub?: string;
  tone: 'info' | 'good' | 'gold' | 'rare' | 'rank';
}

type Listener = (t: ToastData & { id: number }) => void;
const listeners = new Set<Listener>();
let seq = 0;

/** Pushes a non-blocking notification (top-right on desktop, top on mobile). */
export function pushToast(t: ToastData) {
  const item = { ...t, id: ++seq };
  listeners.forEach((l) => l(item));
}

export function Toasts() {
  const [items, setItems] = useState<(ToastData & { id: number })[]>([]);
  useEffect(() => {
    const l: Listener = (item) => {
      setItems((list) => [...list.slice(-3), item]);
      window.setTimeout(() => setItems((list) => list.filter((x) => x.id !== item.id)), item.tone === 'rare' ? 7000 : 4200);
    };
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return (
    <div className="toasts" aria-live="polite">
      {items.map((it) => (
        <div key={it.id} className={`toast tone-${it.tone}`} onClick={() => setItems((l) => l.filter((x) => x.id !== it.id))}>
          <Icon id={it.icon} size={26} />
          <div>
            <div className="toast-title">{it.title}</div>
            {it.text && <div className="toast-text">{it.text}</div>}
            {it.sub && <div className="toast-sub">{it.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
