export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

const TWILIGHT_MINUTES = 60;

export function dayPhase(
  nowMinutes: number,
  sunriseMinutes: number,
  sunsetMinutes: number,
): DayPhase {
  const inDawn =
    nowMinutes >= sunriseMinutes - TWILIGHT_MINUTES &&
    nowMinutes <= sunriseMinutes + TWILIGHT_MINUTES;
  if (inDawn) return 'dawn';
  const inDusk =
    nowMinutes >= sunsetMinutes - TWILIGHT_MINUTES &&
    nowMinutes <= sunsetMinutes + TWILIGHT_MINUTES;
  if (inDusk) return 'dusk';
  if (nowMinutes > sunriseMinutes && nowMinutes < sunsetMinutes) return 'day';
  return 'night';
}
