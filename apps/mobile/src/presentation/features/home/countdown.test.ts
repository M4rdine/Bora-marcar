import type { LocalDateTime } from '@/domain';

import { countdown } from './countdown';

const at = (hour: number, minute: number): LocalDateTime => ({
  date: '2026-09-13',
  hour,
  minute,
  epochMs: 0,
  utcOffsetSeconds: -10800,
});

describe('countdown', () => {
  it('calcula horas e minutos até o início', () => {
    expect(countdown(at(8, 15), 17)).toEqual({ hours: 8, minutes: 45 });
  });

  it('devolve null quando a janela já começou', () => {
    expect(countdown(at(17, 0), 17)).toBeNull();
  });

  it('um minuto antes do início', () => {
    expect(countdown(at(16, 59), 17)).toEqual({ hours: 0, minutes: 1 });
  });
});
