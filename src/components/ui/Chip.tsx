import type { ReactNode } from 'react';

type Variant = 'default' | 'ok' | 'warn' | 'danger' | 'primary' | 'live';

const classFor: Record<Variant, string> = {
  default: 'chip',
  ok: 'chip chip-ok',
  warn: 'chip chip-warn',
  danger: 'chip chip-danger',
  primary: 'chip chip-primary',
  live: 'chip chip-live',
};

export function Chip({
  children,
  variant = 'default',
  dot = false,
}: {
  children: ReactNode;
  variant?: Variant;
  dot?: boolean;
}) {
  return (
    <span className={classFor[variant]}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}
