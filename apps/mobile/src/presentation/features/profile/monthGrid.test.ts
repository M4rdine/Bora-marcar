import { monthGrid } from './monthGrid';

const BASE = {
  year: 2026,
  month: 9,
  today: '2026-09-13',
};

const empty = { activeDates: new Set<string>(), restDates: new Set<string>() };

describe('monthGrid', () => {
  it('setembro/2026 começa na terça: a primeira célula (segunda) é null e o dia 1 vem em seguida', () => {
    const grid = monthGrid({ ...BASE, ...empty });
    expect(grid.cells[0]).toBeNull();
    expect(grid.cells[1]).toMatchObject({ date: '2026-09-01', day: 1 });
  });

  it('tem os 30 dias de setembro', () => {
    const grid = monthGrid({ ...BASE, ...empty });
    const days = grid.cells.filter((c) => c !== null);
    expect(days).toHaveLength(30);
  });

  it('produz o título do mês e o cabeçalho da semana começando na segunda', () => {
    const grid = monthGrid({ ...BASE, ...empty });
    expect(grid.title).toBe('Setembro 2026');
    expect(grid.weekdays).toEqual(['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']);
  });

  it('marca o dia de hoje e hoje-com-atividade', () => {
    const withoutActivity = monthGrid({ ...BASE, ...empty });
    expect(withoutActivity.cells.find((c) => c?.date === '2026-09-13')?.state).toBe('today');

    const withActivity = monthGrid({
      ...BASE,
      activeDates: new Set(['2026-09-13']),
      restDates: new Set<string>(),
    });
    expect(withActivity.cells.find((c) => c?.date === '2026-09-13')?.state).toBe('todayDone');
  });

  it('marca dias ativos como done e folgas por mau tempo como rest', () => {
    const grid = monthGrid({
      ...BASE,
      activeDates: new Set(['2026-09-05']),
      restDates: new Set(['2026-09-06']),
    });
    expect(grid.cells.find((c) => c?.date === '2026-09-05')?.state).toBe('done');
    expect(grid.cells.find((c) => c?.date === '2026-09-06')?.state).toBe('rest');
  });

  it('marca datas depois de hoje como future e datas passadas sem registro como none', () => {
    const grid = monthGrid({ ...BASE, ...empty });
    expect(grid.cells.find((c) => c?.date === '2026-09-20')?.state).toBe('future');
    expect(grid.cells.find((c) => c?.date === '2026-09-01')?.state).toBe('none');
  });
});
