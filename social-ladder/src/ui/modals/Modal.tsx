import { useEffect, type ReactNode } from 'react';

export function Modal({ children, onClose, className = '', dismissable = true }: { children: ReactNode; onClose: () => void; className?: string; dismissable?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, dismissable]);
  return (
    <div className="modal-backdrop" onPointerDown={(e) => dismissable && e.target === e.currentTarget && onClose()}>
      <div className={`modal ${className}`} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}
