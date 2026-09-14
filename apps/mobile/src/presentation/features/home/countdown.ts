import type { LocalDateTime } from '@/domain';

export type Countdown = { readonly hours: number; readonly minutes: number };

const MINUTES_PER_HOUR = 60;

/** Tempo até `startHour`; `null` quando a janela já começou. */
export function countdown(now: LocalDateTime, startHour: number): Countdown | null {
  const nowMinutes = now.hour * MINUTES_PER_HOUR + now.minute;
  const startMinutes = startHour * MINUTES_PER_HOUR;
  const diff = startMinutes - nowMinutes;
  if (diff <= 0) return null;
  return { hours: Math.floor(diff / MINUTES_PER_HOUR), minutes: diff % MINUTES_PER_HOUR };
}
