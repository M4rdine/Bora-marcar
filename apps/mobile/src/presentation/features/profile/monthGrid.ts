import { monthTitle, weekdayIndex, WEEKDAYS_SHORT } from '../../i18n/dates';

export type MonthCellState = 'done' | 'rest' | 'today' | 'todayDone' | 'future' | 'none';

export type MonthCell = {
  readonly date: string;
  readonly day: number;
  readonly state: MonthCellState;
};

/** As células agrupadas em semanas completas, para o calendário desenhar linha por linha. */
export type MonthWeek = readonly (MonthCell | null)[];

export type MonthGrid = {
  readonly title: string;
  readonly weekdays: readonly string[];
  readonly cells: readonly (MonthCell | null)[];
};

type Input = {
  readonly year: number;
  readonly month: number; // 1-12
  readonly activeDates: ReadonlySet<string>;
  readonly restDates: ReadonlySet<string>;
  readonly today: string;
};

const DAYS_IN_WEEK = 7;

const pad = (n: number): string => String(n).padStart(2, '0');
const dateOf = (year: number, month: number, day: number): string =>
  `${year}-${pad(month)}-${pad(day)}`;

/** 0 = segunda … 6 = domingo, a partir do índice 0 = domingo de `weekdayIndex`. */
const mondayIndex = (date: string): number => (weekdayIndex(date) + 6) % DAYS_IN_WEEK;

const daysInMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

function stateFor(date: string, input: Input): MonthCellState {
  const isToday = date === input.today;
  const isDone = input.activeDates.has(date);
  if (isToday && isDone) return 'todayDone';
  if (isToday) return 'today';
  if (isDone) return 'done';
  if (input.restDates.has(date)) return 'rest';
  if (date > input.today) return 'future';
  return 'none';
}

const padding = (length: number): readonly null[] => Array.from({ length }, () => null);

/** Grade do mês (semana começando na segunda) para o calendário do Perfil. */
export function monthGrid(input: Input): MonthGrid {
  const { year, month } = input;
  const leading = mondayIndex(dateOf(year, month, 1));
  const total = daysInMonth(year, month);
  const days: readonly MonthCell[] = Array.from({ length: total }, (_, i) => {
    const date = dateOf(year, month, i + 1);
    return { date, day: i + 1, state: stateFor(date, input) };
  });
  const trailing = (DAYS_IN_WEEK - ((leading + total) % DAYS_IN_WEEK)) % DAYS_IN_WEEK;
  const weekdays = [...WEEKDAYS_SHORT.slice(1), WEEKDAYS_SHORT[0]];
  return {
    title: monthTitle(year, month),
    weekdays,
    cells: [...padding(leading), ...days, ...padding(trailing)],
  };
}

/**
 * Quebra as células em semanas de sete, completando a última com vazios.
 *
 * O calendário desenhava tudo numa fileira só com quebra automática e largura de 100/7 por
 * cento. Duas coisas davam errado nisso: a porcentagem arredonda diferente em cada densidade de
 * tela, então as células encostavam e os cantos arredondados se sobrepunham; e a última semana,
 * com menos de sete dias, precisaria ser preenchida para as colunas continuarem alinhadas.
 */
export function weeksOf(cells: readonly (MonthCell | null)[]): readonly MonthWeek[] {
  const weeks: MonthWeek[] = [];
  for (let i = 0; i < cells.length; i += DAYS_IN_WEEK) {
    const week = cells.slice(i, i + DAYS_IN_WEEK);
    weeks.push([...week, ...Array<null>(DAYS_IN_WEEK - week.length).fill(null)]);
  }
  return weeks;
}
