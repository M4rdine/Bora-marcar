import { weekStrip } from './weekStrip';

describe('weekStrip', () => {
  it('monta os 7 dias da semana (segunda a domingo) com o estado de cada um', () => {
    // 2026-09-13 é um domingo: a semana vai de 2026-09-07 (segunda) a 2026-09-13 (domingo).
    const days = weekStrip({
      today: '2026-09-13',
      activeDates: new Set(['2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12']),
      restDates: new Set(['2026-09-07']),
    });
    expect(days.map((d) => d.date)).toEqual([
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
      '2026-09-13',
    ]);
    expect(days.map((d) => d.label)).toEqual(['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']);
    expect(days.map((d) => d.state)).toEqual([
      'rest',
      'done',
      'done',
      'done',
      'done',
      'done',
      'today',
    ]);
  });

  it('hoje com atividade registrada vira todayDone; dias depois de hoje viram future', () => {
    // 2026-09-08 é uma terça-feira dentro da mesma semana.
    const days = weekStrip({
      today: '2026-09-08',
      activeDates: new Set(['2026-09-08']),
      restDates: new Set(),
    });
    const byDate = new Map(days.map((d) => [d.date, d.state]));
    expect(byDate.get('2026-09-08')).toBe('todayDone');
    expect(byDate.get('2026-09-09')).toBe('future');
    expect(byDate.get('2026-09-13')).toBe('future');
    // dia passado da semana, sem registro e sem folga: `none`, não `future`.
    expect(byDate.get('2026-09-07')).toBe('none');
  });
});
