import { addDays } from '../time/localDateTime';

import { computeStreak } from './streak';

const set = (...d: string[]) => new Set(d);
const none = new Set<string>();

describe('computeStreak', () => {
  it('sem atividades é 0', () => {
    expect(computeStreak(none, none, '2026-09-13')).toBe(0);
  });

  it('conta dias consecutivos terminando hoje', () => {
    expect(computeStreak(set('2026-09-11', '2026-09-12', '2026-09-13'), none, '2026-09-13')).toBe(
      3,
    );
  });

  it('hoje sem atividade ainda não quebra: conta a partir de ontem', () => {
    expect(computeStreak(set('2026-09-11', '2026-09-12'), none, '2026-09-13')).toBe(2);
  });

  it('um dia perdido zera o que veio antes', () => {
    expect(computeStreak(set('2026-09-10', '2026-09-12', '2026-09-13'), none, '2026-09-13')).toBe(
      2,
    );
  });

  it('dia de folga por mau tempo não quebra nem conta', () => {
    expect(
      computeStreak(set('2026-09-10', '2026-09-11', '2026-09-13'), set('2026-09-12'), '2026-09-13'),
    ).toBe(3);
  });

  it('folga hoje e ontem sem atividade: streak preservado', () => {
    expect(computeStreak(set('2026-09-11'), set('2026-09-12', '2026-09-13'), '2026-09-13')).toBe(1);
  });

  it('atividade em dia marcado como folga conta normalmente', () => {
    expect(computeStreak(set('2026-09-12', '2026-09-13'), set('2026-09-13'), '2026-09-13')).toBe(2);
  });

  it('dois dias perdidos seguidos zeram', () => {
    expect(computeStreak(set('2026-09-09', '2026-09-10'), none, '2026-09-13')).toBe(0);
  });

  it('sequência longa satura no limite de 400 dias', () => {
    const active = new Set(Array.from({ length: 401 }, (_, i) => addDays('2026-09-13', -i)));
    expect(computeStreak(active, none, '2026-09-13')).toBe(400);
  });
});
