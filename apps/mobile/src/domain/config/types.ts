import type { ActivityId, ActivityProfile } from '../activities/types';

export type ScoreThresholds = {
  readonly great: number;
  readonly good: number;
  readonly fair: number;
};

export type WindowRules = {
  readonly sizes: readonly number[];
  readonly minHourScore: number;
  readonly lengthBonus: number;
  readonly minRemainingMinutes: number;
  readonly graceHoursAfterEnd: number;
};

export type TipThresholds = {
  readonly uvProtect: number;
  readonly waterApparent: number;
  readonly coolDropDeg: number;
  readonly rainNextPct: number;
  readonly coatApparent: number;
};

export type XpRules = {
  readonly base: number;
  readonly planBonus: number;
  readonly streakPerDay: number;
  readonly streakMaxDays: number;
};

export type LevelDef = { readonly level: number; readonly xp: number; readonly name: string };

export type EngineConfig = {
  readonly schemaVersion: 1;
  readonly activities: Readonly<Record<ActivityId, ActivityProfile>>;
  readonly scores: ScoreThresholds;
  readonly window: WindowRules;
  readonly tips: TipThresholds;
  readonly xp: XpRules;
  readonly levels: readonly LevelDef[];
};
