import { addDays } from '@/domain';

import { weekdayIndex, weekdayShort } from '../../i18n/dates';

export type WeekDayState = 'done' | 'today' | 'rest' | 'todayDone' | 'none';

export type WeekStripDay = {
  readonly date: string;
  readonly label: string;
  readonly state: WeekDayState;
};

type Input = {
  readonly today: string;
  readonly activeDates: ReadonlySet<string>;
  readonly restDates: ReadonlySet<string>;
};

const DAYS_IN_WEEK = 7;

function stateFor(date: string, input: Input): WeekDayState {
  const isToday = date === input.today;
  const isDone = input.activeDates.has(date);
  if (isToday && isDone) return 'todayDone';
  if (isToday) return 'today';
  if (isDone) return 'done';
  if (input.restDates.has(date)) return 'rest';
  return 'none';
}

/** Os 7 dias da semana (segunda a domingo) de `today`, com o estado de cada um. */
export function weekStrip(input: Input): readonly WeekStripDay[] {
  const monday = addDays(input.today, -((weekdayIndex(input.today) + 6) % DAYS_IN_WEEK));
  return Array.from({ length: DAYS_IN_WEEK }, (_, i) => {
    const date = addDays(monday, i);
    return { date, label: weekdayShort(date), state: stateFor(date, input) };
  });
}
