export type LocalDateTime = {
  readonly date: string;
  readonly hour: number;
  readonly minute: number;
  readonly epochMs: number;
  readonly utcOffsetSeconds: number;
};

const pad = (n: number): string => String(n).padStart(2, '0');

const toDateString = (d: Date): string =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export function localNow(epochMs: number, utcOffsetSeconds: number): LocalDateTime {
  const shifted = new Date(epochMs + utcOffsetSeconds * 1000);
  return {
    date: toDateString(shifted),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    epochMs,
    utcOffsetSeconds,
  };
}

export function parseLocalIso(iso: string): { date: string; hour: number; minute: number } {
  const [date = '', time = '00:00'] = iso.split('T');
  const [h = '0', m = '0'] = time.split(':');
  return { date, hour: Number(h), minute: Number(m) };
}

export function addDays(date: string, n: number): string {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d + n));
  return toDateString(base);
}

export function minutesOfDay(value: string): number {
  const time = value.includes('T') ? (value.split('T')[1] ?? '00:00') : value;
  const [h = '0', m = '0'] = time.split(':');
  return Number(h) * 60 + Number(m);
}
