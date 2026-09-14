import type { ActivityId } from '../activities/types';

import type { XpBreakdown } from './xp';

export type ActivityRecord = {
  readonly id: string;
  readonly date: string;
  readonly cityId: string;
  readonly activity: ActivityId;
  readonly hourLeft: number;
  readonly hourScore: number;
  readonly planFulfilled: boolean;
  readonly streakDays: number; // streak no momento do registro, incluindo o dia
  readonly xp: XpBreakdown;
  readonly createdAt: number;
};
