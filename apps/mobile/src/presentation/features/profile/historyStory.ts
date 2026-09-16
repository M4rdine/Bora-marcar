import type { ActivityRecord } from '@/domain';

/** O que houve de notável num registro. Uma lista sem isso é um extrato, não uma história. */
export type HistoryNote = 'first' | 'streak' | 'planKept' | 'greatScore';

export type HistoryEntry = {
  readonly record: ActivityRecord;
  readonly notes: readonly HistoryNote[];
};

/** Um mês de registros. O agrupamento é o que dá ao histórico um sentido de linha do tempo. */
export type HistorySection = {
  /** "2026-09", usado como chave e para formatar o título do mês. */
  readonly month: string;
  readonly entries: readonly HistoryEntry[];
};

const MIN_STREAK_WORTH_NOTING = 2;
const MONTH_LENGTH = 7;

const monthOf = (date: string): string => date.slice(0, MONTH_LENGTH);

function notesFor(
  record: ActivityRecord,
  isFirstEver: boolean,
  greatThreshold: number,
): readonly HistoryNote[] {
  const notes: HistoryNote[] = [];
  if (isFirstEver) notes.push('first');
  if (record.streakDays >= MIN_STREAK_WORTH_NOTING) notes.push('streak');
  if (record.planFulfilled) notes.push('planKept');
  if (record.hourScore >= greatThreshold) notes.push('greatScore');
  return notes;
}

type Input = {
  readonly records: readonly ActivityRecord[];
  readonly greatThreshold: number;
  readonly max: number;
};

/**
 * Histórico agrupado por mês, do mais recente para o mais antigo, com o que cada registro teve de
 * notável. O corte em `max` acontece antes do agrupamento, senão um mês antigo entraria só com a
 * sua última linha e o título mentiria sobre o que há ali.
 */
export function buildHistory({ records, greatThreshold, max }: Input): readonly HistorySection[] {
  if (records.length === 0) return [];
  const firstEverId = records.reduce((oldest, r) => (r.date < oldest.date ? r : oldest)).id;

  const recent = [...records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, max);

  return recent.reduce<HistorySection[]>((sections, record) => {
    const month = monthOf(record.date);
    const entry: HistoryEntry = {
      record,
      notes: notesFor(record, record.id === firstEverId, greatThreshold),
    };
    const last = sections[sections.length - 1];
    if (last !== undefined && last.month === month) {
      return [...sections.slice(0, -1), { month, entries: [...last.entries, entry] }];
    }
    return [...sections, { month, entries: [entry] }];
  }, []);
}
