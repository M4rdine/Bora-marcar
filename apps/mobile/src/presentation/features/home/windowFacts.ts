import type { HourScore } from '@/domain';

export type WindowFacts = {
  readonly apparent: number;
  readonly rainPct: number;
  readonly windKmh: number;
  readonly uv: number;
};

const mean = (xs: readonly number[]): number =>
  xs.length === 0 ? 0 : Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);

/** Médias arredondadas dos fatores de conforto das horas de uma janela. */
export const windowFacts = (hours: readonly HourScore[]): WindowFacts => ({
  apparent: mean(hours.map((h) => h.hour.apparentTemperature)),
  rainPct: mean(hours.map((h) => h.hour.precipitationProbability)),
  windKmh: mean(hours.map((h) => h.hour.windSpeedKmh)),
  uv: mean(hours.map((h) => h.hour.uvIndex)),
});
