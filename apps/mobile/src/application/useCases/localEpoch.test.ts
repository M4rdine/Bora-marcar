import { localEpochMs } from './localEpoch';

describe('localEpochMs', () => {
  it('converte hora local de São Paulo (UTC-3) para epoch', () => {
    expect(localEpochMs('2026-09-13', 17, 0, -10800)).toBe(Date.UTC(2026, 8, 13, 20, 0, 0));
  });
  it('converte hora local de Tóquio (UTC+9)', () => {
    expect(localEpochMs('2026-09-14', 2, 30, 32400)).toBe(Date.UTC(2026, 8, 13, 17, 30, 0));
  });
});
