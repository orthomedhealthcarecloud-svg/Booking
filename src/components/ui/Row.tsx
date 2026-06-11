import type { ReactNode } from 'react';

export function Row({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--ink-3)' }}>{k}</span>
      <span>{v}</span>
    </div>
  );
}
