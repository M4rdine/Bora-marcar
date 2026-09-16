import { formatHour, formatHourRange } from './hourRange';

describe('formatHour', () => {
  it('mantém horas normais do relógio', () => {
    expect(formatHour(0)).toBe('0h');
    expect(formatHour(6)).toBe('6h');
    expect(formatHour(23)).toBe('23h');
  });

  it('dobra a meia-noite em vez de mostrar 24h', () => {
    expect(formatHour(24)).toBe('0h');
  });

  it('dobra horas da madrugada seguinte em vez de mostrar 25h', () => {
    expect(formatHour(25)).toBe('1h');
    expect(formatHour(26)).toBe('2h');
  });
});

describe('formatHourRange', () => {
  it('formata uma janela que termina dentro do mesmo dia', () => {
    expect(formatHourRange(6, 9)).toBe('6h – 9h');
  });

  it('formata uma janela que termina na meia-noite sem inventar 24h', () => {
    expect(formatHourRange(21, 24)).toBe('21h – 0h');
  });

  it('formata uma janela que atravessa a meia-noite sem inventar 25h', () => {
    expect(formatHourRange(21, 25)).toBe('21h – 1h');
  });
});
