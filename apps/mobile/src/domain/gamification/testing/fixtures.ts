import type { ActivityId } from '../../activities/types';
import type {
  BadWeatherDayEvent,
  ConfirmedEvent,
  LoggedEvent,
  PlanCancelledEvent,
  PlannedEvent,
} from '../events';

let seq = 0;
const nextId = (): string => `evt-${++seq}`;
const at = (date: string, hour: number): number =>
  Date.parse(`${date}T${String(hour).padStart(2, '0')}:00:00Z`);

export function planned(
  date: string,
  opts: {
    activity?: ActivityId;
    cityId?: string;
    startHour?: number;
    endHour?: number;
    windowScore?: number;
    id?: string;
  } = {},
): PlannedEvent {
  const startHour = opts.startHour ?? 17;
  return {
    type: 'planned',
    id: opts.id ?? nextId(),
    cityId: opts.cityId ?? 'sp',
    activity: opts.activity ?? 'run',
    date,
    window: { date, startHour, endHour: opts.endHour ?? startHour + 2 },
    windowScore: opts.windowScore ?? 84,
    createdAt: at(date, 8),
  };
}

export function confirmed(
  plan: PlannedEvent,
  opts: { hourLeft?: number; hourScore?: number } = {},
): ConfirmedEvent {
  const hourLeft = opts.hourLeft ?? plan.window.startHour;
  return {
    type: 'confirmed',
    id: nextId(),
    planId: plan.id,
    date: plan.date,
    hourLeft,
    hourScore: opts.hourScore ?? 86,
    createdAt: at(plan.date, hourLeft) + 1,
  };
}

export function logged(
  date: string,
  opts: { activity?: ActivityId; cityId?: string; hourLeft?: number; hourScore?: number } = {},
): LoggedEvent {
  const hourLeft = opts.hourLeft ?? 18;
  return {
    type: 'logged',
    id: nextId(),
    cityId: opts.cityId ?? 'sp',
    activity: opts.activity ?? 'walk',
    date,
    hourLeft,
    hourScore: opts.hourScore ?? 70,
    createdAt: at(date, hourLeft) + 1,
  };
}

export function cancelled(plan: PlannedEvent): PlanCancelledEvent {
  return { type: 'planCancelled', id: nextId(), planId: plan.id, createdAt: plan.createdAt + 1 };
}

export function badDay(date: string, cityId = 'sp'): BadWeatherDayEvent {
  return {
    type: 'badWeatherDay',
    id: nextId(),
    cityId,
    date,
    bestScore: 22,
    createdAt: at(date, 7),
  };
}

/** Sequência de dias consecutivos com registro espontâneo, terminando em `lastDate`. */
export function loggedRun(
  lastDate: string,
  days: number,
  opts: Parameters<typeof logged>[1] = {},
): LoggedEvent[] {
  const [y = 0, m = 1, d = 1] = lastDate.split('-').map(Number);
  return Array.from({ length: days }, (_, i) => {
    const dt = new Date(Date.UTC(y, m - 1, d - (days - 1 - i)));
    const date = dt.toISOString().slice(0, 10);
    return logged(date, opts);
  });
}
