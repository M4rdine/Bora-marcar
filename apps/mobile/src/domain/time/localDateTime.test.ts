import { addDays, localNow, minutesOfDay, parseLocalIso } from './localDateTime';

describe('localNow', () => {
  // 2026-09-13T17:30:00Z
  const epoch = Date.UTC(2026, 8, 13, 17, 30, 0);

  it('converte para São Paulo (UTC-3)', () => {
    expect(localNow(epoch, -3 * 3600)).toEqual({
      date: '2026-09-13',
      hour: 14,
      minute: 30,
      epochMs: epoch,
      utcOffsetSeconds: -10800,
    });
  });

  it('converte para Tóquio (UTC+9) atravessando a meia-noite', () => {
    expect(localNow(epoch, 9 * 3600)).toMatchObject({ date: '2026-09-14', hour: 2, minute: 30 });
  });

  it('converte para Lisboa (UTC+1 no verão)', () => {
    expect(localNow(epoch, 3600)).toMatchObject({ date: '2026-09-13', hour: 18, minute: 30 });
  });
});

describe('parseLocalIso', () => {
  it('lê data, hora e minuto de um ISO local', () => {
    expect(parseLocalIso('2026-09-13T06:12')).toEqual({ date: '2026-09-13', hour: 6, minute: 12 });
  });
});

describe('addDays', () => {
  it('soma dias atravessando o mês', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-09-13', 4)).toBe('2026-09-17');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('minutesOfDay', () => {
  it('aceita ISO local e HH:mm', () => {
    expect(minutesOfDay('2026-09-13T06:12')).toBe(372);
    expect(minutesOfDay('18:04')).toBe(1084);
  });
});
