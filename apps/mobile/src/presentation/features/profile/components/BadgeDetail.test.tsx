import { render, screen } from '@testing-library/react-native';

import type { BadgeState } from '@/domain';

import { BadgeDetail } from './BadgeDetail';

const weekBadge: BadgeState = {
  id: 'week',
  unlocked: false,
  unlockedOn: null,
  progress: { current: 3, target: 7 },
};

const unlockedBadge: BadgeState = {
  id: 'first',
  unlocked: true,
  unlockedOn: '2026-09-01',
  progress: null,
};

describe('BadgeDetail', () => {
  it('mostra "melhor sequência" para a conquista de semana bloqueada', () => {
    render(<BadgeDetail badge={weekBadge} />);
    expect(screen.getByText('melhor sequência 3/7')).toBeTruthy();
  });

  it('conquista desbloqueada não mostra critério de progresso', () => {
    render(<BadgeDetail badge={unlockedBadge} />);
    expect(screen.getByText('Primeira saída')).toBeTruthy();
    expect(screen.getByText('Registrou a primeira atividade.')).toBeTruthy();
    expect(screen.queryByText(/\d+\/\d+/)).toBeNull();
  });
});
