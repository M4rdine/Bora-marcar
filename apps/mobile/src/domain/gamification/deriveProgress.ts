import type { ActivityId } from '../activities/types';
import type { EngineConfig } from '../config/types';
import { isWithinWindow, type TimeWindow } from '../recommendation/windows';

import { evaluateBadges, type BadgeState } from './badges';
import type { ConfirmedEvent, GamificationEvent, LoggedEvent, PlannedEvent } from './events';
import { levelFor, type LevelProgress } from './levels';
import type { ActivityRecord } from './records';
import { computeStreak } from './streak';
import { computeXp } from './xp';

export type ActivePlan = {
  readonly planId: string;
  readonly cityId: string;
  readonly activity: ActivityId;
  readonly date: string;
  readonly window: TimeWindow;
  readonly windowScore: number;
};

export type Progress = {
  readonly totalXp: number;
  readonly level: LevelProgress;
  readonly streak: number;
  readonly records: readonly ActivityRecord[];
  readonly badges: readonly BadgeState[];
  readonly activeDates: ReadonlySet<string>;
  readonly restDates: ReadonlySet<string>;
  readonly citiesCount: number;
  readonly plansByDate: ReadonlyMap<string, ActivePlan>;
  readonly activePlan: ActivePlan | null;
  readonly todayRecord: ActivityRecord | null;
};

type Draft = Omit<ActivityRecord, 'streakDays' | 'xp'>;

function draftFromConfirmed(
  e: ConfirmedEvent,
  plans: ReadonlyMap<string, PlannedEvent>,
  cancelled: ReadonlySet<string>,
  graceHours: number,
): Draft | null {
  const plan = plans.get(e.planId);
  if (!plan || cancelled.has(plan.id)) return null;
  const planFulfilled =
    e.date === plan.date &&
    isWithinWindow(plan.window, { hour: e.hourLeft, minute: 0 }, graceHours);
  return {
    id: e.id,
    date: e.date,
    cityId: plan.cityId,
    activity: plan.activity,
    hourLeft: e.hourLeft,
    minuteLeft: e.minuteLeft ?? 0,
    hourScore: e.hourScore,
    planFulfilled,
    createdAt: e.createdAt,
  };
}

const draftFromLogged = (e: LoggedEvent): Draft => ({
  id: e.id,
  date: e.date,
  cityId: e.cityId,
  activity: e.activity,
  hourLeft: e.hourLeft,
  minuteLeft: e.minuteLeft ?? 0,
  hourScore: e.hourScore,
  planFulfilled: false,
  createdAt: e.createdAt,
});

function buildRecords(
  sorted: readonly GamificationEvent[],
  cfg: EngineConfig,
  restDates: ReadonlySet<string>,
): readonly ActivityRecord[] {
  const plans = new Map(
    sorted.filter((e): e is PlannedEvent => e.type === 'planned').map((p) => [p.id, p]),
  );
  const cancelled = new Set(sorted.flatMap((e) => (e.type === 'planCancelled' ? [e.planId] : [])));
  const drafts = sorted.flatMap((e): Draft[] => {
    if (e.type === 'confirmed') {
      const d = draftFromConfirmed(e, plans, cancelled, cfg.window.graceHoursAfterEnd);
      return d ? [d] : [];
    }
    return e.type === 'logged' ? [draftFromLogged(e)] : [];
  });
  return drafts.reduce<readonly ActivityRecord[]>((acc, d) => {
    // só o primeiro registro do dia rende XP; os demais entram no histórico com XP zero
    const isFirstOfDay = !acc.some((r) => r.date === d.date);
    const active = new Set([...acc.map((r) => r.date), d.date]);
    const streakDays = computeStreak(active, restDates, d.date);
    const xp = isFirstOfDay
      ? computeXp({ hourScore: d.hourScore, planFulfilled: d.planFulfilled, streakDays }, cfg.xp)
      : { base: 0, hourBonus: 0, planBonus: 0, streakBonus: 0, total: 0 };
    return [...acc, { ...d, streakDays, xp }];
  }, []);
}

const toActivePlan = (plan: PlannedEvent): ActivePlan => ({
  planId: plan.id,
  cityId: plan.cityId,
  activity: plan.activity,
  date: plan.date,
  window: plan.window,
  windowScore: plan.windowScore,
});

/** Último plano não cancelado e não confirmado de cada data. */
function buildPlansByDate(sorted: readonly GamificationEvent[]): ReadonlyMap<string, ActivePlan> {
  const cancelled = new Set(sorted.flatMap((e) => (e.type === 'planCancelled' ? [e.planId] : [])));
  const confirmedIds = new Set(sorted.flatMap((e) => (e.type === 'confirmed' ? [e.planId] : [])));
  return sorted
    .filter(
      (e): e is PlannedEvent =>
        e.type === 'planned' && !cancelled.has(e.id) && !confirmedIds.has(e.id),
    )
    .reduce(
      (map, plan) => new Map(map).set(plan.date, toActivePlan(plan)),
      new Map<string, ActivePlan>(),
    );
}

export function deriveProgress(
  events: readonly GamificationEvent[],
  cfg: EngineConfig,
  today: string,
): Progress {
  const sorted = [...events].sort((a, b) => a.createdAt - b.createdAt);
  const restDates = new Set(sorted.flatMap((e) => (e.type === 'badWeatherDay' ? [e.date] : [])));
  const records = buildRecords(sorted, cfg, restDates);
  const activeDates = new Set(records.map((r) => r.date));
  const totalXp = records.reduce((acc, r) => acc + r.xp.total, 0);
  const plansByDate = buildPlansByDate(sorted);
  return {
    totalXp,
    level: levelFor(totalXp, cfg.levels),
    streak: computeStreak(activeDates, restDates, today),
    records,
    badges: evaluateBadges(records, restDates),
    activeDates,
    restDates,
    citiesCount: new Set(records.map((r) => r.cityId)).size,
    plansByDate,
    activePlan: plansByDate.get(today) ?? null,
    todayRecord: records.find((r) => r.date === today) ?? null,
  };
}
