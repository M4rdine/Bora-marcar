import {
  formatDayTitle,
  formatLongDate,
  monthTitle,
  weekdayIndex,
  weekdayLong,
  weekdayShort,
} from './dates';

describe('weekdayIndex/weekdayShort/weekdayLong', () => {
  it('2026-09-13 é domingo', () => {
    expect(weekdayIndex('2026-09-13')).toBe(0);
    expect(weekdayShort('2026-09-13')).toBe('dom');
    expect(weekdayLong('2026-09-13')).toBe('Domingo');
  });

  it('2026-09-19 é sábado', () => {
    expect(weekdayShort('2026-09-19')).toBe('sáb');
    expect(weekdayLong('2026-09-19')).toBe('Sábado');
  });

  it('data com componentes não numéricos cai no fallback vazio', () => {
    expect(weekdayShort('xx-yy-zz')).toBe('');
    expect(weekdayLong('xx-yy-zz')).toBe('');
  });

  it('data faltando dia assume o dia 1 do mês', () => {
    // '2026-09' tem apenas ano e mês; o dia cai no fallback `?? 1` de `parts`.
    expect(weekdayIndex('2026-09')).toBe(weekdayIndex('2026-09-01'));
  });
});

describe('formatDayTitle', () => {
  const today = '2026-09-13';
  const tomorrow = '2026-09-14';

  it('retorna Hoje para a data de hoje', () => {
    expect(formatDayTitle(today, today, tomorrow)).toBe('Hoje');
  });

  it('retorna Amanhã para a data de amanhã', () => {
    expect(formatDayTitle(tomorrow, today, tomorrow)).toBe('Amanhã');
  });

  it('retorna dia da semana e mês abreviado para outros dias', () => {
    expect(formatDayTitle('2026-09-19', today, tomorrow)).toBe('Sábado, 19 set');
  });

  it('mês fora do intervalo cai no fallback vazio de MONTHS_SHORT', () => {
    expect(formatDayTitle('2026-13-01', '2020-01-01', '2020-01-02')).toBe('Sexta, 1 ');
  });
});

describe('formatLongDate', () => {
  it('formata data válida por extenso', () => {
    expect(formatLongDate('2026-09-13')).toBe('Domingo, 13 de setembro');
  });

  it('data malformada cai nos fallbacks de dia/mês e no vazio de weekdayLong', () => {
    expect(formatLongDate('x')).toBe(', 1 de janeiro');
  });

  it('mês fora do intervalo cai no fallback vazio de MONTHS_LONG', () => {
    expect(formatLongDate('2026-13-01')).toBe('Sexta, 1 de ');
  });
});

describe('monthTitle', () => {
  it('formata mês e ano', () => {
    expect(monthTitle(2026, 9)).toBe('Setembro 2026');
  });

  it('mês fora do intervalo cai no fallback vazio', () => {
    expect(monthTitle(2026, 13)).toBe(' 2026');
  });
});
