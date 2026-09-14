import type { EngineConfig } from '../config/types';
import type { HourlyConditions } from '../forecast/types';

import type { TimeWindow } from './windows';

export type TipId = 'sunscreen' | 'water' | 'cooling' | 'rain' | 'coat';
export type Tip = { readonly id: TipId; readonly text: string };

const AFTER_WINDOW_HOURS = 2;

const inWindow = (hours: readonly HourlyConditions[], w: TimeWindow) =>
  hours.filter((h) => h.hour >= w.startHour && h.hour < w.endHour);

const after = (hours: readonly HourlyConditions[], w: TimeWindow, count: number) =>
  hours.filter((h) => h.hour >= w.endHour && h.hour < w.endHour + count);

function coolingTip(
  inside: readonly HourlyConditions[],
  following: readonly HourlyConditions[],
  dropDeg: number,
): Tip | null {
  const start = inside[0];
  if (!start) return null;
  const cold = following.find((h) => start.apparentTemperature - h.apparentTemperature >= dropDeg);
  return cold ? { id: 'cooling', text: `Esfria às ${cold.hour}h` } : null;
}

export function preparationTips(
  dayHours: readonly HourlyConditions[],
  window: TimeWindow,
  cfg: EngineConfig,
): readonly Tip[] {
  const inside = inWindow(dayHours, window);
  const following = after(dayHours, window, AFTER_WINDOW_HOURS);
  const next = following[0];
  const t = cfg.tips;
  const candidates: readonly (Tip | null)[] = [
    inside.some((h) => h.uvIndex >= t.uvProtect) ? { id: 'sunscreen', text: 'Use protetor' } : null,
    inside.some((h) => h.apparentTemperature >= t.waterApparent)
      ? { id: 'water', text: 'Leve água' }
      : null,
    coolingTip(inside, following, t.coolDropDeg),
    next && next.precipitationProbability > t.rainNextPct
      ? { id: 'rain', text: 'Leve capa' }
      : null,
    inside.some((h) => h.apparentTemperature < t.coatApparent)
      ? { id: 'coat', text: 'Leve casaco' }
      : null,
  ];
  return candidates.filter((c): c is Tip => c !== null);
}
