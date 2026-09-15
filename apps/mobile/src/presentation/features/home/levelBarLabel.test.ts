import { defaultEngineConfig, levelFor } from '@/domain';

import { levelBarRight } from './levelBarLabel';

describe('levelBarRight', () => {
  it('mostra o XP dentro do nível atual sobre o necessário para o próximo', () => {
    // Nível 2 vai de 100 a 400 XP: 130 no total são 30 dentro do nível, de 300.
    expect(levelBarRight(levelFor(130, defaultEngineConfig.levels))).toBe('30 / 300 XP');
  });

  it('no último nível não há próximo: "Nível máximo"', () => {
    expect(levelBarRight(levelFor(99_999, defaultEngineConfig.levels))).toBe('Nível máximo');
  });
});
