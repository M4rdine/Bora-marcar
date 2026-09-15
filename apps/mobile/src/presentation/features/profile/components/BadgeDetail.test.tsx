import { render, screen } from '@testing-library/react-native';

import type { BadgeState } from '@/domain';

import { BadgeDetail } from './BadgeDetail';

const weekBadge: BadgeState = {
  id: 'week',
  unlocked: false,
  unlockedOn: null,
  progress: { current: 3, target: 7 },
};

describe('BadgeDetail', () => {
  it('mostra "melhor sequência" para a conquista de semana bloqueada', () => {
    render(<BadgeDetail badge={weekBadge} />);
    expect(screen.getByText('melhor sequência 3/7')).toBeTruthy();
  });
});
