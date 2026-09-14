export const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;
export const WEEKDAYS_LONG = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const;
export const MONTHS_SHORT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const;
export const MONTHS_LONG = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

const parts = (date: string): { y: number; m: number; d: number } => {
  const [y, m, d] = date.split('-').map(Number);
  // `String.prototype.split` sempre devolve ao menos um elemento, então `y` nunca é `undefined`
  // em runtime — o `as number` só remove o `| undefined` que `noUncheckedIndexedAccess` adiciona
  // ao tipo, sem introduzir um branch defensivo inalcançável (`m`/`d` podem faltar de verdade
  // quando a data tem menos de três segmentos, por isso mantêm o `?? 1`).
  return { y: y as number, m: m ?? 1, d: d ?? 1 };
};

/** 0 = domingo … 6 = sábado, sem depender do fuso do aparelho. */
export function weekdayIndex(date: string): number {
  const { y, m, d } = parts(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export const weekdayShort = (date: string): string => WEEKDAYS_SHORT[weekdayIndex(date)] ?? '';
export const weekdayLong = (date: string): string => WEEKDAYS_LONG[weekdayIndex(date)] ?? '';

/** 'Hoje' | 'Amanhã' | 'Sábado, 13 set' */
export function formatDayTitle(date: string, today: string, tomorrow: string): string {
  if (date === today) return 'Hoje';
  if (date === tomorrow) return 'Amanhã';
  const { m, d } = parts(date);
  return `${weekdayLong(date)}, ${d} ${MONTHS_SHORT[m - 1] ?? ''}`;
}

/** 'Sábado, 13 de setembro' */
export function formatLongDate(date: string): string {
  const { m, d } = parts(date);
  return `${weekdayLong(date)}, ${d} de ${(MONTHS_LONG[m - 1] ?? '').toLowerCase()}`;
}

export const monthTitle = (year: number, month: number): string =>
  `${MONTHS_LONG[month - 1] ?? ''} ${year}`;
