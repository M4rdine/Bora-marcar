import { dayPosition, neighbourDate } from './daySwipe';

const DIAS = ['2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21'];

describe('neighbourDate', () => {
  it('arrastar para a esquerda avança um dia', () => {
    expect(neighbourDate('2026-09-19', DIAS, 'next')).toBe('2026-09-20');
  });

  it('arrastar para a direita volta um dia', () => {
    expect(neighbourDate('2026-09-19', DIAS, 'previous')).toBe('2026-09-18');
  });

  /** As duas pontas. Sem isto o gesto sairia da lista e a tela abriria uma data inexistente. */
  it('no último dia não há para onde avançar', () => {
    expect(neighbourDate('2026-09-21', DIAS, 'next')).toBeNull();
  });

  it('no primeiro dia não há para onde voltar', () => {
    expect(neighbourDate('2026-09-18', DIAS, 'previous')).toBeNull();
  });

  it('uma data fora da lista não navega para lado nenhum', () => {
    expect(neighbourDate('2026-01-01', DIAS, 'next')).toBeNull();
    expect(neighbourDate('2026-01-01', DIAS, 'previous')).toBeNull();
  });

  it('lista vazia não navega', () => {
    expect(neighbourDate('2026-09-18', [], 'next')).toBeNull();
  });

  it('com um dia só, nenhuma direção leva a algum lugar', () => {
    expect(neighbourDate('2026-09-18', ['2026-09-18'], 'next')).toBeNull();
    expect(neighbourDate('2026-09-18', ['2026-09-18'], 'previous')).toBeNull();
  });
});

describe('dayPosition', () => {
  it('diz onde o dia está e quantos são', () => {
    expect(dayPosition('2026-09-20', DIAS)).toEqual({ index: 2, total: 4 });
  });

  it('fora da lista, não há posição', () => {
    expect(dayPosition('2026-01-01', DIAS)).toBeNull();
  });
});
