import { dayPhase, minutesOfDay, type DailySummary, type LocalDateTime } from '@/domain';

import type { SkyPhase } from './tokens';

const DEFAULT_SUNRISE = 6 * 60;
const DEFAULT_SUNSET = 18 * 60;

export function phaseFor(input: {
  now: LocalDateTime;
  daily: DailySummary | null;
  isBadDay: boolean;
}): SkyPhase {
  if (input.isBadDay) return 'rainy';
  const sunrise = input.daily ? minutesOfDay(input.daily.sunrise) : DEFAULT_SUNRISE;
  const sunset = input.daily ? minutesOfDay(input.daily.sunset) : DEFAULT_SUNSET;
  return dayPhase(input.now.hour * 60 + input.now.minute, sunrise, sunset);
}
