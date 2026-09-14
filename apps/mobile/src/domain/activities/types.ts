export const ACTIVITY_IDS = ['walk', 'run', 'cycle', 'beach', 'picnic'] as const;
export type ActivityId = (typeof ACTIVITY_IDS)[number];

export const FACTOR_IDS = ['thermal', 'rain', 'wind', 'uv', 'sun'] as const;
export type FactorId = (typeof FACTOR_IDS)[number];

export type ThermalRange = {
  readonly idealMin: number;
  readonly idealMax: number;
  readonly tolMin: number;
  readonly tolMax: number;
};

export type Limit = { readonly ok: number; readonly max: number };

export type ActivityProfile = {
  readonly id: ActivityId;
  readonly name: string;
  readonly emoji: string;
  readonly thermal: ThermalRange;
  readonly wind: Limit;
  readonly uv: Limit;
  readonly nightFactor: number;
  readonly weights: Readonly<Record<FactorId, number>>;
};
