export type HourlyConditions = {
  readonly time: string; // ISO local sem fuso, ex.: "2026-09-13T17:00"
  readonly date: string; // "2026-09-13"
  readonly hour: number; // 0–23
  readonly temperature: number;
  readonly apparentTemperature: number;
  readonly precipitationProbability: number; // 0–100
  readonly precipitationMm: number;
  readonly windSpeedKmh: number;
  readonly windGustsKmh: number;
  readonly uvIndex: number;
  readonly cloudCoverPct: number; // 0–100
  readonly weatherCode: number; // WMO
  readonly isDay: boolean;
  readonly humidityPct: number;
  readonly pressureHpa: number;
  /**
   * Variação da pressão nas últimas três horas. Negativo = caindo.
   *
   * Vem calculado do adaptador porque depende das horas VIZINHAS, e o motor pontua uma hora de
   * cada vez. Manter o derivado no dado é o que permite a função de conforto continuar pura.
   */
  readonly pressureTrendHpa: number;
};

export type DailySummary = {
  readonly date: string;
  readonly sunrise: string; // ISO local, ex.: "2026-09-13T06:12"
  readonly sunset: string;
  readonly weatherCode: number;
  readonly tempMax: number;
  readonly tempMin: number;
};

export type Forecast = {
  readonly timezone: string;
  readonly utcOffsetSeconds: number;
  readonly hourly: readonly HourlyConditions[];
  readonly daily: readonly DailySummary[];
};
