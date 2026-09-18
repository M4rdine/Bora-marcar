export const ACTIVITY_IDS = ['walk', 'run', 'cycle', 'beach', 'picnic', 'fish'] as const;
export type ActivityId = (typeof ACTIVITY_IDS)[number];

export const FACTOR_IDS = ['thermal', 'rain', 'wind', 'uv', 'sun', 'pressure'] as const;
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
  // Não há campo de aparência aqui de propósito: como a atividade se PARECE é decisão da camada
  // de apresentação (`presentation/ui/icons/activityIcon.ts`), não da configuração do motor de
  // pontuação, que é sobre peso de temperatura e limite de vento.
  readonly thermal: ThermalRange;
  readonly wind: Limit;
  readonly uv: Limit;
  readonly nightFactor: number;
  readonly weights: Readonly<Record<FactorId, number>>;
};
