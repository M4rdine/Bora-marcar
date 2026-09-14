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

const MS_PER_DAY = 86_400_000;

export function parseLocalIso(iso: string): { date: string; hour: number; minute: number } {
  const t = iso.indexOf('T');
  const date = t === -1 ? iso : iso.slice(0, t);
  const time = t === -1 ? '00:00' : iso.slice(t + 1);
  const [h, m] = time.split(':');
  return { date, hour: Number(h), minute: Number(m) };
}

export function addDays(date: string, n: number): string {
  const base = Date.parse(`${date}T00:00:00Z`);
  return toDateString(new Date(base + n * MS_PER_DAY));
}

export function minutesOfDay(value: string): number {
  const time = value.slice(value.indexOf('T') + 1);
  const [h, m] = time.split(':');
  return Number(h) * 60 + Number(m);
}
