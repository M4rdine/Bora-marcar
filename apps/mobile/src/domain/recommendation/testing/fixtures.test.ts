import { makeDay } from './fixtures';

describe('makeDay', () => {
  it('gera as 24 horas do dia informado, com isDay entre 6h e 18h', () => {
    const day = makeDay('2026-09-13');
    expect(day).toHaveLength(24);
    expect(day[0]?.isDay).toBe(false);
    expect(day[6]?.isDay).toBe(true);
    expect(day[17]?.isDay).toBe(true);
    expect(day[18]?.isDay).toBe(false);
    expect(day[23]?.date).toBe('2026-09-13');
  });

  it('aplica o transformador por hora quando informado', () => {
    const day = makeDay('2026-09-13', (hour) => ({ uvIndex: hour }));
    expect(day[10]?.uvIndex).toBe(10);
  });
});
