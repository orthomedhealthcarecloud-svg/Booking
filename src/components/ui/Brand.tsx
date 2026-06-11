'use client';

export function Brand({ onClick, label = 'Medi' }: { onClick?: () => void; label?: string }) {
  return (
    <div className="brand" onClick={onClick} role={onClick ? 'button' : undefined}>
      <div className="logo">M</div>
      <span>{label}</span>
    </div>
  );
}
