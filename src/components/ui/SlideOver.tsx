'use client';

import { useEffect, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';

export function SlideOver({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="slideover-backdrop" onClick={onClose} />
      <aside className="slideover" role="dialog" aria-modal="true" aria-label={title}>
        <div className="slideover-head">
          <h3 style={{ fontSize: 16 }}>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close" style={{ width: 34, padding: 0 }}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="slideover-body">{children}</div>
      </aside>
    </>
  );
}
