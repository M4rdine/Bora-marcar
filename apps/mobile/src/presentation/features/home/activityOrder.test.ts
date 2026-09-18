import { ACTIVITY_IDS } from '@/domain';

import { activityOrder } from './activityOrder';

describe('activityOrder', () => {
  it('sem preferência, mantém a ordem do domínio', () => {
    expect(activityOrder([])).toEqual(ACTIVITY_IDS);
  });

  it('as preferidas vêm primeiro, na ordem em que foram marcadas', () => {
    expect(activityOrder(['picnic', 'beach'])).toEqual(['picnic', 'beach', 'walk', 'run', 'cycle']);
  });

  /** Preferir não é esconder: quem gosta de praia ainda pode querer caminhar num dia chuvoso. */
  it('nenhuma atividade some da lista', () => {
    for (const favoritas of [[], ['beach'], ['cycle', 'walk'], [...ACTIVITY_IDS]] as const) {
      expect([...activityOrder(favoritas)].sort()).toEqual([...ACTIVITY_IDS].sort());
    }
  });

  it('não duplica quando todas são preferidas', () => {
    const ordem = activityOrder([...ACTIVITY_IDS]);
    expect(ordem).toHaveLength(ACTIVITY_IDS.length);
    expect(new Set(ordem).size).toBe(ACTIVITY_IDS.length);
  });

  it('ignora o que não é atividade conhecida sem quebrar a lista', () => {
    expect(activityOrder(['beach'])).toHaveLength(ACTIVITY_IDS.length);
  });
});
