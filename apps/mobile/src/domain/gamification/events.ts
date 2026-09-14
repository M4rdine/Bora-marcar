import type { ActivityId } from '../activities/types';
import type { TimeWindow } from '../recommendation/windows';

type Base = { readonly id: string; readonly createdAt: number }; // epoch ms

export type PlannedEvent = Base & {
  readonly type: 'planned';
  readonly cityId: string;
  readonly activity: ActivityId;
  readonly date: string;
  readonly window: TimeWindow;
  readonly windowScore: number;
};

export type ConfirmedEvent = Base & {
  readonly type: 'confirmed';
  readonly planId: string;
  readonly date: string;
  readonly hourLeft: number;
  readonly minuteLeft?: number;
  readonly hourScore: number;
};

export type LoggedEvent = Base & {
  readonly type: 'logged';
  readonly cityId: string;
  readonly activity: ActivityId;
  readonly date: string;
  readonly hourLeft: number;
  readonly minuteLeft?: number;
  readonly hourScore: number;
};

export type PlanCancelledEvent = Base & { readonly type: 'planCancelled'; readonly planId: string };

export type BadWeatherDayEvent = Base & {
  readonly type: 'badWeatherDay';
  readonly cityId: string;
  readonly date: string;
  readonly bestScore: number;
};

export type GamificationEvent =
  PlannedEvent | ConfirmedEvent | LoggedEvent | PlanCancelledEvent | BadWeatherDayEvent;
