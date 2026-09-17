import type { BadgeId, BadgeState } from '@/domain';

import { nextBadge } from './nextBadge';

const badge = (id: BadgeId, overrides: Partial<BadgeState> = {}): BadgeState => ({
  id,
  unlocked: false,
  unlockedOn: null,
  progress: null,
  ...overrides,
});

const withProgress = (id: BadgeId, current: number, target: number): BadgeState =>
  badge(id, { progress: { current, target } });

describe('nextBadge', () => {
  it('sem conquistas não há próxima', () => {
    expect(nextBadge([])).toBeNull();
  });

  it('escolhe a mais perto de sair, e não a de maior número absoluto', () => {
    const result = nextBadge([
      withProgress('planner', 6, 10), // 60%
      withProgress('explorer', 4, 5), // 80%, mas número menor
    ]);
    expect(result?.badge.id).toBe('explorer');
    expect(result?.ratio).toBeCloseTo(0.8);
  });

  it('ignora as já desbloqueadas', () => {
    const result = nextBadge([
      badge('first', {
        unlocked: true,
        unlockedOn: '2026-09-10',
        progress: { current: 1, target: 1 },
      }),
      withProgress('planner', 2, 10),
    ]);
    expect(result?.badge.id).toBe('planner');
  });

  it('ignora as que não têm progresso medível: não há quanto falta para mostrar', () => {
    expect(nextBadge([badge('early'), badge('owl')])).toBeNull();
  });

  it('ignora as que ainda não começaram: zero de cinco não é uma meta próxima', () => {
    const result = nextBadge([withProgress('explorer', 0, 5), withProgress('planner', 1, 10)]);
    expect(result?.badge.id).toBe('planner');
  });

  it('não devolve nada quando nenhuma começou', () => {
    expect(nextBadge([withProgress('explorer', 0, 5), withProgress('week', 0, 7)])).toBeNull();
  });

  it('protege contra alvo zero, que dividiria por zero', () => {
    expect(nextBadge([withProgress('multi', 1, 0)])).toBeNull();
  });
});
