export const fmtTime = (d: Date | number, tz = 'Asia/Kolkata') =>
  new Date(d).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  });

export const fmtDate = (d: Date | number, tz = 'Asia/Kolkata') =>
  new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: tz,
  });

export const fmtDateLong = (d: Date | number, tz = 'Asia/Kolkata') =>
  new Date(d).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: tz,
  });

export const fmtMoney = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export function slotIdFor(doctorId: string, startMillis: number): string {
  const d = new Date(startMillis);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const HH = String(d.getUTCHours()).padStart(2, '0');
  const MM = String(d.getUTCMinutes()).padStart(2, '0');
  return `${doctorId}_${yyyy}${mm}${dd}_${HH}${MM}`;
}
