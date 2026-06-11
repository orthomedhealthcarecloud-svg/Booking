export function Avatar({
  name,
  size = '',
}: {
  name: string;
  size?: '' | 'sm' | 'lg';
}) {
  const initials = name
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const cls = size === 'lg' ? 'avatar avatar-lg' : size === 'sm' ? 'avatar avatar-sm' : 'avatar';
  return <div className={cls}>{initials}</div>;
}
