import type { ActivityRecord } from '@/domain';

import { buildHistory } from './historyStory';

const record = (
  overrides: Partial<ActivityRecord> & { id: string; date: string },
): ActivityRecord =>
  ({
    cityId: 'sp',
    activity: 'walk',
    hourLeft: 8,
    minuteLeft: 0,
    hourScore: 70,
    planFulfilled: false,
    streakDays: 1,
    xp: { base: 50, score: 20, plan: 0, streak: 0, total: 70 },
    createdAt: 0,
    ...overrides,
  }) as ActivityRecord;

const GREAT = 80;
const build = (records: readonly ActivityRecord[], max = 20) =>
  buildHistory({ records, greatThreshold: GREAT, max });

describe('buildHistory', () => {
  it('sem registros não inventa seções', () => {
    expect(build([])).toEqual([]);
  });

  it('agrupa por mês, do mais recente para o mais antigo', () => {
    const sections = build([
      record({ id: 'a', date: '2026-08-30' }),
      record({ id: 'b', date: '2026-09-01' }),
      record({ id: 'c', date: '2026-09-14' }),
    ]);
    expect(sections.map((s) => s.month)).toEqual(['2026-09', '2026-08']);
    expect(sections[0]?.entries.map((e) => e.record.id)).toEqual(['c', 'b']);
    expect(sections[1]?.entries.map((e) => e.record.id)).toEqual(['a']);
  });

  it('marca o primeiro registro de todos, mesmo com vários no mesmo mês', () => {
    const sections = build([
      record({ id: 'a', date: '2026-09-01' }),
      record({ id: 'b', date: '2026-09-02' }),
    ]);
    const entries = sections[0]?.entries ?? [];
    expect(entries.find((e) => e.record.id === 'a')?.notes).toContain('first');
    expect(entries.find((e) => e.record.id === 'b')?.notes).not.toContain('first');
  });

  it('anota sequência só a partir de dois dias', () => {
    const sections = build([
      record({ id: 'a', date: '2026-09-01', streakDays: 1 }),
      record({ id: 'b', date: '2026-09-02', streakDays: 2 }),
    ]);
    const entries = sections[0]?.entries ?? [];
    expect(entries.find((e) => e.record.id === 'a')?.notes).not.toContain('streak');
    expect(entries.find((e) => e.record.id === 'b')?.notes).toContain('streak');
  });

  it('anota plano cumprido e nota alta', () => {
    const sections = build([
      record({ id: 'a', date: '2026-09-02', planFulfilled: true, hourScore: 95 }),
    ]);
    const notes = sections[0]?.entries[0]?.notes ?? [];
    expect(notes).toContain('planKept');
    expect(notes).toContain('greatScore');
  });

  it('nota abaixo do limiar de ótimo não vira destaque', () => {
    const sections = build([record({ id: 'a', date: '2026-09-02', hourScore: GREAT - 1 })]);
    expect(sections[0]?.entries[0]?.notes).not.toContain('greatScore');
  });

  it('corta antes de agrupar, para nenhum mês aparecer pela metade sem aviso', () => {
    const sections = build(
      [
        record({ id: 'a', date: '2026-08-01' }),
        record({ id: 'b', date: '2026-09-01' }),
        record({ id: 'c', date: '2026-09-02' }),
      ],
      2,
    );
    expect(sections).toHaveLength(1);
    expect(sections[0]?.month).toBe('2026-09');
    expect(sections[0]?.entries.map((e) => e.record.id)).toEqual(['c', 'b']);
  });
});
