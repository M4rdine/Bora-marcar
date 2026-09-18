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
  /**
   * Os planos pendentes de cada data. Uma data pode ter MAIS DE UM: o plano é por atividade.
   *
   * Era um plano por dia, e a tela inicial mostrava esse plano qualquer que fosse a atividade
   * selecionada — quem tinha ciclismo às 8h via "ciclismo às 8h" com corrida selecionada, e
   * trocar de aba não mudava nada. Uma pessoa pode pedalar de manhã e correr à tarde.
   */
  readonly plansByDate: ReadonlyMap<string, readonly ActivePlan[]>;
  /** Os planos pendentes de hoje, em qualquer atividade. */
  readonly todayPlans: readonly ActivePlan[];
  /**
   * O registro MAIS RECENTE de hoje, não o primeiro. Um dia pode ter mais de uma atividade, e o
   * herói mostra o recibo do que acabou de acontecer.
   */
  readonly todayRecord: ActivityRecord | null;
  /** Quantas atividades hoje já teve. A primeira é a que conta para a sequência. */
  readonly todayCount: number;
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
    const isFirstOfDay = !acc.some((r) => r.date === d.date);
    const active = new Set([...acc.map((r) => r.date), d.date]);
    const streakDays = computeStreak(active, restDates, d.date);
    // A segunda atividade do dia rende XP, sim — sair duas vezes é melhor que sair uma. O que ela
    // NÃO rende é o bônus de sequência, que é por dia e já foi creditado na primeira. Antes o
    // registro seguinte vinha com XP zero, o que transformava "quero sair de novo" em punição.
    const xp = computeXp(
      {
        hourScore: d.hourScore,
        planFulfilled: d.planFulfilled,
        streakDays: isFirstOfDay ? streakDays : 0,
      },
      cfg.xp,
    );
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
function buildPlansByDate(
  sorted: readonly GamificationEvent[],
): ReadonlyMap<string, readonly ActivePlan[]> {
  const cancelled = new Set(sorted.flatMap((e) => (e.type === 'planCancelled' ? [e.planId] : [])));
  const confirmedIds = new Set(sorted.flatMap((e) => (e.type === 'confirmed' ? [e.planId] : [])));
  const pending = sorted.filter(
    (e): e is PlannedEvent =>
      e.type === 'planned' && !cancelled.has(e.id) && !confirmedIds.has(e.id),
  );
  // Um plano pendente por data E atividade: replanejar a mesma atividade substitui o anterior,
  // planejar outra soma. Os eventos vêm ordenados, então o último de cada par vence.
  const byKey = pending.reduce(
    (map, plan) => new Map(map).set(`${plan.date}|${plan.activity}`, toActivePlan(plan)),
    new Map<string, ActivePlan>(),
  );
  return [...byKey.values()].reduce(
    (map, plan) => new Map(map).set(plan.date, [...(map.get(plan.date) ?? []), plan]),
    new Map<string, readonly ActivePlan[]>(),
  );
}

/** O plano pendente daquela atividade, entre os da data. */
export function planFor(plans: readonly ActivePlan[], activity: ActivityId): ActivePlan | null {
  return plans.find((p) => p.activity === activity) ?? null;
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
    todayPlans: plansByDate.get(today) ?? [],
    todayRecord: records.findLast((r) => r.date === today) ?? null,
    todayCount: records.filter((r) => r.date === today).length,
  };
}
