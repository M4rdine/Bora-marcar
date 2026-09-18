import { monthGrid, weeksOf, type MonthCell } from './monthGrid';

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

  it('completa as semanas em múltiplos de 7 e preenche o fim do mês com null', () => {
    const grid = monthGrid({ ...BASE, ...empty });
    expect(grid.cells.length % 7).toBe(0);
    const lastDayIndex = grid.cells.findIndex((c) => c?.date === '2026-09-30');
    const trailing = grid.cells.slice(lastDayIndex + 1);
    expect(trailing.length).toBeGreaterThan(0);
    trailing.forEach((cell) => expect(cell).toBeNull());
  });
});

describe('weeksOf', () => {
  const celula = (day: number): MonthCell => ({
    date: `2026-09-${String(day).padStart(2, '0')}`,
    day,
    state: 'future',
  });

  it('agrupa em semanas de sete', () => {
    const semanas = weeksOf(Array.from({ length: 21 }, (_, i) => celula(i + 1)));
    expect(semanas).toHaveLength(3);
    for (const s of semanas) expect(s).toHaveLength(7);
  });

  /**
   * A última semana quase nunca tem sete dias. Como cada célula divide a linha em partes iguais,
   * uma linha com três células esticaria as três para ocupar a largura toda e as colunas
   * deixariam de alinhar com as de cima.
   */
  it('completa a última semana com vazios, para as colunas continuarem alinhadas', () => {
    const semanas = weeksOf(Array.from({ length: 17 }, (_, i) => celula(i + 1)));
    expect(semanas).toHaveLength(3);
    for (const s of semanas) expect(s).toHaveLength(7);
    expect(semanas[2]?.slice(3).every((c) => c === null)).toBe(true);
    expect(semanas[2]?.[2]?.day).toBe(17);
  });

  it('TODA linha tem exatamente sete colunas, em qualquer mês', () => {
    for (let dias = 1; dias <= 42; dias += 1) {
      const semanas = weeksOf(Array.from({ length: dias }, (_, i) => celula(i + 1)));
      for (const s of semanas) expect(s).toHaveLength(7);
    }
  });

  it('não inventa nem perde dia nenhum', () => {
    const entrada = Array.from({ length: 30 }, (_, i) => celula(i + 1));
    const saida = weeksOf(entrada)
      .flat()
      .filter((c) => c !== null);
    expect(saida).toHaveLength(30);
  });

  it('mês vazio não vira linha nenhuma', () => {
    expect(weeksOf([])).toHaveLength(0);
  });
});
