import type { LocalDateTime } from '@/domain';

import { deriveStreakRisk, minutesUntilMidnight, splitMinutes } from './streakRisk';

const at = (hour: number, minute = 0): LocalDateTime => ({
  date: '2026-09-13',
  hour,
  minute,
  epochMs: 0,
  utcOffsetSeconds: -10800,
});

describe('deriveStreakRisk', () => {
  it('registrou hoje: sequência garantida, sem contagem', () => {
    const risk = deriveStreakRisk({
      streak: 5,
      doneToday: true,
      restToday: false,
      now: at(14),
    });
    expect(risk).toEqual({ kind: 'secured', streak: 5 });
  });

  it('dia de folga por clima ruim protege a sequência', () => {
    const risk = deriveStreakRisk({
      streak: 5,
      doneToday: false,
      restToday: true,
      now: at(14),
    });
    expect(risk).toEqual({ kind: 'protected', streak: 5 });
  });

  it('folga vence risco: um dia protegido não pode aparecer como em risco', () => {
    const risk = deriveStreakRisk({
      streak: 9,
      doneToday: false,
      restToday: true,
      now: at(23, 59),
    });
    expect(risk.kind).toBe('protected');
  });

  it('com sequência e sem registro, conta os minutos até a virada do dia', () => {
    const risk = deriveStreakRisk({
      streak: 3,
      doneToday: false,
      restToday: false,
      now: at(14, 14),
    });
    expect(risk).toEqual({ kind: 'atRisk', streak: 3, minutesLeft: 586 });
  });

  it('sem sequência não há o que perder', () => {
    expect(
      deriveStreakRisk({ streak: 0, doneToday: false, restToday: false, now: at(14) }),
    ).toEqual({ kind: 'idle' });
  });

  it('registrar num dia sem sequência anterior já conta como garantido', () => {
    expect(deriveStreakRisk({ streak: 1, doneToday: true, restToday: false, now: at(9) })).toEqual({
      kind: 'secured',
      streak: 1,
    });
  });
});

describe('minutesUntilMidnight', () => {
  it('à meia-noite em ponto, o dia inteiro está pela frente', () => {
    expect(minutesUntilMidnight(at(0, 0))).toBe(1440);
  });

  it('no último minuto do dia, falta um minuto', () => {
    expect(minutesUntilMidnight(at(23, 59))).toBe(1);
  });
});

describe('splitMinutes', () => {
  it('quebra em horas e minutos', () => {
    expect(splitMinutes(586)).toEqual({ hours: 9, minutes: 46 });
    expect(splitMinutes(60)).toEqual({ hours: 1, minutes: 0 });
    expect(splitMinutes(45)).toEqual({ hours: 0, minutes: 45 });
  });
});
